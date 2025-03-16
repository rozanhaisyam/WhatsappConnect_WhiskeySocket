// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  messages = [];
  isConnected = false;
  async createMessage(insertMessage) {
    const message = {
      id: this.messages.length + 1,
      ...insertMessage,
      sent: true,
      timestamp: /* @__PURE__ */ new Date()
    };
    this.messages.push(message);
    return message;
  }
  async getMessages() {
    return this.messages;
  }
  async updateSessionStatus(isConnected) {
    this.isConnected = isConnected;
  }
  async getSessionStatus() {
    return this.isConnected;
  }
};
var storage = new MemStorage();

// server/whatsapp.ts
import { makeWASocket, initAuthCreds, BufferJSON } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import fs from "fs";
var STATE_FILE = "auth_info.json";
var WhatsAppManager = class {
  constructor(storage2) {
    this.storage = storage2;
  }
  sock = null;
  qrCode = null;
  isConnected = false;
  qrAttemptCount = 0;
  maxQrAttempts = 5;
  loadState() {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, { encoding: "utf-8" }), BufferJSON.reviver);
    }
    return { creds: initAuthCreds() };
  }
  saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, BufferJSON.replacer, 2));
  }
  async connect() {
    const state = this.loadState();
    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: true
    });
    this.sock.ev.on("connection.update", async (update) => {
      const { connection, qr } = update;
      if (qr) {
        this.qrAttemptCount++;
        console.log(`New QR Code generated (${this.qrAttemptCount}/${this.maxQrAttempts})`);
        this.qrCode = await QRCode.toDataURL(qr);
        if (this.qrAttemptCount >= this.maxQrAttempts) {
          console.log("Max QR attempts reached");
          await this.disconnect();
          this.qrCode = null;
        }
      }
      if (connection === "open") {
        console.log("Connected to WhatsApp");
        this.isConnected = true;
        this.qrAttemptCount = 0;
        this.qrCode = null;
        await this.storage.updateSessionStatus(true);
      }
      if (connection === "close") {
        console.log("Disconnected from WhatsApp");
        this.isConnected = false;
        await this.storage.updateSessionStatus(false);
      }
    });
    this.sock.ev.on("creds.update", () => this.saveState(state));
  }
  async disconnect() {
    if (this.sock) {
      this.sock.ws.close();
      this.sock = null;
      this.isConnected = false;
      await this.storage.updateSessionStatus(false);
    }
  }
  async sendMessage(to, content) {
    if (!this.isConnected || !this.sock) {
      throw new Error("WhatsApp not connected");
    }
    const formattedNumber = `${to}@s.whatsapp.net`;
    try {
      await this.sock.sendMessage(formattedNumber, { text: content });
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }
  getStatus() {
    return {
      isConnected: this.isConnected,
      qrCode: this.qrCode,
      qrAttempts: this.qrAttemptCount
    };
  }
};

// shared/schema.ts
import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var whatsappSessions = pgTable("whatsapp_sessions", {
  id: serial("id").primaryKey(),
  state: text("state").notNull(),
  isConnected: boolean("is_connected").notNull().default(false),
  lastConnected: timestamp("last_connected")
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  to: text("to").notNull(),
  content: text("content").notNull(),
  sent: boolean("sent").notNull().default(false),
  timestamp: timestamp("timestamp").notNull().defaultNow()
});
var insertMessageSchema = createInsertSchema(messages).pick({
  to: true,
  content: true
});

// server/routes.ts
async function registerRoutes(app2) {
  const whatsapp = new WhatsAppManager(storage);
  app2.post("/api/connect", async (_req, res) => {
    try {
      await whatsapp.connect();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to connect to WhatsApp" });
    }
  });
  app2.post("/api/disconnect", async (_req, res) => {
    try {
      await whatsapp.disconnect();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect from WhatsApp" });
    }
  });
  app2.get("/api/status", (_req, res) => {
    const status = whatsapp.getStatus();
    res.json(status);
  });
  app2.post("/api/messages", async (req, res) => {
    try {
      const message = insertMessageSchema.parse(req.body);
      await whatsapp.sendMessage(message.to, message.content);
      const savedMessage = await storage.createMessage(message);
      res.json(savedMessage);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  app2.get("/api/messages", async (_req, res) => {
    try {
      const messages2 = await storage.getMessages();
      res.json(messages2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
