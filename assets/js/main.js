/**
 * FINDIT – Shared frontend utilities and mock data.
 *
 * This file is a frontend-only preview layer. Sample records live in
 * memory / localStorage so pages can be demonstrated without PHP or MySQL.
 * Replace FindItAPI calls with fetch() to your PHP endpoints later.
 */

const FindItData = {
  categories: [
    "Electronics",
    "IDs & Cards",
    "Clothing",
    "Bags",
    "Books",
    "Keys",
    "Accessories",
    "Other",
  ],
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
  items: [
    {
      id: "ITM-1042",
      name: "Brown Leather Wallet",
      category: "Accessories",
      type: "lost",
      status: "open",
      date: "2026-11-10",
      location: "HCDC Library",
      description:
        "Slim brown leather wallet with an HCDC sticker on the inside flap. Last seen near the study tables on the second floor.",
      ownerId: "user",
      extra: "Contains student ID and jeepney fare cards.",
      photo: "assets/images/wallet.jpg",
    },
    {
      id: "ITM-1043",
      name: "Red Sunnies Flask",
      category: "Other",
      type: "found",
      status: "open",
      date: "2026-11-11",
      location: "Mabutas Hall",
      description:
        "Red Sunnies insulated flask with a faded HCDC Crusaders sticker. Found on a bench near the Mabutas Hall lobby.",
      ownerId: "user",
      extra: "No name written on the flask.",
      photo: "assets/images/flask.jpg",
    },
    {
      id: "ITM-1044",
      name: "AirPods",
      category: "Electronics",
      type: "found",
      status: "pending",
      date: "2026-11-12",
      location: "Canteen",
      description:
        "White AirPods found under a table after the lunch rush, still in the charging case.",
      ownerId: "admin-preview",
      extra: "HCDC Security Desk is currently holding the item.",
      photo: "assets/images/airpods.jpg",
    },
    {
      id: "ITM-1046",
      name: "Silver/Black Motor Keys",
      category: "Keys",
      type: "found",
      status: "matched",
      date: "2026-11-07",
      location: "Gymnasium",
      description:
        "Motorcycle keys with a silver and black remote. Found near the bicycle racks beside the gymnasium.",
      ownerId: "admin-preview",
      extra: "Claim already in review.",
      photo: "assets/images/keys.jpg",
    },
    {
      id: "ITM-1047",
      name: "Light Blue Longsleeves",
      category: "Clothing",
      type: "lost",
      status: "open",
      date: "2026-11-13",
      location: "Thibault Hall",
      description:
        "Light blue long-sleeve shirt, size M. Lost after the student organization fair at Thibault Hall.",
      ownerId: "maya",
      extra: "Has a small coffee stain on the cuff.",
      photo: "assets/images/longsleeves.jpg",
    },
    {
      id: "ITM-1048",
      name: "HCDC Student ID",
      category: "IDs & Cards",
      type: "found",
      status: "open",
      date: "2026-11-14",
      location: "Chapel",
      description:
        "Holy Cross of Davao College ID found near the chapel entrance. Identifying details are withheld until a claim is verified.",
      ownerId: "admin-preview",
      extra: "Please describe the card photo and ID number when claiming.",
      photo: "assets/images/student-id.jpg",
    },
    {
      id: "ITM-1049",
      name: "Navy Backpack",
      category: "Bags",
      type: "lost",
      status: "open",
      date: "2026-11-09",
      location: "Sta. Ana Hall",
      description:
        "Navy backpack with a laptop sleeve. Last seen in a computer laboratory lounge in Sta. Ana Hall.",
      ownerId: "user",
      extra: "Contains notebooks, not the laptop.",
      photo: "assets/images/backpack.jpg",
    },
  ],
  claims: [
    {
      id: "CLM-2201",
      itemId: "ITM-1044",
      claimant: "Alex Rivera",
      studentId: "2024-11820",
      email: "alex.rivera@hcdc.edu.ph",
      date: "2026-11-13",
      status: "pending",
      note: "I sat at the corner table around 12:30 and left my AirPods behind.",
    },
    {
      id: "CLM-2202",
      itemId: "ITM-1046",
      claimant: "Jordan Cruz",
      studentId: "2023-09114",
      email: "jordan.cruz@hcdc.edu.ph",
      date: "2026-11-09",
      status: "approved",
      note: "These are my motorcycle keys. I can describe the silver and black remote.",
    },
    {
      id: "CLM-2203",
      itemId: "ITM-1043",
      claimant: "Alex Rivera",
      studentId: "2024-11820",
      email: "alex.rivera@hcdc.edu.ph",
      date: "2026-11-12",
      status: "rejected",
      note: "Flask looks similar, but the sticker does not match.",
    },
    {
      id: "CLM-2204",
      itemId: "ITM-1046",
      claimant: "Sam Ortiz",
      studentId: "2022-05501",
      email: "sam.ortiz@hcdc.edu.ph",
      date: "2026-11-10",
      status: "returned",
      note: "Item released at the HCDC Security Desk.",
    },
  ],
  activities: [
    "Claim CLM-2201 submitted for AirPods.",
    "Found report posted: HCDC Student ID.",
    "Lost report posted: Light Blue Longsleeves.",
    "Claim CLM-2202 approved.",
    "Admin updated status of Silver/Black Motor Keys.",
  ],
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
    return FindItData.items.find((item) => item.id === id);
  },

  photoMarkup(item, className) {
    const icon = this.iconFor(item.category);
    if (!item.photo) {
      return `<div class="${className}"><i data-lucide="${icon}"></i></div>`;
    }
    return `<div class="${className} ${className}--photo">
      <img src="${item.photo}" alt="${item.name}" onerror="FindIt.photoFallback(this, '${icon}')" />
    </div>`;
  },

  photoFallback(img, icon) {
    const host = img.parentElement;
    if (!host) return;
    host.className = host.className.replace(/--photo/g, "");
    host.innerHTML = `<i data-lucide="${icon}"></i>`;
    this.refreshIcons();
  },

  iconPlaceholder(name) {
    return `
      <div class="item-card__media" aria-hidden="true">
        <i data-lucide="package"></i>
      </div>
    `.replace("package", this.iconFor(name));
  },

  iconFor(category) {
    const map = {
      Electronics: "smartphone",
      "IDs & Cards": "id-card",
      Clothing: "shirt",
      Bags: "backpack",
      Books: "book-open",
      Keys: "key-round",
      Accessories: "watch",
      Other: "package",
    };
    return map[category] || "package";
  },

  refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
  },
};

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

function initSidebar() {
  const toggle = document.querySelector(".sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");
  toggle?.addEventListener("click", () => sidebar?.classList.toggle("is-open"));

  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
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
  FindItData.items.slice(0, 3).forEach((item) => {
    host.insertAdjacentHTML(
      "beforeend",
      `<article class="hero-card__item">
        ${FindIt.photoMarkup(item, "hero-card__thumb")}
        <div>
          <strong>${item.name}</strong>
          <div class="item-card__meta">
            ${FindIt.badge(item.type)}
            <span>${item.location}</span>
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
  return `
    <article class="card item-card">
      ${FindIt.photoMarkup(item, "item-card__media")}
      <div class="item-card__body">
        <div>${FindIt.badge(item.type)} ${FindIt.badge(item.status)}</div>
        <h3>${item.name}</h3>
        <div class="item-card__meta">
          <span>${item.category}</span>
          <span>${FindIt.formatDate(item.date)}</span>
          <span>${item.location}</span>
        </div>
        <a class="btn btn-secondary btn-sm" href="item-details.html?id=${item.id}">View Details</a>
      </div>
    </article>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  initPublicNav();
  initSidebar();
  initModals();
  renderFeaturedItems();
  renderLandingGrid();
  FindIt.refreshIcons();
});
