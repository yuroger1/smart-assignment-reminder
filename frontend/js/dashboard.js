// When dashboard page loads, run these functions
document.addEventListener("DOMContentLoaded", function () {
    checkLogin();
    loadCourses();
    loadAssignments();
    loadNotifications();
});

// Check whether user is logged in
async function checkLogin() {
    const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include"
    });

    const data = await response.json();

    if (!data.success) {
        window.location.href = "login.html";
        return;
    }

    document.getElementById("userName").textContent = `Hello, ${data.user.name}`;
}

// Load courses into the course dropdown
async function loadCourses() {
    const response = await fetch("/api/courses", {
        method: "GET",
        credentials: "include"
    });

    const data = await response.json();

    const courseSelect = document.getElementById("assignmentCourse");
    const editCourseSelect = document.getElementById("editAssignmentCourse");

    courseSelect.innerHTML = `<option value="">No Course</option>`;

    if (editCourseSelect) {
        editCourseSelect.innerHTML = `<option value="">No Course</option>`;
    }

    if (data.success) {
        data.courses.forEach(function (course) {
            const option = `
                <option value="${course.course_id}">
                    ${course.course_name}
                </option>
            `;

            courseSelect.innerHTML += option;

            if (editCourseSelect) {
                editCourseSelect.innerHTML += option;
            }
        });
    }
}

