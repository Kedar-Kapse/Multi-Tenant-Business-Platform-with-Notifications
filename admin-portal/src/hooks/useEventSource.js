import { useEffect, useRef, useCallback } from 'react';
import authService from '../services/authService';

/**
 * SSE (Server-Sent Events) hook for real-time notifications.
 * @param {string} url - SSE endpoint URL
 * @param {Object} handlers - { onMessage, onError, onOpen }
 * @param {boolean} enabled - Whether to connect
 */
export default function useEventSource(url, handlers = {}, enabled = true) {
  const sourceRef = useRef(null);
  const { onMessage, onError, onOpen } = handlers;

  const connect = useCallback(() => {
    if (!enabled || !url) return;

    // Close existing connection
    if (sourceRef.current) {
      sourceRef.current.close();
    }

    const token = authService.getToken();
    const separator = url.includes('?') ? '&' : '?';
    const fullUrl = token ? `${url}${separator}token=${token}` : url;

    const source = new EventSource(fullUrl);
    sourceRef.current = source;

    source.onopen = () => onOpen?.();

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch {
        onMessage?.(event.data);
      }
    };

    source.onerror = (err) => {
      onError?.(err);
      // Auto-reconnect after 5s
      source.close();
      setTimeout(connect, 5000);
    };
  }, [url, enabled, onMessage, onError, onOpen]);

  useEffect(() => {
    connect();
    return () => {
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
  }, []);

  return { disconnect, reconnect: connect };
}
