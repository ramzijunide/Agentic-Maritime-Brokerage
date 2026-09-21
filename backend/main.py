from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from app.models import (
    RouteRequest,
    QuotationRequest,
    CustomerRegisterRequest,
    CustomerLoginRequest
)

from app.agents.route_agent import RouteAgent
from app.services.quotation_service import QuotationService
from app.database import get_connection, initialize_database


# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(
    title="Agentic Maritime Brokerage API",
    description="Intelligent Maritime Freight Quotation Platform",
    version="1.0.0"
)


# =========================================================
# INITIALIZE DATABASE
# =========================================================

initialize_database()


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# =========================================================
# SERVICES
# =========================================================

route_agent = RouteAgent()

quotation_service = QuotationService()


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "message": "Agentic Maritime Brokerage API is running",

        "project":
            "Maritime Freight Quotation Platform",

        "milestones":
            "Milestone 1 + Milestone 2",

        "status":
            "operational"
    }


# =========================================================
# CUSTOMER REGISTRATION
# =========================================================

@app.post("/api/customers/register")
def register_customer(
    request: CustomerRegisterRequest
):

    connection = get_connection()
    cursor = connection.cursor()

    # -----------------------------------------------------
    # Check whether customer already exists
    # -----------------------------------------------------

    cursor.execute("""
        SELECT id
        FROM customers
        WHERE LOWER(email) = LOWER(?)
    """, (
        request.email,
    ))

    existing_customer = cursor.fetchone()

    if existing_customer:

        connection.close()

        return {
            "status": "error",
            "message":
                "Customer with this email already exists."
        }

    # -----------------------------------------------------
    # Create new customer
    # -----------------------------------------------------

    cursor.execute("""
        INSERT INTO customers (
            name,
            email,
            password,
            role,
            created_at
        )

        VALUES (?, ?, ?, ?, ?)
    """, (
        request.name,
        request.email,
        request.password,
        "customer",
        datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )
    ))

    connection.commit()

    customer_id = cursor.lastrowid

    connection.close()

    return {
        "status": "success",

        "message":
            "Customer registered successfully.",

        "customer": {

            "id":
                customer_id,

            "name":
                request.name,

            "email":
                request.email,

            "role":
                "customer"
        }
    }


# =========================================================
# CUSTOMER LOGIN
# =========================================================

@app.post("/api/customers/login")
def login_customer(
    request: CustomerLoginRequest
):

    connection = get_connection()
    cursor = connection.cursor()

    # -----------------------------------------------------
    # Find customer using email and password
    # -----------------------------------------------------

    cursor.execute("""
        SELECT *
        FROM customers
        WHERE LOWER(email) = LOWER(?)
        AND password = ?
    """, (
        request.email,
        request.password
    ))

    customer = cursor.fetchone()

    connection.close()

    # -----------------------------------------------------
    # Invalid login
    # -----------------------------------------------------

    if customer is None:

        return {
            "status": "error",

            "message":
                "Invalid email or password."
        }

    # -----------------------------------------------------
    # Successful login
    # -----------------------------------------------------

    return {
        "status": "success",

        "message":
            "Login successful.",

        "customer": {

            "id":
                customer["id"],

            "name":
                customer["name"],

            "email":
                customer["email"],

            "role":
                customer["role"]
        }
    }


# =========================================================
# ROUTE ANALYSIS
# =========================================================

@app.post("/api/routes/analyze")
def analyze_route(
    request: RouteRequest
):

    result = route_agent.analyze_route(

        origin=request.origin,

        destination=request.destination,

        cargo_type=request.cargo_type,

        containers=request.containers

    )

    return result


# =========================================================
# GENERATE QUOTATION
# =========================================================

