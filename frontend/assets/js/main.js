/**
 * FINDIT – Shared frontend utilities and API client.
 * Data is loaded from the PHP/MySQL backend under /api.
 */

const FindItData = {
  categories: [],
  locations: [
    "Mabutas Hall",
    "Palma Gil Hall",
    "HCDC Library",
    "Chapel",
    "Canteen",
    "Gymnasium",
    "Sta. Ana Hall",
    "Thibault Hall",
  ],
  items: [],
  claims: [],
  activities: [],
  ready: false,
};

const FindItAPI = {
  projectRoot() {
    const staticPorts = new Set(["3000", "4173", "5000", "5173", "5500"]);
    if (staticPorts.has(location.port)) {
      return "http://localhost/IM_Lab_Activity/";
    }

    const marker = "/frontend/";
    const markerIndex = location.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      return location.pathname.slice(0, markerIndex + 1);
    }
    return "/";
  },

  backendBase() {
    return this.projectRoot() + "backend/";
  },

  assetUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    const cleanPath = String(path).replace(/^\/+/, "");
    if (cleanPath.startsWith("uploads/")) {
      return this.projectRoot() + "backend/" + cleanPath;
    }
    if (cleanPath.startsWith("assets/")) {
      return this.projectRoot() + "frontend/" + cleanPath;
    }
    return this.projectRoot() + cleanPath;
  },

  async request(path, options = {}) {
    const opts = {
      credentials: "include",
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    };

    if (opts.body && !(opts.body instanceof FormData) && typeof opts.body === "object") {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(opts.body);
    }

    let response;
    try {
      response = await fetch(this.backendBase() + path, opts);
    } catch (error) {
      const err = new Error(
        "Cannot reach the PHP API. Serve this project with PHP (for example: php -S localhost:8000) and import the database."
      );
      err.network = true;
      throw err;
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = { success: false, message: "Invalid server response." };
    }

    if (!response.ok || payload?.success === false) {
      const err = new Error(payload?.message || `Request failed (${response.status})`);
      err.status = response.status;
      err.errors = payload?.errors || {};
      err.payload = payload;
      if (response.status === 401) FindIt.clearSession();
      throw err;
    }

    return payload;
  },

  login(body) {
    return this.request("api/auth/login.php", { method: "POST", body });
  },
  register(body) {
    return this.request("api/auth/register.php", { method: "POST", body });
  },
  logout() {
    return this.request("api/auth/logout.php", { method: "POST", body: {} });
  },
  me() {
    return this.request("api/auth/me.php");
  },
  categories() {
    return this.request("api/categories.php");
  },
  items(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`api/items.php${query ? `?${query}` : ""}`);
  },
  item(id) {
    return this.request(`api/items.php?id=${encodeURIComponent(id)}`);
  },
  createItem(formData) {
    return this.request("api/items.php", { method: "POST", body: formData });
  },
  updateItem(body) {
    return this.request("api/items.php", { method: "PUT", body });
  },
  deleteItem(id) {
    return this.request("api/items.php", { method: "DELETE", body: { id } });
  },
  claims(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`api/claims.php${query ? `?${query}` : ""}`);
  },
  createClaim(body) {
    return this.request("api/claims.php", { method: "POST", body });
  },
  updateClaim(body) {
    return this.request("api/claims.php", { method: "PUT", body });
  },
  dashboard() {
    return this.request("api/dashboard.php");
  },
};

