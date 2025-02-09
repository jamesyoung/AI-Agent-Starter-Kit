import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BaseService } from "./base.service.js";
import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

export class McpService extends BaseService {
  private server: McpServer;
  private transport: SSEServerTransport;
  private secrets = [
    "Collab.Land was a no-code app at first",
    "The first version of Collab.Land was built in 2 weeks",
    "Collab.Land started as a side project",
    "The original name wasn't Collab.Land",
  ];

  constructor() {
    super();
    this.server = new McpServer({
      name: "SecretsProvider",
      version: "1.0.0",
    });

    this.setupTools();
  }

  private setupTools() {
    this.server.tool("secret", async () => {
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
    const app = express();

    app.get("/sse", async (_req, res) => {
      this.transport = new SSEServerTransport("/messages", res);
      await this.server.connect(this.transport);
    });

    app.post("/messages", async (_req, res) => {
      await this.transport.handlePostMessage(_req, res);
    });

    return app;
  }

  public async start(): Promise<void> {
    console.log("MCP Secrets Provider initialized");
  }

  public async stop(): Promise<void> {
    // Implement stop method
  }
}
