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

// Add course
const courseForm = document.getElementById("courseForm");

courseForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const courseName = document.getElementById("courseName").value;

    const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            course_name: courseName
        })
    });

    const data = await response.json();

    if (data.success) {
        alert("Course added successfully.");
        courseForm.reset();

        // Reload course list after adding a new course
        loadCourses();
    } else {
        alert(data.message);
    }
});

// Load courses and display them on the page
async function loadCourses() {
    const response = await fetch("/api/courses", {
        method: "GET",
        credentials: "include"
    });

    const data = await response.json();

    const courseList = document.getElementById("courseList");

    if (!data.success) {
        courseList.innerHTML = `
            <div class="alert alert-danger">
                ${data.message}
            </div>
        `;
        return;
    }

    if (data.courses.length === 0) {
        courseList.innerHTML = `
            <p class="text-muted">No courses found. Please add your first course.</p>
        `;
        return;
    }

    courseList.innerHTML = "";

    data.courses.forEach(function (course) {
        courseList.innerHTML += `
            <div class="card shadow-sm p-3 mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-1">${course.course_name}</h5>
                    </div>

                    <button class="btn btn-warning btn-sm"
                        onclick="openEditCourseModal(${course.course_id}, '${escapeString(course.course_name)}')">
                        Edit
                    </button>
                </div>
            </div>
        `;
    });
}

// Open edit modal and fill old course data
function openEditCourseModal(courseId, courseName) {
    document.getElementById("editCourseId").value = courseId;
    document.getElementById("editCourseName").value = courseName;

    const editModal = new bootstrap.Modal(document.getElementById("editCourseModal"));
    editModal.show();
}

// Edit course form submit
const editCourseForm = document.getElementById("editCourseForm");

editCourseForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const courseId = document.getElementById("editCourseId").value;
    const courseName = document.getElementById("editCourseName").value;

    const response = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            course_name: courseName
        })
    });

    const data = await response.json();

    if (data.success) {
        alert("Course updated successfully.");

        const modalElement = document.getElementById("editCourseModal");
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();

        // Reload course list after editing
        loadCourses();
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

// Prevent quotation marks from breaking onclick string
function escapeString(value) {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;");
}