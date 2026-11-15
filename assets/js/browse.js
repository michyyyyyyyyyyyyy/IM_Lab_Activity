/**
 * FINDIT – Browse, details, reports, claims, and admin tables.
 * Filtering uses in-memory sample data only.
 */

function currentFilters() {
  return {
    q: document.getElementById("filter-q")?.value.trim().toLowerCase() || "",
    type: document.getElementById("filter-type")?.value || "all",
    category: document.getElementById("filter-category")?.value || "all",
    date: document.getElementById("filter-date")?.value || "",
    sort: document.getElementById("filter-sort")?.value || "newest",
  };
}

function filteredItems(extra = {}) {
  const filters = { ...currentFilters(), ...extra };
  let rows = FindItData.items.filter((item) => {
    const haystack = `${item.name} ${item.location} ${item.category}`.toLowerCase();
    const matchesQuery = !filters.q || haystack.includes(filters.q);
    const matchesType = filters.type === "all" || item.type === filters.type;
    const matchesCategory = filters.category === "all" || item.category === filters.category;
    const matchesDate = !filters.date || item.date === filters.date;
    const matchesOwner = !filters.ownerId || item.ownerId === filters.ownerId;
    return matchesQuery && matchesType && matchesCategory && matchesDate && matchesOwner;
  });

  rows.sort((a, b) =>
    filters.sort === "oldest" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
  );
  return rows;
}

function fillCategorySelects() {
  document.querySelectorAll("[data-category-select]").forEach((select) => {
    const keepFirst = select.querySelector("option");
    FindItData.categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });
    if (keepFirst) select.prepend(keepFirst);
  });
}

function fillLocationSelects() {
  document.querySelectorAll("[data-location-select]").forEach((select) => {
    const keepFirst = select.querySelector("option");
    FindItData.locations.forEach((location) => {
      const option = document.createElement("option");
      option.value = location;
      option.textContent = location;
      select.appendChild(option);
    });
    if (keepFirst) select.prepend(keepFirst);
  });
}

function initBrowse() {
  const grid = document.getElementById("browse-grid");
  if (!grid) return;

  const render = () => {
    const items = filteredItems();
    const empty = document.getElementById("browse-empty");
    if (!items.length) {
      grid.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    grid.innerHTML = items.map((item) => itemCard(item)).join("");
    FindIt.refreshIcons();
  };

  ["filter-q", "filter-type", "filter-category", "filter-date", "filter-sort"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", render);
    document.getElementById(id)?.addEventListener("change", render);
  });
  render();
}

function initItemDetails() {
  const root = document.getElementById("item-details");
  if (!root) return;
  const id = new URLSearchParams(location.search).get("id") || "ITM-1042";
  const item = FindIt.itemById(id);
  if (!item) {
    root.innerHTML = `<div class="empty-state card"><i data-lucide="search-x"></i><h2>Item not found</h2><p>This report is unavailable.</p><a class="btn btn-primary" href="browse.html">Back to browse</a></div>`;
    FindIt.refreshIcons();
    return;
  }

  const safeDescription =
    item.type === "found"
      ? item.description
      : item.description;
  const withheld =
    item.type === "found"
      ? `<p class="notice">Identifying marks and owner details are withheld until a claim is verified. Describe unique features when you submit a claim.</p>`
      : "";

  root.innerHTML = `
    ${FindIt.photoMarkup(item, "details-photo")}
    <div>
      <div class="item-card__meta" style="margin-bottom:12px">${FindIt.badge(item.type)} ${FindIt.badge(item.status)}</div>
      <h1>${item.name}</h1>
      <p>${safeDescription}</p>
      <div class="list-row"><span>Category</span><strong>${item.category}</strong></div>
      <div class="list-row"><span>Date reported</span><strong>${FindIt.formatDate(item.date)}</strong></div>
      <div class="list-row"><span>Location</span><strong>${item.location}</strong></div>
      <div class="list-row"><span>Report ID</span><strong>${item.id}</strong></div>
      ${withheld}
      <div class="hero__actions" style="margin-top:20px">
        ${
          item.type === "found" && item.status !== "returned"
            ? `<button class="btn btn-primary" id="claim-btn"><i data-lucide="hand"></i> Submit Claim</button>`
            : `<a class="btn btn-secondary" href="browse.html">Browse similar items</a>`
        }
        <a class="btn btn-ghost" href="browse.html">Back</a>
      </div>
    </div>
  `;

  document.getElementById("claim-btn")?.addEventListener("click", () => {
    if (!FindIt.getSession()) {
      FindIt.toast("Please log in to submit a claim.");
      window.location.href = "login.html";
      return;
    }
    FindIt.openModal("claim-modal");
  });

  document.getElementById("claim-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const note = event.target.note.value.trim();
    if (note.length < 12) {
      FindIt.toast("Please add more detail so staff can verify ownership.", "error");
      return;
    }
    FindIt.closeModal("claim-modal");
    FindIt.toast("Claim submitted for review.", "success");
  });
  FindIt.refreshIcons();
}

