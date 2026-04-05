import { useState, useEffect, useRef, useCallback } from "react";
import {
  EEGService,
  type EEGCommand,
  type EEGSample,
  type EEGStatus,
} from "../services/EEGService";

/**
 * React hook that manages the EEG headset connection
 * and feeds commands into the chess game.
 */
export function useEEGInput(onCommand: (command: string) => void) {
  const serviceRef = useRef<EEGService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastCommand, setLastCommand] = useState<EEGCommand | null>(null);
  const [lastEEGSample, setLastEEGSample] = useState<EEGSample | null>(null);
  const [status, setStatus] = useState<EEGStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep onCommand ref stable to avoid re-registering callbacks
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  useEffect(() => {
    const service = new EEGService();
    serviceRef.current = service;

    service.on({
      onCommand: (cmd: EEGCommand) => {
        setLastCommand(cmd);
        onCommandRef.current(cmd.command);
      },
      onEEGData: (sample: EEGSample) => {
        setLastEEGSample(sample);
      },
      onStatus: (s: EEGStatus) => {
        setStatus(s);
      },
      onError: (msg: string) => {
        setError(msg);
      },
      onConnect: () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
    });

    return () => {
      service.stopStream();
    };
  }, []);

  const connect = useCallback(async () => {
    if (!serviceRef.current) return;
    setIsConnecting(true);
    setError(null);

    try {
      const result = await serviceRef.current.connectHeadset();
      if (result.status === "connected") {
        serviceRef.current.startStream();
      } else {
        setError(result.message || "Failed to connect headset");
        setIsConnecting(false);
      }
    } catch (e) {
      setError("Cannot reach backend. Is the server running?");
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!serviceRef.current) return;
    serviceRef.current.stopStream();
    await serviceRef.current.disconnectHeadset();
    setIsConnected(false);
    setLastCommand(null);
    setLastEEGSample(null);
    setStatus(null);
  }, []);

  return {
    isConnected,
    isConnecting,
    lastCommand,
    lastEEGSample,
    status,
    error,
    connect,
    disconnect,
  };
}
