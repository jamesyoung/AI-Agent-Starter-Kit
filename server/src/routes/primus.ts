import express from "express";
import { PrimusService } from "../services/primus.service.js";

export const router = express.Router();

router.get("/sign", async (req: express.Request, res: express.Response) => {
  console.log("[PRIMUS] Received request:", {
    query: req.query,
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

    const { signParams } = req.query;

    if (!signParams) {
      console.log("[PRIMUS] Missing signParams");
      res.status(400).json({ error: "Missing signParams" });
      return;
    }

    // Create a valid JSON object for signing
    const jsonParams = {
      message: signParams,
      timestamp: Date.now(),
    };

    console.log("[PRIMUS] Signing params:", jsonParams);
    const result = await primusService.sign(JSON.stringify(jsonParams));

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
