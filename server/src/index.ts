import express, { Request, Response } from "express";
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
import { AnyType } from "./utils.js";
import { isHttpError } from "http-errors";
import { router as primusRouter } from "./routes/primus.js";
import { PrimusService } from "./services/primus.service.js";

// Convert ESM module URL to filesystem path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Track services for graceful shutdown
const services: IService[] = [];

// Load environment variables from root .env file
dotenv.config({
  path: resolve(__dirname, "../../.env"),
});

// Initialize Express app
const app = express();
const port = process.env.PORT || 8081;

// Configure CORS with ALL allowed origins
app.use(cors());

// Parse JSON request bodies
app.use(express.json());
app.use(cookieParser());

// Debug middleware to log all requests
app.use((req, _res, next) => {
  console.log(`[SERVER] ${req.method} ${req.url}`);
  next();
});

// Mount hello world test route
app.use("/hello", helloRouter);

// Initialize Telegram bot service
const telegramService = TelegramService.getInstance();

// Mount Telegram webhook endpoint
app.use("/telegram/webhook", telegramService.getWebhookCallback());

// Mount Twitter OAuth routes
app.use("/auth/twitter", twitterRouter);

// Mount Discord OAuth routes
app.use("/auth/discord", discordRouter);

// Mount GitHub OAuth routes
app.use("/auth/github", githubRouter);
// Mount Primus routes
app.use("/api/primus", primusRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.url} not found`,
  });
});

app.use((err: AnyType, _req: Request, res: Response) => {
  if (isHttpError(err)) {
    res.status(err.statusCode).json({
      message: err.message,
    });
  } else if (err instanceof Error) {
    res.status(500).json({
      message: `Internal Server Error: ${err.message}`,
    });
  } else {
    res.status(500).json({
      message: `Internal Server Error`,
    });
  }
});

// Start server and initialize services
app.listen(port, async () => {
  try {
    console.log(`[SERVER] 🚀 Server running on port ${port}`);

    // Initialize Primus service
    const primusService = PrimusService.getInstance();
    await primusService.start();
    services.push(primusService);
    console.log("[SERVER] ✅ Primus Service initialized");

    // Start ngrok tunnel for development
    const ngrokService = NgrokService.getInstance();
    await ngrokService.start();
    services.push(ngrokService);

    const ngrokUrl = ngrokService.getUrl()!;
    console.log("NGROK URL:", ngrokUrl);

    // Initialize Telegram bot and set webhook
    await telegramService.start();
    await telegramService.setWebhook(ngrokUrl);
    services.push(telegramService);

    const botInfo = await telegramService.getBotInfo();
    console.log("Telegram Bot URL:", `https://t.me/${botInfo.username}`);
  } catch (e) {
    console.error("Failed to start server:", e);
    process.exit(1);
  }
});

// Graceful shutdown handler
async function gracefulShutdown() {
  console.log("Shutting down gracefully...");
  await Promise.all(services.map((service) => service.stop()));
  process.exit(0);
}

// Register shutdown handlers
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
