import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isStaff: boolean("is_staff").notNull().default(false),
  role: text("role").notNull().default('staff'), // 'admin', 'supervisor', or 'staff'
  email: text("email"), // Add email field
  notifyOnFull: boolean("notify_on_full").default(true),
  notifyOnAvailable: boolean("notify_on_available").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  currentOccupancy: integer("current_occupancy").notNull().default(0),
  maxCapacity: integer("max_capacity").notNull(),
  isOpen: boolean("is_open").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastReset: timestamp("last_reset"),
});

// Track room occupancy changes
export const roomHistory = pgTable("room_history", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: integer("user_id").notNull(),
  previousOccupancy: integer("previous_occupancy").notNull(),
  newOccupancy: integer("new_occupancy").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  isReset: boolean("is_reset").default(false),
  dailySummary: jsonb("daily_summary"),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  roomId: integer("room_id").notNull(),
  type: text("type").notNull(), // 'FULL' | 'AVAILABLE'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Add new table for FCM subscriptions
export const roomSubscriptions = pgTable("room_subscriptions", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  fcmToken: text("fcm_token").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Add new table for parent/member accounts
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isVerified: boolean("is_verified").default(false),
  notificationPreferences: jsonb("notification_preferences").default({
    email: true,
    sms: false,
    capacity: 80, // notify when capacity is below this percentage
  }),
});

// Add table for favorite rooms
export const memberFavorites = pgTable("member_favorites", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull(),
  roomId: integer("room_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Update schemas to include new fields
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isStaff: true,
  role: true,
  email: true,
  notifyOnFull: true,
  notifyOnAvailable: true,
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  name: true,
  maxCapacity: true,
  isOpen: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  email: true,
  roomId: true,
  type: true,
});

export const insertRoomHistorySchema = createInsertSchema(roomHistory).pick({
  roomId: true,
  userId: true,
  previousOccupancy: true,
  newOccupancy: true,
  isReset: true,
  dailySummary: true,
});

// Add new schemas
export const insertMemberSchema = createInsertSchema(members).pick({
  email: true,
  password: true,
  name: true,
  phone: true,
  notificationPreferences: true,
});

export const loginMemberSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Add subscription schema
export const insertRoomSubscriptionSchema = createInsertSchema(roomSubscriptions).pick({
  roomId: true,
  fcmToken: true,
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const updateOccupancySchema = z.object({
  roomId: z.number(),
  occupancy: z.number().min(0),
});

// Add PhoneStatus type definition after the existing types
export type PhoneStatus = {
  verified: boolean;
  message: string;
};

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertRoomHistory = z.infer<typeof insertRoomHistorySchema>;
export type User = typeof users.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type RoomHistory = typeof roomHistory.$inferSelect;
export type InsertRoomSubscription = z.infer<typeof insertRoomSubscriptionSchema>;
export type RoomSubscription = typeof roomSubscriptions.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;
export type MemberFavorite = typeof memberFavorites.$inferSelect;