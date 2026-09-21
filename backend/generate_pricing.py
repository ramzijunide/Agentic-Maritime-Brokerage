import os
import pandas as pd


# ---------------------------------------------------------
# Locate routes.csv
# ---------------------------------------------------------

current_file = os.path.abspath(__file__)

project_root = os.path.dirname(current_file)

routes_path = os.path.join(
    project_root,
    "app",
    "data",
    "routes.csv"
)

pricing_path = os.path.join(
    project_root,
    "app",
    "data",
    "pricing.csv"
)


# ---------------------------------------------------------
# Read route dataset
# ---------------------------------------------------------

routes = pd.read_csv(routes_path)


pricing_rows = []


# ---------------------------------------------------------
# Generate pricing data for every route
# ---------------------------------------------------------

for index, route in routes.iterrows():

    route_id = route["route_id"]

    base_freight = float(
        route["base_freight_usd"]
    )

    transshipments = int(
        route["transshipments"]
    )

    route_type = str(
        route["route_type"]
    ).lower()


    # ---------------------------------------------
    # Fuel surcharge
    # ---------------------------------------------

    fuel_surcharge = round(
        base_freight * 0.05
    )


    # ---------------------------------------------
    # Port charge
    # More transfers → slightly higher port cost
    # ---------------------------------------------

    port_charge = (
        60
        + (transshipments * 10)
    )


    # ---------------------------------------------
    # Risk surcharge
    # More transfers → higher operational risk
    # ---------------------------------------------

    risk_surcharge = (
        40
        + (transshipments * 10)
    )


    # Alternative routes get a small risk adjustment
    if route_type == "alternative":
        risk_surcharge += 5


    # ---------------------------------------------
    # Demand factor
    #
    # Deterministic variation:
    # 0.95 / 1.00 / 1.05 / 1.10
    #
    # This is prototype market-demand data.
    # ---------------------------------------------

    demand_values = [
        0.95,
        1.00,
        1.05,
        1.10
    ]

    demand_factor = demand_values[
        index % len(demand_values)
    ]


    # ---------------------------------------------
    # Target brokerage margin
    # ---------------------------------------------

    target_margin = 15


    # ---------------------------------------------
    # Preserve the Infosys example for R001
    # ---------------------------------------------

    if route_id == "R001":

        fuel_surcharge = 100
        port_charge = 75
        risk_surcharge = 50
        demand_factor = 1.00
        target_margin = 15


    # ---------------------------------------------
    # Create pricing record
    # ---------------------------------------------

    pricing_rows.append({

        "pricing_id": f"P{index + 1:03d}",

        "route_id": route_id,

        "fuel_surcharge_usd":
            fuel_surcharge,

        "port_charge_usd":
            port_charge,

        "demand_factor":
            demand_factor,

        "risk_surcharge_usd":
            risk_surcharge,

        "target_margin_percent":
            target_margin
    })


# ---------------------------------------------------------
# Create DataFrame
# ---------------------------------------------------------

pricing = pd.DataFrame(pricing_rows)


# ---------------------------------------------------------
# Save pricing.csv
# ---------------------------------------------------------

pricing.to_csv(
    pricing_path,
    index=False
)


print()
print("======================================")
print("Pricing dataset created successfully")
print("======================================")
print()
print(f"Routes processed : {len(routes)}")
print(f"Pricing records  : {len(pricing)}")
print(f"Output file      : {pricing_path}")
print()
print("R001 pricing:")
print(
    pricing[
        pricing["route_id"] == "R001"
    ].to_string(index=False)
)
print()