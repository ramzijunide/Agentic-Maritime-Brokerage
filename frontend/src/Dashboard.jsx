import { useEffect, useState } from "react";
import "./App.css";


function Dashboard({ user, onLogout }) {

  // =========================================================
  // FORM STATE
  // =========================================================

  const [origin, setOrigin] = useState("Chennai");

  const [destination, setDestination] =
    useState("Rotterdam");

  const [cargoType, setCargoType] =
    useState("Electronics");

  const [containers, setContainers] =
    useState(10);


  // =========================================================
  // DATA STATE
  // =========================================================

  const [quotation, setQuotation] =
    useState(null);

  const [history, setHistory] =
    useState([]);

  const [stats, setStats] =
    useState(null);


  // =========================================================
  // UI STATE
  // =========================================================

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  // =========================================================
  // API
  // =========================================================

  const API_BASE_URL =
    "http://127.0.0.1:8000";


  // =========================================================
  // CUSTOMER EMAIL
  // =========================================================

  const customerEmail =
    user?.email?.trim().toLowerCase() || "";


  // =========================================================
  // LOAD CUSTOMER DATA
  // =========================================================

  const loadCustomerData = async () => {

    if (!customerEmail) {

      throw new Error(
        "Customer account information is missing."
      );

    }


    // -------------------------------------------------------
    // HISTORY
    // -------------------------------------------------------

    const historyResponse = await fetch(
  `${API_BASE_URL}/api/quotations/history?customer_email=${encodeURIComponent(
    customerEmail
  )}&t=${Date.now()}`,
  {
    cache: "no-store"
  }
);


    if (!historyResponse.ok) {

      throw new Error(
        "Unable to load quotation history."
      );

    }


    const historyData =
      await historyResponse.json();


    if (
      historyData.status !== "success"
    ) {

      throw new Error(
        historyData.message ||
        "Unable to load quotation history."
      );

    }


    const quotationHistory =
      historyData.quotations || [];


    setHistory(
      quotationHistory
    );


    // -------------------------------------------------------
    // STATISTICS
    // -------------------------------------------------------

    const statsResponse = await fetch(
  `${API_BASE_URL}/api/quotations/stats?customer_email=${encodeURIComponent(
    customerEmail
  )}&t=${Date.now()}`,
  {
    cache: "no-store"
  }
);


    if (!statsResponse.ok) {

      throw new Error(
        "Unable to load quotation statistics."
      );

    }


    const statsData =
      await statsResponse.json();


    if (
      statsData.status === "success"
    ) {

      setStats({
        ...statsData,

        total_quotations:
          Number(
            statsData.total_quotations || 0
          ),

        total_containers:
          Number(
            statsData.total_containers || 0
          ),

        total_freight_usd:
          Number(
            statsData.total_freight_usd || 0
          ),

        total_profit_usd:
          Number(
            statsData.total_profit_usd || 0
          ),

        average_margin_percent:
          Number(
            statsData.average_margin_percent || 0
          )
      });

    } else {

      throw new Error(
        statsData.message ||
        "Unable to load quotation statistics."
      );

    }


    return {

      history:
        quotationHistory,

      stats:
        statsData

    };

  };


  // =========================================================
  // INITIAL DATA LOAD
  // =========================================================

  useEffect(() => {

    if (!customerEmail) {
      return;
    }


    loadCustomerData()

      .catch((err) => {

        console.error(
          "Unable to load customer data:",
          err
        );

        setError(
          err.message ||
          "Unable to load customer data."
        );

      });

  }, [customerEmail]);


  // =========================================================
  // GENERATE QUOTATION
  // =========================================================

  const generateQuotation = async (
    event
  ) => {

    event.preventDefault();


    if (loading) {
      return;
    }


    if (!customerEmail) {

      setError(
        "Customer account information is missing. Please sign in again."
      );

      return;

    }


    setLoading(true);

    setError("");

    setQuotation(null);


    try {

      // -----------------------------------------------------
      // Validate containers
      // -----------------------------------------------------

      const containerCount =
        Number(containers);


      if (
        !Number.isInteger(containerCount) ||
        containerCount < 1
      ) {

        throw new Error(
          "Number of containers must be at least 1."
        );

      }


      // -----------------------------------------------------
      // Generate quotation
      // -----------------------------------------------------

      const response = await fetch(
        `${API_BASE_URL}/api/quotations/generate`,
        {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Accept":
              "application/json"

          },

          body: JSON.stringify({

            customer_email:
              customerEmail,

            origin:
              origin.trim(),

            destination:
              destination.trim(),

            cargo_type:
              cargoType,

            containers:
              containerCount

          })

        }
      );


      // -----------------------------------------------------
      // Read response
      // -----------------------------------------------------

      const data =
        await response.json();


      // -----------------------------------------------------
      // HTTP error
      // -----------------------------------------------------

      if (!response.ok) {

        throw new Error(

          data?.detail?.[0]?.msg ||

          data?.message ||

          "Unable to generate quotation."

        );

      }


      // -----------------------------------------------------
      // Application error
      // -----------------------------------------------------

      if (
        data.status !== "success"
      ) {

        throw new Error(
          data.message ||
          "Quotation generation failed."
        );

      }


      // -----------------------------------------------------
      // Show newly generated quotation
      // -----------------------------------------------------

      setQuotation(data);


      // -----------------------------------------------------
      // Refresh history + statistics
      // -----------------------------------------------------

      try {

        await loadCustomerData();

      } catch (refreshError) {

        console.error(
          "Quotation generated, but dashboard refresh failed:",
          refreshError
        );


        /*
         * The quotation itself was successfully generated.
         *
         * We keep the generated quotation visible instead
         * of replacing it with an error.
         *
         * We also refresh the page data below using the
         * newly generated quotation as a fallback.
         */

        setHistory((currentHistory) => {

          const newQuotation = {

            quotation_id:
              data.quotation_id,

             customer_quotation_number:
              data.customer_quotation_number,

            origin:
              data.origin,

            destination:
              data.destination,

            cargo_type:
              data.cargo_type,

            containers:
              data.containers,

            recommended_route:
              data.recommended_route,

            transit_time_days:
              data.transit_time_days,

            total_freight_usd:
              data.total_freight_usd,

            total_profit_usd:
              data.total_profit_usd,

            actual_margin_percent:
              data.actual_margin_percent,

            quotation_status:
              data.quotation_status

          };


          const alreadyExists =
            currentHistory.some(
              (item) =>
                item.quotation_id ===
                newQuotation.quotation_id
            );


          if (alreadyExists) {

            return currentHistory;

          }


          return [
            newQuotation,
            ...currentHistory
          ];

        });


        setStats((currentStats) => {

          const existingStats = {

            total_quotations:
              Number(
                currentStats?.total_quotations || 0
              ),

            total_containers:
              Number(
                currentStats?.total_containers || 0
              ),

            total_freight_usd:
              Number(
                currentStats?.total_freight_usd || 0
              ),

            total_profit_usd:
              Number(
                currentStats?.total_profit_usd || 0
              ),

            average_margin_percent:
              Number(
                currentStats?.average_margin_percent || 0
              )

          };


          const newContainers =
            Number(
              data.containers || 0
            );


          const newFreight =
            Number(
              data.total_freight_usd || 0
            );


          const newProfit =
            Number(
              data.total_profit_usd || 0
            );


          const newMargin =
            Number(
              data.actual_margin_percent || 0
            );


          const oldQuotationCount =
            existingStats.total_quotations;


          const newQuotationCount =
            oldQuotationCount + 1;


          const newTotalContainers =
            existingStats.total_containers +
            newContainers;


          const newTotalFreight =
            existingStats.total_freight_usd +
            newFreight;


          const newTotalProfit =
            existingStats.total_profit_usd +
            newProfit;


          const newAverageMargin =
            (
              (
                existingStats.average_margin_percent *
                oldQuotationCount
              ) +
              newMargin
            ) /
            newQuotationCount;


          return {

            status:
              "success",

            total_quotations:
              newQuotationCount,

            total_containers:
              newTotalContainers,

            total_freight_usd:
              newTotalFreight,

            total_profit_usd:
              newTotalProfit,

            average_margin_percent:
              Number(
                newAverageMargin.toFixed(2)
              )

          };

        });

      }


    } catch (err) {

      console.error(
        "Quotation generation error:",
        err
      );


      setError(
        err.message ||
        "Something went wrong."
      );

    } finally {

      setLoading(false);

    }

  };


  // =========================================================
  // MONEY FORMAT
  // =========================================================

  const money = (value) =>

    `$${Number(value || 0).toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )}`;


  // =========================================================
  // CUSTOMER STATUS SUMMARY
  // =========================================================

  const pendingQuotations = history.filter(
    (item) => (item.status || "PENDING APPROVAL") === "PENDING APPROVAL"
  ).length;

  const approvedQuotations = history.filter(
    (item) => item.status === "APPROVED"
  ).length;

  const rejectedQuotations = history.filter(
    (item) => item.status === "REJECTED"
  ).length;

  const analyticsHistory = [...history]
    .slice()
    .reverse();

  const maxFreight = Math.max(
    ...analyticsHistory.map(
      (item) => Number(item.total_freight_usd || 0)
    ),
    1
  );

  const maxContainers = Math.max(
    ...analyticsHistory.map(
      (item) => Number(item.containers || 0)
    ),
    1
  );


  // =========================================================
  // DASHBOARD
  // =========================================================

  return (

    <div className="enterprise-dashboard">


      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside className="enterprise-sidebar">


        <div className="enterprise-logo">

          <div className="logo-mark">
            MB
          </div>


          <div>

            <strong>
              Maritime
            </strong>

            <span>
              Brokerage
            </span>

          </div>

        </div>


        <div className="sidebar-section-title">
          WORKSPACE
        </div>


        <nav className="enterprise-nav">

          <button
            className="nav-item active"
          >

            <span>
              Overview
            </span>

          </button>


          <button
            className="nav-item"
            onClick={() =>
              document
                .getElementById(
                  "new-shipment"
                )
                ?.scrollIntoView({
                  behavior: "smooth"
                })
            }
          >

            <span>
              New Quotation
            </span>

          </button>


          <button
            className="nav-item"
            onClick={() =>
              document
                .getElementById(
                  "quotation-history"
                )
                ?.scrollIntoView({
                  behavior: "smooth"
                })
            }
          >

            <span>
              Quotation History
            </span>

          </button>


          <button
            className="nav-item"
            onClick={() =>
              document
                .getElementById(
                  "route-intelligence"
                )
                ?.scrollIntoView({
                  behavior: "smooth"
                })
            }
          >

            <span>
              Route Intelligence
            </span>

          </button>


          <button
            className="nav-item"
            onClick={() =>
              document
                .getElementById(
                  "customer-analytics"
                )
                ?.scrollIntoView({
                  behavior: "smooth"
                })
            }
          >

            <span>
              Analytics
            </span>

          </button>


          <button
            className="nav-item"
            onClick={() =>
              document
                .getElementById(
                  "customer-account"
                )
                ?.scrollIntoView({
                  behavior: "smooth"
                })
            }
          >

            <span>
              Account
            </span>

          </button>

        </nav>


        <div className="sidebar-section-title">
          SYSTEM
        </div>


        <div className="system-status">

          <span className="status-dot"></span>


          <div>

            <strong>
              System Online
            </strong>

            <small>
              API connected
            </small>

          </div>

        </div>


        <div className="sidebar-bottom">


          <div className="sidebar-user">

            <div className="user-avatar">

              {customerEmail
                ? customerEmail
                    .charAt(0)
                    .toUpperCase()
                : "C"}

            </div>


            <div>

              <strong>
                {user?.name || "Customer"}
              </strong>

              <small>
                {customerEmail}
              </small>

            </div>

          </div>


          <button
            className="logout-button"
            onClick={onLogout}
          >

            Sign out

          </button>

        </div>

      </aside>


      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <main className="enterprise-main">


        {/* ===================================================
            TOP BAR
            =================================================== */}

        <header className="enterprise-topbar">


          <div>

            <p className="eyebrow">
              CUSTOMER WORKSPACE
            </p>


            <h1>
              Shipment Overview
            </h1>


            <p className="page-description">
              Generate intelligent freight quotations and
              review your shipment history.
            </p>

          </div>


          <div className="topbar-user">


            <div className="topbar-avatar">

              {customerEmail
                ? customerEmail
                    .charAt(0)
                    .toUpperCase()
                : "C"}

            </div>


            <div>

              <strong>
                {user?.name || "Customer Account"}
              </strong>

              <span>
                {customerEmail}
              </span>

            </div>

          </div>

        </header>


        {/* ===================================================
            STATISTICS
            =================================================== */}

        <section className="enterprise-stats">


          <div className="stat-card">

            <span className="stat-label">
              TOTAL QUOTATIONS
            </span>


            <strong>
              {stats?.total_quotations ?? 0}
            </strong>


            <small>
              Generated quotations
            </small>

          </div>


          <div className="stat-card">

            <span className="stat-label">
              CONTAINERS
            </span>


            <strong>
              {stats?.total_containers ?? 0}
            </strong>


            <small>
              Total containers quoted
            </small>

          </div>


          <div className="stat-card">

            <span className="stat-label">
              TOTAL FREIGHT
            </span>


            <strong>
              {money(
                stats?.total_freight_usd
              )}
            </strong>


            <small>
              Quoted freight value
            </small>

          </div>


          <div className="stat-card highlight-stat">

            <span className="stat-label">
              AVERAGE MARGIN
            </span>


            <strong>
              {stats?.average_margin_percent ?? 0}%
            </strong>


            <small>
              Quotation margin
            </small>

          </div>


        </section>


        {/* ===================================================
            CUSTOMER INTELLIGENCE
            =================================================== */}

        <section
          id="route-intelligence"
          className="enterprise-card customer-intelligence-section"
        >

          <div className="section-heading">
            <div>
              <p className="eyebrow">BROKERAGE INTELLIGENCE</p>
              <h2>Route & Pricing Intelligence</h2>
              <p>
                Your quotation is evaluated by the brokerage agents before the final freight price is generated.
              </p>
            </div>

            <div className="engine-badge">
              <span></span>
              3 AGENTS ACTIVE
            </div>
          </div>

          <div className="customer-agent-grid">
            <div className="customer-agent-card">
              <div className="agent-icon">↗</div>
              <div>
                <strong>Route Agent</strong>
                <span>Transit • Distance • Transshipment</span>
              </div>
              <b>ACTIVE</b>
            </div>

            <div className="customer-agent-card">
              <div className="agent-icon">$</div>
              <div>
                <strong>Pricing Agent</strong>
                <span>Fuel • Port • Risk • Demand</span>
              </div>
              <b>ACTIVE</b>
            </div>

            <div className="customer-agent-card">
              <div className="agent-icon">%</div>
              <div>
                <strong>Margin Agent</strong>
                <span>Dynamic selling-price calculation</span>
              </div>
              <b>ACTIVE</b>
            </div>
          </div>

          <div className="customer-intelligence-note">
            <span>i</span>
            <p>
              The system compares candidate routes using weighted route scoring, then applies dynamic pricing and the configured brokerage margin.
            </p>
          </div>

        </section>


        {/* ===================================================
            NEW SHIPMENT
            ===================================================
            */}

        <section
          id="new-shipment"
          className="enterprise-card shipment-section"
        >


          <div className="section-heading">


            <div>

              <p className="eyebrow">
                NEW REQUEST
              </p>


              <h2>
                Create Freight Quotation
              </h2>


              <p>
                Enter your shipment requirements and let the
                brokerage engine calculate the route and
                dynamic price.
              </p>

            </div>


            <div className="engine-badge">

              <span></span>

              ROUTE + PRICING ENGINE

            </div>

          </div>


          <form
            className="shipment-form"
            onSubmit={generateQuotation}
          >


            {/* ORIGIN */}

            <div className="form-field">

              <label>
                Origin Port
              </label>


              <input
                type="text"
                value={origin}
                onChange={(e) =>
                  setOrigin(
                    e.target.value
                  )
                }
                required
              />

            </div>


            {/* DESTINATION */}

            <div className="form-field">

              <label>
                Destination Port
              </label>


              <input
                type="text"
                value={destination}
                onChange={(e) =>
                  setDestination(
                    e.target.value
                  )
                }
                required
              />

            </div>


            {/* CARGO */}

            <div className="form-field">

              <label>
                Cargo Type
              </label>


              <select
                value={cargoType}
                onChange={(e) =>
                  setCargoType(
                    e.target.value
                  )
                }
              >

                <option>
                  Electronics
                </option>

                <option>
                  Machinery
                </option>

                <option>
                  Textiles
                </option>

                <option>
                  Automotive
                </option>

                <option>
                  Food Products
                </option>

                <option>
                  Pharmaceuticals
                </option>

              </select>

            </div>


            {/* CONTAINERS */}

            <div className="form-field">

              <label>
                Number of Containers
              </label>


              <input
                type="number"
                min="1"
                value={containers}
                onChange={(e) =>
                  setContainers(
                    e.target.value
                  )
                }
                required
              />

            </div>


            {/* FORM ACTION */}

            <div className="form-actions">


              <button
                type="submit"
                className="generate-button"
                disabled={loading}
              >

                {loading
                  ? "Calculating..."
                  : "Generate Quotation"}

              </button>


              <span className="form-note">
                Route selection and pricing are calculated automatically.
              </span>

            </div>


          </form>


          {/* ERROR */}

          {error && (

            <div className="enterprise-error">
              {error}
            </div>

          )}


        </section>


        {/* ===================================================
            QUOTATION RESULT
            =================================================== */}

        {quotation && (

          <section
            className="enterprise-card quotation-section"
          >


            <div className="quotation-header">


              <div>

                <p className="eyebrow">
                  QUOTATION GENERATED
                </p>


                <h2>
                  Quotation{" "}
                  {quotation.customer_quotation_number
                  ? `Q${String(quotation.customer_quotation_number
                ).padStart(4, "0")}`
                : quotation.quotation_id}
                </h2>

               {quotation.quotation_id && (
           <p
              style={{
                margin: "6px 0 0",
                color: "#667085",
                fontSize: "13px"
              }}
             >
                 Internal Reference: {quotation.quotation_id}
               </p>
              )}

              </div>


              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap"
                }}
              >
                <div className="success-badge">
                  Target margin achieved
                </div>

                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "999px",
                    background:
                      quotation.quotation_status === "APPROVED"
                        ? "#ecfdf3"
                        : quotation.quotation_status === "REJECTED"
                        ? "#fef2f2"
                        : "#fffaeb",
                    color:
                      quotation.quotation_status === "APPROVED"
                        ? "#027a48"
                        : quotation.quotation_status === "REJECTED"
                        ? "#b42318"
                        : "#b54708",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.4px"
                  }}
                >
                  {quotation.quotation_status || "PENDING APPROVAL"}
                </div>
              </div>

            </div>


            {/* ROUTE */}

            <div className="route-result">


              <div className="route-main">

                <span className="result-label">
                  RECOMMENDED ROUTE
                </span>


                <strong>
                  {quotation.recommended_route}
                </strong>


                <div className="route-path">

                  {quotation.origin}

                  <span>
                    →
                  </span>

                  {quotation.destination}

                </div>

              </div>


              <div className="route-metric">

                <span>
                  Transit
                </span>


                <strong>
                  {quotation.transit_time_days}
                  {" "}days
                </strong>

              </div>


              <div className="route-metric">

                <span>
                  Distance
                </span>


                <strong>
                  {Number(
                    quotation.distance_nm
                  ).toLocaleString()}
                  {" "}NM
                </strong>

              </div>


              <div className="route-metric">

                <span>
                  Route Score
                </span>


                <strong>
                  {quotation.route_score}
                </strong>

              </div>


            </div>


            {/* ===================================================
                ROUTE DECISION & ALTERNATIVES
                =================================================== */}

            <div
              style={{
                marginTop: "28px",
                padding: "24px",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                background: "#fafafa"
              }}
            >
              <div style={{ marginBottom: "20px" }}>
                <p className="eyebrow">ROUTE INTELLIGENCE</p>
                <h3 style={{ margin: "4px 0 8px", fontSize: "20px" }}>
                  Why this route was recommended
                </h3>
                <p style={{ margin: 0, color: "#667085", lineHeight: 1.6 }}>
                  The Route Agent evaluated the available candidate routes using
                  weighted analysis of transit time, distance, and transshipments,
                  then ranked the routes and selected the highest-scoring option.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: "12px",
                  marginBottom: "24px"
                }}
              >
                <div className="price-card"><span>Transit Weight</span><strong>40%</strong></div>
                <div className="price-card"><span>Distance Weight</span><strong>25%</strong></div>
                <div className="price-card"><span>Transshipment Weight</span><strong>35%</strong></div>
                <div className="price-card primary-price">
                  <span>Candidate Routes</span>
                  <strong>{quotation.candidate_routes ?? ((quotation.alternatives || []).length + 1)}</strong>
                </div>
              </div>

              {quotation.score_breakdown && (
                <div style={{ marginBottom: "24px" }}>
                  <h4 style={{ margin: "0 0 14px", fontSize: "15px" }}>
                    Recommended Route Score Breakdown
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: "12px"
                    }}
                  >
                    <div className="price-card">
                      <span>Transit Score</span>
                      <strong>{quotation.score_breakdown.transit_score}</strong>
                    </div>
                    <div className="price-card">
                      <span>Distance Score</span>
                      <strong>{quotation.score_breakdown.distance_score}</strong>
                    </div>
                    <div className="price-card">
                      <span>Transshipment Score</span>
                      <strong>{quotation.score_breakdown.transshipment_score}</strong>
                    </div>
                  </div>
                </div>
              )}

              {quotation.alternatives && quotation.alternatives.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 14px", fontSize: "15px" }}>
                    Alternative Routes Considered
                  </h4>
                  <div className="history-table-wrapper">
                    <table className="enterprise-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Route</th>
                          <th>Type</th>
                          <th>Transit</th>
                          <th>Distance</th>
                          <th>Transshipments</th>
                          <th>Score</th>
                          <th>Base Freight</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotation.alternatives.map((route) => (
                          <tr key={route.route_id}>
                            <td><strong>#{route.rank}</strong></td>
                            <td><span className="route-id">{route.route_id}</span></td>
                            <td>{route.route_type}</td>
                            <td>{route.transit_days} days</td>
                            <td>{Number(route.distance_nm || 0).toLocaleString()} NM</td>
                            <td>{route.transshipments}</td>
                            <td><strong>{route.route_score}</strong></td>
                            <td>{money(route.base_freight_usd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(!quotation.alternatives || quotation.alternatives.length === 0) && (
                <div className="empty-history">
                  No alternative routes were returned for this shipment.
                </div>
              )}
            </div>

            {/* PRICE GRID */}

            <div className="price-grid">


              <div className="price-card">

                <span>
                  Base Freight / Container
                </span>


                <strong>
                  {money(
                    quotation
                      .base_freight_per_container_usd
                  )}
                </strong>

              </div>


              <div className="price-card">

                <span>
                  Operating Cost / Container
                </span>


                <strong>
                  {money(
                    quotation
                      .operating_cost_per_container_usd
                  )}
                </strong>

              </div>


              <div className="price-card">

                <span>
                  Selling Price / Container
                </span>


                <strong>
                  {money(
                    quotation
                      .selling_price_per_container_usd
                  )}
                </strong>

              </div>


              <div className="price-card primary-price">

                <span>
                  Total Quotation
                </span>


                <strong>
                  {money(
                    quotation.total_freight_usd
                  )}
                </strong>

              </div>


            </div>


            {/* PRICING DETAILS */}

            <div className="pricing-details">


              <div>

                <span>
                  Fuel surcharge
                </span>


                <strong>
                  {money(
                    quotation.fuel_surcharge_usd
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Port charges
                </span>


                <strong>
                  {money(
                    quotation.port_charge_usd
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Risk surcharge
                </span>


                <strong>
                  {money(
                    quotation.risk_surcharge_usd
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Demand factor
                </span>


                <strong>
                  {quotation.demand_factor}
                </strong>

              </div>


              <div>

                <span>
                  Profit / Container
                </span>


                <strong>
                  {money(
                    quotation
                      .profit_per_container_usd
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Total Profit
                </span>


                <strong>
                  {money(
                    quotation.total_profit_usd
                  )}
                </strong>

              </div>


            </div>


          </section>

        )}


        {/* ===================================================
            HISTORY
            =================================================== */}

        <section
          id="quotation-history"
          className="enterprise-card history-section"
        >


          <div className="section-heading history-heading">


            <div>

              <p className="eyebrow">
                RECORDS
              </p>


              <h2>
                Quotation History
              </h2>


              <p>
                Previous quotations generated for your account.
              </p>

            </div>


            <span className="record-count">

              {history.length}
              {" "}records

            </span>

          </div>


          {history.length === 0 ? (

            <div className="empty-history">

              No quotations have been generated yet.

            </div>

          ) : (

            <div className="history-table-wrapper">


              <table className="enterprise-table">


                <thead>

                  <tr>

                    <th>
                      Quotation
                    </th>

                    <th>
                      Route
                    </th>

                    <th>
                      Cargo
                    </th>

                    <th>
                      Containers
                    </th>

                    <th>
                      Route ID
                    </th>

                    <th>
                      Transit
                    </th>

                    <th>
                      Freight
                    </th>

                    <th>
                      Profit
                    </th>

                    <th>
                      Margin
                    </th>

                    <th>
                      Status
                    </th>

                  </tr>

                </thead>


                <tbody>


                  {history.map(
                    (item) => (

                      <tr
                        key={
                          item.quotation_id
                        }
                      >


                        <td>

                          <strong>
  {item.customer_quotation_number
    ? `Q${String(
        item.customer_quotation_number
      ).padStart(4, "0")}`
    : item.quotation_id}
</strong>

{item.quotation_id && (
  <small
    style={{
      display: "block",
      marginTop: "4px",
      color: "#667085",
      fontSize: "11px"
    }}
  >
    Ref: {item.quotation_id}
  </small>
)}

                        </td>


                        <td>

                          {item.origin}

                          {" → "}

                          {item.destination}

                        </td>


                        <td>
                          {item.cargo_type}
                        </td>


                        <td>
                          {item.containers}
                        </td>


                        <td>

                          <span className="route-id">

                            {item.recommended_route}

                          </span>

                        </td>


                        <td>

                          {item.transit_time_days}
                          {" "}days

                        </td>


                        <td>

                          {money(
                            item.total_freight_usd
                          )}

                        </td>


                        <td>

                          {money(
                            item.total_profit_usd
                          )}

                        </td>


                        <td>

                          {item.actual_margin_percent}%

                        </td>

                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "6px 10px",
                              borderRadius: "999px",
                              background:
                                item.status === "APPROVED"
                                  ? "#ecfdf3"
                                  : item.status === "REJECTED"
                                  ? "#fef2f2"
                                  : "#fffaeb",
                              color:
                                item.status === "APPROVED"
                                  ? "#027a48"
                                  : item.status === "REJECTED"
                                  ? "#b42318"
                                  : "#b54708",
                              fontSize: "11px",
                              fontWeight: 700,
                              whiteSpace: "nowrap"
                            }}
                          >
                            {item.status || "PENDING APPROVAL"}
                          </span>
                        </td>


                      </tr>

                    )
                  )}


                </tbody>


              </table>


            </div>

          )}


        </section>


        {/* ===================================================
            CUSTOMER ANALYTICS
            =================================================== */}

        <section
          id="customer-analytics"
          className="enterprise-card customer-analytics-section"
        >

          <div className="section-heading">

            <div>
              <p className="eyebrow">CUSTOMER ANALYTICS</p>
              <h2>Shipment Analytics</h2>
              <p>
                Visual summary of your quotation activity, freight value,
                container volume, and approval status.
              </p>
            </div>

            <div className="engine-badge">
              <span></span>
              CUSTOMER DATA
            </div>

          </div>


          {/* ANALYTICS SUMMARY */}

          <div className="analytics-summary-grid">

            <div className="analytics-summary-card">
              <span>Total Requests</span>
              <strong>{history.length}</strong>
              <small>Quotations generated</small>
            </div>

            <div className="analytics-summary-card">
              <span>Approved</span>
              <strong>{approvedQuotations}</strong>
              <small>Approved quotations</small>
            </div>

            <div className="analytics-summary-card">
              <span>Pending</span>
              <strong>{pendingQuotations}</strong>
              <small>Awaiting review</small>
            </div>

            <div className="analytics-summary-card">
              <span>Rejected</span>
              <strong>{rejectedQuotations}</strong>
              <small>Rejected quotations</small>
            </div>

          </div>


          {history.length === 0 ? (

            <div className="empty-history">
              Generate a quotation to start seeing your shipment analytics.
            </div>

          ) : (

            <>

              {/* FREIGHT CHART */}

              <div className="analytics-chart-card">

                <div className="analytics-chart-heading">
                  <div>
                    <h3>Freight by Quotation</h3>
                    <p>Total quoted freight value for each customer quotation.</p>
                  </div>
                  <span>{history.length} quotations</span>
                </div>

                <div className="analytics-bar-chart">

                  {analyticsHistory.map((item) => {

                    const freight =
                      Number(item.total_freight_usd || 0);

                    const height =
                      Math.max(
                        (freight / maxFreight) * 100,
                        4
                      );

                    const quotationNumber =
                      item.customer_quotation_number
                        ? `Q${String(
                            item.customer_quotation_number
                          ).padStart(4, "0")}`
                        : item.quotation_id;

                    return (
                      <div
                        className="analytics-bar-column"
                        key={`freight-${item.quotation_id}`}
                      >

                        <span className="analytics-bar-value">
                          {money(freight)}
                        </span>

                        <div className="analytics-bar-track">
                          <div
                            className="analytics-bar-fill freight-bar"
                            style={{
                              height: `${height}%`
                            }}
                          ></div>
                        </div>

                        <strong>
                          {quotationNumber}
                        </strong>

                      </div>
                    );

                  })}

                </div>

              </div>


              {/* CONTAINER + STATUS */}

              <div className="analytics-two-column">

                <div className="analytics-chart-card">

                  <div className="analytics-chart-heading">
                    <div>
                      <h3>Containers by Quotation</h3>
                      <p>Container volume requested in each quotation.</p>
                    </div>
                  </div>

                  <div className="container-chart">

                    {analyticsHistory.map((item) => {

                      const count =
                        Number(item.containers || 0);

                      const width =
                        Math.max(
                          (count / maxContainers) * 100,
                          3
                        );

                      const quotationNumber =
                        item.customer_quotation_number
                          ? `Q${String(
                              item.customer_quotation_number
                            ).padStart(4, "0")}`
                          : item.quotation_id;

                      return (
                        <div
                          className="container-chart-row"
                          key={`containers-${item.quotation_id}`}
                        >

                          <span>
                            {quotationNumber}
                          </span>

                          <div className="container-bar-track">
                            <div
                              className="container-bar-fill"
                              style={{
                                width: `${width}%`
                              }}
                            ></div>
                          </div>

                          <strong>
                            {count}
                          </strong>

                        </div>
                      );

                    })}

                  </div>

                </div>


                <div className="analytics-chart-card">

                  <div className="analytics-chart-heading">
                    <div>
                      <h3>Quotation Pipeline</h3>
                      <p>Current approval status of your requests.</p>
                    </div>
                  </div>

                  <div className="status-analytics">

                    <div className="status-analytics-row">
                      <div>
                        <span className="status-dot-large pending-dot"></span>
                        <strong>Pending Approval</strong>
                      </div>
                      <b>{pendingQuotations}</b>
                    </div>

                    <div className="status-analytics-progress">
                      <span
                        className="pending-progress"
                        style={{
                          width: `${history.length
                            ? (pendingQuotations / history.length) * 100
                            : 0}%`
                        }}
                      ></span>
                    </div>


                    <div className="status-analytics-row">
                      <div>
                        <span className="status-dot-large approved-dot"></span>
                        <strong>Approved</strong>
                      </div>
                      <b>{approvedQuotations}</b>
                    </div>

                    <div className="status-analytics-progress">
                      <span
                        className="approved-progress"
                        style={{
                          width: `${history.length
                            ? (approvedQuotations / history.length) * 100
                            : 0}%`
                        }}
                      ></span>
                    </div>


                    <div className="status-analytics-row">
                      <div>
                        <span className="status-dot-large rejected-dot"></span>
                        <strong>Rejected</strong>
                      </div>
                      <b>{rejectedQuotations}</b>
                    </div>

                    <div className="status-analytics-progress">
                      <span
                        className="rejected-progress"
                        style={{
                          width: `${history.length
                            ? (rejectedQuotations / history.length) * 100
                            : 0}%`
                        }}
                      ></span>
                    </div>


                    <div className="analytics-approval-rate">
                      <span>Approval Rate</span>
                      <strong>
                        {history.length
                          ? (
                              (approvedQuotations /
                                history.length) *
                              100
                            ).toFixed(1)
                          : "0.0"}%
                      </strong>
                    </div>

                  </div>

                </div>

              </div>


              {/* CUSTOMER FINANCIAL SUMMARY */}

              <div className="analytics-financial-strip">

                <div>
                  <span>Total Freight</span>
                  <strong>
                    {money(stats?.total_freight_usd)}
                  </strong>
                </div>

                <div>
                  <span>Total Profit</span>
                  <strong>
                    {money(stats?.total_profit_usd)}
                  </strong>
                </div>

                <div>
                  <span>Average Margin</span>
                  <strong>
                    {stats?.average_margin_percent ?? 0}%
                  </strong>
                </div>

                <div>
                  <span>Total Containers</span>
                  <strong>
                    {stats?.total_containers ?? 0}
                  </strong>
                </div>

              </div>

            </>

          )}

        </section>


        {/* ===================================================
            ACCOUNT
            =================================================== */}

        <section
          id="customer-account"
          className="enterprise-card customer-account-section"
        >
          <div>
            <p className="eyebrow">ACCOUNT</p>
            <h2>Customer Account</h2>
            <p>Signed in as <strong>{user?.name || "Customer"}</strong> • {customerEmail}</p>
          </div>

          <div className="account-status-grid">
            <div><span>Pending</span><strong>{pendingQuotations}</strong></div>
            <div><span>Approved</span><strong>{approvedQuotations}</strong></div>
            <div><span>Total Requests</span><strong>{history.length}</strong></div>
          </div>
        </section>


        {/* ===================================================
            FOOTER
            =================================================== */}

        <footer className="enterprise-footer">


          <div>

            <strong>
              Maritime Brokerage Platform
            </strong>


            <span>
              Agentic route intelligence & dynamic pricing
            </span>

          </div>


          <div className="footer-status">

            <span></span>

            Backend API Connected

          </div>


        </footer>


      </main>


    </div>

  );

}


export default Dashboard;