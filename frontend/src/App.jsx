import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import Dashboard from "./Dashboard";
import "./App.css";



function AdminDashboard({ user, onLogout }) {

  const [stats, setStats] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [adminSection, setAdminSection] = useState("dashboard");

  const loadAdminData = async () => {

    setLoading(true);
    setError("");

    try {

      const [statsResponse, quotationsResponse] =
        await Promise.all([
          fetch("http://127.0.0.1:8000/api/admin/stats"),
          fetch("http://127.0.0.1:8000/api/admin/quotations")
        ]);

      const statsData = await statsResponse.json();
      const quotationsData = await quotationsResponse.json();

      if (
        !statsResponse.ok ||
        statsData.status !== "success"
      ) {
        throw new Error(
          statsData.message || "Unable to load admin statistics."
        );
      }

      if (
        !quotationsResponse.ok ||
        quotationsData.status !== "success"
      ) {
        throw new Error(
          quotationsData.message || "Unable to load quotations."
        );
      }

      setStats(statsData);
      setQuotations(quotationsData.quotations || []);

    } catch (loadError) {

      console.error("Admin data error:", loadError);

      setError(
        "Unable to load admin data. Please make sure FastAPI is running."
      );

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const updateQuotationStatus = async (
    quotationId,
    newStatus
  ) => {

    setActionLoading(quotationId);
    setError("");

    try {

      const response = await fetch(
        `http://127.0.0.1:8000/api/admin/quotations/${quotationId}/status?status=${encodeURIComponent(newStatus)}`,
        {
          method: "PUT",
          headers: {
            "Accept": "application/json"
          }
        }
      );

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(
          data.message ||
          "Unable to update quotation status."
        );
      }

      setSelectedQuotation(null);
      await loadAdminData();

    } catch (statusError) {

      console.error(
        "Quotation status error:",
        statusError
      );

      setError(
        statusError.message ||
        "Unable to update quotation status."
      );

    } finally {

      setActionLoading("");

    }

  };

  const getStatusStyle = (status) => {

    if (status === "APPROVED") {
      return {
        background: "#ecfdf3",
        color: "#027a48"
      };
    }

    if (status === "REJECTED") {
      return {
        background: "#fef2f2",
        color: "#b42318"
      };
    }

    return {
      background: "#fffaeb",
      color: "#b54708"
    };

  };

  const downloadReport = (quotation) => {

    const doc = new jsPDF({
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const quotationNumber = quotation.customer_quotation_number
      ? `Q${String(quotation.customer_quotation_number).padStart(4, "0")}`
      : quotation.quotation_id;

    const money = (value) =>
      `$${Number(value || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;

    const addSection = (title) => {
      y += 4;
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text(title, 15, y);
      doc.line(15, y + 2, pageWidth - 15, y + 2);
      y += 9;
    };

    const addRow = (label, value) => {
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text(`${label}:`, 18, y);
      doc.setFont(undefined, "normal");
      doc.text(String(value ?? "-"), 70, y);
      y += 6;
    };

    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.text("MARITIME AI BROKERAGE", 15, y);
    y += 9;

    doc.setFontSize(13);
    doc.setFont(undefined, "normal");
    doc.text("Quotation Report", 15, y);
    y += 8;

    doc.setDrawColor(36, 95, 70);
    doc.setLineWidth(0.6);
    doc.line(15, y, pageWidth - 15, y);
    y += 9;

    addRow("Quotation", quotationNumber);
    addRow("Internal Reference", quotation.quotation_id);
    addRow("Customer", quotation.customer_email);
    addRow("Created", quotation.created_at);
    addRow("Status", quotation.status);

    addSection("SHIPMENT DETAILS");
    addRow("Origin", quotation.origin);
    addRow("Destination", quotation.destination);
    addRow("Cargo Type", quotation.cargo_type);
    addRow("Containers", quotation.containers);

    addSection("ROUTE ANALYSIS");
    addRow("Recommended Route", quotation.recommended_route);
    addRow("Transit Time", `${quotation.transit_time_days} days`);
    addRow("Distance", `${quotation.distance_nm} NM`);
    addRow("Transshipments", quotation.transshipments);
    addRow("Route Score", quotation.route_score);

    addSection("PRICING");
    addRow("Base Freight / Container", money(quotation.base_freight_per_container_usd));
    addRow("Fuel Surcharge", money(quotation.fuel_surcharge_usd));
    addRow("Port Charge", money(quotation.port_charge_usd));
    addRow("Risk Surcharge", money(quotation.risk_surcharge_usd));
    addRow("Operating Cost / Container", money(quotation.operating_cost_per_container_usd));
    addRow("Demand Factor", quotation.demand_factor);

    addSection("MARGIN ANALYSIS");
    addRow("Target Margin", `${quotation.target_margin_percent}%`);
    addRow("Actual Margin", `${quotation.actual_margin_percent}%`);
    addRow("Selling Price / Container", money(quotation.selling_price_per_container_usd));
    addRow("Profit / Container", money(quotation.profit_per_container_usd));

    addSection("TOTALS");
    addRow("Total Freight", money(quotation.total_freight_usd));
    addRow("Total Profit", money(quotation.total_profit_usd));

    y += 8;
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text(
      "Generated by Maritime AI Brokerage Platform",
      15,
      y
    );
    doc.text(
      "Quotation pricing and route analysis are generated by the platform's configured agents and datasets.",
      15,
      y + 5
    );

    doc.save(`${quotationNumber}_quotation_report.pdf`);

  };

  const pendingCount = quotations.filter(
    (quotation) =>
      quotation.status === "PENDING APPROVAL"
  ).length;

  const approvedCount = quotations.filter(
    (quotation) =>
      quotation.status === "APPROVED"
  ).length;

  const rejectedCount = quotations.filter(
    (quotation) =>
      quotation.status === "REJECTED"
  ).length;

  // =========================================================
  // ANALYTICS DATA
  // =========================================================

  const routeAnalytics = Object.values(
    quotations.reduce((groups, quotation) => {
      const route = quotation.recommended_route || "Unknown";

      if (!groups[route]) {
        groups[route] = {
          route,
          quotations: 0,
          containers: 0,
          freight: 0,
          profit: 0
        };
      }

      groups[route].quotations += 1;
      groups[route].containers += Number(quotation.containers || 0);
      groups[route].freight += Number(quotation.total_freight_usd || 0);
      groups[route].profit += Number(quotation.total_profit_usd || 0);

      return groups;
    }, {})
  )
    .sort((a, b) => b.quotations - a.quotations)
    .slice(0, 5);

  const customerAnalytics = Object.values(
    quotations.reduce((groups, quotation) => {
      const email = (quotation.customer_email || "Unknown").toLowerCase();

      if (!groups[email]) {
        groups[email] = {
          email,
          quotations: 0,
          containers: 0,
          freight: 0
        };
      }

      groups[email].quotations += 1;
      groups[email].containers += Number(quotation.containers || 0);
      groups[email].freight += Number(quotation.total_freight_usd || 0);

      return groups;
    }, {})
  )
    .sort((a, b) => b.quotations - a.quotations);

  const maxRouteQuotations =
    Math.max(...routeAnalytics.map((item) => item.quotations), 1);

  const maxCustomerQuotations =
    Math.max(...customerAnalytics.map((item) => item.quotations), 1);

  const approvalRate = stats?.total_quotations
    ? ((approvedCount / Number(stats.total_quotations)) * 100).toFixed(1)
    : "0.0";

  return (

    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7f6",
        color: "#172b22"
      }}
    >

      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: "270px",
          background: "#17261f",
          color: "#fff",
          padding: "28px 22px",
          boxSizing: "border-box"
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "42px"
          }}
        >

          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#e6f0eb",
              color: "#1f6f50",
              display: "grid",
              placeItems: "center",
              fontWeight: 800
            }}
          >
            MB
          </div>

          <div>
            <strong
              style={{
                display: "block",
                fontSize: "17px"
              }}
            >
              Maritime
            </strong>

            <span
              style={{
                color: "#aebdb6",
                fontSize: "13px"
              }}
            >
              Brokerage
            </span>
          </div>

        </div>

        <div
          style={{
            color: "#8ea199",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "1.4px",
            marginBottom: "12px"
          }}
        >
          ADMIN WORKSPACE
        </div>

        <div
          style={{
            display: "grid",
            gap: "7px"
          }}
        >
          <button
            onClick={() => {
              setAdminSection("dashboard");
              document
                .getElementById("admin-overview")
                ?.scrollIntoView({ behavior: "smooth" })
            }}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              background: adminSection === "dashboard" ? "#dfece5" : "transparent",
              color: adminSection === "dashboard" ? "#1f6f50" : "#d8e4de",
              padding: "13px 14px",
              borderRadius: "9px",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Dashboard
          </button>

          <button
            onClick={() => {
              setAdminSection("analytics");
              document
                .getElementById("admin-analytics")
                ?.scrollIntoView({ behavior: "smooth" })
            }}
            style={{
              width: "100%",
              textAlign: "left",
              border: "1px solid transparent",
              background: adminSection === "analytics" ? "#dfece5" : "transparent",
              color: adminSection === "analytics" ? "#1f6f50" : "#d8e4de",
              padding: "12px 14px",
              borderRadius: "9px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Analytics
          </button>

          <button
            onClick={() => {
              setAdminSection("quotations");
              document
                .getElementById("admin-quotations")
                ?.scrollIntoView({ behavior: "smooth" })
            }}
            style={{
              width: "100%",
              textAlign: "left",
              border: "1px solid transparent",
              background: adminSection === "quotations" ? "#dfece5" : "transparent",
              color: adminSection === "quotations" ? "#1f6f50" : "#d8e4de",
              padding: "12px 14px",
              borderRadius: "9px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Quotation Requests
          </button>
        </div>

        <div style={{ display: "grid", gap: "7px" }}>

        <button
          onClick={() => {
            setAdminSection("route");
            document.getElementById("admin-route-intelligence")?.scrollIntoView({ behavior: "smooth" });
          }}
          style={{
            width: "100%",
            textAlign: "left",
            border: "1px solid transparent",
            background: adminSection === "route" ? "#dfece5" : "transparent",
            color: adminSection === "route" ? "#1f6f50" : "#d8e4de",
            padding: "12px 14px",
            borderRadius: "9px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Route Intelligence
        </button>

        <button
          onClick={() => {
            setAdminSection("pricing");
            document.getElementById("admin-pricing")?.scrollIntoView({ behavior: "smooth" });
          }}
          style={{
            width: "100%",
            textAlign: "left",
            border: "1px solid transparent",
            background: adminSection === "pricing" ? "#dfece5" : "transparent",
            color: adminSection === "pricing" ? "#1f6f50" : "#d8e4de",
            padding: "12px 14px",
            borderRadius: "9px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Pricing & Margins
        </button>

        <button
          onClick={() => {
            setAdminSection("agents");
            document.getElementById("admin-agent-status")?.scrollIntoView({ behavior: "smooth" });
          }}
          style={{
            width: "100%",
            textAlign: "left",
            border: "1px solid transparent",
            background: adminSection === "agents" ? "#dfece5" : "transparent",
            color: adminSection === "agents" ? "#1f6f50" : "#d8e4de",
            padding: "12px 14px",
            borderRadius: "9px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Agent Status
        </button>

        </div>

        <div
          style={{
            marginTop: "28px",
            color: "#8ea199",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "1.4px"
          }}
        >
          REPORTING
        </div>

        <button
          onClick={() => {
            setAdminSection("reports");
            document.getElementById("admin-reports")?.scrollIntoView({ behavior: "smooth" });
          }}
          style={{
            width: "100%",
            textAlign: "left",
            border: "1px solid transparent",
            background: adminSection === "reports" ? "#dfece5" : "transparent",
            color: adminSection === "reports" ? "#1f6f50" : "#d8e4de",
            padding: "12px 14px",
            borderRadius: "9px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Reports
        </button>

        <div
          style={{
            marginTop: "28px",
            color: "#8ea199",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "1.4px"
          }}
        >
          SYSTEM
        </div>

        <div
          style={{
            marginTop: "14px",
            padding: "14px",
            border: "1px solid #304139",
            borderRadius: "10px",
            color: "#b9c9c1",
            fontSize: "13px"
          }}
        >
          <span style={{ color: "#72d2a6" }}>●</span>{" "}
          Backend API Connected
        </div>

        <div
          style={{
            position: "absolute",
            left: "22px",
            right: "22px",
            bottom: "24px",
            borderTop: "1px solid #304139",
            paddingTop: "18px"
          }}
        >

          <div
            style={{
              fontWeight: 700,
              marginBottom: "4px"
            }}
          >
            {user?.name || "Administrator"}
          </div>

          <div
            style={{
              color: "#9eafa7",
              fontSize: "12px",
              marginBottom: "14px"
            }}
          >
            {user?.email}
          </div>

          <button
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #53635b",
              background: "transparent",
              color: "#fff",
              cursor: "pointer"
            }}
          >
            Sign out
          </button>

        </div>

      </aside>


      <main
        id="admin-overview"
        style={{
          marginLeft: "270px",
          padding: "44px 52px",
          maxWidth: "1500px",
          boxSizing: "border-box"
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            marginBottom: "28px"
          }}
        >

          <div>

            <div
              style={{
                color: "#347a5b",
                fontWeight: 800,
                fontSize: "12px",
                letterSpacing: "1.5px"
              }}
            >
              ADMIN WORKSPACE
            </div>

            <h1
              style={{
                margin: "8px 0 6px",
                fontSize: "32px"
              }}
            >
              Brokerage Overview
            </h1>

            <p
              style={{
                margin: 0,
                color: "#66756e"
              }}
            >
              Review quotations, monitor performance, and manage approvals.
            </p>

          </div>

          <button
            onClick={loadAdminData}
            style={{
              padding: "11px 16px",
              border: "1px solid #ccd8d2",
              borderRadius: "8px",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 700,
              color: "#245f46"
            }}
          >
            Refresh Data
          </button>

        </div>


        {error && (

          <div
            style={{
              marginBottom: "20px",
              padding: "12px 14px",
              borderRadius: "8px",
              background: "#fef2f2",
              color: "#b42318",
              border: "1px solid #fecdca"
            }}
          >
            {error}
          </div>

        )}


        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: "16px",
            marginBottom: "22px"
          }}
        >

          {[
            [
              "TOTAL QUOTATIONS",
              stats?.total_quotations ?? quotations.length,
              "All quotation requests"
            ],
            [
              "PENDING APPROVAL",
              pendingCount,
              "Awaiting admin review"
            ],
            [
              "APPROVED",
              approvedCount,
              "Approved quotations"
            ],
            [
              "REJECTED",
              rejectedCount,
              "Rejected quotations"
            ]
          ].map((card) => (

            <div
              key={card[0]}
              style={{
                background: "#fff",
                border: "1px solid #dce4df",
                borderRadius: "12px",
                padding: "20px"
              }}
            >

              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#73827b",
                  letterSpacing: "1px"
                }}
              >
                {card[0]}
              </div>

              <div
                style={{
                  fontSize: "30px",
                  fontWeight: 800,
                  marginTop: "10px"
                }}
              >
                {loading ? "—" : card[1]}
              </div>

              <div
                style={{
                  marginTop: "5px",
                  color: "#78857f",
                  fontSize: "12px"
                }}
              >
                {card[2]}
              </div>

            </div>

          ))}

        </div>


        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: "16px",
            marginBottom: "24px"
          }}
        >

          {[
            [
              "TOTAL CONTAINERS",
              stats?.total_containers ?? 0,
              ""
            ],
            [
              "TOTAL FREIGHT",
              `$${Number(
                stats?.total_freight_usd || 0
              ).toLocaleString(
                "en-US",
                {
                  minimumFractionDigits: 2
                }
              )}`,
              ""
            ],
            [
              "AVERAGE MARGIN",
              `${Number(
                stats?.average_margin_percent || 0
              ).toFixed(2)}%`,
              ""
            ]
          ].map((card) => (

            <div
              key={card[0]}
              style={{
                background: "#fff",
                border: "1px solid #dce4df",
                borderRadius: "12px",
                padding: "18px 20px"
              }}
            >

              <div
                style={{
                  color: "#73827b",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "1px"
                }}
              >
                {card[0]}
              </div>

              <div
                style={{
                  marginTop: "8px",
                  fontSize: "23px",
                  fontWeight: 800
                }}
              >
                {loading ? "—" : card[1]}
              </div>

            </div>

          ))}

        </div>


        {/* =====================================================
            ANALYTICS
            ===================================================== */}
        <section
          id="admin-analytics"
          style={{
            marginBottom: "24px",
            scrollMarginTop: "24px"
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #dce4df",
              borderRadius: "12px",
              padding: "22px 24px",
              marginBottom: "16px"
            }}
          >
            <div
              style={{
                color: "#347a5b",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "1.3px"
              }}
            >
              PERFORMANCE ANALYTICS
            </div>
            <h2 style={{ margin: "7px 0 4px" }}>
              Brokerage Analytics
            </h2>
            <p style={{ margin: 0, color: "#77847e", fontSize: "13px" }}>
              Operational insights from quotation, route, customer, and margin data.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "16px",
              marginBottom: "16px"
            }}
          >
            {[
              ["APPROVAL RATE", `${approvalRate}%`, "Approved quotations / total"],
              ["TOTAL PROFIT", `$${Number(stats?.total_profit_usd || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, "Across all quotations"],
              ["CUSTOMERS", stats?.customer_count ?? customerAnalytics.length, "Unique quotation customers"]
            ].map((card) => (
              <div
                key={card[0]}
                style={{
                  background: "#fff",
                  border: "1px solid #dce4df",
                  borderRadius: "12px",
                  padding: "18px 20px"
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#73827b", letterSpacing: "1px" }}>
                  {card[0]}
                </div>
                <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "8px" }}>
                  {loading ? "—" : card[1]}
                </div>
                <div style={{ marginTop: "4px", color: "#78857f", fontSize: "12px" }}>
                  {card[2]}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.15fr 0.85fr",
              gap: "16px"
            }}
          >
            <div
              style={{
                background: "#fff",
                border: "1px solid #dce4df",
                borderRadius: "12px",
                padding: "22px 24px"
              }}
            >
              <div style={{ color: "#347a5b", fontSize: "11px", fontWeight: 800, letterSpacing: "1.2px" }}>
                ROUTE PERFORMANCE
              </div>
              <h3 style={{ margin: "7px 0 18px" }}>Top Recommended Routes</h3>

              {routeAnalytics.length === 0 ? (
                <p style={{ color: "#78857f" }}>No route data available.</p>
              ) : (
                routeAnalytics.map((item) => (
                  <div key={item.route} style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                      <strong>{item.route}</strong>
                      <span style={{ color: "#66756e" }}>{item.quotations} quotations</span>
                    </div>
                    <div style={{ height: "8px", background: "#edf2ef", borderRadius: "999px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${(item.quotations / maxRouteQuotations) * 100}%`,
                          height: "100%",
                          background: "#347a5b",
                          borderRadius: "999px"
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "18px", marginTop: "6px", color: "#78857f", fontSize: "11px" }}>
                      <span>{item.containers} containers</span>
                      <span>${item.freight.toLocaleString("en-US", { maximumFractionDigits: 0 })} freight</span>
                      <span>${item.profit.toLocaleString("en-US", { maximumFractionDigits: 0 })} profit</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                background: "#fff",
                border: "1px solid #dce4df",
                borderRadius: "12px",
                padding: "22px 24px"
              }}
            >
              <div style={{ color: "#347a5b", fontSize: "11px", fontWeight: 800, letterSpacing: "1.2px" }}>
                STATUS DISTRIBUTION
              </div>
              <h3 style={{ margin: "7px 0 18px" }}>Quotation Pipeline</h3>

              {[
                ["Pending Approval", pendingCount, "#b54708"],
                ["Approved", approvedCount, "#027a48"],
                ["Rejected", rejectedCount, "#b42318"]
              ].map(([label, count, textColor]) => (
                <div key={label} style={{ marginBottom: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px", fontSize: "12px" }}>
                    <span>{label}</span>
                    <strong style={{ color: textColor }}>{count}</strong>
                  </div>
                  <div style={{ height: "9px", background: "#edf2ef", borderRadius: "999px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${stats?.total_quotations ? (count / Number(stats.total_quotations)) * 100 : 0}%`,
                        height: "100%",
                        background: textColor,
                        borderRadius: "999px"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #dce4df",
              borderRadius: "12px",
              padding: "22px 24px",
              marginTop: "16px"
            }}
          >
            <div style={{ color: "#347a5b", fontSize: "11px", fontWeight: 800, letterSpacing: "1.2px" }}>
              CUSTOMER ACTIVITY
            </div>
            <h3 style={{ margin: "7px 0 18px" }}>Quotation Activity by Customer</h3>
            {customerAnalytics.length === 0 ? (
              <p style={{ color: "#78857f" }}>No customer activity available.</p>
            ) : (
              customerAnalytics.slice(0, 5).map((item) => (
                <div key={item.email} style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                    <strong>{item.email}</strong>
                    <span style={{ color: "#66756e" }}>{item.quotations} quotations · {item.containers} containers</span>
                  </div>
                  <div style={{ height: "7px", background: "#edf2ef", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ width: `${(item.quotations / maxCustomerQuotations) * 100}%`, height: "100%", background: "#6b8f7d", borderRadius: "999px" }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div
          id="admin-quotations"
          style={{
            background: "#fff",
            border: "1px solid #dce4df",
            borderRadius: "12px",
            overflow: "hidden",
            scrollMarginTop: "24px"
          }}
        >

          <div
            style={{
              padding: "22px 24px",
              borderBottom: "1px solid #e6ebe8"
            }}
          >

            <div
              style={{
                color: "#347a5b",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "1.3px"
              }}
            >
              QUOTATION MANAGEMENT
            </div>

            <h2
              style={{
                margin: "7px 0 4px"
              }}
            >
              Quotation Requests
            </h2>

            <p
              style={{
                margin: 0,
                color: "#77847e",
                fontSize: "13px"
              }}
            >
              Review pending requests and manage quotation status.
            </p>

          </div>


          <div style={{ overflowX: "auto" }}>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "1050px"
              }}
            >

              <thead>

                <tr
                  style={{
                    background: "#f8faf9"
                  }}
                >

                  {[
                    "Quotation",
                    "Customer",
                    "Route",
                    "Containers",
                    "Freight",
                    "Margin",
                    "Status",
                    "Actions"
                  ].map((heading) => (

                    <th
                      key={heading}
                      style={{
                        textAlign: "left",
                        padding: "13px 16px",
                        fontSize: "10px",
                        letterSpacing: "1px",
                        color: "#73827b",
                        borderBottom:
                          "1px solid #e6ebe8"
                      }}
                    >
                      {heading}
                    </th>

                  ))}

                </tr>

              </thead>

              <tbody>

                {loading && (

                  <tr>
                    <td
                      colSpan="8"
                      style={{
                        padding: "30px",
                        textAlign: "center",
                        color: "#78857f"
                      }}
                    >
                      Loading quotations...
                    </td>
                  </tr>

                )}

                {!loading &&
                  quotations.length === 0 && (

                    <tr>
                      <td
                        colSpan="8"
                        style={{
                          padding: "35px",
                          textAlign: "center",
                          color: "#78857f"
                        }}
                      >
                        No quotations found.
                      </td>
                    </tr>

                  )}

                {!loading &&
                  quotations.map((quotation) => (

                    <tr key={quotation.quotation_id}>

                      <td
                        style={{
                          padding: "15px 16px",
                          borderBottom:
                            "1px solid #edf1ef"
                        }}
                      >

                        <strong>
                          {quotation.customer_quotation_number
                            ? `Q${String(
                                quotation.customer_quotation_number
                              ).padStart(4, "0")}`
                            : quotation.quotation_id}
                        </strong>

                        <div
                          style={{
                            marginTop: "3px",
                            color: "#7b8781",
                            fontSize: "11px"
                          }}
                        >
                          Ref: {quotation.quotation_id}
                        </div>

                      </td>


                      <td
                        style={{
                          padding: "15px 16px",
                          borderBottom:
                            "1px solid #edf1ef",
                          fontSize: "13px"
                        }}
                      >
                        {quotation.customer_email}
                      </td>


                      <td
                        style={{
                          padding: "15px 16px",
                          borderBottom:
                            "1px solid #edf1ef"
                        }}
                      >
                        {quotation.origin} →{" "}
                        {quotation.destination}

                        <div
                          style={{
                            color: "#718079",
                            fontSize: "11px",
                            marginTop: "4px"
                          }}
                        >
                          {quotation.recommended_route}
                        </div>

                      </td>


                      <td
                        style={{
                          padding: "15px 16px",
                          borderBottom:
                            "1px solid #edf1ef"
                        }}
                      >
                        {quotation.containers}
                      </td>


                      <td
                        style={{
                          padding: "15px 16px",
                          borderBottom:
                            "1px solid #edf1ef",
                          whiteSpace: "nowrap"
                        }}
                      >
                        ${Number(
                          quotation.total_freight_usd || 0
                        ).toLocaleString(
                          "en-US",
                          {
                            minimumFractionDigits: 2
                          }
                        )}
                      </td>


                      <td
                        style={{
                          padding: "15px 16px",
                          borderBottom:
                            "1px solid #edf1ef"
                        }}
                      >
                        {quotation.actual_margin_percent}%
                      </td>


                      <td
                        style={{
                          padding: "15px 16px",
                          borderBottom:
                            "1px solid #edf1ef"
                        }}
                      >

                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 10px",
                            borderRadius: "999px",
                            fontSize: "10px",
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                            ...getStatusStyle(
                              quotation.status
                            )
                          }}
                        >
                          {quotation.status ||
                            "PENDING APPROVAL"}
                        </span>

                      </td>


                      <td
                        style={{
                          padding: "15px 16px",
                          borderBottom:
                            "1px solid #edf1ef"
                        }}
                      >

                        <div
                          style={{
                            display: "flex",
                            gap: "7px",
                            flexWrap: "wrap"
                          }}
                        >

                          {quotation.status ===
                            "PENDING APPROVAL" && (

                            <>
                              <button
                                onClick={() =>
                                  updateQuotationStatus(
                                    quotation.quotation_id,
                                    "APPROVED"
                                  )
                                }
                                disabled={
                                  actionLoading ===
                                  quotation.quotation_id
                                }
                                style={{
                                  border: "none",
                                  borderRadius: "7px",
                                  padding: "8px 11px",
                                  background: "#27734e",
                                  color: "#fff",
                                  cursor: "pointer",
                                  fontSize: "11px",
                                  fontWeight: 700
                                }}
                              >
                                Approve
                              </button>

                              <button
                                onClick={() =>
                                  updateQuotationStatus(
                                    quotation.quotation_id,
                                    "REJECTED"
                                  )
                                }
                                disabled={
                                  actionLoading ===
                                  quotation.quotation_id
                                }
                                style={{
                                  border: "1px solid #e3b8b5",
                                  borderRadius: "7px",
                                  padding: "8px 11px",
                                  background: "#fff",
                                  color: "#b42318",
                                  cursor: "pointer",
                                  fontSize: "11px",
                                  fontWeight: 700
                                }}
                              >
                                Reject
                              </button>
                            </>

                          )}

                          <button
                            onClick={() =>
                              setSelectedQuotation(
                                quotation
                              )
                            }
                            style={{
                              border: "1px solid #ccd8d2",
                              borderRadius: "7px",
                              padding: "8px 11px",
                              background: "#fff",
                              color: "#245f46",
                              cursor: "pointer",
                              fontSize: "11px",
                              fontWeight: 700
                            }}
                          >
                            Details
                          </button>

                          <button
                            onClick={() =>
                              downloadReport(
                                quotation
                              )
                            }
                            style={{
                              border: "1px solid #ccd8d2",
                              borderRadius: "7px",
                              padding: "8px 11px",
                              background: "#fff",
                              color: "#245f46",
                              cursor: "pointer",
                              fontSize: "11px",
                              fontWeight: 700
                            }}
                          >
                            Report
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))}

              </tbody>

            </table>

          </div>

        </div>


        {/* =====================================================
            ROUTE INTELLIGENCE
        ====================================================== */}
        <div
          id="admin-route-intelligence"
          style={{
            background: "#fff",
            border: "1px solid #dce4df",
            borderRadius: "14px",
            padding: "22px",
            marginBottom: "18px"
          }}
        >
          <div style={{ marginBottom: "18px" }}>
            <div style={{ color: "#287454", fontSize: "10px", fontWeight: 800, letterSpacing: "1.4px" }}>ROUTE INTELLIGENCE</div>
            <h2 style={{ margin: "6px 0 4px", fontSize: "22px" }}>Route Performance</h2>
            <p style={{ margin: 0, color: "#77847e", fontSize: "13px" }}>Route usage and operational metrics from generated quotations.</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "850px" }}>
              <thead>
                <tr>
                  {['Route','Quotations','Avg Score','Avg Transit','Avg Distance','Transshipments'].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "11px 10px", borderBottom: "1px solid #e5ebe7", fontSize: "10px", color: "#73827b", letterSpacing: "1px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.values(quotations.reduce((groups, q) => {
                  const route = q.recommended_route || "Unknown";
                  if (!groups[route]) groups[route] = { route, count: 0, score: 0, transit: 0, distance: 0, transshipments: 0 };
                  groups[route].count += 1;
                  groups[route].score += Number(q.route_score || 0);
                  groups[route].transit += Number(q.transit_time_days || 0);
                  groups[route].distance += Number(q.distance_nm || 0);
                  groups[route].transshipments += Number(q.transshipments || 0);
                  return groups;
                }, {})).sort((a, b) => b.count - a.count).map((item) => (
                  <tr key={item.route}>
                    <td style={{ padding: "12px 10px", fontWeight: 700 }}>{item.route}</td>
                    <td style={{ padding: "12px 10px" }}>{item.count}</td>
                    <td style={{ padding: "12px 10px" }}>{(item.score / item.count).toFixed(1)}</td>
                    <td style={{ padding: "12px 10px" }}>{(item.transit / item.count).toFixed(1)} days</td>
                    <td style={{ padding: "12px 10px" }}>{(item.distance / item.count).toFixed(0)} NM</td>
                    <td style={{ padding: "12px 10px" }}>{(item.transshipments / item.count).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* =====================================================
            PRICING & MARGINS
        ====================================================== */}
        <div
          id="admin-pricing"
          style={{
            background: "#fff",
            border: "1px solid #dce4df",
            borderRadius: "14px",
            padding: "22px",
            marginBottom: "18px"
          }}
        >
          <div style={{ marginBottom: "18px" }}>
            <div style={{ color: "#287454", fontSize: "10px", fontWeight: 800, letterSpacing: "1.4px" }}>PRICING & MARGINS</div>
            <h2 style={{ margin: "6px 0 4px", fontSize: "22px" }}>Freight Pricing Analysis</h2>
            <p style={{ margin: 0, color: "#77847e", fontSize: "13px" }}>Pricing, operating cost, selling price and margin information from the quotation engine.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "14px" }}>
            {[
              ["TOTAL BASE FREIGHT", `$${Number(quotations.reduce((sum, q) => sum + Number(q.base_freight_per_container_usd || 0) * Number(q.containers || 0), 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`.replace("$$", "$"), "Before surcharges"],
              ["OPERATING COST", `$${Number(quotations.reduce((sum, q) => sum + Number(q.operating_cost_per_container_usd || 0) * Number(q.containers || 0), 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`.replace("$$", "$"), "Including surcharges"],
              ["SELLING VALUE", `$${Number(quotations.reduce((sum, q) => sum + Number(q.total_freight_usd || 0), 0)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`.replace("$$", "$"), "Customer quotation value"],
              ["TARGET MARGIN", `${Number(stats?.average_margin_percent || 0).toFixed(2)}%`, "Average quotation margin"]
            ].map(([label, value, note]) => (
              <div key={label} style={{ border: "1px solid #e0e7e3", borderRadius: "12px", padding: "17px" }}>
                <div style={{ fontSize: "10px", color: "#73827b", fontWeight: 800, letterSpacing: "1px" }}>{label}</div>
                <div style={{ marginTop: "8px", fontSize: "22px", fontWeight: 800 }}>{value}</div>
                <div style={{ marginTop: "5px", fontSize: "12px", color: "#77847e" }}>{note}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "16px", padding: "14px", background: "#f6f9f7", borderRadius: "10px", fontSize: "13px", color: "#53635b" }}>
            <strong>Margin engine:</strong> The quotation pipeline applies demand adjustment and the target margin before producing the selling price.
          </div>
        </div>

        {/* =====================================================
            AGENT STATUS
        ====================================================== */}
        <div
          id="admin-agent-status"
          style={{
            background: "#fff",
            border: "1px solid #dce4df",
            borderRadius: "14px",
            padding: "22px",
            marginBottom: "18px"
          }}
        >
          <div style={{ marginBottom: "18px" }}>
            <div style={{ color: "#287454", fontSize: "10px", fontWeight: 800, letterSpacing: "1.4px" }}>AGENT STATUS</div>
            <h2 style={{ margin: "6px 0 4px", fontSize: "22px" }}>Agentic Processing Layer</h2>
            <p style={{ margin: 0, color: "#77847e", fontSize: "13px" }}>Core agents and services used by the quotation workflow.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "14px" }}>
            {[
              ["Route Agent", "Route analysis & ranking"],
              ["Pricing Agent", "Dynamic surcharge calculation"],
              ["Margin Agent", "Selling price & profit"],
              ["Quotation Service", "End-to-end quotation orchestration"]
            ].map(([name, description]) => (
              <div key={name} style={{ border: "1px solid #e0e7e3", borderRadius: "12px", padding: "17px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <strong>{name}</strong>
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#027a48", background: "#ecfdf3", padding: "5px 8px", borderRadius: "999px" }}>ACTIVE</span>
                </div>
                <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#77847e" }}>{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* =====================================================
            REPORTS
        ====================================================== */}
        <div
          id="admin-reports"
          style={{
            background: "#fff",
            border: "1px solid #dce4df",
            borderRadius: "14px",
            padding: "22px",
            marginBottom: "18px"
          }}
        >
          <div style={{ marginBottom: "18px" }}>
            <div style={{ color: "#287454", fontSize: "10px", fontWeight: 800, letterSpacing: "1.4px" }}>REPORTING</div>
            <h2 style={{ margin: "6px 0 4px", fontSize: "22px" }}>Quotation Reports</h2>
            <p style={{ margin: 0, color: "#77847e", fontSize: "13px" }}>Generate a PDF report for any quotation.</p>
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            {quotations.slice(0, 10).map((quotation) => {
              const number = quotation.customer_quotation_number ? `Q${String(quotation.customer_quotation_number).padStart(4, "0")}` : quotation.quotation_id;
              return (
                <div key={quotation.quotation_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", padding: "12px 14px", border: "1px solid #e5ebe7", borderRadius: "9px" }}>
                  <div>
                    <strong>{number}</strong>
                    <span style={{ marginLeft: "12px", color: "#66756e", fontSize: "12px" }}>{quotation.customer_email} · {quotation.origin} → {quotation.destination}</span>
                  </div>
                  <button onClick={() => downloadReport(quotation)} style={{ border: "1px solid #ccd8d2", borderRadius: "8px", padding: "8px 12px", background: "#fff", color: "#245f46", cursor: "pointer", fontWeight: 700 }}>Download PDF</button>
                </div>
              );
            })}
          </div>
        </div>


        {selectedQuotation && (

          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(10, 24, 18, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              zIndex: 1000
            }}
            onClick={() =>
              setSelectedQuotation(null)
            }
          >

            <div
              onClick={(event) =>
                event.stopPropagation()
              }
              style={{
                width: "min(720px, 100%)",
                maxHeight: "85vh",
                overflowY: "auto",
                background: "#fff",
                borderRadius: "14px",
                padding: "26px",
                boxSizing: "border-box"
              }}
            >

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "15px"
                }}
              >

                <div>

                  <div
                    style={{
                      color: "#347a5b",
                      fontSize: "11px",
                      fontWeight: 800,
                      letterSpacing: "1.2px"
                    }}
                  >
                    QUOTATION DETAILS
                  </div>

                  <h2
                    style={{
                      margin: "7px 0 4px"
                    }}
                  >
                    {selectedQuotation.customer_quotation_number
                      ? `Q${String(
                          selectedQuotation.customer_quotation_number
                        ).padStart(4, "0")}`
                      : selectedQuotation.quotation_id}
                  </h2>

                  <div
                    style={{
                      color: "#718079",
                      fontSize: "12px"
                    }}
                  >
                    Internal Reference:{" "}
                    {selectedQuotation.quotation_id}
                  </div>

                </div>

                <button
                  onClick={() =>
                    setSelectedQuotation(null)
                  }
                  style={{
                    border: "none",
                    background: "#f1f4f2",
                    borderRadius: "8px",
                    width: "34px",
                    height: "34px",
                    cursor: "pointer"
                  }}
                >
                  ×
                </button>

              </div>


              <div
                style={{
                  marginTop: "20px",
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: "10px"
                }}
              >

                {[
                  ["Customer", selectedQuotation.customer_email],
                  [
                    "Route",
                    `${selectedQuotation.origin} → ${selectedQuotation.destination}`
                  ],
                  ["Cargo", selectedQuotation.cargo_type],
                  ["Containers", selectedQuotation.containers],
                  ["Recommended Route", selectedQuotation.recommended_route],
                  ["Transit", `${selectedQuotation.transit_time_days} days`],
                  ["Distance", `${selectedQuotation.distance_nm} NM`],
                  ["Transshipments", selectedQuotation.transshipments],
                  ["Route Score", selectedQuotation.route_score],
                  [
                    "Total Freight",
                    `$${Number(
                      selectedQuotation.total_freight_usd || 0
                    ).toLocaleString(
                      "en-US",
                      {
                        minimumFractionDigits: 2
                      }
                    )}`
                  ],
                  [
                    "Profit",
                    `$${Number(
                      selectedQuotation.total_profit_usd || 0
                    ).toLocaleString(
                      "en-US",
                      {
                        minimumFractionDigits: 2
                      }
                    )}`
                  ],
                  [
                    "Margin",
                    `${selectedQuotation.actual_margin_percent}%`
                  ]
                ].map((item) => (

                  <div
                    key={item[0]}
                    style={{
                      padding: "13px",
                      background: "#f8faf9",
                      borderRadius: "8px"
                    }}
                  >

                    <div
                      style={{
                        color: "#718079",
                        fontSize: "10px",
                        fontWeight: 800,
                        letterSpacing: "0.7px"
                      }}
                    >
                      {item[0]}
                    </div>

                    <div
                      style={{
                        marginTop: "5px",
                        fontWeight: 700,
                        fontSize: "13px"
                      }}
                    >
                      {item[1]}
                    </div>

                  </div>

                ))}

              </div>


              <div
                style={{
                  marginTop: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap"
                }}
              >

                <span
                  style={{
                    display: "inline-block",
                    padding: "7px 12px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 800,
                    ...getStatusStyle(
                      selectedQuotation.status
                    )
                  }}
                >
                  {selectedQuotation.status}
                </span>

                <div
                  style={{
                    display: "flex",
                    gap: "8px"
                  }}
                >

                  {selectedQuotation.status ===
                    "PENDING APPROVAL" && (

                    <>
                      <button
                        onClick={() =>
                          updateQuotationStatus(
                            selectedQuotation.quotation_id,
                            "APPROVED"
                          )
                        }
                        disabled={
                          actionLoading ===
                          selectedQuotation.quotation_id
                        }
                        style={{
                          border: "none",
                          borderRadius: "8px",
                          padding: "10px 15px",
                          background: "#27734e",
                          color: "#fff",
                          cursor: "pointer",
                          fontWeight: 700
                        }}
                      >
                        Approve Quotation
                      </button>

                      <button
                        onClick={() =>
                          updateQuotationStatus(
                            selectedQuotation.quotation_id,
                            "REJECTED"
                          )
                        }
                        disabled={
                          actionLoading ===
                          selectedQuotation.quotation_id
                        }
                        style={{
                          border: "1px solid #e3b8b5",
                          borderRadius: "8px",
                          padding: "10px 15px",
                          background: "#fff",
                          color: "#b42318",
                          cursor: "pointer",
                          fontWeight: 700
                        }}
                      >
                        Reject Request
                      </button>
                    </>

                  )}

                  <button
                    onClick={() =>
                      downloadReport(
                        selectedQuotation
                      )
                    }
                    style={{
                      border: "1px solid #ccd8d2",
                      borderRadius: "8px",
                      padding: "10px 15px",
                      background: "#fff",
                      color: "#245f46",
                      cursor: "pointer",
                      fontWeight: 700
                    }}
                  >
                    Download Report
                  </button>

                </div>

              </div>

            </div>

          </div>

        )}

      </main>

    </div>

  );

}


function App() {

  /*
   * ---------------------------------------------------------
   * PAGE STATE
   * ---------------------------------------------------------
   */

  const [page, setPage] =
    useState("login");

  const [user, setUser] =
    useState(null);


  /*
   * ---------------------------------------------------------
   * LOGIN STATE
   * ---------------------------------------------------------
   */

  const [loginEmail, setLoginEmail] =
    useState("");

  const [loginPassword, setLoginPassword] =
    useState("");

  const [loginError, setLoginError] =
    useState("");


  /*
   * ---------------------------------------------------------
   * SIGNUP STATE
   * ---------------------------------------------------------
   */

  const [signupName, setSignupName] =
    useState("");

  const [signupEmail, setSignupEmail] =
    useState("");

  const [signupPassword, setSignupPassword] =
    useState("");

  const [signupConfirmPassword, setSignupConfirmPassword] =
    useState("");

  const [signupError, setSignupError] =
    useState("");

  const [signupSuccess, setSignupSuccess] =
    useState("");


  /*
   * ---------------------------------------------------------
   * LOGIN
   * ---------------------------------------------------------
   */

  const handleLogin = async (event) => {

    event.preventDefault();

    setLoginError("");

    const email =
      loginEmail.trim().toLowerCase();

    const password =
      loginPassword;

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/api/customers/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: email,
            password: password
          })
        }
      );

      const data = await response.json();

      if (!response.ok || data.status !== "success") {

        setLoginError(
          data.message ||
          "Invalid username or password."
        );

        return;

      }

      setUser(data.customer);

      setLoginEmail("");
      setLoginPassword("");
      setLoginError("");

    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      setLoginError(
        "Unable to connect to the backend. Please make sure FastAPI is running."
      );

    }

  };


  /*
   * ---------------------------------------------------------
   * SIGNUP
   * ---------------------------------------------------------
   */

  const handleSignup = async (event) => {

    event.preventDefault();

    setSignupError("");
    setSignupSuccess("");

    const name =
      signupName.trim();

    const email =
      signupEmail.trim().toLowerCase();

    const password =
      signupPassword;

    const confirmPassword =
      signupConfirmPassword;

    if (!name) {

      setSignupError(
        "Please enter your name."
      );

      return;

    }

    if (!email) {

      setSignupError(
        "Please enter an email address."
      );

      return;

    }

    if (
      !email.includes("@") ||
      !email.includes(".")
    ) {

      setSignupError(
        "Please enter a valid email address."
      );

      return;

    }

    if (password.length < 6) {

      setSignupError(
        "Password must contain at least 6 characters."
      );

      return;

    }

    if (password !== confirmPassword) {

      setSignupError(
        "Passwords do not match."
      );

      return;

    }

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/api/customers/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: name,
            email: email,
            password: password
          })
        }
      );

      const data = await response.json();

      if (!response.ok || data.status !== "success") {

        setSignupError(
          data.message ||
          "Unable to create the account."
        );

        return;

      }

      setSignupName("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");

      setSignupSuccess(
        "Account created successfully. You can now log in."
      );

      setTimeout(() => {

        setSignupSuccess("");
        setPage("login");

      }, 1500);

    } catch (error) {

      console.error(
        "Signup error:",
        error
      );

      setSignupError(
        "Unable to connect to the backend. Please make sure FastAPI is running."
      );

    }

  };


  /*
   * ---------------------------------------------------------
   * LOGOUT
   * ---------------------------------------------------------
   */

  const handleLogout = () => {

    setUser(null);

    setPage("login");

    setLoginEmail("");
    setLoginPassword("");

  };


  /*
   * ---------------------------------------------------------
   * DASHBOARD
   * ---------------------------------------------------------
   */

  if (user) {

    if (user.role === "admin") {
      return (
        <AdminDashboard
          user={user}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
      />
    );

  }


  /*
   * ---------------------------------------------------------
   * SIGNUP PAGE
   * ---------------------------------------------------------
   */

  if (page === "signup") {

    return (

      <div className="login-page">

        <div className="login-container">

          {/* BRAND */}

          <div className="login-brand">

            <div className="brand-icon">MB</div>

            <h1>
              Maritime AI Brokerage
            </h1>

            <p>
              Intelligent Freight Quotation Platform
            </p>

            <div className="brand-meta">
              <div>
                <strong>570+</strong>
                <span>Route Records</span>
              </div>
              <div>
                <strong>3</strong>
                <span>Core Agents</span>
              </div>
            </div>


            <div className="brand-features">

              <div>
                <span>✓</span>
                Intelligent Route Optimization
              </div>

              <div>
                <span>✓</span>
                Dynamic Freight Pricing
              </div>

              <div>
                <span>✓</span>
                Automated Margin Optimization
              </div>

            </div>

          </div>


          {/* SIGNUP CARD */}

          <div className="login-card">

            <div className="login-header">

              <h2>
                Create Customer Account
              </h2>

              <p>
                Register to access the maritime
                quotation platform.
              </p>

            </div>


            <form onSubmit={handleSignup}>

              <label>
                Full Name
              </label>

              <input
                type="text"
                value={signupName}
                onChange={(event) =>
                  setSignupName(
                    event.target.value
                  )
                }
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />


              <label>
                Email Address
              </label>

              <input
                type="email"
                value={signupEmail}
                onChange={(event) =>
                  setSignupEmail(
                    event.target.value
                  )
                }
                placeholder="Enter your email"
                autoComplete="email"
                required
              />


              <label>
                Password
              </label>

              <input
                type="password"
                value={signupPassword}
                onChange={(event) =>
                  setSignupPassword(
                    event.target.value
                  )
                }
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
                required
              />


              <label>
                Confirm Password
              </label>

              <input
                type="password"
                value={signupConfirmPassword}
                onChange={(event) =>
                  setSignupConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Confirm your password"
                autoComplete="new-password"
                required
              />


              {signupError && (

                <div className="login-error">
                  {signupError}
                </div>

              )}


              {signupSuccess && (

                <div className="login-success">
                  {signupSuccess}
                </div>

              )}


              <button
                type="submit"
                className="login-button"
              >
                Create Account
              </button>

            </form>


            <div className="signup-link">

              Already have an account?

              <button
                type="button"
                onClick={() => {

                  setPage("login");

                  setSignupError("");
                  setSignupSuccess("");

                }}
              >
                Back to Login
              </button>

            </div>

          </div>

        </div>

      </div>

    );

  }


  /*
   * ---------------------------------------------------------
   * LOGIN PAGE
   * ---------------------------------------------------------
   */

  return (

    <div className="login-page">

      <div className="login-container">

        {/* BRAND */}

        <div className="login-brand">

          <div className="brand-icon">
            MB
          </div>

          <h1>
            Maritime AI Brokerage
          </h1>

          <p>
            Intelligent Freight Quotation Platform
          </p>

          <div className="brand-meta">
            <div>
              <strong>570+</strong>
              <span>Route Records</span>
            </div>
            <div>
              <strong>3</strong>
              <span>Core Agents</span>
            </div>
          </div>


          <div className="brand-features">

            <div>
              <span>✓</span>
              Intelligent Route Optimization
            </div>

            <div>
              <span>✓</span>
              Dynamic Freight Pricing
            </div>

            <div>
              <span>✓</span>
              Automated Margin Optimization
            </div>

          </div>

        </div>


        {/* LOGIN CARD */}

        <div className="login-card">

          <div className="login-header">

            <h2>
              Welcome Back
            </h2>

            <p>
              Sign in to access your brokerage dashboard.
            </p>

          </div>


          <form onSubmit={handleLogin}>

            <label>
              Email Address
            </label>

            <input
              type="email"
              value={loginEmail}
              onChange={(event) =>
                setLoginEmail(
                  event.target.value
                )
              }
              placeholder="Enter your email"
              autoComplete="email"
              required
            />


            <label>
              Password
            </label>

            <input
              type="password"
              value={loginPassword}
              onChange={(event) =>
                setLoginPassword(
                  event.target.value
                )
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />


            {loginError && (

              <div className="login-error">
                {loginError}
              </div>

            )}


            <button
              type="submit"
              className="login-button"
            >
              Sign In
            </button>

          </form>


          {/* SIGNUP */}

          <div className="signup-link">

            Don't have an account?

            <button
              type="button"
              onClick={() => {

                setPage("signup");

                setLoginError("");

              }}
            >
              Create Customer Account
            </button>

          </div>




        </div>

      </div>

    </div>

  );

}


export default App;