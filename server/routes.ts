import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { loginSchema, updateOccupancySchema, insertNotificationSchema, insertUserSchema, insertMemberSchema, loginMemberSchema } from "@shared/schema";
import { sendRoomFullNotification, sendRoomAvailableNotification } from "./email";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { sendNotification } from './firebase';
import { validatePhoneNumber, sendSMS } from './sms'; // Assuming these functions are in a separate file


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

  // Add new member routes after existing auth routes
  app.post("/api/members/register", async (req, res) => {
    try {
      const data = insertMemberSchema.parse(req.body);

      // Check if member exists
      const existingMember = await storage.getMemberByEmail(data.email);
      if (existingMember) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const member = await storage.createMember(data);
      const token = jwt.sign({ id: member.id }, JWT_SECRET);

      // Remove password from response
      const { password, ...safeMember } = member;
      res.json({ token, member: safeMember });
    } catch (error) {
      console.error('Member registration error:', error);
      res.status(400).json({ 
        message: "Failed to create account",
        details: error instanceof Error ? error.message : undefined 
      });
    }
  });

  app.post("/api/members/login", async (req, res) => {
    try {
      const data = loginMemberSchema.parse(req.body);
      const member = await storage.getMemberByEmail(data.email);

      if (!member || !await bcrypt.compare(data.password, member.password)) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = jwt.sign({ id: member.id }, JWT_SECRET);

      // Remove password from response
      const { password, ...safeMember } = member;
      res.json({ token, member: safeMember });
    } catch (error) {
      console.error('Member login error:', error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Add member authentication middleware
  const authenticateMember = async (req: any, res: any, next: any) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      const member = await storage.getMember(decoded.id);

      if (!member) {
        return res.status(403).json({ message: "Not authorized" });
      }

      req.member = member;
      next();
    } catch (error) {
      res.status(401).json({ message: "Invalid token" });
    }
  };

  // Add member routes
  app.get("/api/members/favorites", authenticateMember, async (req: any, res) => {
    try {
      const favorites = await storage.getMemberFavorites(req.member.id);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post("/api/members/favorites/:roomId", authenticateMember, async (req: any, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      await storage.addFavoriteRoom(req.member.id, roomId);
      res.json({ message: "Room added to favorites" });
    } catch (error) {
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete("/api/members/favorites/:roomId", authenticateMember, async (req: any, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      await storage.removeFavoriteRoom(req.member.id, roomId);
      res.json({ message: "Room removed from favorites" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // Add new member route for testing SMS notifications
  app.post("/api/members/test-sms", authenticateMember, async (req: any, res) => {
    try {
      if (!req.member.phone) {
        return res.status(400).json({ message: "No phone number provided" });
      }

      // Validate phone number before sending
      const isValid = await validatePhoneNumber(req.member.phone);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid phone number" });
      }

      // Send test message
      const success = await sendSMS({
        to: req.member.phone,
        message: "This is a test message from KidZone. Your SMS notifications are working correctly!"
      });

      if (success) {
        res.json({ message: "Test SMS sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send test SMS" });
      }
    } catch (error) {
      console.error('Failed to send test SMS:', error);
      res.status(500).json({ message: "Failed to send test SMS" });
    }
  });

  // Add new route to check phone verification status
  app.get("/api/members/phone-status", authenticateMember, async (req: any, res) => {
    try {
      if (!req.member.phone) {
        return res.status(400).json({ 
          verified: false,
          message: "No phone number provided" 
        });
      }

      // Check if phone number is verified
      const isValid = await validatePhoneNumber(req.member.phone);
      res.json({ 
        verified: isValid,
        message: isValid ? 
          "Phone number is verified" : 
          "Phone number needs verification. Please verify your number with Twilio to receive SMS notifications."
      });
    } catch (error) {
      console.error('Phone status check failed:', error);
      res.status(500).json({ 
        verified: false,
        message: "Failed to check phone verification status" 
      });
    }
  });

  // Update preferences route to handle SMS separately
  app.post("/api/members/preferences", authenticateMember, async (req: any, res) => {
    try {
      console.log('Updating preferences for member:', req.member.id, 'with data:', req.body);

      // If enabling SMS, verify phone first
      if (req.body.sms && req.member.phone) {
        const isValid = await validatePhoneNumber(req.member.phone);
        if (!isValid) {
          return res.status(400).json({ 
            message: "Cannot enable SMS: Phone number needs verification",
            requiresVerification: true
          });
        }
      }

      await storage.updateMemberPreferences(req.member.id, req.body);
      res.json({ message: "Preferences updated" });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      res.status(500).json({ 
        message: "Failed to update preferences",
        details: error instanceof Error ? error.message : undefined
      });
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

      // Get all staff members with notification preferences
      const staffMembers = await storage.getUsers();
      const otherRooms = (await storage.getRooms()).filter(r => r.id !== roomId && r.isOpen);

      if (!wasFullBefore && isFullNow) {
        // Room just became full - notify staff who want full notifications
        for (const staff of staffMembers) {
          if (staff.email && staff.notifyOnFull) {
            const message = otherRooms.length > 0 
              ? `The ${room.name} is now full. Other rooms are available: ${otherRooms.map(r => r.name).join(", ")}`
              : `The ${room.name} is now full. No other rooms are currently available.`;

            try {
              await sendRoomFullNotification(staff.email, message);
            } catch (error) {
              console.error('Failed to send notification:', error);
            }
          }
        }
      } else if (wasFullBefore && !isFullNow) {
        // Room just opened up - notify staff who want availability notifications
        for (const staff of staffMembers) {
          if (staff.email && staff.notifyOnAvailable) {
            const spotsAvailable = room.maxCapacity - occupancy;
            try {
              await sendRoomAvailableNotification(
                staff.email,
                `${room.name} now has ${spotsAvailable} spot${spotsAvailable > 1 ? 's' : ''} available`
              );
            } catch (error) {
              console.error('Failed to send notification:', error);
            }
          }
        }
      }

      // Send FCM notifications
      const subscriptions = await storage.getNotificationSubscriptions(roomId);
      for (const token of subscriptions) {
        const message = occupancy >= room.maxCapacity
          ? { 
              title: "Room Full Alert",
              body: `${room.name} is now at full capacity`,
              roomId: room.id.toString()
            }
          : {
              title: "Space Available",
              body: `${room.name} now has ${room.maxCapacity - occupancy} spots available`,
              roomId: room.id.toString()
            };

        await sendNotification(token, message);
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

  // Add new route for managing room history
  app.get("/api/rooms/:id/history", authenticateUser, async (req, res) => {
    try {
      const roomId = parseInt(req.params.id);
      const history = await storage.getRoomHistory(roomId);
      res.json(history);
    } catch (error) {
      console.error('Failed to get room history:', error);
      res.status(500).json({ message: "Failed to fetch room history" });
    }
  });

  // Add new route for resetting room data
  app.post("/api/rooms/reset", authenticateUser, requireRole(['admin', 'supervisor']), async (req, res) => {
    try {
      await storage.resetAllRoomsData();

      // Broadcast update to all connected clients
      await broadcastRoomUpdate();

      res.json({ message: "All rooms reset successfully" });
    } catch (error) {
      console.error('Failed to reset rooms:', error);
      res.status(500).json({ message: "Failed to reset rooms" });
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

  app.post("/api/notifications/subscribe", async (req, res) => {
    try {
      const { roomId, token } = req.body;

      // Store subscription in database
      await storage.addNotificationSubscription(roomId, token);

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error);
      res.status(500).json({ message: "Failed to subscribe" });
    }
  });

  app.post("/api/notifications/unsubscribe", async (req, res) => {
    try {
      const { roomId, token } = req.body;

      // Remove subscription from database
      await storage.removeNotificationSubscription(roomId, token);

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to unsubscribe from notifications:', error);
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  // Add new route for managing staff
  app.post("/api/users", authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      console.log('Creating new user with data:', {
        ...req.body,
        password: '[REDACTED]'
      });

      const data = insertUserSchema.parse(req.body);

      // Hash the password before creating the user
      const hashedPassword = bcrypt.hashSync(data.password, 10);

      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Failed to create user:', error);
      res.status(400).json({ 
        message: "Invalid request", 
        details: error instanceof Error ? error.message : undefined 
      });
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

  // Add new route for deleting staff members
  app.delete("/api/users/:id", authenticateUser, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Prevent deleting the last admin
      const users = await storage.getUsers();
      const admins = users.filter(u => u.role === 'admin');
      const targetUser = users.find(u => u.id === userId);

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (targetUser.role === 'admin' && admins.length <= 1) {
        return res.status(400).json({ message: "Cannot delete the last admin account" });
      }

      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error('Failed to delete user:', error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return httpServer;
}