/**
 * FINDIT – Report form validation and image preview.
 */

function initReportForm() {
  const form = document.getElementById("report-form");
  if (!form) return;

  const preview = document.getElementById("photo-preview");
  const previewImage = preview.querySelector("img");

  form.photo.addEventListener("change", () => {
    const file = form.photo.files[0];
    if (!file) {
      preview.classList.remove("is-visible");
      return;
    }
    if (!file.type.startsWith("image/")) {
      FindIt.toast("Please choose an image file.", "error");
      form.photo.value = "";
      return;
    }
    previewImage.src = URL.createObjectURL(file);
    preview.classList.add("is-visible");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const required = ["name", "category", "description", "date", "location"];
    let valid = true;

    required.forEach((field) => {
      const input = form[field];
      input.classList.remove("is-invalid");
      const error = input.closest(".form-group").querySelector(".field-error");
      error.classList.remove("is-visible");
      if (!input.value.trim()) {
        input.classList.add("is-invalid");
        error.textContent = "This field is required.";
        error.classList.add("is-visible");
        valid = false;
      }
    });

    if (form.description.value.trim().length < 20) {
      form.description.classList.add("is-invalid");
      const error = form.description.closest(".form-group").querySelector(".field-error");
      error.textContent = "Please add at least 20 characters so others can recognize the item.";
      error.classList.add("is-visible");
      valid = false;
    }

    if (!valid) {
      FindIt.toast("Please complete the highlighted fields.", "error");
      return;
    }

    FindIt.toast("Report submitted. Staff will review it shortly.", "success");
    form.reset();
    preview.classList.remove("is-visible");
  });
}

document.addEventListener("DOMContentLoaded", initReportForm);
