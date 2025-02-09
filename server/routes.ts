import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";

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
  const connections = new Map<number, WebSocket>();

  wss.on("connection", async (ws, req) => {
    const cookie = req.headers.cookie;
    if (!cookie) {
      ws.close(1008, "No session found");
      return;
    }

    const sessionId = cookie
      .split(";")
      .find((c) => c.trim().startsWith("connect.sid="))
      ?.split("=")[1];

    if (!sessionId) {
      ws.close(1008, "No session found");
      return;
    }

    const userId = parseInt(sessionId);
    sessions.set(ws.toString(), userId);
    connections.set(userId, ws);

    // Set user as online
    await storage.setUserOnlineStatus(userId, true);
    broadcastUserStatus(userId, true);

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const validatedMessage = insertMessageSchema.parse(message);
        const savedMessage = await storage.createMessage(validatedMessage);

        if (validatedMessage.receiverId) {
          // Private message
          const receiverWs = connections.get(validatedMessage.receiverId);
          const senderWs = connections.get(validatedMessage.senderId!);

          if (receiverWs?.readyState === WebSocket.OPEN) {
            receiverWs.send(JSON.stringify(savedMessage));
          }
          if (senderWs?.readyState === WebSocket.OPEN) {
            senderWs.send(JSON.stringify(savedMessage));
          }
        } else {
          // Broadcast to all connected clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(savedMessage));
            }
          });
        }
      } catch (error) {
        console.error("Error processing message:", error);
        ws.send(JSON.stringify({ error: "Failed to process message" }));
      }
    });

    ws.on("close", async () => {
      const userId = sessions.get(ws.toString());
      if (userId) {
        await storage.setUserOnlineStatus(userId, false);
        broadcastUserStatus(userId, false);
        connections.delete(userId);
      }
      sessions.delete(ws.toString());
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