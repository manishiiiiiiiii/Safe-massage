import { Message, InsertMessage, User, InsertUser } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { Store } from "express-session";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getMessages(): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getOnlineUsers(): Promise<User[]>;
  setUserOnlineStatus(userId: number, isOnline: boolean): Promise<void>;
  storeVerificationCode(userId: number, code: string): Promise<void>;
  verifyCode(username: string, code: string): Promise<boolean>;
  sessionStore: Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Map<number, Message>;
  private verificationCodes: Map<string, { code: string; expiresAt: Date }>;
  private currentUserId: number;
  private currentMessageId: number;
  sessionStore: Store;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.verificationCodes = new Map();
    this.currentUserId = 1;
    this.currentMessageId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      avatarUrl: `https://images.unsplash.com/photo-${1708860028064 + id}-3303a016e88f`,
      isOnline: true,
      lastSeen: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values());
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const newMessage: Message = {
      id,
      content: message.content,
      senderId: message.senderId ?? null,
      receiverId: message.receiverId ?? null,
      imageUrl: message.imageUrl ?? null,
      createdAt: new Date(),
    };
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async getOnlineUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isOnline);
  }

  async setUserOnlineStatus(userId: number, isOnline: boolean): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      this.users.set(userId, user);
    }
  }

  async storeVerificationCode(userId: number, code: string): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
      this.verificationCodes.set(user.username, { code, expiresAt });
    }
  }

  async verifyCode(username: string, code: string): Promise<boolean> {
    const storedData = this.verificationCodes.get(username);
    if (!storedData) return false;

    const { code: storedCode, expiresAt } = storedData;
    if (Date.now() > expiresAt.getTime()) {
      this.verificationCodes.delete(username);
      return false;
    }

    if (code === storedCode) {
      this.verificationCodes.delete(username);
      return true;
    }

    return false;
  }
}

export const storage = new MemStorage();