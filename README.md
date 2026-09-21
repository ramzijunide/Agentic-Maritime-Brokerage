# Agentic Maritime Brokerage

An AI-driven maritime brokerage system designed to optimize shipping route selection and generate dynamic freight quotations.

## Overview

Agentic Maritime Brokerage combines route intelligence, freight pricing, and margin optimization to support automated maritime quotation generation.

The system analyzes available shipping routes based on factors such as:

- Transit time
- Distance
- Transshipments
- Route score
- Base freight
- Fuel surcharge
- Port charges
- Risk surcharge
- Demand factor
- Target margin

The selected route is then passed through the dynamic pricing and margin optimization pipeline to generate a freight quotation.

## System Architecture

```text
Customer
   |
   v
React Frontend
   |
   v
FastAPI Backend
   |
   +------------------+
   |                  |
   v                  v
Route Agent       Quotation Service
   |                  |
   v                  v
Route Dataset     Freight Pricing Engine
                      |
             +--------+--------+
             |                 |
             v                 v
        Pricing Agent     Margin Agent
             |                 |
             +--------+--------+
                      |
                      v
              Dynamic Quotation


Key Features
1. Route Intelligence

The Route Agent analyzes available maritime routes between an origin and destination.

Route evaluation considers:

Transit time
Distance
Number of transshipments
2. Weighted Route Scoring

Routes are evaluated using a weighted scoring model:

Route Score =
(Transit Score × 0.40)
+ (Distance Score × 0.25)
+ (Transshipment Score × 0.35)

The route with the highest score is selected as the recommended route.

3. Dynamic Freight Pricing

The Pricing Agent calculates the operational cost of the selected route.

Operating Cost =
Base Freight
+ Fuel Surcharge
+ Port Charge
+ Risk Surcharge

Demand conditions are incorporated using a demand factor:

Demand Adjusted Cost =
Operating Cost × Demand Factor
4. Margin Optimization

The Margin Agent calculates the selling price based on the target margin.

Selling Price =
Demand Adjusted Cost
--------------------
1 - Target Margin

Profit is calculated as:

Profit =
Selling Price - Demand Adjusted Cost

Actual margin:

Margin =
Profit
------
Selling Price × 100
5. Dynamic Quotation

The Quotation Service combines:

Route Selection
       ↓
Base Freight
       ↓
Pricing Analysis
       ↓
Demand Adjustment
       ↓
Margin Calculation
       ↓
Final Freight Quotation

The system generates both per-container and total quotation values.

Technology Stack
Frontend
React.js
Vite
JavaScript
CSS
Backend
Python
FastAPI
Pandas
SQLite
Development Tools
Git
GitHub
Visual Studio Code
Project Structure
Agentic-Maritime-Brokerage/
│
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── route_agent.py
│   │   │   ├── pricing_agent.py
│   │   │   └── margin_agent.py
│   │   │
│   │   ├── data/
│   │   │   ├── routes.csv
│   │   │   └── pricing.csv
│   │   │
│   │   ├── services/
│   │   │   ├── quotation_service.py
│   │   │   ├── freight_pricing_engine.py
│   │   │   └── margin_optimizer.py
│   │   │
│   │   ├── database.py
│   │   └── models.py
│   │
│   ├── main.py
│   └── generate_pricing.py
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── Dashboard.jsx
│   │   ├── App.css
│   │   └── index.css
│   │
│   ├── package.json
│   └── vite.config.js
│
└── README.md
Running the Project
Backend

Open CMD and run:

cd C:\Users\ramzim-pmis0057\Documents\Agentic-Maritime-Brokerage\backend
venv\Scripts\activate
python -m uvicorn main:app --reload

Backend:

http://127.0.0.1:8000

API documentation:

http://127.0.0.1:8000/docs
Frontend

Open another CMD window:

cd C:\Users\ramzim-pmis0057\Documents\Agentic-Maritime-Brokerage\frontend
npm run dev

Frontend:

http://localhost:5173
Example

A quotation request can contain:

Origin: Chennai
Destination: Rotterdam
Cargo Type: Electronics
Containers: 10

The system analyzes available routes, selects the recommended route, calculates dynamic freight pricing, applies the target margin, and generates the final quotation.

API

The backend provides APIs for:

Customer registration
Customer login
Route analysis
Quotation generation
Quotation history
Quotation details
Quotation statistics

FastAPI Swagger documentation is available at:

http://127.0.0.1:8000/docs
Purpose

The project demonstrates how agent-based components can be combined with route analytics and dynamic pricing logic to automate key parts of maritime freight brokerage.

Author

Mohammed Ramzim

M.Tech Software Engineering