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

// Delete course
router.delete("/:id", async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const userId = req.session.user.user_id;
        const courseId = req.params.id;

        await connection.beginTransaction();

        // First, remove this course from assignments.
        // These assignments will still exist, but their course becomes "No Course".
        await connection.execute(
            `
            UPDATE assignments
            SET course_id = NULL
            WHERE course_id = ? AND user_id = ?
            `,
            [courseId, userId]
        );

        // Then delete the course.
        const [result] = await connection.execute(
            `
            DELETE FROM courses
            WHERE course_id = ? AND user_id = ?
            `,
            [courseId, userId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Course not found."
            });
        }

        await connection.commit();

        res.json({
            success: true,
            message: "Course deleted successfully."
        });

    } catch (error) {
        await connection.rollback();

        console.error("Delete course error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete course."
        });

    } finally {
        connection.release();
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