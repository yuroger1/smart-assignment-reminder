const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const pool = require("../db");

const router = express.Router();
const RESET_TOKEN_MINUTES = 30;

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
    return typeof password === "string" && password.length >= 8;
}

function getBaseUrl(req) {
    return process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function getSessionUser(user) {
    return {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        auth_provider: user.auth_provider || (user.google_id ? "google" : "local"),
        google_linked: Boolean(user.google_id)
    };
}

function getTokenHash(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

async function verifyGoogleCredential(credential) {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
        const error = new Error("Google sign-in is not configured.");
        error.statusCode = 503;
        throw error;
    }

    if (!credential) {
        const error = new Error("Google credential is required.");
        error.statusCode = 400;
        throw error;
    }

    const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );

    if (!response.ok) {
        const error = new Error("Google credential could not be verified.");
        error.statusCode = 401;
        throw error;
    }

    const profile = await response.json();

    if (profile.aud !== clientId || profile.email_verified !== "true") {
        const error = new Error("Google credential is not valid for this app.");
        error.statusCode = 401;
        throw error;
    }

    return {
        googleId: profile.sub,
        email: normalizeEmail(profile.email),
        name: profile.name || profile.email.split("@")[0]
    };
}

async function createPasswordResetToken(userId) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = getTokenHash(token);

    await pool.execute(
        "DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL",
        [userId]
    );

    await pool.execute(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
        [userId, tokenHash, RESET_TOKEN_MINUTES]
    );

    return token;
}

// Register
router.post("/register", async (req, res) => {
    try {
        const { name, password } = req.body;
        const email = normalizeEmail(req.body.email);

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required."
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long."
            });
        }

        // Check if email already exists
        const [existingUsers] = await pool.execute(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already exists."
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert new user
        await pool.execute(
            `INSERT INTO users (name, email, password_hash, auth_provider)
             VALUES (?, ?, ?, 'local')`,
            [name, email, passwordHash]
        );

        res.json({
            success: true,
            message: "Registration successful."
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error during registration."
        });
    }
});

// Login
router.post("/login", async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const { password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const [users] = await pool.execute(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = users[0];

        if (!user.password_hash) {
            return res.status(401).json({
                success: false,
                message: "This account uses Google sign-in. Continue with Google or reset your password."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Store user data in session
        req.session.user = getSessionUser(user);

        res.json({
            success: true,
            message: "Login successful.",
            user: req.session.user
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error during login."
        });
    }
});

// Google sign-in configuration
router.get("/google/config", (req, res) => {
    res.json({
        success: true,
        enabled: Boolean(process.env.GOOGLE_CLIENT_ID),
        clientId: process.env.GOOGLE_CLIENT_ID || null
    });
});

// Continue with Google. Existing local accounts are linked by verified email.
router.post("/google", async (req, res) => {
    try {
        const googleProfile = await verifyGoogleCredential(req.body.credential);

        const [linkedUsers] = await pool.execute(
            "SELECT * FROM users WHERE google_id = ?",
            [googleProfile.googleId]
        );

        let user = linkedUsers[0];

        if (!user) {
            const [emailUsers] = await pool.execute(
                "SELECT * FROM users WHERE email = ?",
                [googleProfile.email]
            );

            user = emailUsers[0];

            if (user) {
                const authProvider = user.password_hash ? "local_google" : "google";

                await pool.execute(
                    `UPDATE users
                     SET google_id = ?, auth_provider = ?, name = COALESCE(NULLIF(name, ''), ?)
                     WHERE user_id = ?`,
                    [googleProfile.googleId, authProvider, googleProfile.name, user.user_id]
                );

                user.google_id = googleProfile.googleId;
                user.auth_provider = authProvider;
            } else {
                const [result] = await pool.execute(
                    `INSERT INTO users (name, email, password_hash, google_id, auth_provider)
                     VALUES (?, ?, NULL, ?, 'google')`,
                    [googleProfile.name, googleProfile.email, googleProfile.googleId]
                );

                user = {
                    user_id: result.insertId,
                    name: googleProfile.name,
                    email: googleProfile.email,
                    password_hash: null,
                    google_id: googleProfile.googleId,
                    auth_provider: "google"
                };
            }
        }

        req.session.user = getSessionUser(user);

        res.json({
            success: true,
            message: "Google sign-in successful.",
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Server error during Google sign-in."
        });
    }
});

// Link a Google account to the current logged-in user
router.post("/google/link", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Please login first."
            });
        }

        const googleProfile = await verifyGoogleCredential(req.body.credential);

        const [linkedUsers] = await pool.execute(
            "SELECT user_id FROM users WHERE google_id = ? AND user_id <> ?",
            [googleProfile.googleId, req.session.user.user_id]
        );

        if (linkedUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This Google account is already linked to another user."
            });
        }

        const [emailUsers] = await pool.execute(
            "SELECT user_id FROM users WHERE email = ? AND user_id <> ?",
            [googleProfile.email, req.session.user.user_id]
        );

        if (emailUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This Google email belongs to another account."
            });
        }

        await pool.execute(
            `UPDATE users
             SET google_id = ?, auth_provider = CASE
                 WHEN password_hash IS NULL THEN 'google'
                 ELSE 'local_google'
             END
             WHERE user_id = ?`,
            [googleProfile.googleId, req.session.user.user_id]
        );

        const [users] = await pool.execute(
            "SELECT * FROM users WHERE user_id = ?",
            [req.session.user.user_id]
        );

        req.session.user = getSessionUser(users[0]);

        res.json({
            success: true,
            message: "Google account linked successfully.",
            user: req.session.user
        });
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Server error while linking Google account."
        });
    }
});

