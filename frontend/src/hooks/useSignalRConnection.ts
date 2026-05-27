import { useEffect, useRef, useState, useCallback } from "react";
import { HubConnection, HubConnectionState } from "@microsoft/signalr";
import { createMonitoringConnection } from "../services/signalr";

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";

const globalConnection = { current: null as HubConnection | null };
const globalListeners = new Map<string, Set<(args: unknown[]) => void>>();

function ensureConnection(): HubConnection {
  if (!globalConnection.current) {
    globalConnection.current = createMonitoringConnection();
    const conn = globalConnection.current;

    conn.onreconnecting(() => {
      window.dispatchEvent(new CustomEvent("signalr-state", { detail: "reconnecting" }));
    });
    conn.onreconnected(() => {
      window.dispatchEvent(new CustomEvent("signalr-state", { detail: "connected" }));
    });
    conn.onclose(() => {
      window.dispatchEvent(new CustomEvent("signalr-state", { detail: "disconnected" }));
    });
  }
  return globalConnection.current;
}

export function useSignalRConnection() {
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const handlersRef = useRef<Map<string, (args: unknown[]) => void>>(new Map());

  useEffect(() => {
    const conn = ensureConnection();

    const updateState = () => {
      const s = conn.state;
      if (s === HubConnectionState.Connected) setState("connected");
      else if (s === HubConnectionState.Reconnecting) setState("reconnecting");
      else if (s === HubConnectionState.Connecting) setState("connecting");
      else setState("disconnected");
    };

    const onStateEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as ConnectionState;
      setState(detail);
      if (detail === "connected") setLastSync(new Date());
    };

    window.addEventListener("signalr-state", onStateEvent);

    const startConnection = async () => {
      if (conn.state === HubConnectionState.Disconnected) {
        try {
          await conn.start();
          updateState();
          setLastSync(new Date());
        } catch {
          updateState();
        }
      } else {
        updateState();
        setLastSync(new Date());
      }
    };

    void startConnection();

    const retryInterval = window.setInterval(() => {
      if (conn.state === HubConnectionState.Disconnected) {
        void startConnection();
      }
    }, 5000);

    return () => {
      window.removeEventListener("signalr-state", onStateEvent);
      window.clearInterval(retryInterval);
    };
  }, []);

  const on = useCallback(<T extends unknown[]>(methodName: string, handler: (...args: T) => void) => {
    const conn = ensureConnection();
    const wrapped = (args: unknown[]) => {
      setLastSync(new Date());
      // @ts-expect-error variadic args
      handler(...args);
    };
    handlersRef.current.set(methodName, wrapped);

    if (!globalListeners.has(methodName)) {
      globalListeners.set(methodName, new Set());
      conn.on(methodName, (...args: unknown[]) => {
        globalListeners.get(methodName)?.forEach((h) => {
          try { h(args); } catch { /* noop */ }
        });
      });
    }
    globalListeners.get(methodName)!.add(wrapped);

    return () => {
      globalListeners.get(methodName)?.delete(wrapped);
      handlersRef.current.delete(methodName);
    };
  }, []);

  return { state, lastSync, on };
}
