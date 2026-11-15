/**
 * FINDIT – Login and registration validation.
 * Frontend-only. Connect these handlers to PHP later.
 */

function showError(input, message) {
  input.classList.add("is-invalid");
  const error = input.closest(".form-group")?.querySelector(".field-error");
  if (error) {
    error.textContent = message;
    error.classList.add("is-visible");
  }
}

function clearError(input) {
  input.classList.remove("is-invalid");
  input.closest(".form-group")?.querySelector(".field-error")?.classList.remove("is-visible");
}

function bindPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      const hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      btn.setAttribute("aria-label", hidden ? "Hide password" : "Show password");
      FindIt.refreshIcons();
    });
  });
}

function initLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const identifier = form.identifier;
    const password = form.password;
    let valid = true;

    [identifier, password].forEach(clearError);

    if (!identifier.value.trim()) {
      showError(identifier, "Enter your email or student ID.");
      valid = false;
    }
    if (!password.value.trim()) {
      showError(password, "Enter your password.");
      valid = false;
    } else if (password.value.length < 6) {
      showError(password, "Password must be at least 6 characters.");
      valid = false;
    }

    if (!valid) return;

    const value = identifier.value.trim().toLowerCase();
    const isAdmin = value.includes("admin");
    FindIt.setSession({
      name: isAdmin ? "HCDC Admin" : "Alex Rivera",
      email: value.includes("@") ? value : "alex.rivera@hcdc.edu.ph",
      studentId: isAdmin ? "STAFF-01" : "2024-11820",
      role: isAdmin ? "admin" : "user",
    });

    FindIt.toast("Welcome back.", "success");
    window.location.href = isAdmin ? "admin.html" : "dashboard.html";
  });
}

function initRegister() {
  const form = document.getElementById("register-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = ["fullName", "studentId", "email", "password", "confirmPassword"];
    let valid = true;
    fields.forEach((name) => clearError(form[name]));

    if (form.fullName.value.trim().length < 3) {
      showError(form.fullName, "Please enter your full name.");
      valid = false;
    }
    if (!/^[A-Za-z0-9-]{4,}$/.test(form.studentId.value.trim())) {
      showError(form.studentId, "Enter a valid student ID.");
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim())) {
      showError(form.email, "Enter a valid HCDC email address.");
      valid = false;
    }
    if (form.password.value.length < 8) {
      showError(form.password, "Use at least 8 characters.");
      valid = false;
    }
    if (form.confirmPassword.value !== form.password.value) {
      showError(form.confirmPassword, "Passwords do not match.");
      valid = false;
    }

    if (!valid) return;

    FindIt.setSession({
      name: form.fullName.value.trim(),
      email: form.email.value.trim(),
      studentId: form.studentId.value.trim(),
      role: "user",
    });
    FindIt.toast("Account created. You can now use FINDIT.", "success");
    window.location.href = "dashboard.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindPasswordToggles();
  initLogin();
  initRegister();
});
