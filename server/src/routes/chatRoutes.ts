import { Router, Request, Response } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { prisma } from "../utils/prisma";
import redis from "../utils/redis";

const router = Router();

interface AuthenticatedRequest extends Request {
  userId: number;
}

// Get all chats for authenticated user
router.get("/user/chats", authenticate, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: {
            id: userId,
          },
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            username: true,
          },
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            content: true,
            createdAt: true,
          },
        },
      },
    });
    res.json(
      chats.map((chat) => ({
        ...chat,
        lastMessage: chat.messages[0],
      }))
    );
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

// Create a new chat
router.post("/", authenticate, async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const { username } = req.body;

    const otherUser = await prisma.user.findUnique({
      where: { username },
    });

    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if chat already exists
    const existingChat = await prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { id: userId } } },
          { participants: { some: { id: otherUser.id } } },
        ],
      },
    });

    if (existingChat) {
      return res.status(400).json({ message: "Chat already exists" });
    }

    const chat = await prisma.chat.create({
      data: {
        participants: {
          connect: [{ id: userId }, { id: otherUser.id }],
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ error: "Failed to create chat" });
  }
});

// Add this route to get messages for a specific chat
router.get(
  "/:chatId/messages",
  authenticate,
  async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).userId;
    try {
      const chatId = parseInt(req.params.chatId);
      const cacheKey = `chat:${chatId}:messages`;

      // Verify user is participant in chat
      const chat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          participants: {
            some: {
              id: userId,
            },
          },
        },
      });

      if (!chat) {
        return res
          .status(403)
          .json({ message: "Not authorized to view this chat" });
      }

      // Try to get messages from Redis first
      const cachedMessages = await redis.lrange(cacheKey, 0, -1);

      if (cachedMessages.length > 0) {
        const messages = cachedMessages.map((msg) => JSON.parse(msg));
        return res.json(messages);
      }

      // If not in cache, get from DB
      const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          sender: {
            select: {
              id: true,
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
  }
);

export default router;
