import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, updateOccupancySchema, insertNotificationSchema } from "@shared/schema";
import { sendRoomFullNotification, sendRoomAvailableNotification } from "./email";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  const authenticateStaff = async (req: any, res: any, next: any) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      const user = await storage.getUser(decoded.id);
      
      if (!user?.isStaff) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ message: "Invalid token" });
    }
  };

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(data.username);
      
      if (!user || user.password !== data.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id }, JWT_SECRET);
      res.json({ token, isStaff: user.isStaff });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Room routes
  app.get("/api/rooms", async (req, res) => {
    const rooms = await storage.getRooms();
    res.json(rooms);
  });

  app.post("/api/rooms/:id/occupancy", authenticateStaff, async (req, res) => {
    try {
      const { roomId, occupancy } = updateOccupancySchema.parse({
        roomId: parseInt(req.params.id),
        occupancy: req.body.occupancy,
      });

      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const updatedRoom = await storage.updateRoomOccupancy(roomId, occupancy);
      
      // Handle notifications
      const notifications = await storage.getNotifications(roomId);
      
      if (occupancy >= room.maxCapacity) {
        for (const notification of notifications) {
          if (notification.type === "FULL") {
            await sendRoomFullNotification(notification.email, room.name);
          }
        }
      } else if (occupancy < room.maxCapacity) {
        for (const notification of notifications) {
          if (notification.type === "AVAILABLE") {
            await sendRoomAvailableNotification(notification.email, room.name);
            await storage.deleteNotification(notification.id);
          }
        }
      }

      res.json(updatedRoom);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/rooms/:id/status", authenticateStaff, async (req, res) => {
    try {
      const roomId = parseInt(req.params.id);
      const { isOpen } = req.body;

      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const updatedRoom = await storage.updateRoomStatus(roomId, isOpen);
      res.json(updatedRoom);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Notification routes
  app.post("/api/notifications", async (req, res) => {
    try {
      const data = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(data);
      res.json(notification);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
