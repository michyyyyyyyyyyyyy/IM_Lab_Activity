/**
 * FINDIT – Login and registration connected to PHP auth endpoints.
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

  form.addEventListener("submit", async (event) => {
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

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;

    try {
      const result = await FindItAPI.login({
        identifier: identifier.value.trim(),
        password: password.value,
      });
      FindIt.setSession(result.data.user);
      FindIt.toast(result.message || "Welcome back.", "success");
      window.location.href = result.data.user.role === "admin" ? "admin.html" : "dashboard.html";
    } catch (error) {
      FindIt.applyFieldErrors(form, error.errors || {});
      FindIt.toast(error.message || "Login failed.", "error");
      submitBtn.disabled = false;
    }
  });
}

function initRegister() {
  const form = document.getElementById("register-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
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
    const hcdcEmail = form.email.value.trim().toLowerCase();
    if (!/^[^\s@]+@hcdc\.edu\.ph$/i.test(hcdcEmail)) {
      showError(form.email, "Use an @hcdc.edu.ph email address.");
      valid = false;
    } else {
      form.email.value = hcdcEmail;
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

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;

    try {
      const result = await FindItAPI.register({
        fullName: form.fullName.value.trim(),
        studentId: form.studentId.value.trim(),
        email: form.email.value.trim(),
        password: form.password.value,
        confirmPassword: form.confirmPassword.value,
      });
      FindIt.setSession(result.data.user);
      FindIt.toast(result.message || "Account created.", "success");
      window.location.href = "dashboard.html";
    } catch (error) {
      FindIt.applyFieldErrors(form, error.errors || {});
      FindIt.toast(error.message || "Registration failed.", "error");
      submitBtn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindPasswordToggles();
  initLogin();
  initRegister();
});
