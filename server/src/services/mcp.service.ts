import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BaseService } from "./base.service.js";
import express, { Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

export class McpService extends BaseService {
  private server: McpServer;
  private transport: SSEServerTransport | null = null;
  private secrets = [
    "Collab.Land was a no-code app at first",
    "The first version was built in 2 weeks",
    "It started as a side project",
    "The original name wasn't Collab.Land",
  ];

  constructor() {
    super();
    console.log("[MCP] 🚀 Initializing MCP Service");
    this.server = new McpServer({
      name: "HelloWorld",
      version: "1.0.0",
    });
    this.setupTools();
  }

  private setupTools() {
    this.server.tool("hello", {}, async () => {
      const randomSecret =
        this.secrets[Math.floor(Math.random() * this.secrets.length)];
      return {
        content: [
          {
            type: "text",
            text: randomSecret,
          },
        ],
      };
    });
  }

  public getHandler() {
    const app = express.Router();

    app.get("/mcp", async (_req: Request, res: Response) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      this.transport = new SSEServerTransport("http://localhost:3001/mcp", res);
      await this.transport.start();
    });

    app.post("/mcp", express.json(), async (req: Request, res: Response) => {
      if (!this.transport) {
        res.status(400).json({ error: "No active SSE connection" });
        return;
      }
      await this.transport.handleMessage(req.body);
      res.status(200).end();
    });

    return app;
  }

  public async start(): Promise<void> {
    console.log("[MCP] 🌟 MCP Service started");
  }

  public async stop(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
    }
  }
}
