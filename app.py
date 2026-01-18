#this script obtains an OAuth2 bearer token using client credentials and is just a personal use test file

import requests
import json
import base64
import time
from datetime import datetime

# --- CONFIGURATION ---
CLIENT_ID = 'cb145961-c222-4faa-8333-373e448d0f98'
CLIENT_SECRET = 'H3iexfaHRuPbaa9ssHMPFUnF3Q91wGF0'
TOKEN_URL = "https://services.sentinel-hub.com/oauth/token"

def decode_token_part(token):
    """Decodes the payload part of the JWT to see expiry and ID."""
    try:
        # JWTs are 3 parts separated by dots. The middle part is the payload.
        payload_part = token.split(".")[1]
        # Add padding if needed for base64 decoding
        payload_part += "=" * ((4 - len(payload_part) % 4) % 4)
        decoded_bytes = base64.urlsafe_b64decode(payload_part)
        return json.loads(decoded_bytes)
    except Exception as e:
        print(f"Could not decode token: {e}")
        return {}

def get_bearer_token(client_id, client_secret):
    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret
    }
    
    try:
        print(f"[-] Requesting token for Client ID: {client_id[:5]}...")
        response = requests.post(TOKEN_URL, data=payload)
        response.raise_for_status()
        
        data = response.json()
        token = data.get("access_token")
        
        # --- VERIFICATION STEP ---
        info = decode_token_part(token)
        exp_timestamp = info.get("exp")
        jti = info.get("jti") # Unique Token ID
        
        # Convert timestamp to readable time
        exp_time = datetime.fromtimestamp(exp_timestamp).strftime('%H:%M:%S')
        
        print(f"[-] Token Received!")
        print(f"[-] Token Unique ID (jti): {jti}")
        print(f"[-] Token Expires at:      {exp_time} (Local Time)")
        
        return token

    except requests.exceptions.RequestException as e:
        print(f"[!] Error: {e}")
        if response.content:
            print(f"[!] Response: {response.content.decode()}")
        return None

if __name__ == "__main__":
    token = get_bearer_token(CLIENT_ID, CLIENT_SECRET)
    print("\nACCESS TOKEN:")
    print(token)