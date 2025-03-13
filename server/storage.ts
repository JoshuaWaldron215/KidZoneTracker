import { db } from "./db";
import { eq, and, gte, asc } from "drizzle-orm";
import { users, rooms, notifications, roomHistory, roomSubscriptions } from "@shared/schema";
import type { InsertUser, InsertRoom, InsertNotification, InsertRoomHistory, User, Room, Notification, RoomSubscription, RoomHistory } from "@shared/schema";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;

  // Room operations
  getRooms(): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoomOccupancy(id: number, occupancy: number): Promise<Room>;
  updateRoomStatus(id: number, isOpen: boolean): Promise<Room>;
  getRoomHistory(roomId: number): Promise<RoomHistory[]>;
  resetDailyData(roomId: number): Promise<void>;
  resetAllRoomsData(): Promise<void>;

  // Notification operations
  getNotifications(roomId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  deleteNotification(id: number): Promise<void>;

  // FCM Subscription operations
  getNotificationSubscriptions(roomId: number): Promise<string[]>;
  addNotificationSubscription(roomId: number, token: string): Promise<void>;
  removeNotificationSubscription(roomId: number, token: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Room operations
  async getRooms(): Promise<Room[]> {
    return await db.select().from(rooms);
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const [room] = await db.insert(rooms).values(insertRoom).returning();
    return room;
  }

  async updateRoomOccupancy(id: number, occupancy: number): Promise<Room> {
    // First get the current room to track history
    const [currentRoom] = await db.select().from(rooms).where(eq(rooms.id, id));
    if (!currentRoom) throw new Error("Room not found");

    // Create room history entry
    await db.insert(roomHistory).values({
      roomId: id,
      userId: 1, // TODO: Get from auth context
      previousOccupancy: currentRoom.currentOccupancy,
      newOccupancy: occupancy,
      timestamp: new Date(),
    });

    // Update room
    const [updatedRoom] = await db
      .update(rooms)
      .set({
        currentOccupancy: occupancy,
        updatedAt: new Date(),
      })
      .where(eq(rooms.id, id))
      .returning();

    return updatedRoom;
  }

  async updateRoomStatus(id: number, isOpen: boolean): Promise<Room> {
    const [updatedRoom] = await db
      .update(rooms)
      .set({
        isOpen,
        updatedAt: new Date(),
      })
      .where(eq(rooms.id, id))
      .returning();

    if (!updatedRoom) throw new Error("Room not found");
    return updatedRoom;
  }

  async getRoomHistory(roomId: number): Promise<RoomHistory[]> {
    // Get the last 30 days of history
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await db
      .select()
      .from(roomHistory)
      .where(eq(roomHistory.roomId, roomId))
      .where(gte(roomHistory.timestamp, thirtyDaysAgo))
      .orderBy(asc(roomHistory.timestamp));
  }

  async resetDailyData(roomId: number): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Archive current day's data
    await db.insert(roomHistory).values({
      roomId,
      userId: 1, // System user
      previousOccupancy: 0,
      newOccupancy: 0,
      timestamp: new Date(),
      isReset: true
    });

    // Reset room occupancy
    await db
      .update(rooms)
      .set({
        currentOccupancy: 0,
        updatedAt: new Date(),
      })
      .where(eq(rooms.id, roomId));
  }

  async resetAllRoomsData(): Promise<void> {
    const allRooms = await this.getRooms();
    for (const room of allRooms) {
      await this.resetDailyData(room.id);
    }
  }


  // Notification operations
  async getNotifications(roomId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.roomId, roomId));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  // FCM Subscription operations
  async getNotificationSubscriptions(roomId: number): Promise<string[]> {
    const subscriptions = await db
      .select()
      .from(roomSubscriptions)
      .where(eq(roomSubscriptions.roomId, roomId));

    return subscriptions.map(sub => sub.fcmToken);
  }

  async addNotificationSubscription(roomId: number, token: string): Promise<void> {
    await db
      .insert(roomSubscriptions)
      .values({ roomId, fcmToken: token })
      .onConflictDoNothing();
  }

  async removeNotificationSubscription(roomId: number, token: string): Promise<void> {
    await db
      .delete(roomSubscriptions)
      .where(
        and(
          eq(roomSubscriptions.roomId, roomId),
          eq(roomSubscriptions.fcmToken, token)
        )
      );
  }
}

// Initialize storage
export const storage = new DatabaseStorage();

// Initialize default data
async function initializeDefaultData() {
  try {
    const adminUser = await storage.getUserByUsername("admin");
    if (!adminUser) {
      const hashedPassword = bcrypt.hashSync("admin123", 10);
      await storage.createUser({
        username: "admin",
        password: hashedPassword,
        isStaff: true,
        role: "admin",
      });
    }

    const rooms = await storage.getRooms();
    if (rooms.length === 0) {
      await storage.createRoom({
        name: "Main KidZone",
        maxCapacity: 10,
        isOpen: true,
      });

      await storage.createRoom({
        name: "Overflow Room",
        maxCapacity: 10,
        isOpen: false,
      });
    }
  } catch (error) {
    console.error('Failed to initialize default data:', error);
  }
}

// Initialize default data
initializeDefaultData();

// Add a mechanism to run resetAllRoomsData at midnight (requires a scheduling library)
// Example using node-cron (needs to be installed: npm install node-cron)
// import cron from 'node-cron';

// cron.schedule('0 0 * * *', () => { // Runs every day at midnight
//   storage.resetAllRoomsData().catch(error => console.error('Error resetting data:', error));
// });