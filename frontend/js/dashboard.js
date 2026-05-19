// When dashboard page loads, run these functions
document.addEventListener("DOMContentLoaded", async function () {
    await checkLogin();
    await loadCourses();
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

// Load courses for Edit Assignment modal and Course Filter
async function loadCourses() {
    try {
        const response = await fetch("/api/courses", {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();

        if (!data.success) {
            console.error("Failed to load courses:", data.message);
            return;
        }

        // Course dropdown in Edit Assignment modal
        const editCourseSelect = document.getElementById("editAssignmentCourse");

        if (editCourseSelect) {
            editCourseSelect.innerHTML = `<option value="">No Course</option>`;
        }

        // Course filter in Dashboard, if you have it
        const courseFilter = document.getElementById("courseFilter");

        if (courseFilter) {
            courseFilter.innerHTML = `<option value="">All Courses</option>`;
        }

        data.courses.forEach(function (course) {
            const option = `
                <option value="${course.course_id}">
                    ${course.course_name}
                </option>
            `;

            if (editCourseSelect) {
                editCourseSelect.innerHTML += option;
            }

            if (courseFilter) {
                courseFilter.innerHTML += option;
            }
        });

    } catch (error) {
        console.error("Load courses error:", error);
    }
}

// Load assignments from backend
async function loadAssignments() {
    try {
        const search = document.getElementById("searchInput")?.value || "";
        const courseId = document.getElementById("courseFilter")?.value || "";
        const status = document.getElementById("statusFilter")?.value || "";
        const sort = document.getElementById("sortSelect")?.value || "";

        const params = new URLSearchParams();

        if (search) {
            params.append("search", search);
        }
        
        if (courseId) {
            params.append("course_id", courseId);
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
                <button class="btn btn-success btn-sm"
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

                    <div class="assignment-actions">
                        ${completeButton}

                        <button class="btn btn-warning btn-sm"
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
            <p class="text-muted mb-0">No reminders available.</p>
        `;
        return;
    }

    if (data.notifications.length === 0) {
        notificationList.innerHTML = `
            <p class="text-muted mb-0">No due soon or overdue assignments.</p>
        `;
        return;
    }

    notificationList.innerHTML = "";

    data.notifications.forEach(function (notification) {
        const displayStatus = getDueText(
            notification.due_date,
            notification.notification_type
        );

        const emoji = getReminderEmoji(
            notification.due_date,
            notification.notification_type
        );

        notificationList.innerHTML += `
            <div class="reminder-card">
                <div class="reminder-emoji">${emoji}</div>

                <div class="reminder-content">
                    <div class="reminder-card-title">
                        ${notification.title}
                    </div>

                    <div class="reminder-card-time">
                        (${displayStatus})
                    </div>
                </div>
            </div>
        `;
    });
}

// Filter button
document.getElementById("filterBtn").addEventListener("click", function () {
    loadAssignments();
});

document.getElementById("resetFilterBtn").addEventListener("click", function () {
    document.getElementById("searchInput").value = "";
    document.getElementById("courseFilter").value = "";
    document.getElementById("statusFilter").value = "";
    document.getElementById("sortSelect").value = "due_date";

    loadAssignments();
});

document.getElementById("searchInput").addEventListener("input", function () {
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

// Format MySQL DATETIME string as GMT+8 display time
function formatDate(dateString) {
    if (!dateString) {
        return "";
    }

    // If backend returns "2026-05-20 16:00:00"
    if (typeof dateString === "string" && dateString.includes(" ")) {
        const [datePart, timePart] = dateString.split(" ");
        const time = timePart ? timePart.slice(0, 5) : "";

        return `${datePart} ${time} GMT+8`;
    }

    // Fallback for ISO date strings
    const date = new Date(dateString);

    return date.toLocaleString("en-US", {
        timeZone: "Asia/Taipei",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }) + " GMT+8";
}

// Parse MySQL DATETIME as GMT+8 time
function parseGMT8Date(dateString) {
    if (!dateString) {
        return null;
    }

    // If backend returns "2026-05-20 16:00:00",
    // treat it as GMT+8 by adding "+08:00"
    if (typeof dateString === "string" && dateString.includes(" ")) {
        return new Date(dateString.replace(" ", "T") + "+08:00");
    }

    return new Date(dateString);
}

// Get current GMT+8 time
function getNowGMT8() {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
}

// Convert due date into short reminder text
function getDueText(dueDateString, notificationType) {
    const now = getNowGMT8();
    const dueDate = parseGMT8Date(dueDateString);

    const differenceMs = dueDate - now;
    const differenceHours = Math.ceil(differenceMs / (1000 * 60 * 60));
    const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));

    if (notificationType === "Overdue" || differenceMs < 0) {
        return "OVERDUE";
    }

    if (differenceHours <= 24) {
        return "Due Today";
    }

    if (differenceDays === 1) {
        return "Due Tomorrow";
    }

    return `Due ${differenceDays} Days`;
}

function getReminderEmoji(dueDateString, notificationType) {
    const now = getNowGMT8();
    const dueDate = parseGMT8Date(dueDateString);

    const differenceMs = dueDate - now;
    const differenceHours = Math.ceil(differenceMs / (1000 * 60 * 60));

    if (notificationType === "Overdue" || differenceMs < 0) {
        return "⚠️";
    }

    if (differenceHours <= 24) {
        return "📅";
    }

    return "⏰";
}

function convertToMySQLDateTime(dateTimeLocalValue) {
    return dateTimeLocalValue.replace("T", " ") + ":00";
}

// Convert MySQL DATETIME to datetime-local input format
function convertToDateTimeLocal(dateString) {
    if (!dateString) {
        return "";
    }

    // If backend returns "2026-05-20 16:00:00"
    if (typeof dateString === "string" && dateString.includes(" ")) {
        return dateString.replace(" ", "T").slice(0, 16);
    }

    // Fallback for ISO date strings
    const date = new Date(dateString);

    const taipeiDate = new Date(
        date.toLocaleString("en-US", { timeZone: "Asia/Taipei" })
    );

    const year = taipeiDate.getFullYear();
    const month = String(taipeiDate.getMonth() + 1).padStart(2, "0");
    const day = String(taipeiDate.getDate()).padStart(2, "0");
    const hours = String(taipeiDate.getHours()).padStart(2, "0");
    const minutes = String(taipeiDate.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function openEditModal(assignmentId) {
    // Make sure course options are loaded before setting selected value
    await loadCourses();

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

    const editCourseSelect = document.getElementById("editAssignmentCourse");

    if (assignment.course_id) {
        editCourseSelect.value = assignment.course_id;
    } else {
        editCourseSelect.value = "";
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