from app.agents.pricing_agent import PricingAgent
from app.agents.margin_agent import MarginAgent


class FreightPricingEngine:

    def __init__(self):

        self.pricing_agent = PricingAgent()
        self.margin_agent = MarginAgent()

    def calculate_freight_price(
        self,
        route_id,
        base_freight
    ):

        # Step 1: Calculate operating and
        # demand-adjusted cost
        pricing_result = self.pricing_agent.calculate_pricing(
            route_id=route_id,
            base_freight=base_freight
        )

        if pricing_result["status"] != "success":
            return pricing_result

        # Step 2: Get demand-adjusted cost
        demand_adjusted_cost = (
            pricing_result["demand_adjusted_cost_usd"]
        )

        target_margin = (
            pricing_result["target_margin_percent"]
        )

        # Step 3: Calculate selling price
        margin_result = self.margin_agent.calculate_selling_price(
            demand_adjusted_cost=demand_adjusted_cost,
            target_margin_percent=target_margin
        )

        if margin_result["status"] != "success":
            return margin_result

        # Step 4: Combine pricing + margin results
        return {
            "status": "success",

            "route_id": route_id,

            "base_freight_usd":
                pricing_result["base_freight_usd"],

            "fuel_surcharge_usd":
                pricing_result["fuel_surcharge_usd"],

            "port_charge_usd":
                pricing_result["port_charge_usd"],

            "risk_surcharge_usd":
                pricing_result["risk_surcharge_usd"],

            "demand_factor":
                pricing_result["demand_factor"],

            "operating_cost_usd":
                pricing_result["operating_cost_usd"],

            "demand_adjusted_cost_usd":
                pricing_result["demand_adjusted_cost_usd"],

            "target_margin_percent":
                margin_result["target_margin_percent"],

            "selling_price_usd":
                margin_result["selling_price_usd"],

            "profit_usd":
                margin_result["profit_usd"]
        }