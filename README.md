# Smart Assignment Reminder

## Project Description

Smart Assignment Reminder is a dynamic web application designed to help university students manage assignments, courses, due dates, and reminders in one centralized dashboard.

Many students take multiple courses at the same time, and each course may have different homework, quizzes, reports, and project deadlines. This system helps students avoid missing important deadlines by allowing them to add assignments, organize them by course, track due dates, and view due-soon or overdue reminders.

This is not a static website. It is a full-stack, database-driven web application with authentication, CRUD operations, dynamic dashboard content, search/filter features, and reminder functionality.

---

## Target Users

The target users are university students who need to manage coursework across multiple courses.

Typical user problems include:

- Forgetting assignment deadlines
- Managing tasks from several courses at the same time
- Losing track of overdue assignments
- Needing a centralized dashboard for academic tasks
- Wanting a simple reminder system for upcoming deadlines

---

## Main Features

### 1. User Authentication

Users can register, log in, and log out.

Main functions:

- Register a new account
- Log in with email and password
- Store password securely using password hashing
- Maintain login session
- Prevent unauthorized users from accessing protected pages

---

### 2. Dashboard

After logging in, users can access the dashboard.

The dashboard displays:

- Total assignments
- Due soon assignments
- Overdue assignments
- Completed assignments
- Reminder section
- Assignment list
- Search and filter tools
- Quick action buttons for adding assignments and courses

---

### 3. Assignment Management

Users can manage their assignments through full CRUD operations.

Assignment functions include:

- Add assignment
- View assignment list
- Edit assignment
- Mark assignment as completed
- Delete assignment
- Assign course to assignment
- Set due date
- Set priority level

Assignment fields include:

- Assignment title
- Course
- Description
- Due date
- Priority
- Status

---

### 4. Course Management

Users can manage their own course list.

Course functions include:

- Add course
- View course list
- Edit course name
- Delete course

When a course is deleted, assignments using that course can remain in the system and become “No Course”.

---

### 5. Search and Filter

Users can search and filter assignments dynamically.

Search and filter options include:

- Search by assignment title
- Filter by course
- Filter by status
- Sort by due date

The frontend sends query parameters to the backend, and the backend retrieves matching data from the MySQL database.

---

### 6. Reminder System

The system includes an in-app reminder feature.

Reminder types:

- Due Soon
- Overdue

Reminder logic:

- If an assignment is due within the next few days, it appears as Due Soon.
- If an assignment is past its due date and not completed, it appears as Overdue.
- Completed assignments do not appear in the reminder section.

The reminder section is dynamically generated from database data.

---

### 7. Responsive Homepage

The homepage uses a modern landing page design with:

- Navigation bar
- Background image
- Main project title
- Short project description
- Login and sign-up buttons
- Key features card

---

## Technology Stack

| Layer | Technology |
|:---|:---|
| Frontend | HTML5, CSS3, JavaScript, Bootstrap |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Authentication | Express Session, bcrypt |
| API Communication | Fetch API |
| Deployment | Railway / Render / similar platform |
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
│   └── schema.sql
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

The system uses a MySQL database named:

```sql
smart_assignment_reminder
```

### Main Tables

| Table | Purpose |
|:---|:---|
| users | Stores registered user accounts |
| courses | Stores user-created courses |
| assignments | Stores assignment details and deadlines |
| notifications | Optional table for storing reminder messages |

---

## Database Schema Example

```sql
CREATE DATABASE IF NOT EXISTS smart_assignment_reminder;
USE smart_assignment_reminder;

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
| GET | `/api/assignments` | Get all assignments for current user |
| GET | `/api/assignments/:id` | Get one assignment |
| POST | `/api/assignments` | Add new assignment |
| PUT | `/api/assignments/:id` | Edit assignment |
| PATCH | `/api/assignments/:id/complete` | Mark assignment as completed |
| DELETE | `/api/assignments/:id` | Delete assignment |

---

### Course APIs

| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/api/courses` | Get all courses for current user |
| POST | `/api/courses` | Add new course |
| PUT | `/api/courses/:id` | Edit course name |
| DELETE | `/api/courses/:id` | Delete course |

