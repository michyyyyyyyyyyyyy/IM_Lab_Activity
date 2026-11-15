/**
 * FINDIT – User and admin dashboard widgets.
 */

function fillSessionLabels() {
  const session = FindIt.getSession();
  document.querySelectorAll("[data-user-name]").forEach((el) => {
    el.textContent = session?.name || "Alex Rivera";
  });
  document.querySelectorAll("[data-user-email]").forEach((el) => {
    el.textContent = session?.email || "alex.rivera@hcdc.edu.ph";
  });
}

function initUserDashboard() {
  if (!document.getElementById("user-dashboard")) return;
  const mine = FindItData.items.filter((item) => item.ownerId === "user");
  const myClaims = FindItData.claims.filter((claim) => claim.claimant === "Alex Rivera");

  document.getElementById("stat-lost").textContent = mine.filter((i) => i.type === "lost").length;
  document.getElementById("stat-found").textContent = mine.filter((i) => i.type === "found").length;
  document.getElementById("stat-claims").textContent = myClaims.length;
  document.getElementById("stat-open").textContent = mine.filter((i) => i.status === "open").length;

  const recent = document.getElementById("recent-items");
  recent.innerHTML = FindItData.items
    .slice(0, 5)
    .map(
      (item) => `
      <div class="list-row">
        <div>
          <strong>${item.name}</strong>
          <div class="item-card__meta">${item.location}</div>
        </div>
        ${FindIt.badge(item.type)}
      </div>`
    )
    .join("");

  const lost = document.getElementById("my-lost");
  lost.innerHTML = mine
    .filter((item) => item.type === "lost")
    .map(
      (item) =>
        `<div class="list-row"><span>${item.name}</span>${FindIt.badge(item.status)}</div>`
    )
    .join("") || `<p class="hint">No lost reports yet.</p>`;

  const found = document.getElementById("my-found");
  found.innerHTML = mine
    .filter((item) => item.type === "found")
    .map(
      (item) =>
        `<div class="list-row"><span>${item.name}</span>${FindIt.badge(item.status)}</div>`
    )
    .join("") || `<p class="hint">No found reports yet.</p>`;

  const claims = document.getElementById("my-claims");
  claims.innerHTML = myClaims
    .map((claim) => {
      const item = FindIt.itemById(claim.itemId);
      return `<div class="list-row"><span>${item?.name}</span>${FindIt.badge(claim.status)}</div>`;
    })
    .join("");
}

function initAdminDashboard() {
  if (!document.getElementById("admin-dashboard")) return;
  document.getElementById("admin-total").textContent = FindItData.items.length;
  document.getElementById("admin-lost").textContent = FindItData.items.filter((i) => i.type === "lost").length;
  document.getElementById("admin-found").textContent = FindItData.items.filter((i) => i.type === "found").length;
  document.getElementById("admin-pending").textContent = FindItData.claims.filter((c) => c.status === "pending").length;

  document.getElementById("admin-recent-reports").innerHTML = FindItData.items
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)
    .map(
      (item) =>
        `<div class="list-row"><span>${item.name}</span><span>${FindIt.badge(item.type)}</span></div>`
    )
    .join("");

  document.getElementById("admin-activity").innerHTML = FindItData.activities
    .map((row) => `<div class="list-row"><span>${row}</span></div>`)
    .join("");
}

document.addEventListener("DOMContentLoaded", () => {
  fillSessionLabels();
  initUserDashboard();
  initAdminDashboard();
  FindIt.refreshIcons();
});
