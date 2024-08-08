"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const ws_1 = require("ws");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const authMiddleware_1 = require("./middlewares/authMiddleware");
const client_1 = require("@prisma/client");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const redis_1 = __importDefault(require("./utils/redis"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const wss = new ws_1.WebSocketServer({ server });
const prisma = new client_1.PrismaClient();
app.use(express_1.default.json());
app.use("/auth", authRoutes_1.default);
wss.on("connection", (ws, req) => {
    ws.on("message", (message) => __awaiter(void 0, void 0, void 0, function* () {
        const parsedMessage = JSON.parse(message);
        const { token, content } = parsedMessage;
        try {
            const payload = jsonwebtoken_1.default.verify(token, `${process.env.JWT_SECRET}`);
            const newMessage = yield prisma.message.create({
                data: {
                    content,
                    senderId: payload.userId,
                },
            });
            yield redis_1.default.lpush("messages", JSON.stringify(newMessage));
            // Broadcast message to all connected clients
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === client.OPEN) {
                    client.send(JSON.stringify(newMessage));
                }
            });
        }
        catch (error) {
            ws.send(JSON.stringify({ error: "Invalid token" }));
        }
    }));
});
app.get("/messages", authMiddleware_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const messages = yield redis_1.default.lrange("messages", 0, -1);
        const parsedMessages = messages.map((msg) => JSON.parse(msg));
        res.json(parsedMessages);
    }
    catch (error) {
        res.status(500).json({ error });
    }
}));
server.listen(process.env.PORT, () => {
    console.log("Server is running on port 3000");
});
