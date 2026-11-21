# FINDIT – Lost and Found Management System

Holy Cross of Davao College lost and found portal with an HTML/CSS/JS frontend and a PHP + MySQL backend.

## Requirements

- PHP 8.0+ with PDO MySQL extension
- MySQL 8.0+ (XAMPP, WAMP, Laragon, or standalone)
- A modern browser

> `npx serve` only serves static files. Use a PHP server so `/backend/api/*.php` endpoints work.

## 1. Import the database

1. Start MySQL.
2. Import the schema and sample data:

```bash
mysql -u root -p < backend/database/lost_and_found_database.sql
```

Or open **phpMyAdmin** → Import → choose `backend/database/lost_and_found_database.sql`.

## 2. Configure the database connection

Edit `backend/config/database.php` if needed:

```php
'host' => '127.0.0.1',
'port' => '3306',
'name' => 'lost_and_found_db',
'user' => 'root',
'pass' => '',   // XAMPP default is empty
```

## 3. Run the app with PHP

From the project root:

```bash
php -S localhost:8000
```

Then open **http://localhost:8000/frontend/index.html**.

### XAMPP / WAMP alternative

Copy or link this folder into `htdocs` (or `www`) and open:

`http://localhost/IM_Lab_Activity/`

## Demo accounts

All sample users use password **`Password123`**.

| Email | Role |
| --- | --- |
| `alex.santos@hcdc.edu.ph` | student |
| `jamie.reyes@hcdc.edu.ph` | student |
| `taylor.cruz@hcdc.edu.ph` | staff |
| `admin@hcdc.edu.ph` | admin |

You can also sign in with a student ID such as `2024-11820`.

## Backend API (CRUD)

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `backend/api/auth/login.php` | POST | Sign in |
| `backend/api/auth/register.php` | POST | Create account |
| `backend/api/auth/logout.php` | POST | Sign out |
| `backend/api/auth/me.php` | GET | Current session user |
| `backend/api/categories.php` | GET | List categories |
| `backend/api/items.php` | GET, POST, PUT, DELETE | Item report CRUD |
| `backend/api/claims.php` | GET, POST, PUT | Claim create + staff review |
| `backend/api/dashboard.php` | GET | Dashboard stats |

- Auth uses PHP sessions (`credentials: "include"` from the frontend).
- Passwords are stored with `password_hash()` / verified with `password_verify()`.
- Uploaded photos are saved under `backend/uploads/items/`.
- Deletes archive the item (`status = archived`) and write an `archived_items` snapshot.
- Triggers in the SQL schema write to `activity_logs` and `item_status_history`.

## Pages

| File | Purpose |
| --- | --- |
| `frontend/index.html` | Public landing page |
| `frontend/login.html` / `frontend/register.html` | Auth |
| `frontend/browse.html` | Searchable catalog |
| `frontend/report.html` | Lost / found form |
| `frontend/item-details.html` | Details + claim |
| `frontend/dashboard.html` | Student overview |
| `frontend/my-reports.html` | User reports CRUD |
| `frontend/claims.html` | User claims |
| `frontend/admin.html` | Staff dashboard |
| `frontend/admin-items.html` | Item management |
| `frontend/admin-claims.html` | Claim review |

## Project layout

```
frontend/                     HTML, CSS, JavaScript, public images
backend/
 config/database.php         MySQL settings
 includes/                    Shared PHP helpers
 api/                         JSON API endpoints
 database/lost_and_found_database.sql
 uploads/items/               Uploaded photos
```
