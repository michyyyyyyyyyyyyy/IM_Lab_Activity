/**
 * FINDIT – Report form validation and create via PHP API.
 */

function initReportForm() {
  const form = document.getElementById("report-form");
  if (!form) return;

  const preview = document.getElementById("photo-preview");
  const previewImage = preview.querySelector("img");
  let previewUrl = null;

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
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    previewImage.src = previewUrl;
    preview.classList.add("is-visible");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!FindIt.getSession()) {
      FindIt.toast("Please log in before submitting a report.", "error");
      window.location.href = "login.html";
      return;
    }

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

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;

    const data = new FormData(form);

    try {
      const result = await FindItAPI.createItem(data);
      FindIt.toast(result.message || "Report submitted.", "success");
      form.reset();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
      }
      preview.classList.remove("is-visible");
      setTimeout(() => {
        const item = result?.data?.item;
        const itemId = item?.item_id ?? item?.id;
        if (itemId === undefined || itemId === null || itemId === "") {
          FindIt.toast("Report submitted, but its details could not be opened.", "error");
          window.location.href = "my-reports.html";
          return;
        }
        window.location.href = `item-details.html?id=${encodeURIComponent(itemId)}`;
      }, 700);
    } catch (error) {
      FindIt.applyFieldErrors(form, error.errors || {});
      FindIt.toast(error.message || "Could not submit report.", "error");
      submitBtn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", initReportForm);
