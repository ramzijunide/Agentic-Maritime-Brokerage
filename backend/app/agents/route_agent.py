import os
import pandas as pd


class RouteAgent:

    def __init__(self):

        current_file = os.path.abspath(__file__)

        project_root = os.path.dirname(
            os.path.dirname(
                os.path.dirname(current_file)
            )
        )

        self.dataset_path = os.path.join(
            project_root,
            "app",
            "data",
            "routes.csv"
        )

        self.routes = pd.read_csv(self.dataset_path)

    def analyze_route(
        self,
        origin,
        destination,
        cargo_type,
        containers
    ):

        # 1. Find matching routes
        matching_routes = self.routes[
            (self.routes["origin"].str.lower() == origin.lower())
            &
            (self.routes["destination"].str.lower() == destination.lower())
        ].copy()

        # 2. No route found
        if matching_routes.empty:

            return {
                "status": "not_found",
                "message": (
                    f"No route found from {origin} "
                    f"to {destination}"
                )
            }

        # -------------------------------------------------
        # 3. Transit Score
        # Faster route = higher score
        # -------------------------------------------------

        min_transit = matching_routes["transit_days"].min()
        max_transit = matching_routes["transit_days"].max()

        if max_transit == min_transit:
            matching_routes["transit_score"] = 100.0
        else:
            matching_routes["transit_score"] = (
                100
                - (
                    (
                        matching_routes["transit_days"]
                        - min_transit
                    )
                    /
                    (
                        max_transit
                        - min_transit
                    )
                    * 100
                )
            )

        # -------------------------------------------------
        # 4. Distance Score
        # Shorter route = higher score
        # -------------------------------------------------

        min_distance = matching_routes["distance_nm"].min()
        max_distance = matching_routes["distance_nm"].max()

        if max_distance == min_distance:
            matching_routes["distance_score"] = 100.0
        else:
            matching_routes["distance_score"] = (
                100
                - (
                    (
                        matching_routes["distance_nm"]
                        - min_distance
                    )
                    /
                    (
                        max_distance
                        - min_distance
                    )
                    * 100
                )
            )

        # -------------------------------------------------
        # 5. Transshipment Score
        # Fewer transfers = higher score
        # -------------------------------------------------

        min_transshipments = matching_routes[
            "transshipments"
        ].min()

        max_transshipments = matching_routes[
            "transshipments"
        ].max()

        if max_transshipments == min_transshipments:
            matching_routes["transshipment_score"] = 100.0
        else:
            matching_routes["transshipment_score"] = (
                100
                - (
                    (
                        matching_routes["transshipments"]
                        - min_transshipments
                    )
                    /
                    (
                        max_transshipments
                        - min_transshipments
                    )
                    * 100
                )
            )

        # -------------------------------------------------
        # 6. Overall Route Score
        #
        # Transit       = 40%
        # Distance      = 25%
        # Transshipment = 35%
        # -------------------------------------------------

        matching_routes["route_score"] = (
            matching_routes["transit_score"] * 0.40
            +
            matching_routes["distance_score"] * 0.25
            +
            matching_routes["transshipment_score"] * 0.35
        )

        # -------------------------------------------------
        # 7. Sort routes by score
        # -------------------------------------------------

        matching_routes = matching_routes.sort_values(
            "route_score",
            ascending=False
        ).reset_index(drop=True)

        # Best route
        best_route = matching_routes.iloc[0]

        # -------------------------------------------------
        # 8. Prepare alternative routes
        # -------------------------------------------------

        alternatives = []

        for index, route in matching_routes.iloc[1:].iterrows():

            alternatives.append({

                "rank": int(index) + 1,

                "route_id": route["route_id"],

                "route_type": route["route_type"],

                "transit_days": int(
                    route["transit_days"]
                ),

                "distance_nm": int(
                    route["distance_nm"]
                ),

                "transshipments": int(
                    route["transshipments"]
                ),

                "route_score": round(
                    float(route["route_score"]),
                    2
                ),

                "base_freight_usd": float(
                    route["base_freight_usd"]
                ),

                "score_breakdown": {

                    "transit_score": round(
                        float(route["transit_score"]),
                        2
                    ),

                    "distance_score": round(
                        float(route["distance_score"]),
                        2
                    ),

                    "transshipment_score": round(
                        float(route["transshipment_score"]),
                        2
                    )
                }
            })

        # -------------------------------------------------
        # 9. Return recommendation
        # -------------------------------------------------

        return {

            "status": "success",

            "origin": origin,

            "destination": destination,

            "cargo_type": cargo_type,

            "containers": containers,

            "candidate_routes": len(
                matching_routes
            ),

            "recommended_route":
                best_route["route_id"],

            "route_type":
                best_route["route_type"],

            "transit_time_days":
                int(best_route["transit_days"]),

            "distance_nm":
                int(best_route["distance_nm"]),

            "transshipments":
                int(best_route["transshipments"]),

            "route_score": round(
                float(best_route["route_score"]),
                2
            ),

            "score_breakdown": {

                "transit_score": round(
                    float(best_route["transit_score"]),
                    2
                ),

                "distance_score": round(
                    float(best_route["distance_score"]),
                    2
                ),

                "transshipment_score": round(
                    float(best_route["transshipment_score"]),
                    2
                )
            },

            "base_freight_usd": float(
                best_route["base_freight_usd"]
            ),

            "alternatives": alternatives,

            "reason": (
                "Route selected using weighted "
                "transit time, distance, and "
                "transshipment analysis."
            )
        }