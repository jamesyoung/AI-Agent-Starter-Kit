import express from "express";
import { PrimusService } from "../services/primus.service.js";

export const router = express.Router();

router.post("/sign", async (req: express.Request, res: express.Response) => {
  console.log("[PRIMUS] Received request:", {
    body: req.body,
    path: req.path,
    url: req.url,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
  });

  try {
    // Check if service is initialized
    const primusService = PrimusService.getInstance();
    if (!primusService.isInitialized()) {
      console.log("[PRIMUS] Service not initialized, attempting to start...");
      await primusService.start();
    }

    // Get params from request body instead of query
    const params = req.body;

    if (!params) {
      console.log("[PRIMUS] Missing request body");
      res.status(400).json({ error: "Missing request body" });
      return;
    }

    // Pass the entire params object as JSON string
    const result = await primusService.sign(JSON.stringify(params));

    console.log("[PRIMUS] Sign result:", result);
    res.json({ signResult: result });
  } catch (error) {
    console.error("[PRIMUS] Error:", error);
    res.status(500).json({
      error: "Failed to sign data",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