const FindIt = {
  storageKey: "findit.session",

  getSession() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || "null");
    } catch (error) {
      return null;
    }
  },

  setSession(session) {
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  },

  clearSession() {
    localStorage.removeItem(this.storageKey);
  },

  requireAuth(role) {
    const session = this.getSession();
    if (!session) {
      window.location.href = "login.html";
      return null;
    }
    if (role && session.role !== role) {
      window.location.href = session.role === "admin" ? "admin.html" : "dashboard.html";
      return null;
    }
    return session;
  },

  toast(message, type = "info") {
    const stack = document.querySelector(".toast-stack") || this.mountToastStack();
    const toast = document.createElement("div");
    toast.className = `toast${type === "success" ? " toast--success" : type === "error" ? " toast--error" : ""}`;
    toast.textContent = message;
    stack.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  },

  mountToastStack() {
    const stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
    return stack;
  },

  openModal(id) {
    document.getElementById(id)?.classList.add("is-open");
  },

  closeModal(id) {
    document.getElementById(id)?.classList.remove("is-open");
  },

  formatDate(value) {
    if (!value) return "";
    return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  },

  badge(statusOrType) {
    const label = String(statusOrType).replace(/-/g, " ");
    return `<span class="badge badge-${statusOrType}">${label}</span>`;
  },

  itemById(id) {
    return FindItData.items.find((item) => String(item.id) === String(id) || String(item.item_id) === String(id));
  },

  photoMarkup(item, className) {
    const icon = this.iconFor(item.category);
    if (!item.photo) {
      return `<div class="${className}"><i data-lucide="${icon}"></i></div>`;
    }
    const photoUrl = FindItAPI.assetUrl(item.photo);
    const safeName = this.escapeHtml(item.name || "Item photo");
    return `<div class="${className} ${className}--photo">
      <img src="${photoUrl}" alt="${safeName}" onerror="FindIt.photoFallback(this, '${icon}')" />
    </div>`;
  },

  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  photoFallback(img, icon) {
    const host = img.parentElement;
    if (!host) return;
    host.className = host.className.replace(/--photo/g, "");
    host.innerHTML = `<i data-lucide="${icon}"></i>`;
    this.refreshIcons();
  },

  iconFor(category) {
    const map = {
      Electronics: "smartphone",
      Gadgets: "smartphone",
      "IDs & Cards": "id-card",
      Documents: "id-card",
      Clothing: "shirt",
      Bags: "backpack",
      Books: "book-open",
      Keys: "key-round",
      Accessories: "watch",
      Other: "package",
      "Personal Belongings": "package",
    };
    return map[category] || "package";
  },

  refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
  },

  applyFieldErrors(form, errors = {}) {
    Object.entries(errors).forEach(([name, message]) => {
      const input = form.elements?.[name] || form[name];
      if (!input) return;
      input.classList.add("is-invalid");
      const error = input.closest(".form-group")?.querySelector(".field-error");
      if (error) {
        error.textContent = message;
        error.classList.add("is-visible");
      }
    });
  },
};

async function loadCatalog(options = {}) {
  const params = {
    public: "1",
    sort: "newest",
    ...options,
  };

  try {
    const [catRes, itemRes] = await Promise.all([
      FindItAPI.categories(),
      FindItAPI.items(params),
    ]);
    FindItData.categories = (catRes.data.categories || []).map((c) => c.name);
    FindItData.categoryRows = catRes.data.categories || [];
    FindItData.items = itemRes.data.items || [];
    FindItData.ready = true;
    return true;
  } catch (error) {
    FindItData.ready = false;
    console.error(error);
    FindIt.toast(error.message || "Could not load data from the server.", "error");
    return false;
  }
}

function initPublicNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");
  toggle?.addEventListener("click", () => nav?.classList.toggle("is-open"));

  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === path) link.classList.add("is-active");
  });
}

