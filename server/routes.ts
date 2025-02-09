import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import cookie from "cookie";

type WebSocketClient = WebSocket & {
  userId?: number;
  isAlive?: boolean;
};

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.get("/api/users/online", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const users = await storage.getOnlineUsers();
    res.json(users);
  });

  // Map to store user sessions and their WebSocket connections
  const sessions = new Map<string, number>();
  const connections = new Map<number, WebSocketClient>();

  // Heartbeat to keep track of connected clients
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocketClient) => {
      if (ws.isAlive === false) {
        handleDisconnection(ws);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  function handleDisconnection(ws: WebSocketClient) {
    if (ws.userId) {
      storage.setUserOnlineStatus(ws.userId, false).catch(console.error);
      broadcastUserStatus(ws.userId, false);
      connections.delete(ws.userId);
    }
    const wsKey = ws.toString();
    if (sessions.has(wsKey)) {
      sessions.delete(wsKey);
    }
  }

  wss.on("connection", async (ws: WebSocketClient, req) => {
    console.log("New WebSocket connection attempt");
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      console.log("No cookie header found");
      ws.close(1008, "No session cookie found");
      return;
    }

    const cookies = cookie.parse(cookieHeader);
    const sessionId = cookies["connect.sid"];

    if (!sessionId) {
      console.log("No session ID found in cookies");
      ws.close(1008, "No session ID found");
      return;
    }

    // Get the session from storage
    const session = await new Promise((resolve) => {
      storage.sessionStore.get(sessionId.substring(2), (err, session) => {
        if (err || !session) {
          console.log("Session retrieval error:", err);
          resolve(null);
        } else {
          resolve(session);
        }
      });
    });

    if (!session || !session.passport || !session.passport.user) {
      console.log("Invalid session:", session);
      ws.close(1008, "Invalid session");
      return;
    }

    const userId = session.passport.user;
    console.log("WebSocket authenticated for user:", userId);
    ws.userId = userId;
    sessions.set(ws.toString(), userId);
    connections.set(userId, ws);

    // Set user as online
    await storage.setUserOnlineStatus(userId, true);
    broadcastUserStatus(userId, true);

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'message':
            // Handle chat message
            const validatedMessage = insertMessageSchema.parse(message);
            const savedMessage = await storage.createMessage(validatedMessage);

            // Send delivery confirmation to sender
            const senderWs = connections.get(validatedMessage.senderId!);
            if (senderWs?.readyState === WebSocket.OPEN) {
              senderWs.send(JSON.stringify({
                type: 'messageStatus',
                messageId: message.id,
                status: 'delivered'
              }));
            }

            if (validatedMessage.receiverId) {
              // Private message
              const receiverWs = connections.get(validatedMessage.receiverId);

              if (receiverWs?.readyState === WebSocket.OPEN) {
                receiverWs.send(JSON.stringify(savedMessage));
                // Send read receipt
                senderWs?.send(JSON.stringify({
                  type: 'messageStatus',
                  messageId: message.id,
                  status: 'read'
                }));
              }
            } else {
              // Broadcast to all connected clients
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(savedMessage));
                }
              });
            }
            break;

          case 'typing':
            // Broadcast typing status
            if (message.receiverId) {
              const receiverWs = connections.get(message.receiverId);
              if (receiverWs?.readyState === WebSocket.OPEN) {
                receiverWs.send(JSON.stringify({
                  type: 'typing',
                  userId: ws.userId,
                  isTyping: message.isTyping
                }));
              }
            } else {
              // Broadcast typing status to all
              wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'typing',
                    userId: ws.userId,
                    isTyping: message.isTyping
                  }));
                }
              });
            }
            break;
        }
      } catch (error) {
        console.error("Error processing message:", error);
        ws.send(JSON.stringify({ 
          type: 'error',
          message: "Failed to process message" 
        }));
      }
    });

    ws.on("close", () => {
      handleDisconnection(ws);
    });

    ws.on("error", () => {
      handleDisconnection(ws);
    });
  });

  function broadcastUserStatus(userId: number, isOnline: boolean) {
    const statusUpdate = {
      type: "userStatus",
      userId,
      isOnline,
    };

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(statusUpdate));
      }
    });
  }

  return httpServer;
}