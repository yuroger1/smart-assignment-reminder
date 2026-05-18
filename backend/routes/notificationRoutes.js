const express = require("express");
const pool = require("../db");
const requireLogin = require("../middleware/authMiddleware");

const router = express.Router();

// All notification routes require login
router.use(requireLogin);

// Get due soon and overdue reminders
router.get("/", async (req, res) => {
    try {
        const userId = req.session.user.user_id;

        const [notifications] = await pool.execute(
            `
            SELECT 
                assignment_id,
                title,
                description,
                due_date,
                priority,
                status,
                CASE
                    WHEN due_date < NOW() THEN 'Overdue'
                    WHEN due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY) THEN 'Due Soon'
                END AS notification_type
            FROM assignments
            WHERE user_id = ?
              AND status = 'Pending'
              AND due_date <= DATE_ADD(NOW(), INTERVAL 3 DAY)
            ORDER BY due_date ASC
            `,
            [userId]
        );

        res.json({
            success: true,
            notifications: notifications
        });

    } catch (error) {
        console.error("Get notifications error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get notifications."
        });
    }
});

module.exports = router;