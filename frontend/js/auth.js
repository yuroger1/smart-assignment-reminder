// Register form
const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById("registerName").value;
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;

        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                name: name,
                email: email,
                password: password
            })
        });

        const data = await response.json();

        const messageBox = document.getElementById("registerMessage");

        if (data.success) {
            messageBox.innerHTML = `
                <div class="alert alert-success">
                    Registration successful. Redirecting to login page...
                </div>
            `;

            setTimeout(function () {
                window.location.href = "login.html";
            }, 1000);
        } else {
            messageBox.innerHTML = `
                <div class="alert alert-danger">
                    ${data.message}
                </div>
            `;
        }
    });
}

// Login form
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        const messageBox = document.getElementById("loginMessage");

        if (data.success) {
            messageBox.innerHTML = `
                <div class="alert alert-success">
                    Login successful. Redirecting to dashboard...
                </div>
            `;

            setTimeout(function () {
                window.location.href = "dashboard.html";
            }, 1000);
        } else {
            messageBox.innerHTML = `
                <div class="alert alert-danger">
                    ${data.message}
                </div>
            `;
        }
    });
}