function initMyReports() {
  const list = document.getElementById("my-reports-list");
  if (!list) return;
  const session = FindIt.getSession();
  let type = "lost";

  const render = () => {
    const rows = FindItData.items.filter(
      (item) => item.ownerId === "user" && item.type === type
    );
    if (!rows.length) {
      list.innerHTML = `<div class="empty-state"><i data-lucide="inbox"></i><h3>No ${type} reports yet</h3><p>When you submit a report, it will appear here.</p></div>`;
      FindIt.refreshIcons();
      return;
    }
    list.innerHTML = rows
      .map(
        (item) => `
        <div class="list-row">
          <div>
            <strong>${item.name}</strong>
            <div class="item-card__meta">${item.location} · ${FindIt.formatDate(item.date)}</div>
          </div>
          <div class="actions">
            ${FindIt.badge(item.status)}
            <a class="btn btn-sm btn-secondary" href="item-details.html?id=${item.id}">View</a>
            <button class="btn btn-sm btn-ghost" data-edit="${item.id}">Edit</button>
            <button class="btn btn-sm btn-ghost" data-delete="${item.id}">Delete</button>
          </div>
        </div>`
      )
      .join("");
  };

  document.querySelectorAll("[data-report-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-report-tab]").forEach((el) => el.classList.remove("is-active"));
      tab.classList.add("is-active");
      type = tab.dataset.reportTab;
      render();
    });
  });

  list.addEventListener("click", (event) => {
    const editId = event.target.closest("[data-edit]")?.dataset.edit;
    const deleteId = event.target.closest("[data-delete]")?.dataset.delete;
    if (editId) FindIt.toast("Edit will connect to PHP later.");
    if (deleteId) {
      window._pendingDelete = deleteId;
      FindIt.openModal("delete-modal");
    }
  });

  document.getElementById("confirm-delete")?.addEventListener("click", () => {
    FindIt.closeModal("delete-modal");
    FindIt.toast("Delete is a placeholder until the backend is connected.");
  });

  if (!session) {
    /* Preview still renders sample user reports. */
  }
  render();
}

function initClaimsPage() {
  const host = document.getElementById("claims-list");
  if (!host) return;
  const session = FindIt.getSession();
  const rows = FindItData.claims.filter((claim) => !session || claim.email === session.email || session.role === "admin");
  const mine = session?.role === "admin" ? FindItData.claims : FindItData.claims.filter((c) => c.claimant === "Alex Rivera");

  host.innerHTML = mine
    .map((claim) => {
      const item = FindIt.itemById(claim.itemId);
      return `
        <article class="card panel">
          <div class="panel__head">
            <div>
              <h3>${item?.name || "Unknown item"}</h3>
              <div class="item-card__meta">${claim.id} · Submitted ${FindIt.formatDate(claim.date)}</div>
            </div>
            ${FindIt.badge(claim.status)}
          </div>
          <p>${claim.note}</p>
          <button class="btn btn-secondary btn-sm" data-view-claim="${claim.id}">View claim details</button>
        </article>`;
    })
    .join("");

  host.addEventListener("click", (event) => {
    const id = event.target.closest("[data-view-claim]")?.dataset.viewClaim;
    if (!id) return;
    const claim = FindItData.claims.find((row) => row.id === id);
    const item = FindIt.itemById(claim.itemId);
    document.getElementById("claim-detail-body").innerHTML = `
      <p><strong>${item.name}</strong> (${claim.id})</p>
      <p>Status: ${claim.status}</p>
      <p>${claim.note}</p>
    `;
    FindIt.openModal("claim-detail-modal");
  });
}

