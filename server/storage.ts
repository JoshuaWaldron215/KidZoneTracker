import { db } from "./db";
import { eq, and, gte, lt, asc } from "drizzle-orm";
import { users, rooms, notifications, roomHistory, roomSubscriptions, members, memberFavorites } from "@shared/schema";
import type { InsertUser, InsertRoom, InsertNotification, InsertRoomHistory, User, Room, Notification, RoomSubscription, RoomHistory, Member, InsertMember, MemberFavorite } from "@shared/schema";
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
  archiveOldData(): Promise<void>;

  // Notification operations
  getNotifications(roomId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  deleteNotification(id: number): Promise<void>;

  // FCM Subscription operations
  getNotificationSubscriptions(roomId: number): Promise<string[]>;
  addNotificationSubscription(roomId: number, token: string): Promise<void>;
  removeNotificationSubscription(roomId: number, token: string): Promise<void>;

  // Member operations
  getMember(id: number): Promise<Member | undefined>;
  getMemberByEmail(email: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  getMemberFavorites(memberId: number): Promise<number[]>;
  addFavoriteRoom(memberId: number, roomId: number): Promise<void>;
  removeFavoriteRoom(memberId: number, roomId: number): Promise<void>;
  updateMemberPreferences(memberId: number, preferences: any): Promise<void>;
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
      .where(
        and(
          eq(roomHistory.roomId, roomId),
          gte(roomHistory.timestamp, thirtyDaysAgo)
        )
      )
      .orderBy(asc(roomHistory.timestamp));
  }

  async resetDailyData(roomId: number): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get current room data before reset
    const [currentRoom] = await db.select().from(rooms).where(eq(rooms.id, roomId));
    if (!currentRoom) throw new Error("Room not found");

    // Get today's history for summary
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayHistory = await db
      .select()
      .from(roomHistory)
      .where(
        and(
          eq(roomHistory.roomId, roomId),
          gte(roomHistory.timestamp, todayStart),
          lt(roomHistory.timestamp, todayEnd)
        )
      );

    // Calculate daily summary
    const maxOccupancy = Math.max(
      currentRoom.currentOccupancy,
      ...todayHistory.map(h => h.newOccupancy)
    );

    const totalUpdates = todayHistory.length;
    const avgOccupancy = totalUpdates > 0
      ? todayHistory.reduce((sum, h) => sum + h.newOccupancy, 0) / totalUpdates
      : 0;

    // Archive current day's data with summary
    await db.insert(roomHistory).values({
      roomId,
      userId: 1, // System user
      previousOccupancy: currentRoom.currentOccupancy,
      newOccupancy: 0,
      timestamp: new Date(),
      isReset: true,
      dailySummary: {
        maxOccupancy,
        avgOccupancy: Math.round(avgOccupancy),
        totalUpdates,
        lastUpdated: new Date()
      }
    });

    // Reset room occupancy but maintain historical data
    await db
      .update(rooms)
      .set({
        currentOccupancy: 0,
        updatedAt: new Date(),
        lastReset: new Date()
      })
      .where(eq(rooms.id, roomId));
  }

  async resetAllRoomsData(): Promise<void> {
    const allRooms = await this.getRooms();
    for (const room of allRooms) {
      await this.resetDailyData(room.id);
    }
  }

  async archiveOldData(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Archive data older than 30 days
    // In a real production system, this would move data to a separate archive table
    // For now, we'll just keep the last 30 days
    await db
      .delete(roomHistory)
      .where(
        lt(roomHistory.timestamp, thirtyDaysAgo)
      );
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

  // Member operations
  async getMember(id: number): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member;
  }

  async getMemberByEmail(email: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.email, email));
    return member;
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(insertMember.password, 10);

    const [member] = await db
      .insert(members)
      .values({
        ...insertMember,
        password: hashedPassword,
      })
      .returning();

    return member;
  }

  async getMemberFavorites(memberId: number): Promise<number[]> {
    const favorites = await db
      .select()
      .from(memberFavorites)
      .where(eq(memberFavorites.memberId, memberId));

    return favorites.map(f => f.roomId);
  }

  async addFavoriteRoom(memberId: number, roomId: number): Promise<void> {
    await db
      .insert(memberFavorites)
      .values({ memberId, roomId })
      .onConflictDoNothing();
  }

  async removeFavoriteRoom(memberId: number, roomId: number): Promise<void> {
    await db
      .delete(memberFavorites)
      .where(
        and(
          eq(memberFavorites.memberId, memberId),
          eq(memberFavorites.roomId, roomId)
        )
      );
  }

  async updateMemberPreferences(memberId: number, preferences: any): Promise<void> {
    await db
      .update(members)
      .set({
        notificationPreferences: preferences,
        updatedAt: new Date(),
      })
      .where(eq(members.id, memberId));
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

// Add a mechanism to run resetAllRoomsData and archiveOldData at midnight (requires a scheduling library)
// Example using node-cron (needs to be installed: npm install node-cron)
import cron from 'node-cron';

// Reset at midnight
cron.schedule('0 0 * * *', () => {
  Promise.all([
    storage.resetAllRoomsData(),
    storage.archiveOldData()
  ]).catch(error => console.error('Error resetting or archiving data:', error));
});

// Archive old data weekly (Sunday at 1 AM)
cron.schedule('0 1 * * 0', () => {
  storage.archiveOldData()
    .catch(error => console.error('Error archiving old data:', error));
});