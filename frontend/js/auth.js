const REDIRECT_DELAY_MS = 900;

function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : "";
}

function isStrongPassword(password) {
    return password.length >= 8;
}

function showMessage(targetId, type, message) {
    const messageBox = document.getElementById(targetId);

    if (!messageBox) {
        return;
    }

    messageBox.innerHTML = "";

    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    messageBox.appendChild(alert);
}

function showDevResetLink(targetId, resetUrl) {
    const messageBox = document.getElementById(targetId);

    if (!messageBox || !resetUrl) {
        return;
    }

    const note = document.createElement("div");
    note.className = "alert alert-info";

    const label = document.createElement("span");
    label.textContent = "Development reset link: ";

    const link = document.createElement("a");
    link.href = resetUrl;
    link.textContent = "Open reset page";

    note.appendChild(label);
    note.appendChild(link);
    messageBox.appendChild(note);
}

function setLoading(button, isLoading, loadingText) {
    if (!button) {
        return;
    }

    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
        button.disabled = true;
    } else {
        button.textContent = button.dataset.originalText || button.textContent;
        button.disabled = false;
    }
}

async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({
        success: false,
        message: "Unexpected server response."
    }));

    if (!response.ok && data.success !== false) {
        data.success = false;
    }

    return data;
}

function redirectToDashboard() {
    setTimeout(function () {
        window.location.href = "dashboard.html";
    }, REDIRECT_DELAY_MS);
}

function redirectToLogin() {
    setTimeout(function () {
        window.location.href = "login.html";
    }, REDIRECT_DELAY_MS);
}

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const submitButton = registerForm.querySelector("button[type='submit']");
        const name = getValue("registerName");
        const email = getValue("registerEmail").toLowerCase();
        const password = getValue("registerPassword");
        const confirmPassword = getValue("registerConfirmPassword");

        if (!isStrongPassword(password)) {
            showMessage("registerMessage", "danger", "Password must be at least 8 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            showMessage("registerMessage", "danger", "Passwords do not match.");
            return;
        }

        setLoading(submitButton, true, "Creating account...");

        try {
            const data = await requestJson("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            });

            if (data.success) {
                showMessage("registerMessage", "success", "Registration successful. Redirecting to login page...");
                redirectToLogin();
            } else {
                showMessage("registerMessage", "danger", data.message || "Registration failed.");
            }
        } catch (error) {
            showMessage("registerMessage", "danger", "Unable to register right now. Please try again.");
        } finally {
            setLoading(submitButton, false);
        }
    });
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const submitButton = loginForm.querySelector("button[type='submit']");
        const email = getValue("loginEmail").toLowerCase();
        const password = getValue("loginPassword");

        setLoading(submitButton, true, "Logging in...");

        try {
            const data = await requestJson("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            if (data.success) {
                showMessage("loginMessage", "success", "Login successful. Redirecting to dashboard...");
                redirectToDashboard();
            } else {
                showMessage("loginMessage", "danger", data.message || "Login failed.");
            }
        } catch (error) {
            showMessage("loginMessage", "danger", "Unable to login right now. Please try again.");
        } finally {
            setLoading(submitButton, false);
        }
    });
}

const forgotPasswordForm = document.getElementById("forgotPasswordForm");

if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const submitButton = forgotPasswordForm.querySelector("button[type='submit']");
        const email = getValue("forgotEmail").toLowerCase();

        setLoading(submitButton, true, "Preparing reset link...");

        try {
            const data = await requestJson("/api/auth/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ email: email })
            });

            if (data.success) {
                showMessage("forgotPasswordMessage", "success", data.message);
                showDevResetLink("forgotPasswordMessage", data.devResetUrl);
            } else {
                showMessage("forgotPasswordMessage", "danger", data.message || "Unable to prepare reset link.");
            }
        } catch (error) {
            showMessage("forgotPasswordMessage", "danger", "Unable to prepare reset link right now.");
        } finally {
            setLoading(submitButton, false);
        }
    });
}

const resetPasswordForm = document.getElementById("resetPasswordForm");

if (resetPasswordForm) {
    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
        showMessage("resetPasswordMessage", "danger", "Password reset link is missing a token.");
        resetPasswordForm.querySelectorAll("input, button").forEach(function (element) {
            element.disabled = true;
        });
    }

    resetPasswordForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const submitButton = resetPasswordForm.querySelector("button[type='submit']");
        const password = getValue("resetPassword");
        const confirmPassword = getValue("resetConfirmPassword");

        if (!isStrongPassword(password)) {
            showMessage("resetPasswordMessage", "danger", "Password must be at least 8 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            showMessage("resetPasswordMessage", "danger", "Passwords do not match.");
            return;
        }

        setLoading(submitButton, true, "Resetting password...");

        try {
            const data = await requestJson("/api/auth/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    token: token,
                    password: password
                })
            });

            if (data.success) {
                showMessage("resetPasswordMessage", "success", "Password reset successful. Redirecting to login page...");
                redirectToLogin();
            } else {
                showMessage("resetPasswordMessage", "danger", data.message || "Unable to reset password.");
            }
        } catch (error) {
            showMessage("resetPasswordMessage", "danger", "Unable to reset password right now.");
        } finally {
            setLoading(submitButton, false);
        }
    });
}

function waitForGoogleIdentity(callback, attempt) {
    if (window.google && window.google.accounts && window.google.accounts.id) {
        callback();
        return;
    }

    if (attempt >= 30) {
        showMessage("googleAuthStatus", "warning", "Google sign-in did not load. Please refresh the page.");
        return;
    }

    setTimeout(function () {
        waitForGoogleIdentity(callback, attempt + 1);
    }, 200);
}

async function handleGoogleCredential(response) {
    const statusId = "googleAuthStatus";
    showMessage(statusId, "info", "Signing in with Google...");

    try {
        const data = await requestJson("/api/auth/google", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                credential: response.credential
            })
        });

        if (data.success) {
            showMessage(statusId, "success", "Google sign-in successful. Redirecting to dashboard...");
            redirectToDashboard();
        } else {
            showMessage(statusId, "danger", data.message || "Google sign-in failed.");
        }
    } catch (error) {
        showMessage(statusId, "danger", "Unable to complete Google sign-in right now.");
    }
}

async function initGoogleAuth() {
    const googleButton = document.getElementById("googleSignInButton");

    if (!googleButton) {
        return;
    }

    try {
        const config = await requestJson("/api/auth/google/config", {
            method: "GET",
            credentials: "include"
        });

        if (!config.enabled || !config.clientId) {
            showMessage("googleAuthStatus", "secondary", "Google sign-in is unavailable until GOOGLE_CLIENT_ID is configured.");
            googleButton.classList.add("d-none");
            return;
        }

        waitForGoogleIdentity(function () {
            window.google.accounts.id.initialize({
                client_id: config.clientId,
                callback: handleGoogleCredential
            });

            window.google.accounts.id.renderButton(googleButton, {
                theme: "outline",
                size: "large",
                shape: "rectangular",
                text: googleButton.dataset.text || "signin_with",
                width: Math.min(400, Math.max(260, googleButton.offsetWidth || 320))
            });
        }, 0);
    } catch (error) {
        showMessage("googleAuthStatus", "warning", "Google sign-in configuration could not be loaded.");
    }
}

initGoogleAuth();
