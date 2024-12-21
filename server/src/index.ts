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
import twitterRouter from './routes/twitter.js';
import discordRouter from './routes/discord.js';
import cookieParser from 'cookie-parser';
import githubRouter from './routes/github.js';

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
const port = process.env.PORT || 3001;

// Configure CORS with allowed origins
app.use(cors({
  origin: [
    'http://localhost:3000',  // Local development
    process.env.CLIENT_URL,   // Production client URL
    /\.ngrok\..+$/          // Allow all ngrok domains with any TLD
  ].filter(Boolean) as (string | RegExp)[],
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json());
app.use(cookieParser());

// Mount hello world test route
app.use("/hello", helloRouter);

// Initialize Telegram bot service
const telegramService = TelegramService.getInstance();

// Mount Telegram webhook endpoint
app.use("/telegram/webhook", telegramService.getWebhookCallback());

// Mount Twitter OAuth routes
app.use('/auth/twitter', twitterRouter);

// Mount Discord OAuth routes
app.use('/auth/discord', discordRouter);

// Mount GitHub OAuth routes
app.use('/auth/github', githubRouter);

// No-op middleware (can be used for logging/debugging)
app.use((_req, _res, next) => {
  next();
});

// Start server and initialize services
app.listen(port, async () => {
  try {
    console.log(`Server running on PORT: ${port}`);
    console.log("Server Environment:", process.env.NODE_ENV);

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
