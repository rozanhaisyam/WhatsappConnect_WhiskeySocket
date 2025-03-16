import { makeWASocket, initAuthCreds, BufferJSON } from "@whiskeysockets/baileys";
import { type IStorage } from "./storage";
import QRCode from "qrcode";
import fs from "fs";

const STATE_FILE = "auth_info.json";
const QR_TIMEOUT = 5000; // 5 seconds before QR code expires

export class WhatsAppManager {
  private sock: any = null;
  private qrCode: string | null = null;
  private isConnected = false;
  private qrAttemptCount = 0;
  private readonly maxQrAttempts = 5;
  private qrTimer: NodeJS.Timeout | null = null;

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

  private clearQRTimer() {
    if (this.qrTimer) {
      clearTimeout(this.qrTimer);
      this.qrTimer = null;
    }
  }

  private async handleQRGeneration(qr: string) {
    this.qrAttemptCount++;
    console.log(`New QR Code generated (${this.qrAttemptCount}/${this.maxQrAttempts})`);

    try {
      this.qrCode = await QRCode.toDataURL(qr);

      // Set timer to clear QR code after 5 seconds
      this.clearQRTimer();
      this.qrTimer = setTimeout(() => {
        console.log("QR Code expired");
        this.qrCode = null;
        // No delay for next QR code generation
      }, QR_TIMEOUT);

    } catch (err) {
      console.error("Error generating QR code:", err);
    }

    if (this.qrAttemptCount >= this.maxQrAttempts) {
      console.log("Max QR attempts reached");
      await this.disconnect();
      this.qrCode = null;
    }
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
        await this.handleQRGeneration(qr);
      }

      if (connection === "open") {
        console.log("Connected to WhatsApp");
        this.isConnected = true;
        this.qrAttemptCount = 0;
        this.qrCode = null;
        this.clearQRTimer();
        await this.storage.updateSessionStatus(true);
      }

      if (connection === "close") {
        console.log("Disconnected from WhatsApp");
        this.isConnected = false;
        this.clearQRTimer();
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
      this.clearQRTimer();
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