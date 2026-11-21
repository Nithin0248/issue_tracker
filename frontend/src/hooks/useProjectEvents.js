import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { WS_URL, tokenStore } from '../api/client';

/**
 * Live updates: subscribes to /topic/projects/{id} over STOMP/WebSocket and calls onEvent for every
 * change another teammate makes ({ projectId, type, ticketId, actorId }). Reconnects automatically.
 * If the socket cannot connect the app still works - you just need to refresh to see others' changes.
 */
export default function useProjectEvents(projectId, onEvent) {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    const token = tokenStore.get();
    if (!token || !projectId) return undefined;

    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 0,
      heartbeatOutgoing: 0,
    });

    client.onConnect = () => {
      client.subscribe(`/topic/projects/${projectId}`, (message) => {
        try {
          handler.current(JSON.parse(message.body));
        } catch {
          /* ignore malformed frames */
        }
      });
    };

    client.activate();
    return () => {
      client.deactivate();
    };
  }, [projectId]);
}
