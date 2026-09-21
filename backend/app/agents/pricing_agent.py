import pandas as pd
from pathlib import Path


class PricingAgent:

    def __init__(self):

        base_dir = Path(__file__).resolve().parent.parent
        pricing_file = base_dir / "data" / "pricing.csv"

        self.pricing_data = pd.read_csv(pricing_file)

    def calculate_pricing(self, route_id, base_freight):

        pricing_record = self.pricing_data[
            self.pricing_data["route_id"].astype(str).str.upper()
            == str(route_id).upper()
        ]

        if pricing_record.empty:
            return {
                "status": "error",
                "message": f"No pricing data found for route {route_id}"
            }

        pricing = pricing_record.iloc[0]

        fuel_surcharge = float(pricing["fuel_surcharge_usd"])
        port_charge = float(pricing["port_charge_usd"])
        demand_factor = float(pricing["demand_factor"])
        risk_surcharge = float(pricing["risk_surcharge_usd"])
        target_margin = float(pricing["target_margin_percent"])

        operating_cost = (
            float(base_freight)
            + fuel_surcharge
            + port_charge
            + risk_surcharge
        )

        demand_adjusted_cost = (
            operating_cost * demand_factor
        )

        return {
            "status": "success",
            "route_id": route_id,
            "base_freight_usd": float(base_freight),

            "fuel_surcharge_usd": fuel_surcharge,
            "port_charge_usd": port_charge,
            "risk_surcharge_usd": risk_surcharge,

            "demand_factor": demand_factor,

            "operating_cost_usd": operating_cost,
            "demand_adjusted_cost_usd": demand_adjusted_cost,

            "target_margin_percent": target_margin
        }