function initAdminItems() {
  const body = document.getElementById("admin-items-body");
  if (!body) return;

  const render = () => {
    const rows = filteredItems();
    body.innerHTML = rows
      .map(
        (item) => `
        <tr>
          <td>${item.id}</td>
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td>${FindIt.badge(item.type)}</td>
          <td>${FindIt.formatDate(item.date)}</td>
          <td>${FindIt.badge(item.status)}</td>
          <td class="actions">
            <a class="btn btn-sm btn-secondary" href="item-details.html?id=${item.id}">View</a>
            <button class="btn btn-sm btn-ghost" data-edit="${item.id}">Edit</button>
            <button class="btn btn-sm btn-ghost" data-delete="${item.id}">Delete</button>
          </td>
        </tr>`
      )
      .join("");
  };

  ["filter-q", "filter-type", "filter-category"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", render);
    document.getElementById(id)?.addEventListener("change", render);
  });

  body.addEventListener("click", (event) => {
    if (event.target.closest("[data-edit]")) FindIt.toast("Edit form will be wired to PHP.");
    const id = event.target.closest("[data-delete]")?.dataset.delete;
    if (id) {
      window._pendingDelete = id;
      FindIt.openModal("delete-modal");
    }
  });

  document.getElementById("confirm-delete")?.addEventListener("click", () => {
    FindIt.closeModal("delete-modal");
    FindIt.toast("Deletion confirmed in the UI only. No database record was changed.", "success");
  });
  render();
}

function initAdminClaims() {
  const body = document.getElementById("admin-claims-body");
  if (!body) return;

  body.innerHTML = FindItData.claims
    .map((claim) => {
      const item = FindIt.itemById(claim.itemId);
      const pending = claim.status === "pending";
      return `
        <tr>
          <td>${claim.id}</td>
          <td>${claim.claimant}<div class="hint">${claim.studentId}</div></td>
          <td>${item?.name || claim.itemId}</td>
          <td>${FindIt.formatDate(claim.date)}</td>
          <td>${FindIt.badge(claim.status)}</td>
          <td class="actions">
            <button class="btn btn-sm btn-success" ${pending ? "" : "disabled"} data-approve="${claim.id}">Approve</button>
            <button class="btn btn-sm btn-danger" ${pending ? "" : "disabled"} data-reject="${claim.id}">Reject</button>
          </td>
        </tr>`;
    })
    .join("");

  let pendingAction = null;
  body.addEventListener("click", (event) => {
    const approve = event.target.closest("[data-approve]")?.dataset.approve;
    const reject = event.target.closest("[data-reject]")?.dataset.reject;
    if (!approve && !reject) return;
    pendingAction = { id: approve || reject, type: approve ? "approve" : "reject" };
    document.getElementById("claim-action-text").textContent =
      pendingAction.type === "approve"
        ? "Approve this claim and notify the claimant?"
        : "Reject this claim? The claimant will be notified.";
    FindIt.openModal("claim-action-modal");
  });

  document.getElementById("confirm-claim-action")?.addEventListener("click", () => {
    FindIt.closeModal("claim-action-modal");
    FindIt.toast(
      pendingAction?.type === "approve" ? "Claim approved (preview only)." : "Claim rejected (preview only).",
      "success"
    );
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fillCategorySelects();
  fillLocationSelects();
  initBrowse();
  initItemDetails();
  initMyReports();
  initClaimsPage();
  initAdminItems();
  initAdminClaims();
});
