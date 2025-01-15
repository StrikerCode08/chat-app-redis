import express from "express";
import { createServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import authRoutes from "./routes/authRoutes";
import { authenticate } from "./middlewares/authMiddleware";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import redis from "./utils/redis";
import cors from "cors";
import { WebSocketRequest } from "./types/ws";
import chatRoutes from "./routes/chatRoutes";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const prisma = new PrismaClient();

// Add cookie parser before routes
app.use(cookieParser());

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["set-cookie"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/api", chatRoutes);

wss.on("connection", (ws, req: WebSocketRequest) => {
  try {
    const url = new URL(req.url, `ws://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(1008, "Token missing");
      return;
    }

    jwt.verify(token, `${process.env.JWT_SECRET}`);

    ws.on("message", async (message: string) => {
      const parsedMessage = JSON.parse(message);
      const { content, chatId } = parsedMessage;

      try {
        const payload = jwt.verify(token, `${process.env.JWT_SECRET}`) as {
          userId: number;
        };

        // Create message in DB
        const newMessage = await prisma.message.create({
          data: {
            content,
            senderId: payload.userId,
            chatId,
          },
          include: {
            sender: {
              select: {
                username: true,
              },
            },
          },
        });

        // Clear old cache and set new cache
        const cacheKey = `chat:${chatId}:messages`;
        await redis.del(cacheKey); // Clear existing cache
        await redis.lpush(cacheKey, JSON.stringify(newMessage));
        await redis.expire(cacheKey, 30); // Set 1 hour expiry

        // Broadcast to all clients in this chat
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(newMessage));
          }
        });
      } catch (error) {
        ws.send(JSON.stringify({ error: "Invalid token" }));
      }
    });
  } catch (error) {
    ws.close(1008, "Invalid token");
  }
});

// Get messages endpoint with Redis caching
app.get("/messages/:chatId", authenticate, async (req, res) => {
  try {
    const chatId = parseInt(req.params.chatId);
    const cacheKey = `chat:${chatId}:messages`;

    // Try to get messages from Redis first
    const cachedMessages = await redis.lrange(cacheKey, 0, -1);

    if (cachedMessages.length > 0) {
      const messages = cachedMessages.map((msg) => JSON.parse(msg));
      return res.json(messages);
    }

    // If not in cache, get from DB
    const messages = await prisma.message.findMany({
      where: {
        chatId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      include: {
        sender: {
          select: {
            username: true,
          },
        },
      },
    });

    // Cache the messages
    if (messages.length > 0) {
      await Promise.all(
        messages
          .reverse()
          .map((msg) => redis.lpush(cacheKey, JSON.stringify(msg)))
      );
      await redis.expire(cacheKey, 3600); // Cache for 1 hour
    }

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

server.listen(process.env.PORT, () => {
  console.log("Server is running on port 3000");
});
