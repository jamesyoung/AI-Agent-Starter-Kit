import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BaseService } from "./base.service.js";
import { Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Readable } from "stream";
import { IncomingMessage } from "http";
import * as net from "net";

interface StreamIncomingMessage
  extends Omit<IncomingMessage, "pause" | "resume"> {
  body: Readable;
  pause(): this;
  resume(): this;
}

export class McpService extends BaseService {
  private static instance: McpService;
  private server: McpServer;
  private transport: SSEServerTransport | null = null;
  private sseResponse: Response | null = null;
  private lastMessageTime: number = 0;

  public static readonly SECRETS = [
    "Collab.Land was a no-code app at first",
    "The first version was built in 2 weeks",
    "It started as a side project",
    "The original name wasn't Collab.Land",
  ];

  private constructor() {
    super();
    console.log("[MCP] 🚀 Initializing MCP Service");
    this.server = new McpServer({
      name: "HelloWorld",
      version: "1.0.0",
      capabilities: {
        tools: {
          hello: {},
        },
      },
    });
    this.setupTools();
  }

  public static getInstance(): McpService {
    if (!McpService.instance) {
      McpService.instance = new McpService();
    }
    return McpService.instance;
  }

  private debugConnection(context: string): void {
    if (!this.transport || !this.sseResponse) return;

    console.log(`[MCP] Connection state (${context}):`, {
      active: !!this.transport,
      writable: !this.sseResponse.writableEnded,
      finished: this.sseResponse.finished,
      lastMessageAge: Date.now() - this.lastMessageTime,
    });
  }

  private createBodyStream(data: unknown): Readable {
    const jsonString = JSON.stringify(data);
    const buffer = Buffer.from(jsonString, "utf8");
    let dataDelivered = false;

    const stream = new Readable({
      read(): void {
        if (dataDelivered) {
          this.push(null);
          return;
        }
        this.push(buffer);
        dataDelivered = true;
      },
    });

    stream.on("error", (error) => {
      console.error("[MCP] Stream error:", error);
    });

    return stream;
  }

  private setupTools(): void {
    console.log("[MCP] 🛠️ Setting up tools...");

    try {
      console.log("[MCP] 📝 Registering hello tool");
      this.server.tool("hello", {}, async () => {
        console.log("[MCP] 👋 Hello tool called");
        const randomSecret =
          McpService.SECRETS[
            Math.floor(Math.random() * McpService.SECRETS.length)
          ];
        console.log("[MCP] 📤 Hello tool returning:", randomSecret);
        return {
          content: [{ type: "text", text: randomSecret }],
        };
      });

      console.log("[MCP] 📝 Registering secret tool");
      this.server.tool("secret", {}, async () => {
        console.log("[MCP] 🤫 Secret tool called");
        const secret = await this.getRandomSecret();
        return {
          content: [
            {
              type: "text",
              text: secret,
            },
          ],
        };
      });

      console.log("[MCP] ✅ Tools setup complete");
    } catch (error) {
      console.error("[MCP] 💥 Error setting up tools:", error);
      throw error;
    }
  }

  public async handleSSE(_req: Request, res: Response): Promise<void> {
    try {
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
        this.sseResponse = null;
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");

      this.sseResponse = res;
      this.lastMessageTime = Date.now();

      this.transport = new SSEServerTransport("/messages", res);
      await this.server.connect(this.transport);
      this.debugConnection("setup");

      res.write('data: {"type":"connected"}\n\n');

      const keepAlive = setInterval(() => {
        if (res.writableEnded) {
          clearInterval(keepAlive);
          return;
        }
        res.write(": ping\n\n");
        this.lastMessageTime = Date.now();
      }, 30000);

      res.on("close", () => {
        clearInterval(keepAlive);
        if (this.transport) {
          this.transport.close();
          this.transport = null;
        }
        this.sseResponse = null;
        this.debugConnection("close");
      });
    } catch (error) {
      console.error("[MCP] SSE setup failed:", error);
      this.transport = null;
      this.sseResponse = null;
      if (!res.headersSent) {
        res.status(500).end();
      }
    }
  }

  public async handleMessage(req: Request, res: Response): Promise<void> {
    if (
      !this.transport ||
      !this.sseResponse ||
      this.sseResponse.writableEnded
    ) {
      res.status(400).json({
        error:
          "No active SSE connection. Please establish SSE connection first at /sse",
      });
      return;
    }

    try {
      const bodyStream = this.createBodyStream(req.body);

      // Monitor stream lifecycle
      const cleanup = () => {
        bodyStream.destroy();
      };

      res.on("close", cleanup);
      res.on("error", cleanup);

      const streamReq = this.createStreamRequest(req, bodyStream);

      await this.transport.handlePostMessage(streamReq, res);

      if (!res.writableEnded) {
        res.end();
      }
    } catch (error) {
      console.error("[MCP] Message handling failed:", error);
      if (!res.writableEnded) {
        res.status(500).json({
          error: "Failed to handle message",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  public async start(): Promise<void> {
    console.log("[MCP] 🌟 MCP Service started");
  }

  public async stop(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.sseResponse = null;
    console.log("[MCP] ✅ MCP Service stopped");
    this.debugConnection("Service Stop");
  }

  private createStreamRequest(
    req: Request,
    bodyStream: Readable
  ): StreamIncomingMessage {
    const socket = new net.Socket();
    const streamReq = new IncomingMessage(socket) as StreamIncomingMessage;

    Object.assign(streamReq, {
      method: req.method,
      url: req.url,
      headers: {
        ...req.headers,
        "content-type": "application/json",
        "content-length": req.headers["content-length"],
      },
      body: bodyStream,
    });

    streamReq.resume = () => {
      bodyStream.resume();
      return streamReq;
    };

    streamReq.pause = () => {
      bodyStream.pause();
      return streamReq;
    };

    return streamReq;
  }

  public getServer(): McpServer {
    return this.server;
  }

  public async getRandomSecret(): Promise<string> {
    try {
      console.log("[MCP] 🎲 getRandomSecret called");

      // Validate secrets array
      if (!McpService.SECRETS) {
        console.error("[MCP] ❌ SECRETS array is undefined");
        throw new Error("SECRETS array is undefined");
      }

      if (McpService.SECRETS.length === 0) {
        console.error("[MCP] ❌ SECRETS array is empty");
        throw new Error("No secrets configured");
      }

      // Get random secret
      const index = Math.floor(Math.random() * McpService.SECRETS.length);
      console.log("[MCP] 📊 Selecting secret:", {
        totalSecrets: McpService.SECRETS.length,
        selectedIndex: index,
      });

      const secret = McpService.SECRETS[index];
      console.log("[MCP] 📜 Selected secret:", secret);

      // Format response
      const formattedSecret = `🤫 ${secret}`;
      console.log("[MCP] 🎁 Formatted response:", formattedSecret);

      return formattedSecret;
    } catch (error) {
      console.error("[MCP] 💥 Error in getRandomSecret:", {
        error,
        secretsAvailable: !!McpService.SECRETS,
        secretsCount: McpService.SECRETS?.length ?? 0,
      });
      throw error;
    }
  }

  public async handleSecretRequest(): Promise<string> {
    console.log("[MCP] 📥 Handling secret request");
    try {
      const secret = await this.getRandomSecret();
      console.log("[MCP] 📤 Returning secret:", secret);
      return secret;
    } catch (error) {
      console.error("[MCP] 💥 Failed to handle secret request:", error);
      throw error;
    }
  }
}
