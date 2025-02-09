import { useEffect, useRef, useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type MessageStatus = "sending" | "sent" | "delivered" | "read";
type MessageWithStatus = {
  id: number;
  content: string;
  status: MessageStatus;
};

export function useWebSocket() {
  const { toast } = useToast();
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [messageStatuses, setMessageStatuses] = useState<Record<number, MessageStatus>>({});
  const messageQueueRef = useRef<MessageWithStatus[]>([]);

  const connect = useCallback(() => {
    if (!user) return; // Only connect if user is authenticated

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      // Send any queued messages
      messageQueueRef.current.forEach(msg => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'message',
            ...msg
          }));
        }
      });
      messageQueueRef.current = [];

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      // Attempt to reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to chat server. Retrying...",
        variant: "destructive",
      });
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user, toast]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  const sendMessage = useCallback((message: any) => {
    const messageWithStatus: MessageWithStatus = {
      ...message,
      status: "sending",
      id: Date.now(), // Temporary ID for tracking
    };

    setMessageStatuses(prev => ({
      ...prev,
      [messageWithStatus.id]: "sending"
    }));

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        ...messageWithStatus
      }));
    } else {
      // Queue message for when connection is restored
      messageQueueRef.current.push(messageWithStatus);
      toast({
        title: "Connection Error",
        description: "Not connected to chat server. Message will be sent when connection is restored.",
        variant: "destructive",
      });
    }

    return messageWithStatus.id; // Return ID for tracking
  }, [toast]);

  const updateMessageStatus = useCallback((messageId: number, status: MessageStatus) => {
    setMessageStatuses(prev => ({
      ...prev,
      [messageId]: status
    }));
  }, []);

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        isTyping,
        userId: user?.id
      }));
    }
  }, [user]);

  const subscribe = useCallback((callback: (data: any) => void) => {
    if (!wsRef.current) return;

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle different message types
        switch (data.type) {
          case 'messageStatus':
            updateMessageStatus(data.messageId, data.status);
            break;
          case 'typing':
            // Handle typing indicator
            break;
          default:
            callback(data);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };
  }, [updateMessageStatus]);

  const getMessageStatus = useCallback((messageId: number) => {
    return messageStatuses[messageId] || "sending";
  }, [messageStatuses]);

  return { 
    sendMessage, 
    subscribe, 
    isConnected, 
    sendTypingStatus,
    getMessageStatus
  };
}