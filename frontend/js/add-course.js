document.addEventListener("DOMContentLoaded", function () {
    checkLogin();
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