---

### Notification APIs

| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/api/notifications` | Get due soon and overdue assignments |

---

## Dynamic Features

This project includes the following dynamic web application features:

- User registration and login
- User session authentication
- Dashboard with real-time database content
- Assignment CRUD operations
- Course CRUD operations
- Search and filter system
- In-app reminder system
- Dynamic due soon / overdue classification
- Frontend and backend communication through Fetch API
- MySQL database integration

---

## How to Run Locally

### 1. Prerequisites

Make sure the following tools are installed:

- Node.js
- npm
- MySQL
- Git

Check Node.js and npm:

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

If using Windows PowerShell and `npm` is blocked, use:

```bash
npm.cmd install
```

---

### 4. Create MySQL Database

Open MySQL Workbench or MySQL command line and run:

```sql
CREATE DATABASE smart_assignment_reminder;
```

Then import the SQL file:

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
SESSION_SECRET=your_session_secret
```

Example:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=smart_assignment_reminder
PORT=3000
SESSION_SECRET=smart_assignment_secret
```

Do not upload `.env` to GitHub.

---

### 6. Run the Server

Inside the `backend/` folder:

```bash
npm run dev
```

If using Windows PowerShell:

```bash
npm.cmd run dev
```

If successful, the terminal should show:

```text
Server is running on http://localhost:3000
```

---

### 7. Open the Website

Open the browser and go to:

```text
http://localhost:3000/index.html
```

---

## How to Use the Website

### 1. Register

Go to the sign-up page and create a new account.

### 2. Login

Log in with the registered email and password.

### 3. Add Courses

Go to the Add Course page and create course names.

### 4. Add Assignments

Go to the Add Assignment page and create assignments with:

- Title
- Course
- Description
- Due date
- Priority

### 5. Use Dashboard

The dashboard allows users to:

- View all assignments
- See due soon assignments
- See overdue assignments
- Mark assignments as completed
- Edit assignments
- Delete assignments
- Search and filter assignments

---

## Deployment

The project is intended to be deployed online.

Recommended deployment platform:

```text
Railway
```

Other possible platforms:

```text
Render
Vercel
Netlify
Firebase Hosting
```

Since this is a full-stack project with backend and MySQL database, Railway or Render is recommended.

---

## Deployment URL

```text
https://deployment.com
```

Replace this with the final deployed project link.

---

## GitHub Repository

```text
https://github.com/yuroger1/smart-assignment-reminder 
```

Replace this with the final GitHub repository link.

---

## Environment Variables for Deployment

Example deployment environment variables:

```env
NODE_ENV=production
SESSION_SECRET=your_production_secret
DB_HOST=your_cloud_mysql_host
DB_PORT=3306
DB_USER=your_cloud_mysql_user
DB_PASSWORD=your_cloud_mysql_password
DB_NAME=your_cloud_mysql_database
```

---

## Screenshots

### Homepage

```text
screenshots/homepage.png
```

### Dashboard

```text
screenshots/dashboard.png
```

### Add Assignment Page

```text
screenshots/add-assignment.png
```

### Add Course Page

```text
screenshots/add-course.png
```

---

## Security Notes

This project includes basic security practices:

- Passwords are hashed using bcrypt
- User sessions are handled using express-session
- Protected routes require login
- SQL queries use parameterized queries to reduce SQL injection risk
- Users can only access their own assignments and courses

---

## Future Improvements

Possible future improvements include:

- Email reminder notifications
- Google Calendar synchronization
- File upload for assignment instructions
- Reminder settings page
- Push notifications
- Dark mode
- Data visualization charts
- Mobile app version
- More advanced priority system

---

## Team Members

| Name | Student ID |
|:---|:---|
| Jacky | D1365097 |
| Roger | D1365109 |

---

## Project Status

Current version includes:

- Functional frontend
- Functional backend
- MySQL database integration
- User authentication
- Assignment CRUD
- Course CRUD
- Search and filter
- In-app reminder system
- Dynamic dashboard
- Homepage UI

This project is a real functional web application, not a static website.
