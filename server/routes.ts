import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { loginSchema, updateOccupancySchema, insertNotificationSchema, insertUserSchema } from "@shared/schema";
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
  const authenticateUser = async (req: any, res: any, next: any) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      const user = await storage.getUser(decoded.id);

      if (!user) {
        return res.status(403).json({ message: "Not authorized" });
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ message: "Invalid token" });
    }
  };

  const requireRole = (allowedRoles: string[]) => async (req: any, res: any, next: any) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    next();
  };


  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(data.username);

      if (!user || !bcrypt.compareSync(data.password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id }, JWT_SECRET);
      res.json({ 
        token, 
        isStaff: user.isStaff,
        role: user.role 
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Room routes
  app.get("/api/rooms", async (req, res) => {
    const rooms = await storage.getRooms();
    res.json(rooms);
  });

  app.post("/api/rooms/:id/occupancy", authenticateUser, requireRole(['admin', 'supervisor', 'staff']), async (req, res) => {
    try {
      const roomId = parseInt(req.params.id);

      if (!req.body || typeof req.body.occupancy !== 'number') {
        return res.status(400).json({ message: "Invalid occupancy value" });
      }

      const occupancy = req.body.occupancy;

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

            try {
              await sendRoomFullNotification(notification.email, message);
            } catch (error) {
              console.error('Failed to send notification:', error);
            }
          }
        }
      } else if (wasFullBefore && !isFullNow) {
        // Room just opened up
        for (const notification of notifications) {
          if (notification.type === "AVAILABLE") {
            const spotsAvailable = room.maxCapacity - occupancy;
            try {
              await sendRoomAvailableNotification(
                notification.email, 
                `${room.name} now has ${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available`
              );
              await storage.deleteNotification(notification.id);
            } catch (error) {
              console.error('Failed to send notification:', error);
            }
          }
        }
      }

      // Broadcast update to all connected clients
      await broadcastRoomUpdate();

      res.json(updatedRoom);
    } catch (error) {
      console.error('Error updating room occupancy:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/rooms/:id/status", authenticateUser, requireRole(['admin', 'supervisor']), async (req, res) => {
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

  // Add new route for managing staff
  app.post("/api/users", authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const user = await storage.createUser(data);
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Add this route after the other routes
  app.get("/api/users", authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Don't send password hashes to the client
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  return httpServer;
}