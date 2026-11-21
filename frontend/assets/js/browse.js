/**
 * FINDIT – Browse, details, reports, claims, and admin tables (API-backed).
 */

function currentFilters() {
  return {
    q: document.getElementById("filter-q")?.value.trim() || "",
    type: document.getElementById("filter-type")?.value || "all",
    category: document.getElementById("filter-category")?.value || "all",
    date: document.getElementById("filter-date")?.value || "",
    sort: document.getElementById("filter-sort")?.value || "newest",
  };
}

function fillCategorySelects() {
  document.querySelectorAll("[data-category-select]").forEach((select) => {
    const first = select.querySelector("option");
    select.innerHTML = "";
    if (first) select.appendChild(first);
    FindItData.categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });
  });
}

function fillLocationSelects() {
  document.querySelectorAll("[data-location-select]").forEach((select) => {
    const first = select.querySelector("option");
    select.innerHTML = "";
    if (first) select.appendChild(first);
    FindItData.locations.forEach((location) => {
      const option = document.createElement("option");
      option.value = location;
      option.textContent = location;
      select.appendChild(option);
    });
  });
}

function initBrowse() {
  const grid = document.getElementById("browse-grid");
  if (!grid) return;

  const render = async () => {
    const filters = currentFilters();
    try {
      const result = await FindItAPI.items({
        public: "1",
        q: filters.q,
        type: filters.type,
        category: filters.category,
        date: filters.date,
        sort: filters.sort,
      });
      const items = result.data.items || [];
      FindItData.items = items;
      const empty = document.getElementById("browse-empty");
      if (!items.length) {
        grid.innerHTML = "";
        empty.hidden = false;
        return;
      }
      empty.hidden = true;
      grid.innerHTML = items.map((item) => itemCard(item)).join("");
      FindIt.refreshIcons();
    } catch (error) {
      FindIt.toast(error.message || "Could not load items.", "error");
    }
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

  const params = new URLSearchParams(location.search);
  const hashId = location.hash.match(/(?:id=)?(ITM-\d+|\d+)/i)?.[1] || "";
  const id = (
    params.get("id") ||
    params.get("itemId") ||
    params.get("item_id") ||
    hashId
  ).trim();
  if (!id || !id.trim()) {
    window.location.replace("browse.html");
    return;
  }

  (async () => {
    try {
      const result = await FindItAPI.item(id);
      const item = result.data.item;
      FindItData.items = [item];

      const withheld =
        item.type === "found"
          ? `<p class="notice">Identifying marks and owner details are withheld until a claim is verified. Describe unique features when you submit a claim.</p>`
          : "";

      root.innerHTML = `
        ${FindIt.photoMarkup(item, "details-photo")}
        <div>
          <div class="item-card__meta" style="margin-bottom:12px">${FindIt.badge(item.type)} ${FindIt.badge(item.status)}</div>
          <h1>${FindIt.escapeHtml(item.name)}</h1>
          <p>${FindIt.escapeHtml(item.description || "")}</p>
          <div class="list-row"><span>Category</span><strong>${FindIt.escapeHtml(item.category)}</strong></div>
          <div class="list-row"><span>Date reported</span><strong>${FindIt.formatDate(item.date)}</strong></div>
          <div class="list-row"><span>Location</span><strong>${FindIt.escapeHtml(item.location)}</strong></div>
          <div class="list-row"><span>Report ID</span><strong>${item.id}</strong></div>
          ${withheld}
          <div class="hero__actions" style="margin-top:20px">
            ${
              item.type === "found" && !["returned", "archived"].includes(item.status)
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

      document.getElementById("claim-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const note = event.target.note.value.trim();
        if (note.length < 12) {
          FindIt.toast("Please add more detail so staff can verify ownership.", "error");
          return;
        }
        try {
          await FindItAPI.createClaim({ itemId: item.id, note });
          FindIt.closeModal("claim-modal");
          FindIt.toast("Claim submitted for review.", "success");
          event.target.reset();
        } catch (error) {
          FindIt.toast(error.message || "Could not submit claim.", "error");
        }
      });

      FindIt.refreshIcons();
    } catch (error) {
      root.innerHTML = `<div class="empty-state card"><i data-lucide="search-x"></i><h2>Item not found</h2><p>${error.message || "This report is unavailable."}</p><a class="btn btn-primary" href="browse.html">Back to browse</a></div>`;
      FindIt.refreshIcons();
    }
  })();
}

function initMyReports() {
  const list = document.getElementById("my-reports-list");
  if (!list) return;
  const session = FindIt.requireAuth();
  if (!session) return;

  let type = "lost";

  const render = async () => {
    try {
      const result = await FindItAPI.items({ mine: "1", type, sort: "newest" });
      const rows = result.data.items || [];
      if (!rows.length) {
        list.innerHTML = `<div class="empty-state"><i data-lucide="inbox"></i><h3>No ${type} reports yet</h3><p>When you submit a report, it will appear here.</p></div>`;
        FindIt.refreshIcons();
        return;
      }
      list.innerHTML = rows
        .map(
          (item) => {
            const itemId = item.item_id ?? item.id;
            return `
          <div class="list-row">
            <div>
              <strong>${FindIt.escapeHtml(item.name)}</strong>
              <div class="item-card__meta">${FindIt.escapeHtml(item.location)} · ${FindIt.formatDate(item.date)}</div>
            </div>
            <div class="actions">
              ${FindIt.badge(item.status)}
              ${itemId ? `<a class="btn btn-sm btn-secondary" href="item-details.html?id=${encodeURIComponent(itemId)}">View</a>` : ""}
              <button class="btn btn-sm btn-ghost" data-edit="${FindIt.escapeHtml(itemId)}">Edit</button>
              <button class="btn btn-sm btn-ghost" data-delete="${FindIt.escapeHtml(itemId)}">Delete</button>
            </div>
          </div>`;
          }
        )
        .join("");
      FindIt.refreshIcons();
    } catch (error) {
      FindIt.toast(error.message || "Could not load your reports.", "error");
    }
  };

  document.querySelectorAll("[data-report-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-report-tab]").forEach((el) => el.classList.remove("is-active"));
      tab.classList.add("is-active");
      type = tab.dataset.reportTab;
      render();
    });
  });

  list.addEventListener("click", async (event) => {
    const editId = event.target.closest("[data-edit]")?.dataset.edit;
    const deleteId = event.target.closest("[data-delete]")?.dataset.delete;
    if (editId) {
      const name = prompt("Update item name:");
      if (!name) return;
      try {
        await FindItAPI.updateItem({ id: editId, name });
        FindIt.toast("Report updated.", "success");
        render();
      } catch (error) {
        FindIt.toast(error.message || "Update failed.", "error");
      }
    }
    if (deleteId) {
      window._pendingDelete = deleteId;
      FindIt.openModal("delete-modal");
    }
  });

  document.getElementById("confirm-delete")?.addEventListener("click", async () => {
    if (!window._pendingDelete) return;
    try {
      await FindItAPI.deleteItem(window._pendingDelete);
      FindIt.closeModal("delete-modal");
      FindIt.toast("Item deleted.", "success");
      window._pendingDelete = null;
      render();
    } catch (error) {
      FindIt.toast(error.message || "Delete failed.", "error");
    }
  });

  render();
}

function initClaimsPage() {
  const host = document.getElementById("claims-list");
  if (!host) return;
  const session = FindIt.requireAuth();
  if (!session) return;

  (async () => {
    try {
      const result = await FindItAPI.claims({ mine: "1" });
      const mine = result.data.claims || [];
      FindItData.claims = mine;

      if (!mine.length) {
        host.innerHTML = `<div class="empty-state card"><i data-lucide="inbox"></i><h3>No claims yet</h3><p>Claims you submit will show up here.</p></div>`;
        FindIt.refreshIcons();
        return;
      }

      host.innerHTML = mine
        .map(
          (claim) => `
          <article class="card panel">
            <div class="panel__head">
              <div>
                <h3>${FindIt.escapeHtml(claim.itemName || claim.itemId)}</h3>
                <div class="item-card__meta">${claim.id} · Submitted ${FindIt.formatDate(claim.date)}</div>
              </div>
              ${FindIt.badge(claim.status)}
            </div>
            <p>${FindIt.escapeHtml(claim.note)}</p>
            <button class="btn btn-secondary btn-sm" data-view-claim="${claim.id}">View claim details</button>
          </article>`
        )
        .join("");

      host.addEventListener("click", (event) => {
        const id = event.target.closest("[data-view-claim]")?.dataset.viewClaim;
        if (!id) return;
        const claim = FindItData.claims.find((row) => row.id === id);
        if (!claim) return;
        document.getElementById("claim-detail-body").innerHTML = `
          <p><strong>${FindIt.escapeHtml(claim.itemName || claim.itemId)}</strong> (${FindIt.escapeHtml(claim.id)})</p>
          <p>Status: ${claim.status}</p>
          <p>${FindIt.escapeHtml(claim.note)}</p>
        `;
        FindIt.openModal("claim-detail-modal");
      });
    } catch (error) {
      FindIt.toast(error.message || "Could not load claims.", "error");
    }
  })();
}

function initAdminItems() {
  const body = document.getElementById("admin-items-body");
  if (!body) return;
  if (!FindIt.requireAuth("admin")) return;

  const render = async () => {
    const filters = currentFilters();
    try {
      const result = await FindItAPI.items({
        q: filters.q,
        type: filters.type,
        category: filters.category,
        sort: "newest",
      });
      const rows = result.data.items || [];
      FindItData.items = rows;
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
              <a class="btn btn-sm btn-secondary" href="item-details.html?id=${encodeURIComponent(item.item_id ?? item.id)}">View</a>
              <button class="btn btn-sm btn-ghost" data-status="${item.id}">Status</button>
              <button class="btn btn-sm btn-ghost" data-delete="${item.id}">Delete</button>
            </td>
          </tr>`
        )
        .join("");
    } catch (error) {
      FindIt.toast(error.message || "Could not load items.", "error");
    }
  };

  ["filter-q", "filter-type", "filter-category"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", render);
    document.getElementById(id)?.addEventListener("change", render);
  });

  body.addEventListener("click", async (event) => {
    const statusId = event.target.closest("[data-status]")?.dataset.status;
    if (statusId) {
      const status = prompt("New status (pending, approved, claimed, returned, archived):", "approved");
      if (!status) return;
      try {
        await FindItAPI.updateItem({ id: statusId, status: status.trim().toLowerCase() });
        FindIt.toast("Status updated.", "success");
        render();
      } catch (error) {
        FindIt.toast(error.message || "Update failed.", "error");
      }
    }
    const id = event.target.closest("[data-delete]")?.dataset.delete;
    if (id) {
      window._pendingDelete = id;
      FindIt.openModal("delete-modal");
    }
  });

  document.getElementById("confirm-delete")?.addEventListener("click", async () => {
    if (!window._pendingDelete) return;
    try {
      await FindItAPI.deleteItem(window._pendingDelete);
      FindIt.closeModal("delete-modal");
      FindIt.toast("Item deleted.", "success");
      window._pendingDelete = null;
      render();
    } catch (error) {
      FindIt.toast(error.message || "Delete failed.", "error");
    }
  });

  render();
}

