from pydantic import BaseModel

from pydantic import BaseModel


# =========================================================
# ROUTE REQUEST
# =========================================================

class RouteRequest(BaseModel):

    origin: str
    destination: str
    cargo_type: str
    containers: int


# =========================================================
# QUOTATION REQUEST
# =========================================================

class QuotationRequest(BaseModel):

    customer_email: str
    origin: str
    destination: str
    cargo_type: str
    containers: int


# =========================================================
# CUSTOMER REGISTRATION REQUEST
# =========================================================

class CustomerRegisterRequest(BaseModel):

    name: str
    email: str
    password: str


# =========================================================
# CUSTOMER LOGIN REQUEST
# =========================================================

class CustomerLoginRequest(BaseModel):

    email: str
    password: str