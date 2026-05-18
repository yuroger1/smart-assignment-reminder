const express = require("express");
const pool = require("../db");
const requireLogin = require("../middleware/authMiddleware");

const router = express.Router();

// All assignment routes require login
router.use(requireLogin);

// Get all assignments for current user
router.get("/", async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const { search, course_id, status, sort } = req.query;

        let sql = `
            SELECT 
                a.assignment_id,
                a.title,
                a.description,
                a.due_date,
                a.priority,
                a.status,
                c.course_name,
                CASE
                    WHEN a.status = 'Completed' THEN 'Completed'
                    WHEN a.due_date < NOW() THEN 'Overdue'
                    WHEN a.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY) THEN 'Due Soon'
                    ELSE 'Upcoming'
                END AS deadline_status
            FROM assignments a
            LEFT JOIN courses c
            ON a.course_id = c.course_id
            WHERE a.user_id = ?
        `;

        const params = [userId];

        if (search) {
            sql += " AND a.title LIKE ?";
            params.push(`%${search}%`);
        }

        if (course_id) {
            sql += " AND a.course_id = ?";
            params.push(course_id);
        }

        if (status) {
            sql += " AND a.status = ?";
            params.push(status);
        }

        if (sort === "due_date") {
            sql += " ORDER BY a.due_date ASC";
        } else {
            sql += " ORDER BY a.created_at DESC";
        }

        const [assignments] = await pool.execute(sql, params);

        res.json({
            success: true,
            assignments: assignments
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to get assignments."
        });
    }
});

// Get one assignment
router.get("/:id", async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const assignmentId = req.params.id;

        const [assignments] = await pool.execute(
            `
            SELECT *
            FROM assignments
            WHERE assignment_id = ? AND user_id = ?
            `,
            [assignmentId, userId]
        );

        if (assignments.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Assignment not found."
            });
        }

        res.json({
            success: true,
            assignment: assignments[0]
        });

    } catch (error) {
        console.error("Get assignment error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get assignment."
        });
    }
});

// Add assignment
router.post("/", async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const { course_id, title, description, due_date, priority } = req.body;

        if (!title || !due_date) {
            return res.status(400).json({
                success: false,
                message: "Title and due date are required."
            });
        }

        await pool.execute(
            `
            INSERT INTO assignments
            (user_id, course_id, title, description, due_date, priority)
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                userId,
                course_id || null,
                title,
                description || "",
                due_date,
                priority || "Medium"
            ]
        );

        res.json({
            success: true,
            message: "Assignment added successfully."
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to add assignment."
        });
    }
});

// Update assignment
router.put("/:id", async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const assignmentId = req.params.id;

        const {
            course_id,
            title,
            description,
            due_date,
            priority,
            status
        } = req.body;

        if (!title || !due_date) {
            return res.status(400).json({
                success: false,
                message: "Title and due date are required."
            });
        }

        await pool.execute(
            `
            UPDATE assignments
            SET course_id = ?, 
                title = ?, 
                description = ?, 
                due_date = ?, 
                priority = ?, 
                status = ?
            WHERE assignment_id = ? AND user_id = ?
            `,
            [
                course_id || null,
                title,
                description || "",
                due_date,
                priority || "Medium",
                status || "Pending",
                assignmentId,
                userId
            ]
        );

        res.json({
            success: true,
            message: "Assignment updated successfully."
        });

    } catch (error) {
        console.error("Update assignment error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update assignment."
        });
    }
});

// Delete assignment
router.delete("/:id", async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const assignmentId = req.params.id;

        await pool.execute(
            `
            DELETE FROM assignments
            WHERE assignment_id = ? AND user_id = ?
            `,
            [assignmentId, userId]
        );

        res.json({
            success: true,
            message: "Assignment deleted successfully."
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to delete assignment."
        });
    }
});

// Mark assignment as completed
router.patch("/:id/complete", async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const assignmentId = req.params.id;

        await pool.execute(
            `
            UPDATE assignments
            SET status = 'Completed'
            WHERE assignment_id = ? AND user_id = ?
            `,
            [assignmentId, userId]
        );

        res.json({
            success: true,
            message: "Assignment marked as completed."
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to complete assignment."
        });
    }
});

module.exports = router;