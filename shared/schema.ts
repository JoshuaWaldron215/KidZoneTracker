import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
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
});

// Track room occupancy changes
export const roomHistory = pgTable("room_history", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  userId: integer("user_id").notNull(),
  previousOccupancy: integer("previous_occupancy").notNull(),
  newOccupancy: integer("new_occupancy").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
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