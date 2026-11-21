-- =========================================================
-- LOST AND FOUND MANAGEMENT SYSTEM
-- Database Designer: Rachel
-- MySQL 8.0+
-- One-file database schema, relationships, sample data, triggers
-- Adapted for FINDIT PHP backend (adds student_id; bcrypt demo passwords)
-- =========================================================

CREATE DATABASE IF NOT EXISTS lost_and_found_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lost_and_found_db;

-- ---------------------------------------------------------
-- TABLE 1: users
-- Stores registered user accounts.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    student_id VARCHAR(50) NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'staff', 'admin') NOT NULL DEFAULT 'student',
    contact_number VARCHAR(30),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- TABLE 2: categories
-- Stores the categories of lost/found belongings.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- TABLE 3: item_reports
-- Stores lost and found item reports.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS item_reports (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    report_type ENUM('lost', 'found') NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    date_lost_found DATE NOT NULL,
    image_path VARCHAR(500),
    status ENUM('pending', 'approved', 'claimed', 'returned', 'archived')
        NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_item_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- TABLE 4: claim_requests
-- Stores users' requests to claim found items.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS claim_requests (
    claim_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    user_id INT NOT NULL,
    claim_message TEXT NOT NULL,
    claim_status ENUM('pending', 'approved', 'rejected')
        NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    request_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL,
    CONSTRAINT fk_claim_item
        FOREIGN KEY (item_id) REFERENCES item_reports(item_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_claim_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_claim_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- TABLE 5: activity_logs
-- Stores system activity records created by triggers.
-- user_id may be NULL for system-generated activities.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action_type VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id INT,
    activity_description TEXT,
    activity_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- TABLE 6: item_status_history
-- Keeps a record of status changes made to item reports.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS item_status_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    changed_by INT NULL,
    old_status VARCHAR(30) NOT NULL,
    new_status VARCHAR(30) NOT NULL,
    change_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_item
        FOREIGN KEY (item_id) REFERENCES item_reports(item_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_history_user
        FOREIGN KEY (changed_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- TABLE 7: archived_items
-- Stores a snapshot of archived item reports.
-- original_item_id is intentionally not a foreign key so the
-- archive snapshot can remain even if the original is removed.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS archived_items (
    archive_id INT AUTO_INCREMENT PRIMARY KEY,
    original_item_id INT NOT NULL,
    archived_by INT NULL,
    item_name VARCHAR(150) NOT NULL,
    report_type VARCHAR(20) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    date_lost_found DATE NOT NULL,
    original_status VARCHAR(30) NOT NULL,
    archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archive_reason VARCHAR(255),
    CONSTRAINT fk_archive_user
        FOREIGN KEY (archived_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- TRIGGERS
-- Automatically record item report activity and status changes.
-- ---------------------------------------------------------
DROP TRIGGER IF EXISTS trg_item_report_insert;
DROP TRIGGER IF EXISTS trg_item_report_update;
DROP TRIGGER IF EXISTS trg_claim_request_insert;

DELIMITER $$

CREATE TRIGGER trg_item_report_insert
AFTER INSERT ON item_reports
FOR EACH ROW
BEGIN
    INSERT INTO activity_logs
        (user_id, action_type, table_name, record_id, activity_description)
    VALUES
        (NEW.user_id, 'INSERT', 'item_reports', NEW.item_id,
         CONCAT('A ', NEW.report_type, ' item report was created: ', NEW.item_name));
END$$

CREATE TRIGGER trg_item_report_update
AFTER UPDATE ON item_reports
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO item_status_history
            (item_id, changed_by, old_status, new_status)
        VALUES
            (NEW.item_id, NULL, OLD.status, NEW.status);

        INSERT INTO activity_logs
            (user_id, action_type, table_name, record_id, activity_description)
        VALUES
            (NEW.user_id, 'STATUS UPDATE', 'item_reports', NEW.item_id,
             CONCAT('Item status changed from ', OLD.status, ' to ', NEW.status));
    END IF;
END$$

CREATE TRIGGER trg_claim_request_insert
AFTER INSERT ON claim_requests
FOR EACH ROW
BEGIN
    INSERT INTO activity_logs
        (user_id, action_type, table_name, record_id, activity_description)
    VALUES
        (NEW.user_id, 'INSERT', 'claim_requests', NEW.claim_id,
         CONCAT('A claim request was submitted for item ID ', NEW.item_id));
END$$

DELIMITER ;

-- ---------------------------------------------------------
-- SAMPLE DATA
-- Demo password for all sample users: Password123
-- Hash generated with bcrypt (password_hash compatible).
-- ---------------------------------------------------------

INSERT INTO users
    (first_name, last_name, student_id, email, password_hash, role, contact_number)
VALUES
    ('Alex', 'Santos', '2024-11820', 'alex.santos@hcdc.edu.ph',
     '$2b$10$ZWXvYuYac7YXwn4wLTXsc.jZF8GAKMBEQMekgDqHOWj/y/mS.CtCe', 'student', '09170000001'),
    ('Jamie', 'Reyes', '2023-09114', 'jamie.reyes@hcdc.edu.ph',
     '$2b$10$ZWXvYuYac7YXwn4wLTXsc.jZF8GAKMBEQMekgDqHOWj/y/mS.CtCe', 'student', '09170000002'),
    ('Taylor', 'Cruz', 'STAFF-01', 'taylor.cruz@hcdc.edu.ph',
     '$2b$10$ZWXvYuYac7YXwn4wLTXsc.jZF8GAKMBEQMekgDqHOWj/y/mS.CtCe', 'staff', '09170000003'),
    ('Morgan', 'Dela Cruz', 'ADMIN-01', 'admin@hcdc.edu.ph',
     '$2b$10$ZWXvYuYac7YXwn4wLTXsc.jZF8GAKMBEQMekgDqHOWj/y/mS.CtCe', 'admin', '09170000004');

INSERT INTO categories (category_name, description)
VALUES
    ('Electronics', 'Phones, tablets, laptops, and other electronic devices'),
    ('Accessories', 'Wallets, watches, bags, and similar belongings'),
    ('IDs & Cards', 'IDs, papers, certificates, and school documents'),
    ('Clothing', 'Shirts, jackets, and other apparel'),
    ('Bags', 'Backpacks, handbags, and similar items'),
    ('Books', 'Textbooks and notebooks'),
    ('Keys', 'House, vehicle, and locker keys'),
    ('Other', 'Other personal belongings');

-- These inserts automatically create activity_logs records.
INSERT INTO item_reports
    (user_id, category_id, report_type, item_name, description,
     location, date_lost_found, image_path, status)
VALUES
    (1, 2, 'lost', 'Brown Leather Wallet',
     'Slim brown leather wallet with an HCDC sticker on the inside flap. Last seen near the study tables on the second floor.',
     'HCDC Library', '2026-11-10', 'assets/images/wallet.jpg', 'approved'),
    (2, 8, 'found', 'Red Sunnies Flask',
     'Red Sunnies insulated flask with a faded HCDC Crusaders sticker. Found on a bench near the Mabutas Hall lobby.',
     'Mabutas Hall', '2026-11-11', 'assets/images/flask.jpg', 'approved'),
    (3, 1, 'found', 'AirPods',
     'White AirPods found under a table after the lunch rush, still in the charging case.',
     'Canteen', '2026-11-12', 'assets/images/airpods.jpg', 'pending'),
    (3, 7, 'found', 'Silver/Black Motor Keys',
     'Motorcycle keys with a silver and black remote. Found near the bicycle racks beside the gymnasium.',
     'Gymnasium', '2026-11-07', 'assets/images/keys.jpg', 'claimed'),
    (2, 4, 'lost', 'Light Blue Longsleeves',
     'Light blue long-sleeve shirt, size M. Lost after the student organization fair at Thibault Hall.',
     'Thibault Hall', '2026-11-13', 'assets/images/longsleeves.jpg', 'approved'),
    (3, 3, 'found', 'HCDC Student ID',
     'Holy Cross of Davao College ID found near the chapel entrance. Identifying details are withheld until a claim is verified.',
     'Chapel', '2026-11-14', 'assets/images/student-id.jpg', 'approved'),
    (1, 5, 'lost', 'Navy Backpack',
     'Navy backpack with a laptop sleeve. Last seen in a computer laboratory lounge in Sta. Ana Hall.',
     'Sta. Ana Hall', '2026-11-09', NULL, 'approved');

-- This insert automatically creates an activity_logs record.
INSERT INTO claim_requests
    (item_id, user_id, claim_message, claim_status)
VALUES
    (3, 1, 'I sat at the corner table around 12:30 and left my AirPods behind.', 'pending'),
    (4, 2, 'These are my motorcycle keys. I can describe the silver and black remote.', 'approved'),
    (2, 1, 'Flask looks similar, but the sticker does not match.', 'rejected');

UPDATE item_reports
SET status = 'approved'
WHERE item_id = 3 AND status = 'pending';

INSERT INTO archived_items
    (original_item_id, archived_by, item_name, report_type, category_name,
     description, location, date_lost_found, original_status, archive_reason)
VALUES
    (99, 4, 'Old Sample Item', 'found', 'Accessories',
     'Sample archived record', 'Old Building', '2026-01-10', 'returned',
     'Sample archive entry for demonstration');
