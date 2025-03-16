import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WhatsAppManager } from "./whatsapp";
import { insertMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const whatsapp = new WhatsAppManager(storage);

  app.post("/api/connect", async (_req, res) => {
    try {
      await whatsapp.connect();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to connect to WhatsApp" });
    }
  });

  app.post("/api/disconnect", async (_req, res) => {
    try {
      await whatsapp.disconnect();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect from WhatsApp" });
    }
  });

  app.get("/api/status", (_req, res) => {
    const status = whatsapp.getStatus();
    res.json(status);
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const message = insertMessageSchema.parse(req.body);
      await whatsapp.sendMessage(message.to, message.content);
      const savedMessage = await storage.createMessage(message);
      res.json(savedMessage);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/messages", async (_req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
