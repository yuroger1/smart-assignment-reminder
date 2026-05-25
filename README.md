# Smart Assignment Reminder

## Project Description

Smart Assignment Reminder is a dynamic full-stack web application designed to help university students manage assignments, courses, deadlines, and reminders in one centralized dashboard.

Students often take multiple courses at the same time, and each course may have different homework, reports, quizzes, lab tasks, and project deadlines. This system helps students organize academic tasks, track due dates, and avoid missing important assignments.

This project is not a static website. It includes user authentication, database integration, backend APIs, CRUD operations, search and filter features, and a reminder system.

---

## Deployment

### Live Website

```text
https://smart-assignment-reminder-production.up.railway.app
```

### Test API

```text
https://smart-assignment-reminder-production.up.railway.app/api/test
```

Expected response:

```json
{
  "message": "Backend is working!"
}
```

---

## GitHub Repository

```text
https://github.com/yuroger1/smart-assignment-reminder
```

---

## Target Users

The target users are university students who need to manage coursework from multiple classes.

Common problems this project solves:

- Forgetting assignment deadlines
- Managing assignments from several courses
- Tracking overdue tasks
- Organizing tasks by course
- Viewing all academic tasks in one dashboard
- Receiving reminders for upcoming or overdue assignments

---

## Main Features

### 1. User Authentication

Users can:

- Register an account
- Log in with email and password
- Log out
- Access protected pages only after login

Passwords are hashed using `bcrypt`, and login sessions are managed using `express-session`.

---

### 2. Dashboard

The dashboard displays:

- Total assignments
- Due soon assignments
- Overdue assignments
- Completed assignments
- Reminder section
- Assignment list
- Search and filter tools
- Quick action buttons

The dashboard dynamically loads data from the MySQL database through Express API routes.

---

### 3. Assignment Management

Users can perform full CRUD operations for assignments.

Assignment functions:

- Add assignment
- View assignment list
- Edit assignment
- Mark assignment as completed
- Delete assignment

Assignment fields:

- Assignment title
- Course
- Description
- Due date
- Priority
- Status

The default assignment sorting is by due date, so the nearest deadlines appear first.

---

### 4. Course Management

Users can manage their own courses.

Course functions:

- Add course
- View course list
- Edit course name
- Delete course

The course system does not require an instructor field. If a course is deleted, assignments connected to that course remain in the system and become “No Course”.

---

### 5. Search and Filter

Users can search and filter assignments dynamically.

Search and filter options:

- Search by assignment title
- Filter by course
- Filter by status
- Sort by due date

The frontend sends query parameters to the backend, and the backend retrieves matching data from MySQL using parameterized SQL queries.

---

### 6. Reminder System

The system includes an in-app reminder section.

Reminder types:

- Overdue
- Due Today
- Due Soon

The reminder section uses emojis instead of colored bars to avoid confusion with assignment priority colors.

Emoji meanings:

| Emoji | Meaning |
|:---|:---|
| ❗ | Overdue |
| ⚠️ | Due Today |
| ⏰ | Due Soon |

Completed assignments do not appear in the reminder section.

---

### 7. GMT+8 Time Display

The system uses GMT+8 / Asia Taipei time for assignment deadlines and reminders.

Date and time are displayed in this format:

```text
YYYY-MM-DD HR:MIN AM/PM
```

Example:

```text
2026-05-19 03:00 AM
```

---

### 8. Homepage Design

The homepage includes:

- Modern landing page layout
- Background image
- Navigation bar
- Project title
- Short project description
- Login and sign-up buttons
- Key features section

---

## Technology Stack

| Layer | Technology |
|:---|:---|
| Frontend | HTML5, CSS3, JavaScript, Bootstrap |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Authentication | bcrypt, express-session |
| API Communication | Fetch API |
| Deployment | Railway |
| Version Control | Git, GitHub |

---

## Project Structure

```text
smart-assignment-reminder/
│
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   ├── package-lock.json
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── assignmentRoutes.js
│   │   ├── courseRoutes.js
│   │   └── notificationRoutes.js
│   │
│   └── middleware/
│       └── authMiddleware.js
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── add-assignment.html
│   ├── add-course.html
│   │
│   ├── css/
│   │   └── style.css
│   │
│   ├── js/
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── add-assignment.js
│   │   └── add-course.js
│   │
│   └── images/
│       ├── homepage-bg.png
│       └── logo.png
│
├── database/
│   ├── schema.sql
│   └── schema_railway.sql
│
├── screenshots/
│   ├── homepage.png
│   ├── dashboard.png
│   ├── add-assignment.png
│   └── add-course.png
│
├── README.md
├── .gitignore
├── .env.example
└── package.json
```

---

## Database Design

The project uses a MySQL database.

Main database tables:

| Table | Purpose |
|:---|:---|
| users | Stores registered user accounts |
| courses | Stores user-created courses |
| assignments | Stores assignment details and deadlines |
| notifications | Stores optional reminder data |
| assignment_overview | Optional view for assignment display |

