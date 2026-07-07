import { useEffect, useRef, useState, useCallback } from 'react';

type WebSocketMessage = {
  type: string;
  payload: any;
};

export function useWebsocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setIsConnected(true);
      console.log(`[WS] Connected to ${url}`);
    };

    ws.current.onmessage = (event) => {
      if (event.data === 'PONG') return;
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        setLastMessage(data);
      } catch (e) {
        console.warn('[WS] Failed to parse message:', event.data);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      console.log(`[WS] Disconnected from ${url}. Reconnecting in 3s...`);
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('[WS] Error:', error);
      ws.current?.close();
    };
  }, [url]);

  useEffect(() => {
    connect();

    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send('PING');
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) {
        ws.current.onclose = null; // Prevent reconnect on intentional unmount
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('[WS] Cannot send message, socket not open');
    }
  }, []);

  return { isConnected, lastMessage, sendMessage };
}
