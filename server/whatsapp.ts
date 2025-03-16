import { makeWASocket, initAuthCreds, BufferJSON } from "@whiskeysockets/baileys";
import { type IStorage } from "./storage";
import QRCode from "qrcode";
import fs from "fs";

const STATE_FILE = "auth_info.json";

export class WhatsAppManager {
  private sock: any = null;
  private qrCode: string | null = null;
  private isConnected = false;
  private qrAttemptCount = 0;
  private readonly maxQrAttempts = 5;
  
  constructor(private storage: IStorage) {}

  private loadState() {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, { encoding: "utf-8" }), BufferJSON.reviver);
    }
    return { creds: initAuthCreds() };
  }

  private saveState(state: any) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, BufferJSON.replacer, 2));
  }

  async connect() {
    const state = this.loadState();
    
    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
    });

    this.sock.ev.on("connection.update", async (update: any) => {
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

  async sendMessage(to: string, content: string) {
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
      qrAttempts: this.qrAttemptCount,
    };
  }
}
