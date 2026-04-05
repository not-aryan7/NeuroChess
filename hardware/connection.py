import websocket

try:
    ws = websocket.create_connection(
        "wss://localhost:6868",
        sslopt={"cert_reqs": 0}
    )
    print("✅ Connected to Cortex")
    ws.close()
except Exception as e:
    print("❌ Connection failed:", e)