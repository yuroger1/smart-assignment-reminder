const express = require("express");
const pool = require("../db");
const requireLogin = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireLogin);

// Get due soon and overdue notifications
router.get("/", async (req, res) => {
    try {
        const userId = req.session.user.user_id;

        const [notifications] = await pool.execute(
            `
            SELECT 
                assignment_id,
                title,
                due_date,
                CASE
                    WHEN due_date < NOW() THEN 'Overdue'
                    WHEN due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY) THEN 'Due Soon'
                    ELSE 'Upcoming'
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
            notifications
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to get notifications."
        });
    }
});

module.exports = router;