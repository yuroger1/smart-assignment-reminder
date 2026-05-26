const pool = require("../db");

async function columnExists(tableName, columnName) {
    const [rows] = await pool.execute(
        `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?`,
        [tableName, columnName]
    );

    return rows[0].count > 0;
}

async function indexExists(tableName, indexName) {
    const [rows] = await pool.execute(
        `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND INDEX_NAME = ?`,
        [tableName, indexName]
    );

    return rows[0].count > 0;
}

async function ensureAuthSchema() {
    await pool.execute("ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL");

    if (!(await columnExists("users", "google_id"))) {
        await pool.execute(
            "ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL AFTER password_hash"
        );
    }

    if (!(await columnExists("users", "auth_provider"))) {
        await pool.execute(
            `ALTER TABLE users
             ADD COLUMN auth_provider ENUM('local', 'google', 'local_google')
             NOT NULL DEFAULT 'local' AFTER google_id`
        );
    }

    if (!(await indexExists("users", "idx_users_google_id"))) {
        await pool.execute(
            "CREATE UNIQUE INDEX idx_users_google_id ON users (google_id)"
        );
    }

    await pool.execute(
        `CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token_hash CHAR(64) NOT NULL UNIQUE,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT fk_password_reset_tokens_user
                FOREIGN KEY (user_id)
                REFERENCES users(user_id)
                ON DELETE CASCADE
        )`
    );

    if (!(await columnExists("assignments", "google_calendar_event_id"))) {
        await pool.execute(
            "ALTER TABLE assignments ADD COLUMN google_calendar_event_id VARCHAR(255) NULL AFTER status"
        );
    }

    if (!(await columnExists("assignments", "google_calendar_event_link"))) {
        await pool.execute(
            "ALTER TABLE assignments ADD COLUMN google_calendar_event_link VARCHAR(500) NULL AFTER google_calendar_event_id"
        );
    }

    if (!(await columnExists("assignments", "calendar_synced_at"))) {
        await pool.execute(
            "ALTER TABLE assignments ADD COLUMN calendar_synced_at DATETIME NULL AFTER google_calendar_event_link"
        );
    }
}

module.exports = ensureAuthSchema;
