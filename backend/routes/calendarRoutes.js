const express = require("express");
const pool = require("../db");
const requireLogin = require("../middleware/authMiddleware");

const router = express.Router();
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const CALENDAR_TIME_ZONE = process.env.TZ || "Asia/Taipei";

router.use(requireLogin);

function pad(value) {
    return String(value).padStart(2, "0");
}

function parseTaipeiDate(dateString) {
    if (!dateString) {
        return null;
    }

    if (typeof dateString === "string" && dateString.includes(" ")) {
        return new Date(dateString.replace(" ", "T") + "+08:00");
    }

    return new Date(dateString);
}

function formatCalendarDateTime(date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: CALENDAR_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(date);

    const values = {};

    parts.forEach(function (part) {
        values[part.type] = part.value;
    });

    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}

function getEndDateTime(dateString) {
    const start = parseTaipeiDate(dateString);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    return formatCalendarDateTime(end);
}

function getStartDateTime(dateString) {
    return dateString.replace(" ", "T");
}

function getPriorityReminderMinutes(priority) {
    if (priority === "High") {
        return [1440, 180, 60];
    }

    if (priority === "Medium") {
        return [1440, 60];
    }

    return [60];
}

function buildCalendarEvent(assignment) {
    const details = [
        assignment.course_name ? `Course: ${assignment.course_name}` : null,
        assignment.description || null,
        `Priority: ${assignment.priority}`,
        "Created by Smart Assignment Reminder."
    ].filter(Boolean);

    return {
        summary: `Assignment due: ${assignment.title}`,
        description: details.join("\n\n"),
        start: {
            dateTime: getStartDateTime(assignment.due_date),
            timeZone: CALENDAR_TIME_ZONE
        },
        end: {
            dateTime: getEndDateTime(assignment.due_date),
            timeZone: CALENDAR_TIME_ZONE
        },
        reminders: {
            useDefault: false,
            overrides: getPriorityReminderMinutes(assignment.priority).map(function (minutes) {
                return {
                    method: "popup",
                    minutes: minutes
                };
            })
        },
        extendedProperties: {
            private: {
                smartAssignmentId: String(assignment.assignment_id)
            }
        }
    };
}

async function googleCalendarRequest(accessToken, method, url, body) {
    const response = await fetch(url, {
        method: method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : undefined
    });

    const responseText = await response.text();
    let data = null;

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch (error) {
            data = { error: { message: responseText } };
        }
    }

    if (!response.ok) {
        const error = new Error(data?.error?.message || "Google Calendar request failed.");
        error.statusCode = response.status;
        throw error;
    }

    return data;
}

async function createCalendarEvent(accessToken, eventBody) {
    return googleCalendarRequest(
        accessToken,
        "POST",
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        eventBody
    );
}

async function updateCalendarEvent(accessToken, eventId, eventBody) {
    return googleCalendarRequest(
        accessToken,
        "PATCH",
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
        eventBody
    );
}

router.get("/config", (req, res) => {
    res.json({
        success: true,
        enabled: Boolean(process.env.GOOGLE_CLIENT_ID),
        clientId: process.env.GOOGLE_CLIENT_ID || null,
        scope: CALENDAR_SCOPE,
        timeZone: CALENDAR_TIME_ZONE
    });
});

router.get("/status", async (req, res) => {
    try {
        const userId = req.session.user.user_id;

        const [rows] = await pool.execute(
            `SELECT
                COUNT(*) AS pending_count,
                SUM(CASE WHEN google_calendar_event_id IS NOT NULL THEN 1 ELSE 0 END) AS synced_count,
                MAX(calendar_synced_at) AS last_synced_at
             FROM assignments
             WHERE user_id = ?
               AND status = 'Pending'`,
            [userId]
        );

        const status = rows[0];

        res.json({
            success: true,
            enabled: Boolean(process.env.GOOGLE_CLIENT_ID),
            pendingCount: Number(status.pending_count || 0),
            syncedCount: Number(status.synced_count || 0),
            lastSyncedAt: status.last_synced_at
        });
    } catch (error) {
        console.error("Calendar status error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load Google Calendar status."
        });
    }
});

router.post("/sync", async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.status(400).json({
                success: false,
                message: "Google Calendar access token is required."
            });
        }

        const [assignments] = await pool.execute(
            `SELECT
                a.assignment_id,
                a.title,
                a.description,
                a.due_date,
                a.priority,
                a.google_calendar_event_id,
                c.course_name
             FROM assignments a
             LEFT JOIN courses c
             ON a.course_id = c.course_id
             WHERE a.user_id = ?
               AND a.status = 'Pending'
             ORDER BY a.due_date ASC`,
            [userId]
        );

        let created = 0;
        let updated = 0;
        const failed = [];

        for (const assignment of assignments) {
            const eventBody = buildCalendarEvent(assignment);

            try {
                let event;

                if (assignment.google_calendar_event_id) {
                    try {
                        event = await updateCalendarEvent(
                            accessToken,
                            assignment.google_calendar_event_id,
                            eventBody
                        );
                        updated += 1;
                    } catch (error) {
                        if (error.statusCode !== 404 && error.statusCode !== 410) {
                            throw error;
                        }

                        event = await createCalendarEvent(accessToken, eventBody);
                        created += 1;
                    }
                } else {
                    event = await createCalendarEvent(accessToken, eventBody);
                    created += 1;
                }

                await pool.execute(
                    `UPDATE assignments
                     SET google_calendar_event_id = ?,
                         google_calendar_event_link = ?,
                         calendar_synced_at = NOW()
                     WHERE assignment_id = ?
                       AND user_id = ?`,
                    [
                        event.id,
                        event.htmlLink || null,
                        assignment.assignment_id,
                        userId
                    ]
                );
            } catch (error) {
                console.error("Calendar sync item error:", error);
                failed.push({
                    assignmentId: assignment.assignment_id,
                    title: assignment.title,
                    message: error.message
                });
            }
        }

        res.json({
            success: failed.length === 0,
            message: failed.length === 0
                ? "Assignments synced to Google Calendar."
                : "Some assignments could not be synced.",
            created: created,
            updated: updated,
            failed: failed,
            total: assignments.length
        });
    } catch (error) {
        console.error("Calendar sync error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to sync Google Calendar."
        });
    }
});

module.exports = router;
