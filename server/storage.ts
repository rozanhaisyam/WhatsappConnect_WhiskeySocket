import { messages, type Message, type InsertMessage, type WhatsappSession } from "@shared/schema";

export interface IStorage {
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(): Promise<Message[]>;
  updateSessionStatus(isConnected: boolean): Promise<void>;
  getSessionStatus(): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private messages: Message[] = [];
  private isConnected = false;

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.messages.length + 1,
      ...insertMessage,
      sent: true,
      timestamp: new Date(),
    };
    this.messages.push(message);
    return message;
  }

  async getMessages(): Promise<Message[]> {
    return this.messages;
  }

  async updateSessionStatus(isConnected: boolean): Promise<void> {
    this.isConnected = isConnected;
  }

  async getSessionStatus(): Promise<boolean> {
    return this.isConnected;
  }
}

export const storage = new MemStorage();
