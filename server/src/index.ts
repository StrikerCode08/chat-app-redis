import express from "express";
import { createServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import authRoutes from "./routes/authRoutes";
import { authenticate } from "./middlewares/authMiddleware";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import redis from "./utils/redis";

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const prisma = new PrismaClient();

app.use(express.json());
app.use("/auth", authRoutes);

wss.on("connection", (ws, req) => {
  ws.on("message", async (message: string) => {
    const parsedMessage = JSON.parse(message);
    const { token, content } = parsedMessage;

    try {
      const payload = jwt.verify(token, `${process.env.JWT_SECRET}`) as {
        userId: number;
      };
      const newMessage = await prisma.message.create({
        data: {
          content,
          senderId: payload.userId,
        },
      });
      await redis.lpush("messages", JSON.stringify(newMessage));
      // Broadcast message to all connected clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === client.OPEN) {
          client.send(JSON.stringify(newMessage));
        }
      });
    } catch (error) {
      ws.send(JSON.stringify({ error: "Invalid token" }));
    }
  });
});
app.get("/messages", authenticate, async (req, res) => {
  try {
    const messages = await redis.lrange("messages", 0, -1);
    const parsedMessages = messages.map((msg) => JSON.parse(msg));
    res.json(parsedMessages);
  } catch (error) {
    res.status(500).json({ error });
  }
});

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
