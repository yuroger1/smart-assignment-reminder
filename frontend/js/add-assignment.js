document.addEventListener("DOMContentLoaded", function () {
    checkLogin();
    loadCourses();
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

// Load courses into assignment course dropdown
async function loadCourses() {
    const response = await fetch("/api/courses", {
        method: "GET",
        credentials: "include"
    });

    const data = await response.json();

    const courseSelect = document.getElementById("assignmentCourse");
    courseSelect.innerHTML = `<option value="">No Course</option>`;

    if (data.success) {
        data.courses.forEach(function (course) {
            courseSelect.innerHTML += `
                <option value="${course.course_id}">
                    ${course.course_name}
                </option>
            `;
        });
    }
}

// Add assignment
const assignmentForm = document.getElementById("assignmentForm");

assignmentForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const courseId = document.getElementById("assignmentCourse").value;
    const title = document.getElementById("assignmentTitle").value;
    const description = document.getElementById("assignmentDescription").value;

    // Convert datetime-local format to MySQL DATETIME format
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
        window.location.href = "dashboard.html";
    } else {
        alert(data.message);
    }
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