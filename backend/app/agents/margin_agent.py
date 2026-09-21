class MarginAgent:

    def calculate_selling_price(
        self,
        demand_adjusted_cost,
        target_margin_percent
    ):

        margin = target_margin_percent / 100

        if margin >= 1:
            return {
                "status": "error",
                "message": "Margin percentage must be less than 100."
            }

        selling_price = (
            demand_adjusted_cost / (1 - margin)
        )

        profit = selling_price - demand_adjusted_cost

        return {
            "status": "success",
            "demand_adjusted_cost_usd": round(
                demand_adjusted_cost, 2
            ),
            "target_margin_percent": target_margin_percent,
            "selling_price_usd": round(
                selling_price, 2
            ),
            "profit_usd": round(
                profit, 2
            )
        }