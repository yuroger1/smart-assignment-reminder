const express = require("express");
const pool = require("../db");
const requireLogin = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireLogin);

// Get all courses
router.get("/", async (req, res) => {
    try {
        const userId = req.session.user.user_id;

        const [courses] = await pool.execute(
            `
            SELECT course_id, course_name, instructor, created_at
            FROM courses
            WHERE user_id = ?
            ORDER BY course_name ASC
            `,
            [userId]
        );

        res.json({
            success: true,
            courses: courses
        });

    } catch (error) {
        console.error("Get courses error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get courses."
        });
    }
});

// Add course
router.post("/", async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const { course_name } = req.body;

        if (!course_name) {
            return res.status(400).json({
                success: false,
                message: "Course name is required."
            });
        }

        await pool.execute(
            `
            INSERT INTO courses (user_id, course_name, instructor)
            VALUES (?, ?, ?)
            `,
            [userId, course_name, ""]
        );

        res.json({
            success: true,
            message: "Course added successfully."
        });

    } catch (error) {
        console.error("Add course error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to add course."
        });
    }
});

// Update course
router.put("/:id", async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const courseId = req.params.id;
        const { course_name } = req.body;

        if (!course_name) {
            return res.status(400).json({
                success: false,
                message: "Course name is required."
            });
        }

        const [result] = await pool.execute(
            `
            UPDATE courses
            SET course_name = ?
            WHERE course_id = ? AND user_id = ?
            `,
            [course_name, courseId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Course not found."
            });
        }

        res.json({
            success: true,
            message: "Course updated successfully."
        });

    } catch (error) {
        console.error("Update course error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update course."
        });
    }
});

module.exports = router;