@app.post("/api/quotations/generate")
def generate_quotation(
    request: QuotationRequest
):

    # -----------------------------------------------------
    # Generate quotation using existing AI/agent pipeline
    # -----------------------------------------------------

    result = quotation_service.generate_quotation(

        origin=request.origin,

        destination=request.destination,

        cargo_type=request.cargo_type,

        containers=request.containers

    )

    # -----------------------------------------------------
    # If quotation generation failed
    # -----------------------------------------------------

    if result["status"] != "success":

        return result


    # -----------------------------------------------------
    # Connect to SQLite
    # -----------------------------------------------------

    connection = get_connection()

    cursor = connection.cursor()


    # -----------------------------------------------------
    # Generate next quotation ID
    # -----------------------------------------------------

    cursor.execute("""
        SELECT
            COALESCE(MAX(id), 0) + 1 AS next_id
        FROM quotations
    """)

    next_id = cursor.fetchone()["next_id"]

    quotation_id = f"Q{next_id:04d}"

    # -----------------------------------------------------
    # Generate customer-specific quotation number
    # -----------------------------------------------------
    cursor.execute("""
        SELECT
            COALESCE(MAX(customer_quotation_number), 0) + 1
            AS next_customer_quotation_number
        FROM quotations
        WHERE LOWER(customer_email) = LOWER(?)
    """, (
        request.customer_email,
    ))

    customer_quotation_number = cursor.fetchone()[
        "next_customer_quotation_number"
    ]


    # -----------------------------------------------------
    # Current quotation timestamp
    # -----------------------------------------------------

    created_at = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )


    # -----------------------------------------------------
    # Initial quotation status
    # -----------------------------------------------------

    quotation_status = "PENDING APPROVAL"


    # -----------------------------------------------------
    # Save quotation
    # -----------------------------------------------------

    cursor.execute("""
        INSERT INTO quotations (

            quotation_id,
            customer_email,
            customer_quotation_number,

            origin,
            destination,
            cargo_type,
            containers,

            recommended_route,
            transit_time_days,
            distance_nm,
            transshipments,
            route_score,

            base_freight_per_container_usd,
            fuel_surcharge_usd,
            port_charge_usd,
            risk_surcharge_usd,

            demand_factor,
            operating_cost_per_container_usd,
            demand_adjusted_cost_per_container_usd,

            target_margin_percent,
            actual_margin_percent,

            selling_price_per_container_usd,
            profit_per_container_usd,

            total_freight_usd,
            total_profit_usd,

            status,
            created_at
        )

        VALUES (

           ?, ?, ?,

           ?, ?, ?, ?,

           ?, ?, ?, ?, ?,

           ?, ?, ?, ?,

           ?, ?, ?,

           ?, ?,

           ?, ?,

           ?, ?,

           ?, ?
        )
    """, (

        quotation_id,

        request.customer_email,
        customer_quotation_number,

        result["origin"],

        result["destination"],

        result["cargo_type"],

        result["containers"],


        result["recommended_route"],

        result["transit_time_days"],

        result["distance_nm"],

        result["transshipments"],

        result["route_score"],


        result[
            "base_freight_per_container_usd"
        ],

        result[
            "fuel_surcharge_usd"
        ],

        result[
            "port_charge_usd"
        ],

        result[
            "risk_surcharge_usd"
        ],


        result[
            "demand_factor"
        ],

        result[
            "operating_cost_per_container_usd"
        ],

        result[
            "demand_adjusted_cost_per_container_usd"
        ],


        result[
            "target_margin_percent"
        ],

        result[
            "actual_margin_percent"
        ],


        result[
            "selling_price_per_container_usd"
        ],

        result[
            "profit_per_container_usd"
        ],


        result[
            "total_freight_usd"
        ],

        result[
            "total_profit_usd"
        ],


        quotation_status,

        created_at
    ))


    connection.commit()

    connection.close()


    # -----------------------------------------------------
    # Return quotation information
    # -----------------------------------------------------

    result["quotation_id"] = quotation_id
    result["customer_email"] = request.customer_email
    result["customer_quotation_number"] = customer_quotation_number
    result["status"] = "success"
    result["quotation_status"] = quotation_status
    result["created_at"] = created_at

    return result


# =========================================================
# CUSTOMER QUOTATION HISTORY
# =========================================================

@app.get("/api/quotations/history")
def get_quotation_history(
    customer_email: str | None = None
):

    connection = get_connection()

    cursor = connection.cursor()


    if customer_email:

        cursor.execute("""
            SELECT *
            FROM quotations

            WHERE LOWER(customer_email)
                = LOWER(?)

            ORDER BY id DESC
        """, (
            customer_email,
        ))

    else:

        cursor.execute("""
            SELECT *
            FROM quotations

            ORDER BY id DESC
        """)


    quotations = [

        dict(row)

        for row in cursor.fetchall()

    ]


    connection.close()


    return {

        "status":
            "success",

        "count":
            len(quotations),

        "quotations":
            quotations

    }


# =========================================================
# INDIVIDUAL CUSTOMER QUOTATION
# =========================================================

