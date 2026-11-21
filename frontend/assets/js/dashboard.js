/**
 * FINDIT – User and admin dashboard widgets (API-backed).
 */

function fillSessionLabels() {
  const session = FindIt.getSession();
  document.querySelectorAll("[data-user-name]").forEach((el) => {
    el.textContent = session?.name || "Guest";
  });
  document.querySelectorAll("[data-user-email]").forEach((el) => {
    el.textContent = session?.email || "";
  });
}

async function initUserDashboard() {
  if (!document.getElementById("user-dashboard")) return;
  if (!FindIt.requireAuth()) return;

  try {
    const result = await FindItAPI.dashboard();
    const data = result.data;
    const stats = data.stats || {};
    const mine = data.myItems || [];
    const myClaims = data.myClaims || [];

    document.getElementById("stat-lost").textContent = stats.lost ?? 0;
    document.getElementById("stat-found").textContent = stats.found ?? 0;
    document.getElementById("stat-claims").textContent = stats.claims ?? 0;
    document.getElementById("stat-open").textContent = stats.open ?? 0;

    document.getElementById("recent-items").innerHTML = (data.recentItems || [])
      .map(
        (item) => `
      <div class="list-row">
        <div>
          <strong>${FindIt.escapeHtml(item.name)}</strong>
          <div class="item-card__meta">${FindIt.escapeHtml(item.location)}</div>
        </div>
        ${FindIt.badge(item.type)}
      </div>`
      )
      .join("") || `<p class="hint">No recent items.</p>`;

    document.getElementById("my-lost").innerHTML =
      mine
        .filter((item) => item.type === "lost")
        .map((item) => `<div class="list-row"><span>${FindIt.escapeHtml(item.name)}</span>${FindIt.badge(item.status)}</div>`)
        .join("") || `<p class="hint">No lost reports yet.</p>`;

    document.getElementById("my-found").innerHTML =
      mine
        .filter((item) => item.type === "found")
        .map((item) => `<div class="list-row"><span>${FindIt.escapeHtml(item.name)}</span>${FindIt.badge(item.status)}</div>`)
        .join("") || `<p class="hint">No found reports yet.</p>`;

    document.getElementById("my-claims").innerHTML =
      myClaims
        .map(
          (claim) =>
            `<div class="list-row"><span>${FindIt.escapeHtml(claim.itemName || claim.itemId)}</span>${FindIt.badge(claim.status)}</div>`
        )
        .join("") || `<p class="hint">No claims yet.</p>`;
  } catch (error) {
    FindIt.toast(error.message || "Could not load dashboard.", "error");
  }
}

async function initAdminDashboard() {
  if (!document.getElementById("admin-dashboard")) return;
  if (!FindIt.requireAuth("admin")) return;

  try {
    const result = await FindItAPI.dashboard();
    const data = result.data;
    const stats = data.stats || {};

    document.getElementById("admin-total").textContent = stats.total ?? 0;
    document.getElementById("admin-lost").textContent = stats.lost ?? 0;
    document.getElementById("admin-found").textContent = stats.found ?? 0;
    document.getElementById("admin-pending").textContent = stats.pendingClaims ?? 0;

    document.getElementById("admin-recent-reports").innerHTML = (data.recentItems || [])
      .map(
        (item) =>
          `<div class="list-row"><span>${FindIt.escapeHtml(item.name)}</span><span>${FindIt.badge(item.type)}</span></div>`
      )
      .join("") || `<p class="hint">No reports yet.</p>`;

    document.getElementById("admin-activity").innerHTML = (data.activities || [])
      .map((row) => `<div class="list-row"><span>${FindIt.escapeHtml(row)}</span></div>`)
      .join("") || `<p class="hint">No activity yet.</p>`;
  } catch (error) {
    FindIt.toast(error.message || "Could not load admin dashboard.", "error");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (window.FindItReady) await window.FindItReady;
  fillSessionLabels();
  await initUserDashboard();
  await initAdminDashboard();
  FindIt.refreshIcons();
});