// Load assignments from backend
async function loadAssignments() {
    try {
        const search = document.getElementById("searchInput")?.value || "";
        const status = document.getElementById("statusFilter")?.value || "";
        const sort = document.getElementById("sortSelect")?.value || "";

        const params = new URLSearchParams();

        if (search) {
            params.append("search", search);
        }

        if (status) {
            params.append("status", status);
        }

        if (sort) {
            params.append("sort", sort);
        }

        const url = "/api/assignments?" + params.toString();

        const response = await fetch(url, {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();

        const assignmentList = document.getElementById("assignmentList");

        if (!data.success) {
            assignmentList.innerHTML = `
                <div class="alert alert-danger">
                    ${data.message}
                </div>
            `;
            return;
        }

        displayAssignments(data.assignments);
        updateSummary(data.assignments);

    } catch (error) {
        console.error("Load assignments error:", error);

        document.getElementById("assignmentList").innerHTML = `
            <div class="alert alert-danger">
                Failed to load assignments. Please check the backend server.
            </div>
        `;
    }
}

// Display assignment cards
function displayAssignments(assignments) {
    const assignmentList = document.getElementById("assignmentList");

    if (assignments.length === 0) {
        assignmentList.innerHTML = `
            <p class="text-muted">No assignments found.</p>
        `;
        return;
    }

    assignmentList.innerHTML = "";

    assignments.forEach(function (assignment) {
        const priorityClass = assignment.priority.toLowerCase();

        let statusClass = "status-upcoming";

        if (assignment.deadline_status === "Overdue") {
            statusClass = "status-overdue";
        } else if (assignment.deadline_status === "Due Soon") {
            statusClass = "status-due-soon";
        } else if (assignment.deadline_status === "Completed") {
            statusClass = "status-completed";
        }

        const completeButton = assignment.deadline_status === "Completed"
            ? ""
            : `
                <button class="btn btn-success btn-sm mb-2"
                    onclick="completeAssignment(${assignment.assignment_id})">
                    Complete
                </button>
            `;

        assignmentList.innerHTML += `
            <div class="card assignment-card ${priorityClass} shadow-sm p-3 mb-3">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5>${assignment.title}</h5>

                        <p class="mb-1">
                            <strong>Course:</strong> ${assignment.course_name || "No Course"}
                        </p>

                        <p class="mb-1">
                            <strong>Description:</strong> ${assignment.description || "No description"}
                        </p>

                        <p class="mb-1">
                            <strong>Due Date:</strong> ${formatDate(assignment.due_date)}
                        </p>

                        <p class="mb-1">
                            <strong>Priority:</strong> ${assignment.priority}
                        </p>

                        <p class="mb-1">
                            <strong>Status:</strong>
                            <span class="${statusClass}">
                                ${assignment.deadline_status}
                            </span>
                        </p>
                    </div>

                    <div>
                        ${completeButton}

                        <button class="btn btn-warning btn-sm mb-2"
                            onclick="openEditModal(${assignment.assignment_id})">
                            Edit
                        </button>

                        <button class="btn btn-danger btn-sm"
                            onclick="deleteAssignment(${assignment.assignment_id})">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

// Update summary cards
function updateSummary(assignments) {
    const total = assignments.length;

    const dueSoon = assignments.filter(function (assignment) {
        return assignment.deadline_status === "Due Soon";
    }).length;

    const overdue = assignments.filter(function (assignment) {
        return assignment.deadline_status === "Overdue";
    }).length;

    const completed = assignments.filter(function (assignment) {
        return assignment.deadline_status === "Completed";
    }).length;

    document.getElementById("totalCount").textContent = total;
    document.getElementById("dueSoonCount").textContent = dueSoon;
    document.getElementById("overdueCount").textContent = overdue;
    document.getElementById("completedCount").textContent = completed;
}
// Add assignment
const assignmentForm = document.getElementById("assignmentForm");

assignmentForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const courseId = document.getElementById("assignmentCourse").value;
    const title = document.getElementById("assignmentTitle").value;
    const description = document.getElementById("assignmentDescription").value;
    const dueDateInput = document.getElementById("assignmentDueDate").value;
    const dueDate = dueDateInput.replace("T", " ") + ":00";
    const priority = document.getElementById("assignmentPriority").value;

    const response = await fetch("/api/assignments", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            course_id: courseId || null,
            title: title,
            description: description,
            due_date: dueDate,
            priority: priority
        })
    });

    const data = await response.json();

    if (data.success) {
        alert("Assignment added successfully.");
        assignmentForm.reset();
        loadAssignments();
        loadNotifications();
    } else {
        alert(data.message);
    }
});

// Add course
const courseForm = document.getElementById("courseForm");

courseForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const courseName = document.getElementById("courseName").value;
    const instructor = document.getElementById("courseInstructor").value;

    const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            course_name: courseName,
            instructor: instructor
        })
    });

    const data = await response.json();

    if (data.success) {
        alert("Course added successfully.");
        courseForm.reset();
        loadCourses();
    } else {
        alert(data.message);
    }
});

// Complete assignment
async function completeAssignment(assignmentId) {
    const response = await fetch(`/api/assignments/${assignmentId}/complete`, {
        method: "PATCH",
        credentials: "include"
    });

    const data = await response.json();

    if (data.success) {
        loadAssignments();
        loadNotifications();
    } else {
        alert(data.message);
    }
}

// Delete assignment
async function deleteAssignment(assignmentId) {
    const confirmDelete = confirm("Are you sure you want to delete this assignment?");

    if (!confirmDelete) {
        return;
    }

    const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "DELETE",
        credentials: "include"
    });

    const data = await response.json();

    if (data.success) {
        loadAssignments();
        loadNotifications();
    } else {
        alert(data.message);
    }
}

// Load due soon and overdue reminders
async function loadNotifications() {
    const response = await fetch("/api/notifications", {
        method: "GET",
        credentials: "include"
    });

    const data = await response.json();

    const notificationList = document.getElementById("notificationList");

    if (!data.success) {
        notificationList.innerHTML = `
            <p class="text-muted">No reminders available.</p>
        `;
        return;
    }

    if (data.notifications.length === 0) {
        notificationList.innerHTML = `
            <p class="text-muted">No due soon or overdue assignments.</p>
        `;
        return;
    }

    notificationList.innerHTML = "";

    data.notifications.forEach(function (notification) {
        let alertClass = "alert-info";

        if (notification.notification_type === "Overdue") {
            alertClass = "alert-danger";
        } else if (notification.notification_type === "Due Soon") {
            alertClass = "alert-warning";
        }

        notificationList.innerHTML += `
            <div class="alert ${alertClass}">
                <strong>${notification.notification_type}:</strong>
                ${notification.title} - ${formatDate(notification.due_date)}
            </div>
        `;
    });
}

// Filter button
document.getElementById("filterBtn").addEventListener("click", function () {
    loadAssignments();
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", async function () {
    const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
    });

    const data = await response.json();

    if (data.success) {
        window.location.href = "login.html";
    }
});

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function convertToMySQLDateTime(dateTimeLocalValue) {
    return dateTimeLocalValue.replace("T", " ") + ":00";
}

function convertToDateTimeLocal(dateString) {
    const date = new Date(dateString);

    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);

    return localDate.toISOString().slice(0, 16);
}

async function openEditModal(assignmentId) {
    const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "GET",
        credentials: "include"
    });

    const data = await response.json();

    if (!data.success) {
        alert(data.message);
        return;
    }

    const assignment = data.assignment;

    document.getElementById("editAssignmentId").value = assignment.assignment_id;
    document.getElementById("editAssignmentTitle").value = assignment.title;
    document.getElementById("editAssignmentDescription").value = assignment.description || "";
    document.getElementById("editAssignmentDueDate").value = convertToDateTimeLocal(assignment.due_date);
    document.getElementById("editAssignmentPriority").value = assignment.priority;
    document.getElementById("editAssignmentStatus").value = assignment.status;

    if (assignment.course_id) {
        document.getElementById("editAssignmentCourse").value = assignment.course_id;
    } else {
        document.getElementById("editAssignmentCourse").value = "";
    }

    const editModal = new bootstrap.Modal(document.getElementById("editAssignmentModal"));
    editModal.show();
}

const editAssignmentForm = document.getElementById("editAssignmentForm");

editAssignmentForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const assignmentId = document.getElementById("editAssignmentId").value;
    const courseId = document.getElementById("editAssignmentCourse").value;
    const title = document.getElementById("editAssignmentTitle").value;
    const description = document.getElementById("editAssignmentDescription").value;

    const dueDateInput = document.getElementById("editAssignmentDueDate").value;
    const dueDate = convertToMySQLDateTime(dueDateInput);

    const priority = document.getElementById("editAssignmentPriority").value;
    const status = document.getElementById("editAssignmentStatus").value;

    const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            course_id: courseId || null,
            title: title,
            description: description,
            due_date: dueDate,
            priority: priority,
            status: status
        })
    });

    const data = await response.json();

    if (data.success) {
        alert("Assignment updated successfully.");

        const modalElement = document.getElementById("editAssignmentModal");
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();

        loadAssignments();
        loadNotifications();
    } else {
        alert(data.message);
    }
});