function initAdminClaims() {
  const body = document.getElementById("admin-claims-body");
  if (!body) return;
  if (!FindIt.requireAuth("admin")) return;

  const render = async () => {
    try {
      const result = await FindItAPI.claims();
      const claims = result.data.claims || [];
      FindItData.claims = claims;
      body.innerHTML = claims
        .map((claim) => {
          const pending = claim.status === "pending";
          return `
            <tr>
              <td>${claim.id}</td>
              <td>${claim.claimant}<div class="hint">${claim.studentId || ""}</div></td>
              <td>${claim.itemName || claim.itemId}</td>
              <td>${FindIt.formatDate(claim.date)}</td>
              <td>${FindIt.badge(claim.status)}</td>
              <td class="actions">
                <button class="btn btn-sm btn-success" ${pending ? "" : "disabled"} data-approve="${claim.id}">Approve</button>
                <button class="btn btn-sm btn-danger" ${pending ? "" : "disabled"} data-reject="${claim.id}">Reject</button>
              </td>
            </tr>`;
        })
        .join("");
    } catch (error) {
      FindIt.toast(error.message || "Could not load claims.", "error");
    }
  };

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

  document.getElementById("confirm-claim-action")?.addEventListener("click", async () => {
    if (!pendingAction) return;
    try {
      await FindItAPI.updateClaim({ id: pendingAction.id, status: pendingAction.type });
      FindIt.closeModal("claim-action-modal");
      FindIt.toast(
        pendingAction.type === "approve" ? "Claim approved." : "Claim rejected.",
        "success"
      );
      pendingAction = null;
      render();
    } catch (error) {
      FindIt.toast(error.message || "Action failed.", "error");
    }
  });

  render();
}

document.addEventListener("DOMContentLoaded", async () => {
  if (window.FindItReady) await window.FindItReady;
  const needsCategories =
    document.querySelector("[data-category-select]") ||
    document.getElementById("browse-grid") ||
    document.getElementById("admin-items-body") ||
    document.getElementById("report-form");

  if (needsCategories) {
    try {
      const catRes = await FindItAPI.categories();
      FindItData.categories = (catRes.data.categories || []).map((c) => c.name);
    } catch (error) {
      FindIt.toast(error.message || "Could not load categories.", "error");
    }
  }

  fillCategorySelects();
  fillLocationSelects();
  initBrowse();
  initItemDetails();
  initMyReports();
  initClaimsPage();
  initAdminItems();
  initAdminClaims();
});
