import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { texts } from "./texts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const DB_FILE = path.join(__dirname, "results.json");
const ACADEMY_DB_FILE = path.join(__dirname, "academy_results.json");

// Helper to get local IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      // node >= 18 families could be 'IPv4' or number 4
      if ((alias.family === "IPv4" || alias.family === 4) && alias.address !== "127.0.0.1" && !alias.internal) {
        return alias.address;
      }
    }
  }
  return "localhost";
}

// Read results from database
function readStats() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data || "[]");
  } catch (error) {
    console.error("Error reading database:", error);
    return [];
  }
}

// Save result to database
function saveGameResult(gameData) {
  try {
    const stats = readStats();
    stats.push(gameData);
    // Keep last 100 games
    if (stats.length > 100) stats.shift();
    fs.writeFileSync(DB_FILE, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error("Error writing to database:", error);
  }
}

// Active rooms state
// roomCode -> { teacherId, text, language, difficulty, status, students: { socketId -> { name, progress, wpm, accuracy, finished } } }
const rooms = new Map();

// API routes
app.get("/api/ip", (req, res) => {
  res.json({ ip: getLocalIp() });
});

app.get("/api/texts", (req, res) => {
  res.json(texts);
});

app.get("/api/stats", (req, res) => {
  res.json(readStats());
});

// --- Academy API Routes ---

// Read Academy progress from database
function readAcademyStats() {
  try {
    if (!fs.existsSync(ACADEMY_DB_FILE)) {
      fs.writeFileSync(ACADEMY_DB_FILE, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(ACADEMY_DB_FILE, "utf-8");
    return JSON.parse(data || "[]");
  } catch (error) {
    console.error("Error reading academy database:", error);
    return [];
  }
}

app.get("/api/academy/progress", (req, res) => {
  res.json(readAcademyStats());
});

app.post("/api/academy/progress", (req, res) => {
  const { name, lessonId, score } = req.body;
  if (!name || !lessonId) return res.status(400).json({ error: "Missing required fields" });

  try {
    let stats = readAcademyStats();
    // Find if the student already completed this lesson
    let existingRecord = stats.find(s => s.name === name && s.lessonId === lessonId);
    if (existingRecord) {
      if (score > existingRecord.score) existingRecord.score = score;
      existingRecord.date = new Date().toISOString();
    } else {
      stats.push({ name, lessonId, score, date: new Date().toISOString() });
    }
    fs.writeFileSync(ACADEMY_DB_FILE, JSON.stringify(stats, null, 2));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to save progress" });
  }
});

app.delete("/api/academy/progress", (req, res) => {
  try {
    fs.writeFileSync(ACADEMY_DB_FILE, JSON.stringify([]));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to clear progress" });
  }
});

// --- End Academy API Routes ---

// Socket.io connection logic
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Teacher creates a room
  socket.on("create-room", ({ language, difficulty, textId }, callback) => {
    // Generate a unique 4-digit code
    let roomCode;
    do {
      roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    } while (rooms.has(roomCode));

    // Get the selected text
    const categoryTexts = texts[language] || [];
    const selectedText = categoryTexts.find(t => t.id === textId) || categoryTexts[0];

    if (!selectedText) {
      return callback({ error: "Text not found" });
    }

    const roomData = {
      teacherId: socket.id,
      roomCode,
      language,
      difficulty,
      text: selectedText,
      status: "waiting", // waiting, playing, finished
      students: new Map()
    };

    rooms.set(roomCode, roomData);
    socket.join(roomCode);

    console.log(`Room created: ${roomCode} by ${socket.id}`);
    callback({
      roomCode,
      text: selectedText
    });
  });

  // 2. Student joins a room
  socket.on("join-room", ({ roomCode, name }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) {
      return callback({ error: "Кімнату не знайдено. Перевірте код." });
    }
    if (room.status !== "waiting") {
      return callback({ error: "Змагання в цій кімнаті вже почалося або завершилося." });
    }

    const clientIp = socket.handshake.address;

    // Check if IP is localhost (both IPv4 and IPv6 loopback variants)
    const isLocalhost = clientIp === "127.0.0.1" || 
                        clientIp === "::1" || 
                        clientIp === "::ffff:127.0.0.1" || 
                        clientIp.includes("localhost");

    if (!isLocalhost) {
      // Check if any existing student in the room already has this IP
      const ipExists = Array.from(room.students.values()).some(s => s.ip === clientIp);
      if (ipExists) {
        return callback({ error: "З вашого комп'ютера (IP) вже здійснено підключення до цієї кімнати." });
      }
    }

    // Add student to the room list
    const studentInfo = {
      id: socket.id,
      name,
      ip: clientIp, // Store IP address for enforcement
      progress: 0, // 0 to 100%
      wpm: 0,
      accuracy: 100,
      finished: false,
      finishedAt: null
    };

    room.students.set(socket.id, studentInfo);
    socket.join(roomCode);

    // Notify the room (especially the teacher) that a student joined
    const studentList = Array.from(room.students.values());
    io.to(roomCode).emit("student-list-update", studentList);

    console.log(`Student ${name} joined room ${roomCode}`);
    callback({
      text: room.text,
      status: room.status
    });
  });

  // 3. Teacher starts the game
  socket.on("start-game", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room && room.teacherId === socket.id) {
      room.status = "playing";
      // Send start event to everyone in the room
      io.to(roomCode).emit("game-started");
      console.log(`Game started in room ${roomCode}`);
    }
  });

  // 4. Student sends progress updates
  socket.on("update-progress", ({ roomCode, progress, wpm, accuracy, finished }) => {
    const room = rooms.get(roomCode);
    if (!room || room.status !== "playing") return;

    const student = room.students.get(socket.id);
    if (student) {
      student.progress = progress;
      student.wpm = wpm;
      student.accuracy = accuracy;
      if (finished && !student.finished) {
        student.finished = true;
        student.finishedAt = new Date();
      }

      // Broadcast update to all users in the room
      const studentList = Array.from(room.students.values());
      io.to(roomCode).emit("progress-update", studentList);

      // Check if all students finished
      const allFinished = studentList.every(s => s.finished);
      if (allFinished) {
        finishGame(roomCode);
      }
    }
  });

  // 5. Teacher manually ends the game (or timeout)
  socket.on("end-game", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room && room.teacherId === socket.id) {
      finishGame(roomCode);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Check if the user was a student or a teacher in any room
    for (const [roomCode, room] of rooms.entries()) {
      if (room.teacherId === socket.id) {
        // Teacher disconnected: inform students, close room
        io.to(roomCode).emit("teacher-disconnected");
        rooms.delete(roomCode);
        console.log(`Room ${roomCode} deleted because teacher disconnected.`);
      } else if (room.students.has(socket.id)) {
        // Student disconnected: remove student, notify room
        room.students.delete(socket.id);
        const studentList = Array.from(room.students.values());
        io.to(roomCode).emit("student-list-update", studentList);
        io.to(roomCode).emit("progress-update", studentList);
        console.log(`Student disconnected from room ${roomCode}. Remaining: ${room.students.size}`);
        
        // If room is playing and now empty of students
        if (room.status === "playing" && room.students.size === 0) {
          // Reset status or wait
        }
      }
    }
  });
});

// Helper to wrap up the game and save results
function finishGame(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.status === "finished") return;

  room.status = "finished";

  // Calculate final ranking
  const studentList = Array.from(room.students.values())
    .sort((a, b) => {
      // Finished first gets higher rank
      if (a.finished && b.finished) {
        return new Date(a.finishedAt) - new Date(b.finishedAt);
      }
      if (a.finished) return -1;
      if (b.finished) return 1;
      // If neither finished, sort by progress percentage
      return b.progress - a.progress;
    })
    .map((student, index) => ({
      name: student.name,
      wpm: student.wpm,
      accuracy: student.accuracy,
      progress: student.progress,
      finished: student.finished,
      rank: index + 1
    }));

  // Save to database
  const gameRecord = {
    id: `game_${Date.now()}_${roomCode}`,
    date: new Date().toISOString(),
    roomCode,
    language: room.language,
    textTitle: room.text.title,
    results: studentList
  };

  saveGameResult(gameRecord);

  // Notify everyone in the room
  io.to(roomCode).emit("game-finished", studentList);
  console.log(`Game in room ${roomCode} finished and results saved.`);
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Local network IP: http://${getLocalIp()}:${PORT}`);
});
