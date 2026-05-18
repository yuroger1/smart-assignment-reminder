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
            SELECT *
            FROM courses
            WHERE user_id = ?
            ORDER BY course_name ASC
            `,
            [userId]
        );

        res.json({
            success: true,
            courses
        });

    } catch (error) {
        console.error(error);
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
        const { course_name, instructor } = req.body;

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
            [userId, course_name, instructor || ""]
        );

        res.json({
            success: true,
            message: "Course added successfully."
        });

    } catch (error) {
        console.error(error);
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
        const { course_name, instructor } = req.body;

        await pool.execute(
            `
            UPDATE courses
            SET course_name = ?, instructor = ?
            WHERE course_id = ? AND user_id = ?
            `,
            [course_name, instructor || "", courseId, userId]
        );

        res.json({
            success: true,
            message: "Course updated successfully."
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to update course."
        });
    }
});

// Delete course
router.delete("/:id", async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const courseId = req.params.id;

        await pool.execute(
            `
            DELETE FROM courses
            WHERE course_id = ? AND user_id = ?
            `,
            [courseId, userId]
        );

        res.json({
            success: true,
            message: "Course deleted successfully."
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to delete course."
        });
    }
});

module.exports = router;