import os
from supabase import create_client, Client

_supabase = None

def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        _supabase = create_client(url, key)
    return _supabase