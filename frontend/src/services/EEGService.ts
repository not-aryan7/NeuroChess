/**
 * EEG Service — connects the frontend to the MindQuest backend
 * for live EEG data from the Emotiv Insight headset.
 *
 * Provides:
 *  - WebSocket connection to /ws/eeg for live commands + raw EEG
 *  - REST calls to /eeg/connect and /eeg/disconnect
 *  - Callback-based API for the chess game to consume commands
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_BASE = API_BASE.replace(/^http/, "ws");

export type EEGCommand = {
  command: "left" | "right" | "up" | "down" | "feet" | "rest";
  confidence: number;
  raw_action: string;
  timestamp: number;
};

export type EEGSample = {
  channels: Record<string, number>;
  timestamp: number;
  focus: number;
};

export type EEGStatus = {
  connected: boolean;
  last_command: string | null;
  last_confidence: number;
  focus_level: number;
  contact_quality: Record<string, number>;
  buffer_size: number;
};

type EEGCallbacks = {
  onCommand?: (cmd: EEGCommand) => void;
  onEEGData?: (sample: EEGSample) => void;
  onStatus?: (status: EEGStatus) => void;
  onError?: (message: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

export class EEGService {
  private ws: WebSocket | null = null;
  private callbacks: EEGCallbacks = {};
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _isConnected = false;

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Register callbacks for EEG events.
   */
  on(callbacks: EEGCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Tell the backend to connect to the Emotiv headset.
   */
  async connectHeadset(): Promise<{ status: string; message?: string }> {
    const res = await fetch(`${API_BASE}/eeg/connect`, { method: "POST" });
    return res.json();
  }

  /**
   * Tell the backend to disconnect from the headset.
   */
  async disconnectHeadset(): Promise<void> {
    await fetch(`${API_BASE}/eeg/disconnect`, { method: "POST" });
  }

  /**
   * Check headset connection status.
   */
  async getStatus(): Promise<EEGStatus> {
    const res = await fetch(`${API_BASE}/eeg/status`);
    return res.json();
  }

  /**
   * Open WebSocket to /ws/eeg for live streaming.
   */
  startStream(): void {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(`${WS_BASE}/ws/eeg`);

    this.ws.onopen = () => {
      this._isConnected = true;
      this.callbacks.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "command":
            this.callbacks.onCommand?.({
              command: data.command,
              confidence: data.confidence,
              raw_action: data.raw_action,
              timestamp: data.timestamp,
            });
            break;

          case "eeg":
            this.callbacks.onEEGData?.({
              channels: data.channels,
              timestamp: data.timestamp,
              focus: data.focus,
            });
            break;

          case "status":
            this.callbacks.onStatus?.(data as EEGStatus);
            break;

          case "error":
            this.callbacks.onError?.(data.message);
            break;
        }
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this._isConnected = false;
      this.callbacks.onDisconnect?.();
    };

    this.ws.onerror = () => {
      this.callbacks.onError?.("WebSocket connection error");
    };
  }

  /**
   * Close the WebSocket stream.
   */
  stopStream(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._isConnected = false;
  }

  /**
   * Request a status update from the backend via the WebSocket.
   */
  requestStatus(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "status" }));
    }
  }
}
