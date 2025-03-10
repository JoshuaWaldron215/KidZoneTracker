import { InsertUser, InsertRoom, InsertNotification, User, Room, Notification } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Room operations
  getRooms(): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoomOccupancy(id: number, occupancy: number): Promise<Room>;
  updateRoomStatus(id: number, isOpen: boolean): Promise<Room>;
  
  // Notification operations
  getNotifications(roomId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  deleteNotification(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private rooms: Map<number, Room>;
  private notifications: Map<number, Notification>;
  private currentId: { users: number; rooms: number; notifications: number };

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.notifications = new Map();
    this.currentId = { users: 1, rooms: 1, notifications: 1 };
    
    // Add default staff user
    this.createUser({
      username: "admin",
      password: "admin123",
      isStaff: true,
    });
    
    // Add default rooms
    this.createRoom({
      name: "Main KidZone",
      maxCapacity: 20,
      isOpen: true,
    });
    this.createRoom({
      name: "Overflow Room",
      maxCapacity: 15,
      isOpen: false,
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Room operations
  async getRooms(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }

  async getRoom(id: number): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = this.currentId.rooms++;
    const room: Room = { ...insertRoom, id, currentOccupancy: 0 };
    this.rooms.set(id, room);
    return room;
  }

  async updateRoomOccupancy(id: number, occupancy: number): Promise<Room> {
    const room = await this.getRoom(id);
    if (!room) throw new Error("Room not found");
    
    const updatedRoom = { ...room, currentOccupancy: occupancy };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async updateRoomStatus(id: number, isOpen: boolean): Promise<Room> {
    const room = await this.getRoom(id);
    if (!room) throw new Error("Room not found");
    
    const updatedRoom = { ...room, isOpen };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  // Notification operations
  async getNotifications(roomId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      (n) => n.roomId === roomId,
    );
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.currentId.notifications++;
    const notification: Notification = { ...insertNotification, id };
    this.notifications.set(id, notification);
    return notification;
  }

  async deleteNotification(id: number): Promise<void> {
    this.notifications.delete(id);
  }
}

export const storage = new MemStorage();