// Request a password reset
router.post("/forgot-password", async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const genericMessage = "If an account exists for that email, a password reset link has been prepared.";

        if (!email || !isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        const [users] = await pool.execute(
            "SELECT user_id, email FROM users WHERE email = ?",
            [email]
        );

        const responseBody = {
            success: true,
            message: genericMessage
        };

        if (users.length > 0) {
            const token = await createPasswordResetToken(users[0].user_id);
            const resetUrl = `${getBaseUrl(req)}/reset-password.html?token=${token}`;

            console.log(`Password reset link for ${users[0].email}: ${resetUrl}`);

            if (process.env.NODE_ENV !== "production") {
                responseBody.devResetUrl = resetUrl;
            }
        }

        res.json(responseBody);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error while preparing password reset."
        });
    }
});

// Complete a password reset
router.post("/reset-password", async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !isStrongPassword(password)) {
            return res.status(400).json({
                success: false,
                message: "A valid reset token and an 8-character password are required."
            });
        }

        const tokenHash = getTokenHash(token);

        const [tokens] = await pool.execute(
            `SELECT token_id, user_id
             FROM password_reset_tokens
             WHERE token_hash = ?
               AND used_at IS NULL
               AND expires_at > NOW()`,
            [tokenHash]
        );

        if (tokens.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Password reset link is invalid or expired."
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const resetToken = tokens[0];

        await pool.execute(
            `UPDATE users
             SET password_hash = ?,
                 auth_provider = CASE
                     WHEN google_id IS NULL THEN 'local'
                     ELSE 'local_google'
                 END
             WHERE user_id = ?`,
            [passwordHash, resetToken.user_id]
        );

        await pool.execute(
            "UPDATE password_reset_tokens SET used_at = NOW() WHERE token_id = ?",
            [resetToken.token_id]
        );

        res.json({
            success: true,
            message: "Password has been reset. You can now log in."
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error while resetting password."
        });
    }
});

// Logout
router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({
            success: true,
            message: "Logout successful."
        });
    });
});

// Get current user
router.get("/me", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Not logged in."
        });
    }

    res.json({
        success: true,
        user: req.session.user
    });
});

module.exports = router;
