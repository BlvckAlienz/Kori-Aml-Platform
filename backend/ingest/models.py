from pydantic import BaseModel, Field
from typing import Optional

class TransactionPayload(BaseModel):
    transaction_id: str
    user_id: str
    amount: float
    timestamp: str  # ISO format
    ip_address: Optional[str] = None
    phone: Optional[str] = None
    wallet_address: Optional[str] = None
    merchant_id: Optional[str] = None
    is_fraud: bool = False