DROP DATABASE IF EXISTS smart_assignment_reminder;
CREATE DATABASE smart_assignment_reminder;
USE smart_assignment_reminder;

-- Table 1: users
-- Store registered student accounts
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: courses
-- Store courses created by each user
CREATE TABLE courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    instructor VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_courses_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- Table 3: assignments
-- Store assignment details and deadlines
CREATE TABLE assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    due_date DATETIME NOT NULL,
    priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
    status ENUM('Pending', 'Completed') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_assignments_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignments_course
        FOREIGN KEY (course_id)
        REFERENCES courses(course_id)
        ON DELETE SET NULL
);

-- Table 4: notifications
-- Store reminder messages for assignments
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    assignment_id INT NOT NULL,
    message VARCHAR(255) NOT NULL,
    notification_type ENUM('Due Soon', 'Overdue', 'General') DEFAULT 'General',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notifications_assignment
        FOREIGN KEY (assignment_id)
        REFERENCES assignments(assignment_id)
        ON DELETE CASCADE
);

-- =========================================
-- Sample Data
-- =========================================

INSERT INTO users (name, email, password_hash)
VALUES
('Roger Yu', 'roger@example.com', 'hashed_password_123'),
('Jacky Chen', 'jacky@example.com', 'hashed_password_456');

INSERT INTO courses (user_id, course_name, instructor)
VALUES
(1, 'Web-based Programming', 'Professor Wang'),
(1, 'Database Systems', 'Professor Lin'),
(1, 'Introduction to Cryptography', 'Professor Chen'),
(2, 'Computer Networks', 'Professor Lee');

INSERT INTO assignments 
(user_id, course_id, title, description, due_date, priority, status)
VALUES
(1, 1, 'Smart Assignment Reminder Project', 'Build a dynamic web application with database integration.', '2026-06-10 23:59:00', 'High', 'Pending'),
(1, 2, 'ER Diagram Report', 'Create ER diagram and relational schema.', '2026-06-05 23:59:00', 'Medium', 'Pending'),
(1, 3, 'RSA Encryption Assignment', 'Implement RSA encryption and decryption functions.', '2026-06-15 23:59:00', 'Medium', 'Pending'),
(2, 4, 'DNS Architecture Presentation', 'Prepare slides for DNS architecture and attacks.', '2026-06-12 23:59:00', 'High', 'Pending');

INSERT INTO notifications
(user_id, assignment_id, message, notification_type)
VALUES
(1, 1, 'Smart Assignment Reminder Project is coming soon.', 'Due Soon'),
(1, 2, 'ER Diagram Report is due soon.', 'Due Soon'),
(1, 3, 'RSA Encryption Assignment is upcoming.', 'General'),
(2, 4, 'DNS Architecture Presentation is coming soon.', 'Due Soon');

CREATE VIEW assignment_overview AS
SELECT 
    a.assignment_id,
    a.user_id,
    a.title,
    a.description,
    c.course_name,
    a.due_date,
    a.priority,
    a.status,
    CASE
        WHEN a.status = 'Completed' THEN 'Completed'
        WHEN a.due_date < NOW() THEN 'Overdue'
        WHEN a.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY) THEN 'Due Soon'
        ELSE 'Upcoming'
    END AS deadline_status
FROM assignments a
LEFT JOIN courses c
ON a.course_id = c.course_id;