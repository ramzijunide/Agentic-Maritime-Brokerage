import sqlite3
from pathlib import Path
from datetime import datetime


# =========================================================
# DATABASE LOCATION
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_FILE = BASE_DIR / "maritime.db"


# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_connection():

    connection = sqlite3.connect(DATABASE_FILE)

    connection.row_factory = sqlite3.Row

    return connection


# =========================================================
# INITIALIZE DATABASE
# =========================================================

def initialize_database():

    connection = get_connection()
    cursor = connection.cursor()

    # =====================================================
    # CREATE QUOTATIONS TABLE
    # =====================================================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS quotations (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            quotation_id TEXT UNIQUE NOT NULL,

            customer_email TEXT,

            customer_quotation_number INTEGER,

            origin TEXT NOT NULL,
            destination TEXT NOT NULL,
            cargo_type TEXT NOT NULL,
            containers INTEGER NOT NULL,

            recommended_route TEXT,
            transit_time_days INTEGER,
            distance_nm REAL,
            transshipments INTEGER,
            route_score REAL,

            base_freight_per_container_usd REAL,
            fuel_surcharge_usd REAL,
            port_charge_usd REAL,
            risk_surcharge_usd REAL,

            demand_factor REAL,
            operating_cost_per_container_usd REAL,
            demand_adjusted_cost_per_container_usd REAL,

            target_margin_percent REAL,
            actual_margin_percent REAL,

            selling_price_per_container_usd REAL,
            profit_per_container_usd REAL,

            total_freight_usd REAL,
            total_profit_usd REAL,

            status TEXT DEFAULT 'PENDING APPROVAL',

            created_at TEXT
        )
    """)

    # =====================================================
    # CHECK EXISTING QUOTATION COLUMNS
    # =====================================================

    cursor.execute("""
        PRAGMA table_info(quotations)
    """)

    columns = [
        row["name"]
        for row in cursor.fetchall()
    ]

    # =====================================================
    # ADD CUSTOMER EMAIL TO OLD DATABASE
    # =====================================================

    if "customer_email" not in columns:

        cursor.execute("""
            ALTER TABLE quotations
            ADD COLUMN customer_email TEXT
        """)

    # =====================================================
    # ADD CUSTOMER QUOTATION NUMBER TO OLD DATABASE
    # =====================================================

    if "customer_quotation_number" not in columns:

        cursor.execute("""
            ALTER TABLE quotations
            ADD COLUMN customer_quotation_number INTEGER
        """)

    # =====================================================
    # ADD STATUS TO OLD DATABASE
    # =====================================================

    if "status" not in columns:

        cursor.execute("""
            ALTER TABLE quotations
            ADD COLUMN status TEXT
            DEFAULT 'PENDING APPROVAL'
        """)

    # =====================================================
    # ADD CREATED TIME TO OLD DATABASE
    # =====================================================

    if "created_at" not in columns:

        cursor.execute("""
            ALTER TABLE quotations
            ADD COLUMN created_at TEXT
        """)

    # =====================================================
    # UPDATE OLD QUOTATIONS WITH DEFAULT STATUS
    # =====================================================

    cursor.execute("""
        UPDATE quotations

        SET status = 'PENDING APPROVAL'

        WHERE status IS NULL
           OR status = ''
    """)

    # =====================================================
    # UPDATE OLD QUOTATIONS WITH CREATED TIME
    # =====================================================

    cursor.execute("""
        UPDATE quotations

        SET created_at = ?

        WHERE created_at IS NULL
           OR created_at = ''
    """, (
        datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        ),
    ))

    # =====================================================
    # CREATE CUSTOMERS TABLE
    # =====================================================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customers (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            email TEXT UNIQUE NOT NULL,

            password TEXT NOT NULL,

            name TEXT,

            role TEXT DEFAULT 'customer',

            created_at TEXT
        )
    """)

    # =====================================================
    # CREATE DEMO CUSTOMER ACCOUNT
    # =====================================================

    cursor.execute("""
        INSERT OR IGNORE INTO customers (

            email,
            password,
            name,
            role,
            created_at

        )

        VALUES (?, ?, ?, ?, ?)
    """, (

        "customer@maritime.com",

        "customer123",

        "Demo Customer",

        "customer",

        datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

    ))

    # =====================================================
    # CREATE ADMIN ACCOUNT
    # =====================================================

    cursor.execute("""
        INSERT OR IGNORE INTO customers (

            email,
            password,
            name,
            role,
            created_at

        )

        VALUES (?, ?, ?, ?, ?)
    """, (

        "admin@maritime.com",

        "admin123",

        "Maritime Administrator",

        "admin",

        datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

    ))

    # =====================================================
    # SAVE CHANGES
    # =====================================================

    connection.commit()

    # =====================================================
    # CLOSE DATABASE
    # =====================================================

    connection.close()