import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { db } from "./lib/db";
import { messages, conversations, participants } from "./lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Log file for debugging
const logFile = path.resolve(process.cwd(), "server_debug.log");
function diagLog(msg: string) {
    const time = new Date().toISOString();
    const line = `[${time}] ${msg}\n`;
    try {
        fs.appendFileSync(logFile, line);
    } catch (e) { }
    console.log(msg);
}

diagLog("🚀 Initializing Socket Server...");

app.prepare().then(() => {
    const httpServer = createServer(handler);

    // Cinema Room Management (In-Memory) - Global to all connections
    const activeRooms = new Map(); // code -> roomData

    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        diagLog(`🔌 Client connected: ${socket.id}`);

        socket.on("sendMessage", async (data) => {
            diagLog(`📩 Message from ${data.senderId} to ${data.receiverId}`);

            try {
                const { content, senderId, receiverId, id: msgId, type, fileUrl } = data;

                if (!content && !fileUrl) return;

                // For better-sqlite3 with Drizzle, transactions are synchronous
                // We identify the conversation first, then save everything

                let conversationId = data.conversationId;

                // 1. Identify or Create Conversation
                if (!conversationId) {
                    const userParts = db.select().from(participants).where(eq(participants.userId, senderId)).all();
                    const receiverParts = db.select().from(participants).where(eq(participants.userId, receiverId)).all();

                    const common = userParts.find(up =>
                        receiverParts.some(rp => rp.conversationId === up.conversationId)
                    );

                    if (common) {
                        conversationId = common.conversationId;
                    } else {
                        conversationId = uuidv4();
                        diagLog(`✨ Creating NEW conversation: ${conversationId}`);

                        db.insert(conversations).values({
                            id: conversationId,
                            isGroup: false,
                        }).run();

                        db.insert(participants).values([
                            { userId: senderId, conversationId: conversationId },
                            { userId: receiverId, conversationId: conversationId }
                        ]).run();
                    }
                }

                // 2. Save Message
                db.insert(messages).values({
                    id: msgId || uuidv4(),
                    content: content || "",
                    senderId,
                    conversationId,
                    type: type || 'text',
                    fileUrl: fileUrl || null,
                    createdAt: new Date(),
                }).run();

                // 3. Update Conversation Timestamp
                db.update(conversations)
                    .set({ lastMessageAt: new Date() })
                    .where(eq(conversations.id, conversationId))
                    .run();

                diagLog(`✅ Message saved to SQLite. Broadcasting...`);
                io.emit("receiveMessage", { ...data, conversationId });

            } catch (err: any) {
                diagLog(`❌ DATABASE ERROR: ${err.message}`);
                console.error(err);
            }
        });

        // Room handlers use the global activeRooms map

        socket.on("createPrivateRoom", (data) => {
            diagLog(`🛠️ Attempting to create room: ${JSON.stringify(data)}`);
            const { ownerId, guestEmail } = data;
            const code = Math.floor(100000 + Math.random() * 900000).toString();

            activeRooms.set(code, {
                ownerId,
                ownerSocketId: socket.id,
                guestEmail,
                guestSocketId: null,
                createdAt: Date.now()
            });

            socket.join(code);
            socket.emit("roomCreated", { code });
            diagLog(`🌟 Room created: ${code} for guest ${guestEmail}`);
        });

        socket.on("joinPrivateRoom", (data) => {
            const { code, guestEmail, guestId } = data;
            const room = activeRooms.get(code);

            if (!room) {
                return socket.emit("joinError", { message: "Código inválido o sala expirada." });
            }

            if (room.guestEmail !== guestEmail) {
                return socket.emit("joinError", { message: "No tienes permiso para entrar a esta sala." });
            }

            room.guestSocketId = socket.id;
            room.guestId = guestId;
            socket.join(code);

            io.to(room.ownerSocketId).emit("guestJoined", { guestId, socketId: socket.id });
            socket.emit("joinSuccess", { ownerId: room.ownerId });
            diagLog(`🤝 Guest ${guestEmail} joined room ${code}`);
        });

        // WebRTC Signaling
        socket.on("signal", (data) => {
            const { to, signal } = data;
            io.to(to).emit("signal", { from: socket.id, signal });
        });

        socket.on("syncCinema", (data) => {
            const { code } = data;
            if (code) {
                socket.to(code).emit("syncCinema", data);
            } else {
                io.emit("syncCinema", data); // Fallback for standard cinema
            }
        });

        socket.on("disconnect", () => {
            // Cleanup rooms if owner or guest disconnects
            activeRooms.forEach((room, code) => {
                if (room.ownerSocketId === socket.id || room.guestSocketId === socket.id) {
                    io.to(code).emit("roomClosed");
                    activeRooms.delete(code);
                    diagLog(`🚫 Room ${code} closed due to disconnect`);
                }
            });
            diagLog(`👋 Client disconnected: ${socket.id}`);
        });
    });

    httpServer.listen(port, () => {
        diagLog(`🌐 Server ready on http://${hostname}:${port}`);
    });
});
