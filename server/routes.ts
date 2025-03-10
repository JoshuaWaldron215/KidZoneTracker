import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { loginSchema, updateOccupancySchema, insertNotificationSchema } from "@shared/schema";
import { sendRoomFullNotification, sendRoomAvailableNotification } from "./email";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const clients = new Set<WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  // Broadcast room updates to all connected clients
  const broadcastRoomUpdate = async () => {
    const rooms = await storage.getRooms();
    const message = JSON.stringify({ type: 'ROOMS_UPDATE', rooms });

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

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
      const roomId = parseInt(req.params.id);
      console.log('Request body:', req.body); // Debug log
      console.log('Request headers:', req.headers); // Debug log

      if (!req.body.hasOwnProperty('occupancy')) {
        return res.status(400).json({ message: "Occupancy value is required" });
      }

      const occupancy = parseInt(req.body.occupancy);
      console.log('Parsed occupancy:', occupancy); // Debug log

      if (isNaN(occupancy) || occupancy < 0) {
        return res.status(400).json({ message: "Invalid occupancy value" });
      }

      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      if (occupancy > room.maxCapacity) {
        return res.status(400).json({ 
          message: `Occupancy cannot exceed maximum capacity of ${room.maxCapacity}` 
        });
      }

      const wasFullBefore = room.currentOccupancy >= room.maxCapacity;
      const updatedRoom = await storage.updateRoomOccupancy(roomId, occupancy);
      const isFullNow = occupancy >= room.maxCapacity;

      // Handle notifications
      const notifications = await storage.getNotifications(roomId);
      const otherRooms = (await storage.getRooms()).filter(r => r.id !== roomId && r.isOpen);

      if (!wasFullBefore && isFullNow) {
        // Room just became full
        for (const notification of notifications) {
          if (notification.type === "FULL") {
            const message = otherRooms.length > 0 
              ? `The ${room.name} is now full. Other rooms are available: ${otherRooms.map(r => r.name).join(", ")}`
              : `The ${room.name} is now full. No other rooms are currently available.`;
            await sendRoomFullNotification(notification.email, message);
          }
        }
      } else if (wasFullBefore && !isFullNow) {
        // Room just opened up
        for (const notification of notifications) {
          if (notification.type === "AVAILABLE") {
            const spotsAvailable = room.maxCapacity - occupancy;
            await sendRoomAvailableNotification(
              notification.email, 
              `${room.name} now has ${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available`
            );
            await storage.deleteNotification(notification.id);
          }
        }
      }

      // Broadcast update to all connected clients
      await broadcastRoomUpdate();

      res.json(updatedRoom);
    } catch (error) {
      console.error('Error updating room occupancy:', error);
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

      // Broadcast update to all connected clients
      await broadcastRoomUpdate();

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

  return httpServer;
}