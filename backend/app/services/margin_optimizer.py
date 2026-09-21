class MarginOptimizer:

    def evaluate_margin(
        self,
        selling_price,
        cost,
        target_margin_percent
    ):

        if selling_price <= 0:
            return {
                "status": "error",
                "message": "Selling price must be greater than zero."
            }

        profit = selling_price - cost

        actual_margin_percent = (
            profit / selling_price
        ) * 100

        margin_difference = (
            actual_margin_percent - target_margin_percent
        )

        if actual_margin_percent >= target_margin_percent:
            margin_status = "Target margin achieved"
        else:
            margin_status = "Below target margin"

        return {
            "status": "success",
            "selling_price_usd": round(selling_price, 2),
            "cost_usd": round(cost, 2),
            "profit_usd": round(profit, 2),
            "actual_margin_percent": round(
                actual_margin_percent, 2
            ),
            "target_margin_percent": target_margin_percent,
            "margin_difference_percent": round(
                margin_difference, 2
            ),
            "margin_status": margin_status
        }