import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isStaff: boolean("is_staff").notNull().default(false),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  currentOccupancy: integer("current_occupancy").notNull().default(0),
  maxCapacity: integer("max_capacity").notNull(),
  isOpen: boolean("is_open").notNull().default(true),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  roomId: integer("room_id").notNull(),
  type: text("type").notNull(), // 'FULL' | 'AVAILABLE'
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isStaff: true,
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

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const updateOccupancySchema = z.object({
  roomId: z.number(),
  occupancy: z.number().min(0),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type User = typeof users.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