---

## Database Schema

```sql
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_courses_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

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

CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    assignment_id INT,
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
```

---

## API Endpoints

### Authentication APIs

| Method | Endpoint | Description |
|:---|:---|:---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Log in user |
| POST | `/api/auth/logout` | Log out user |
| GET | `/api/auth/me` | Get current logged-in user |

---

### Assignment APIs

| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/api/assignments` | Get all assignments |
| GET | `/api/assignments/:id` | Get one assignment |
| POST | `/api/assignments` | Add assignment |
| PUT | `/api/assignments/:id` | Edit assignment |
| PATCH | `/api/assignments/:id/complete` | Mark assignment as completed |
| DELETE | `/api/assignments/:id` | Delete assignment |

---

### Course APIs

| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/api/courses` | Get all courses |
| POST | `/api/courses` | Add course |
| PUT | `/api/courses/:id` | Edit course |
| DELETE | `/api/courses/:id` | Delete course |

---

### Notification APIs

| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/api/notifications` | Get due soon and overdue reminders |

---

## Dynamic Features

This project includes:

- User registration and login
- Session-based authentication
- Dynamic dashboard
- Assignment CRUD
- Course CRUD
- Search and filter
- Reminder system
- Due soon and overdue classification
- GMT+8 deadline display
- Frontend and backend communication
- MySQL database integration
- Online deployment

---

## How to Run Locally

### 1. Prerequisites

Install:

- Node.js
- npm
- MySQL
- Git

Check versions:

```bash
node -v
npm -v
```

---

### 2. Clone the Repository

```bash
git clone https://github.com/yuroger1/smart-assignment-reminder.git
cd smart-assignment-reminder
```

---

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

For Windows PowerShell:

```bash
npm.cmd install
```

---

### 4. Create MySQL Database

Open MySQL Workbench or MySQL command line and run:

```sql
CREATE DATABASE smart_assignment_reminder;
```

Then import:

```text
database/schema.sql
```

---

### 5. Create `.env` File

Inside the `backend/` folder, create a `.env` file:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=smart_assignment_reminder
PORT=3000
SESSION_SECRET=smart_assignment_secret
TZ=Asia/Taipei
```

Do not upload `.env` to GitHub.

---

### 6. Run the Server

Inside the `backend/` folder:

```bash
npm run dev
```

For Windows PowerShell:

```bash
npm.cmd run dev
```

If successful:

```text
Server is running on http://localhost:3000
```

---

### 7. Open the Website

```text
http://localhost:3000/index.html
```

---

## How to Use the Website

### 1. Register

Create a new user account.

### 2. Login

Log in using email and password.

### 3. Add Courses

Go to the Add Course page and create courses.

### 4. Add Assignments

Go to the Add Assignment page and create assignments.

### 5. Use Dashboard

The dashboard allows users to:

- View all assignments
- See due soon reminders
- See overdue reminders
- Mark assignments as completed
- Edit assignments
- Delete assignments
- Search and filter assignments

---

## Railway Deployment Setup

### Required Railway Web Service Variables

```env
NODE_ENV=production
TZ=Asia/Taipei
SESSION_SECRET=smart_assignment_reminder_secret_2026

DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=smart_assignment_reminder
```

---

### Railway Build Command

```bash
npm install --prefix backend
```

---

### Railway Start Command

```bash
npm start --prefix backend
```

---

### Root `package.json`

```json
{
  "name": "smart-assignment-reminder",
  "version": "1.0.0",
  "description": "A dynamic web application for students to manage assignments and deadlines.",
  "scripts": {
    "build": "npm install --prefix backend",
    "start": "npm start --prefix backend",
    "dev": "npm run dev --prefix backend"
  },
  "engines": {
    "node": ">=20"
  }
}
```

---

## Security Notes

This project includes basic security practices:

- Passwords are hashed using bcrypt
- Sessions are managed using express-session
- Protected routes require login
- SQL queries use parameterized queries
- Users can only access their own courses and assignments
- `.env` files are excluded from GitHub

---

## Known Notes

The project currently uses the default `MemoryStore` from `express-session`. This is acceptable for a course project demo. In a real production system, this should be replaced with a persistent session store such as Redis or MySQL session storage.

---

## Future Improvements

Possible future improvements:

- Email reminder notifications
- Google Calendar synchronization
- Push notifications
- Reminder settings page
- File upload for assignment instructions
- Dark mode
- Mobile layout improvements
- Assignment charts and statistics
- More advanced priority system

---

## Team Members

| Name | Student ID |
| :---| :---|
| Jacky | D1365097 |
| Roger | D1365109 |

---

## Project Status

Current version includes:

- Functional frontend
- Functional backend
- Railway deployment
- MySQL database integration
- User authentication
- Assignment CRUD
- Course CRUD
- Search and filter
- In-app reminder system
- Dynamic dashboard
- Modern homepage UI

This project is a real functional web application, not a static website.
