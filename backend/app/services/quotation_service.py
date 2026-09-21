from app.agents.route_agent import RouteAgent
from app.services.freight_pricing_engine import FreightPricingEngine
from app.services.margin_optimizer import MarginOptimizer


class QuotationService:

    def __init__(self):

        self.route_agent = RouteAgent()

        self.pricing_engine = FreightPricingEngine()

        self.margin_optimizer = MarginOptimizer()


    def generate_quotation(
        self,
        origin,
        destination,
        cargo_type,
        containers
    ):

        # -------------------------------------------------
        # STEP 1: ROUTE ANALYSIS
        # -------------------------------------------------

        route_result = self.route_agent.analyze_route(
            origin=origin,
            destination=destination,
            cargo_type=cargo_type,
            containers=containers
        )


        if route_result["status"] != "success":

            return route_result


        # -------------------------------------------------
        # STEP 2: GET RECOMMENDED ROUTE
        # -------------------------------------------------

        recommended_route = (
            route_result["recommended_route"]
        )

        base_freight = (
            route_result["base_freight_usd"]
        )


        # -------------------------------------------------
        # STEP 3: DYNAMIC FREIGHT PRICING
        # -------------------------------------------------

        pricing_result = (
            self.pricing_engine.calculate_freight_price(
                route_id=recommended_route,
                base_freight=base_freight
            )
        )


        if pricing_result["status"] != "success":

            return pricing_result


        demand_adjusted_cost = (
            pricing_result[
                "demand_adjusted_cost_usd"
            ]
        )


        target_margin = (
            pricing_result[
                "target_margin_percent"
            ]
        )


        # -------------------------------------------------
        # STEP 4: MARGIN OPTIMIZATION
        # -------------------------------------------------

        selling_price_per_container = (
            pricing_result[
                "selling_price_usd"
            ]
        )


        margin_result = (
            self.margin_optimizer.evaluate_margin(
                selling_price=selling_price_per_container,
                cost=demand_adjusted_cost,
                target_margin_percent=target_margin
            )
        )


        if margin_result["status"] != "success":

            return margin_result


        # -------------------------------------------------
        # STEP 5: TOTAL QUOTATION
        # -------------------------------------------------

        total_freight = (
            selling_price_per_container
            * containers
        )


        total_profit = (
            margin_result["profit_usd"]
            * containers
        )


        # -------------------------------------------------
        # STEP 6: FINAL RESPONSE
        # -------------------------------------------------

        return {

            "status": "success",

            "origin": origin,

            "destination": destination,

            "cargo_type": cargo_type,

            "containers": containers,

            "recommended_route":
                recommended_route,

            "route_type":
                route_result["route_type"],

            "transit_time_days":
                route_result["transit_time_days"],

            "distance_nm":
                route_result["distance_nm"],

            "transshipments":
                route_result["transshipments"],

            "route_score":
                route_result["route_score"],

            "score_breakdown":
                route_result["score_breakdown"],

            "base_freight_per_container_usd":
                pricing_result[
                    "base_freight_usd"
                ],

            "fuel_surcharge_usd":
                pricing_result[
                    "fuel_surcharge_usd"
                ],

            "port_charge_usd":
                pricing_result[
                    "port_charge_usd"
                ],

            "risk_surcharge_usd":
                pricing_result[
                    "risk_surcharge_usd"
                ],

            "demand_factor":
                pricing_result[
                    "demand_factor"
                ],

            "operating_cost_per_container_usd":
                pricing_result[
                    "operating_cost_usd"
                ],

            "demand_adjusted_cost_per_container_usd":
                demand_adjusted_cost,

            "target_margin_percent":
                margin_result[
                    "target_margin_percent"
                ],

            "actual_margin_percent":
                margin_result[
                    "actual_margin_percent"
                ],

            "margin_difference_percent":
                margin_result[
                    "margin_difference_percent"
                ],

            "margin_status":
                margin_result[
                    "margin_status"
                ],

            "selling_price_per_container_usd":
                margin_result[
                    "selling_price_usd"
                ],

            "profit_per_container_usd":
                margin_result[
                    "profit_usd"
                ],

            "total_freight_usd":
                round(total_freight, 2),

            "total_profit_usd":
                round(total_profit, 2),

            "alternatives":
                route_result["alternatives"],

            "message":
                "Dynamic quotation generated successfully."
        }