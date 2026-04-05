"""
Emotiv Cortex API client for MindQuest.

Handles authentication, session creation, and data subscription
via the Cortex V2 WebSocket API (runs locally through Emotiv Launcher).
"""

import json
import ssl
import time
import asyncio
import websockets
from typing import Optional, Callable

from .config import (
    CORTEX_URL,
    CLIENT_ID,
    CLIENT_SECRET,
    HEADSET_ID,
    PROFILE_NAME,
)


class CortexClient:
    """Async client for the Emotiv Cortex V2 API."""

    def __init__(self):
        self.ws = None
        self.auth_token: Optional[str] = None
        self.session_id: Optional[str] = None
        self.headset_id: Optional[str] = None
        self._request_id = 0

    async def connect(self):
        """Open WebSocket connection to local Cortex service."""
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        self.ws = await websockets.connect(
            CORTEX_URL,
            ssl=ssl_context,
            max_size=2**20,
        )

    async def close(self):
        """Close the WebSocket connection."""
        if self.ws:
            await self.ws.close()

    def _next_id(self) -> int:
        self._request_id += 1
        return self._request_id

    async def _send(self, method: str, params: dict = None) -> dict:
        """Send a JSON-RPC request and return the response."""
        request = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": method,
        }
        if params:
            request["params"] = params

        await self.ws.send(json.dumps(request))
        response = await self.ws.recv()
        return json.loads(response)

    # ── Authentication ──────────────────────────────────────────────

    async def get_cortex_info(self) -> dict:
        """Get Cortex service version info."""
        return await self._send("getCortexInfo")

    async def authorize(self) -> str:
        """Authorize with client credentials and get an auth token."""
        result = await self._send("authorize", {
            "clientId": CLIENT_ID,
            "clientSecret": CLIENT_SECRET,
        })

        if "result" in result:
            self.auth_token = result["result"]["cortexToken"]
        else:
            error = result.get("error", {})
            raise RuntimeError(
                f"Authorization failed: {error.get('message', result)}"
            )

        return self.auth_token

    async def has_access_right(self) -> bool:
        """Check if the app has access rights."""
        result = await self._send("hasAccessRight", {
            "clientId": CLIENT_ID,
            "clientSecret": CLIENT_SECRET,
        })
        return result.get("result", {}).get("accessGranted", False)

    async def request_access(self) -> dict:
        """Request access — user must approve in Emotiv Launcher."""
        return await self._send("requestAccess", {
            "clientId": CLIENT_ID,
            "clientSecret": CLIENT_SECRET,
        })

    # ── Headset ─────────────────────────────────────────────────────

    async def query_headsets(self) -> list:
        """List connected headsets."""
        result = await self._send("queryHeadsets")
        return result.get("result", [])

    async def connect_headset(self, headset_id: str = None) -> str:
        """Connect to a specific headset (or first available)."""
        if not headset_id:
            headsets = await self.query_headsets()
            if not headsets:
                raise RuntimeError("No headsets found. Is your Insight powered on?")
            headset_id = headsets[0]["id"]

        await self._send("controlDevice", {
            "command": "connect",
            "headset": headset_id,
        })

        self.headset_id = headset_id
        return headset_id

    # ── Session ─────────────────────────────────────────────────────

    async def create_session(self, activate: bool = True) -> str:
        """Create a session for the connected headset."""
        status = "active" if activate else "open"
        result = await self._send("createSession", {
            "cortexToken": self.auth_token,
            "headset": self.headset_id or HEADSET_ID,
            "status": status,
        })

        if "result" in result:
            self.session_id = result["result"]["id"]
        else:
            error = result.get("error", {})
            raise RuntimeError(
                f"Session creation failed: {error.get('message', result)}"
            )

        return self.session_id

    async def close_session(self):
        """Close the current session."""
        if self.session_id:
            await self._send("updateSession", {
                "cortexToken": self.auth_token,
                "session": self.session_id,
                "status": "close",
            })
            self.session_id = None

    # ── Profiles (trained mental commands) ──────────────────────────

    async def load_profile(self, profile_name: str = PROFILE_NAME) -> dict:
        """Load a trained mental command profile."""
        return await self._send("setupProfile", {
            "cortexToken": self.auth_token,
            "headset": self.headset_id,
            "profile": profile_name,
            "status": "load",
        })

    async def query_profiles(self) -> list:
        """List available profiles."""
        result = await self._send("queryProfile", {
            "cortexToken": self.auth_token,
        })
        return result.get("result", [])

    # ── Data Subscription ───────────────────────────────────────────

    async def subscribe(self, streams: list[str]) -> dict:
        """
        Subscribe to data streams.

        Streams:
          - "eeg"  : raw EEG channel data
          - "mot"  : motion sensors
          - "com"  : mental commands (trained)
          - "fac"  : facial expressions
          - "met"  : performance metrics (focus, stress, etc.)
        """
        return await self._send("subscribe", {
            "cortexToken": self.auth_token,
            "session": self.session_id,
            "streams": streams,
        })

    async def unsubscribe(self, streams: list[str]) -> dict:
        """Unsubscribe from data streams."""
        return await self._send("unsubscribe", {
            "cortexToken": self.auth_token,
            "session": self.session_id,
            "streams": streams,
        })

    async def recv_data(self) -> dict:
        """Receive the next data packet from subscribed streams."""
        raw = await self.ws.recv()
        return json.loads(raw)

    # ── Full Setup Convenience ──────────────────────────────────────

    async def setup(self) -> str:
        """
        Full setup sequence: connect → authorize → headset → session → subscribe.
        Returns the session ID.
        """
        await self.connect()

        # Check / request access
        has_access = await self.has_access_right()
        if not has_access:
            await self.request_access()
            print("⏳ Approve access in Emotiv Launcher, then retry...")
            raise RuntimeError("Access not yet granted. Approve in Emotiv Launcher.")

        await self.authorize()
        await self.connect_headset(HEADSET_ID or None)

        # Wait for headset to be ready
        await asyncio.sleep(1)

        await self.create_session()

        # Try to load mental command profile
        try:
            await self.load_profile()
        except Exception:
            pass  # Profile may not exist yet — that's okay for raw EEG mode

        # Subscribe to mental commands + raw EEG + performance metrics
        await self.subscribe(["com", "eeg", "met"])

        return self.session_id
