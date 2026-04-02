def score_transaction(tx: dict, block_score: float) -> float:
    score = 0.0
    
    # High amount ( > 500,000 NGN )
    if tx.get("amount", 0) > 500000:
        score += 0.3
    
    # Blocklist hit
    score += block_score
    
    # Cap at 1.0
    return min(score, 1.0)