async function initAccountMenu() {
  await window.FindItReady;
  const session = FindIt.getSession();

  const mountInPublicNav = document.querySelector(".nav");
  const publicHeader = document.querySelector(".site-header__inner");
  if (mountInPublicNav) {
    publicHeader?.querySelector(".account-menu")?.remove();
    mountInPublicNav.querySelectorAll('a[href="login.html"]').forEach((link) => {
      link.style.display = session ? "none" : "";
    });
  }

  const mountInTopbar = document.querySelector(".app-topbar");
  if (!publicHeader && !mountInTopbar) return;

  const mount = mountInTopbar || publicHeader;
  if (!session) return;

  mount.querySelector(".account-menu")?.remove();
  const isAdmin = session.role === "admin";
  const initials = (session.name || "User")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const dashboardUrl = isAdmin ? "admin.html" : "dashboard.html";
  const studentId = session.studentId || (isAdmin ? "Campus Administration" : "HCDC Student");
  const contact = session.contact_number ? FindIt.escapeHtml(session.contact_number) : "";

  const accountMarkup =
    `<div class="account-menu">
      <button class="account-menu__trigger" type="button" aria-expanded="false" aria-label="Open account menu">
        <span class="account-menu__avatar">${FindIt.escapeHtml(initials)}</span>
      </button>
      <div class="account-menu__dropdown" role="menu">
        <div class="account-menu__profile">
          <span class="account-menu__profile-avatar">${FindIt.escapeHtml(initials)}</span>
          <div>
            <strong>${FindIt.escapeHtml(session.name || "User")}</strong>
            <span>${isAdmin ? "Administrator" : "Student"}</span>
          </div>
        </div>
        <div class="account-menu__details">
          <div><i data-lucide="mail"></i><span>${FindIt.escapeHtml(session.email || "")}</span></div>
          <div><i data-lucide="${isAdmin ? "shield-check" : "badge-check"}"></i><span>${FindIt.escapeHtml(studentId)}</span></div>
          ${contact ? `<div><i data-lucide="phone"></i><span>${contact}</span></div>` : ""}
        </div>
        <div class="account-menu__actions">
          <a href="${dashboardUrl}" role="menuitem"><i data-lucide="layout-dashboard"></i> View dashboard</a>
          <button type="button" role="menuitem" data-account-logout><i data-lucide="log-out"></i> Log out</button>
        </div>
      </div>
    </div>`;

  if (publicHeader && mount === publicHeader) {
    publicHeader.insertAdjacentHTML("beforeend", accountMarkup);
  } else {
    mount.insertAdjacentHTML("beforeend", accountMarkup);
  }

  const menu = mount.querySelector(".account-menu");
  const trigger = menu.querySelector(".account-menu__trigger");
  const dropdown = menu.querySelector(".account-menu__dropdown");

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = menu.classList.toggle("is-open");
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  });

  menu.querySelector("[data-account-logout]").addEventListener("click", async () => {
    try {
      await FindItAPI.logout();
    } catch (error) {
      /* Session may already be unavailable. */
    }
    FindIt.clearSession();
    window.location.href = "login.html";
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) {
      menu.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      menu.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  FindIt.refreshIcons();
}

function initSidebar() {
  const toggle = document.querySelector(".sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");
  toggle?.addEventListener("click", () => sidebar?.classList.toggle("is-open"));

  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        await FindItAPI.logout();
      } catch (error) {
        /* session may already be gone */
      }
      FindIt.clearSession();
      window.location.href = "login.html";
    });
  });
}

function initModals() {
  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => {
      el.closest(".modal")?.classList.remove("is-open");
    });
  });
}

function renderFeaturedItems() {
  const host = document.getElementById("featured-items");
  if (!host) return;
  host.innerHTML = "";
  FindItData.items.slice(0, 3).forEach((item) => {
    host.insertAdjacentHTML(
      "beforeend",
      `<article class="hero-card__item">
        ${FindIt.photoMarkup(item, "hero-card__thumb")}
        <div>
          <strong>${FindIt.escapeHtml(item.name)}</strong>
          <div class="item-card__meta">
            ${FindIt.badge(item.type)}
            <span>${FindIt.escapeHtml(item.location)}</span>
          </div>
        </div>
      </article>`
    );
  });
}

function renderLandingGrid() {
  const host = document.getElementById("landing-item-grid");
  if (!host) return;
  host.innerHTML = FindItData.items
    .slice(0, 6)
    .map((item) => itemCard(item))
    .join("");
}

function itemCard(item) {
  const itemId = item.item_id ?? item.id;
  return `
    <article class="card item-card">
      ${FindIt.photoMarkup(item, "item-card__media")}
      <div class="item-card__body">
        <div>${FindIt.badge(item.type)} ${FindIt.badge(item.status)}</div>
        <h3>${FindIt.escapeHtml(item.name)}</h3>
        <div class="item-card__meta">
          <span>${FindIt.escapeHtml(item.category)}</span>
          <span>${FindIt.formatDate(item.date)}</span>
          <span>${FindIt.escapeHtml(item.location)}</span>
        </div>
        ${itemId ? `<a class="btn btn-secondary btn-sm" href="item-details.html?id=${encodeURIComponent(itemId)}">View Details</a>` : ""}
      </div>
    </article>
  `;
}

window.FindItReady = (async () => {
  try {
    const result = await FindItAPI.me();
    FindIt.setSession(result.data.user);
  } catch (error) {
    if (error.status === 401) {
      FindIt.clearSession();
    }
  }
})();

document.addEventListener("DOMContentLoaded", async () => {
  await window.FindItReady;
  initPublicNav();
  initSidebar();
  initModals();
  await initAccountMenu();

  const needsCatalog =
    document.getElementById("featured-items") ||
    document.getElementById("landing-item-grid");

  if (needsCatalog) {
    await loadCatalog();
    renderFeaturedItems();
    renderLandingGrid();
  }

  FindIt.refreshIcons();
});
