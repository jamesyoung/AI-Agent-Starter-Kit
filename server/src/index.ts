import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helloRouter from "./routes/hello.js";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { NgrokService } from "./services/ngrok.service.js";
import { TelegramService } from "./services/telegram.service.js";
import { IService } from "./services/base.service.js";
import twitterRouter from "./routes/twitter.js";
import discordRouter from "./routes/discord.js";
import cookieParser from "cookie-parser";
import githubRouter from "./routes/github.js";
import { McpService } from "./services/mcp.service.js";
import { ElizaService } from "./services/eliza.service.js";

// Convert ESM module URL to filesystem path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Track services for graceful shutdown
const services: IService[] = [];

// Load environment variables from root .env file
dotenv.config({
  path: resolve(__dirname, "../../.env"),
});

// Initialize Express app first
const app = express();
const port = process.env.PORT || 3001;

// Basic middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Initialize services but don't start them yet
const mcpService = McpService.getInstance();
const telegramService = TelegramService.getInstance();
const elizaService = ElizaService.getInstance(telegramService.getBot());

// Mount MCP routes first - MUST be before other routes
app.get("/sse", async (req, res) => {
  console.log("[SERVER] 📡 SSE connection request received");
  await mcpService.handleSSE(req, res);
});

app.post("/messages", express.json(), async (req, res) => {
  console.log("[SERVER] 📬 Message received:", req.body);
  await mcpService.handleMessage(req, res);
});

// Mount other routes
app.use("/hello", helloRouter);
app.use("/telegram/webhook", telegramService.getWebhookCallback());
app.use("/auth/twitter", twitterRouter);
app.use("/auth/discord", discordRouter);
app.use("/auth/github", githubRouter);

// Start server and initialize services
const server = app.listen(port, async () => {
  try {
    console.log(`Server running on PORT: ${port}`);
    console.log("Server Environment:", process.env.NODE_ENV);

    // 1. Start MCP first
    await mcpService.start();
    services.push(mcpService);
    console.log("[SERVER] ✅ MCP Service initialized");

    // Wait for endpoints to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2. Start ngrok
    const ngrokService = NgrokService.getInstance();
    await ngrokService.start();
    services.push(ngrokService);
    const ngrokUrl = ngrokService.getUrl()!;
    console.log("NGROK URL:", ngrokUrl);

    // 3. Start Telegram
    await telegramService.start();
    await telegramService.setWebhook(ngrokUrl);
    services.push(telegramService);
    const botInfo = await telegramService.getBotInfo();
    console.log("Telegram Bot URL:", `https://t.me/${botInfo.username}`);

    // 4. Finally start Eliza
    await elizaService.start();
    services.push(elizaService);
    console.log("[SERVER] ✅ Eliza Service initialized");
  } catch (e) {
    console.error("Failed to start server:", e);
    await Promise.all(services.map((s) => s.stop()));
    process.exit(1);
  }
});

// Graceful shutdown handler
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  await Promise.all(services.map((s) => s.stop()));
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
