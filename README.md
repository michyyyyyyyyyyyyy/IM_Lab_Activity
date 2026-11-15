# FINDIT – Lost and Found Management System (Frontend)

Academic frontend for the Holy Cross of Davao College lost and found portal. This package contains HTML, CSS, and vanilla JavaScript only. It does **not** include PHP, MySQL, or live persistence.

## Preview the UI

Open `index.html` in a browser, or serve the folder locally:

```bash
npx serve .
```

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Public landing page |
| `login.html` | Student / admin sign in |
| `register.html` | Account registration |
| `browse.html` | Searchable item catalog |
| `report.html` | Lost / found report form |
| `item-details.html` | Item detail and claim prompt |
| `dashboard.html` | Student overview |
| `my-reports.html` | User reports |
| `claims.html` | User claims |
| `admin.html` | Staff dashboard |
| `admin-items.html` | Item management |
| `admin-claims.html` | Claim review |

## Sample data

Records in `assets/js/main.js` (`FindItData`) are mock objects for UI demonstration. They are not database rows.

Preview login:

- Any email/student ID and a password of 6+ characters opens the student dashboard.
- An identifier containing `admin` opens the staff dashboard.

Session state is stored in `localStorage` as a frontend placeholder.

## Connecting PHP later

Keep the markup and CSS. Replace JavaScript data access with `fetch()` calls to PHP endpoints, for example:

- `POST /auth/login.php`
- `GET /api/items.php`
- `POST /api/reports.php`
- `POST /api/claims.php`

Form field names (`name`, `category`, `description`, `date`, `location`, `photo`) are ready to map to backend request bodies.

## Design system

HCDC branding colors:

- Primary blue `#0B3D91`
- Accent red `#C8102E`
- White `#FFFFFF`
- Shared styles live in `assets/css/`
- Icons: [Lucide](https://lucide.dev) via CDN