@app.get("/api/quotations/details/{quotation_id}")
def get_quotation_details(
    quotation_id: str,
    customer_email: str
):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM quotations
        WHERE quotation_id = ?
        AND LOWER(customer_email) = LOWER(?)
    """, (
        quotation_id,
        customer_email
    ))

    quotation = cursor.fetchone()

    connection.close()

    if quotation is None:

        return {
            "status": "error",
            "message": "Quotation not found for this customer."
        }

    return {
        "status": "success",
        "quotation": dict(quotation)
    }


# =========================================================
# CUSTOMER STATISTICS
# =========================================================

@app.get("/api/quotations/stats")
def get_quotation_stats(
    customer_email: str | None = None
):

    connection = get_connection()

    cursor = connection.cursor()


    if customer_email:

        cursor.execute("""
            SELECT

                COUNT(*)
                    AS total_quotations,

                COALESCE(
                    SUM(containers),
                    0
                )
                    AS total_containers,

                COALESCE(
                    SUM(total_freight_usd),
                    0
                )
                    AS total_freight_usd,

                COALESCE(
                    SUM(total_profit_usd),
                    0
                )
                    AS total_profit_usd,

                COALESCE(
                    AVG(actual_margin_percent),
                    0
                )
                    AS average_margin_percent

            FROM quotations

            WHERE LOWER(customer_email)
                = LOWER(?)

        """, (
            customer_email,
        ))

    else:

        cursor.execute("""
            SELECT

                COUNT(*)
                    AS total_quotations,

                COALESCE(
                    SUM(containers),
                    0
                )
                    AS total_containers,

                COALESCE(
                    SUM(total_freight_usd),
                    0
                )
                    AS total_freight_usd,

                COALESCE(
                    SUM(total_profit_usd),
                    0
                )
                    AS total_profit_usd,

                COALESCE(
                    AVG(actual_margin_percent),
                    0
                )
                    AS average_margin_percent

            FROM quotations

        """)


    row = cursor.fetchone()


    connection.close()


    return {

        "status":
            "success",

        "total_quotations":
            row["total_quotations"],

        "total_containers":
            row["total_containers"],

        "total_freight_usd":
            round(
                row["total_freight_usd"],
                2
            ),

        "total_profit_usd":
            round(
                row["total_profit_usd"],
                2
            ),

        "average_margin_percent":
            round(
                row["average_margin_percent"],
                2
            )

    }


# =========================================================
# ADMIN - ALL QUOTATIONS
# =========================================================

@app.get("/api/admin/quotations")
def get_all_quotations():

    connection = get_connection()

    cursor = connection.cursor()


    cursor.execute("""
        SELECT *
        FROM quotations

        ORDER BY id DESC
    """)


    quotations = [

        dict(row)

        for row in cursor.fetchall()

    ]


    connection.close()


    return {

        "status":
            "success",

        "count":
            len(quotations),

        "quotations":
            quotations

    }


# =========================================================
# ADMIN - GLOBAL STATISTICS
# =========================================================

@app.get("/api/admin/stats")
def get_admin_stats():

    connection = get_connection()

    cursor = connection.cursor()


    cursor.execute("""
        SELECT

            COUNT(*)
                AS total_quotations,

            COALESCE(
                SUM(containers),
                0
            )
                AS total_containers,

            COALESCE(
                SUM(total_freight_usd),
                0
            )
                AS total_freight_usd,

            COALESCE(
                SUM(total_profit_usd),
                0
            )
                AS total_profit_usd,

            COALESCE(
                AVG(actual_margin_percent),
                0
            )
                AS average_margin_percent,

            COUNT(
                DISTINCT LOWER(customer_email)
            )
                AS customer_count

        FROM quotations
    """)


    row = cursor.fetchone()


    connection.close()


    return {

        "status":
            "success",

        "total_quotations":
            row["total_quotations"],

        "total_containers":
            row["total_containers"],

        "total_freight_usd":
            round(
                row["total_freight_usd"],
                2
            ),

        "total_profit_usd":
            round(
                row["total_profit_usd"],
                2
            ),

        "average_margin_percent":
            round(
                row["average_margin_percent"],
                2
            ),

        "customer_count":
            row["customer_count"]

    }


# =========================================================
# ADMIN - CUSTOMER ACTIVITY
# =========================================================

@app.get("/api/admin/customers")
def get_customer_activity():

    connection = get_connection()

    cursor = connection.cursor()


    cursor.execute("""
        SELECT

            LOWER(customer_email)
                AS customer_email,

            COUNT(*)
                AS total_quotations,

            COALESCE(
                SUM(containers),
                0
            )
                AS total_containers,

            COALESCE(
                SUM(total_freight_usd),
                0
            )
                AS total_freight_usd,

            COALESCE(
                SUM(total_profit_usd),
                0
            )
                AS total_profit_usd

        FROM quotations

        WHERE customer_email IS NOT NULL

        GROUP BY LOWER(customer_email)

        ORDER BY total_quotations DESC

    """)


    customers = [

        dict(row)

        for row in cursor.fetchall()

    ]


    connection.close()


    for customer in customers:

        customer["total_freight_usd"] = round(

            customer["total_freight_usd"],

            2

        )

        customer["total_profit_usd"] = round(

            customer["total_profit_usd"],

            2

        )


    return {

        "status":
            "success",

        "count":
            len(customers),

        "customers":
            customers

    }

# =========================================================
# ADMIN - APPROVE / REJECT QUOTATION
# =========================================================

@app.put("/api/admin/quotations/{quotation_id}/status")
def update_quotation_status(
    quotation_id: str,
    status: str
):

    allowed_statuses = [
        "APPROVED",
        "REJECTED",
        "PENDING APPROVAL"
    ]

    status = status.upper()

    if status not in allowed_statuses:
        return {
            "status": "error",
            "message": "Invalid quotation status."
        }

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT quotation_id
        FROM quotations
        WHERE quotation_id = ?
    """, (
        quotation_id,
    ))

    quotation = cursor.fetchone()

    if quotation is None:
        connection.close()

        return {
            "status": "error",
            "message": "Quotation not found."
        }

    cursor.execute("""
        UPDATE quotations
        SET status = ?
        WHERE quotation_id = ?
    """, (
        status,
        quotation_id
    ))

    connection.commit()
    connection.close()

    return {
        "status": "success",
        "quotation_id": quotation_id,
        "quotation_status": status,
        "message": f"Quotation {quotation_id} updated successfully."
    }