import express from "express";
import AxisService from "../services/axis.service.js";

const router = express.Router();
const axisService = AxisService.getInstance();

// Debug middleware
router.use((req, res, next) => {
  console.log("[AxisRouter] Request:", {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
  });
  res.setHeader("X-Debug", "true");
  next();
});

// Cloak endpoint for bid encryption
router.post("/cloak", async (req, res) => {
  try {
    const response = await axisService.encryptBid(req.body);
    res.json(response); // Return encrypted data with key/iv
  } catch (error) {
    console.error("[AxisRouter] Encryption error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Metadata endpoint for launch info
router.get("/metadata/:chainId/:lotId", async (req, res) => {
  try {
    const { chainId, lotId } = req.params;
    const metadata = await axisService.getLaunchMetadata(
      Number(chainId),
      Number(lotId)
    );
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Subgraph endpoint for querying launch data
router.get("/subgraph/:chainId/:lotId", async (req, res) => {
  try {
    const { chainId, lotId } = req.params;
    const launch = await axisService.getLaunch(Number(chainId), Number(lotId));
    res.json(launch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/launches", async (_req, res) => {
  try {
    const axisService = AxisService.getInstance();
    const launches = await axisService.getAllLaunches();
    res.json(launches);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch launches" });
  }
});

router.get("/launch/:chainId/:lotId/participants", async (req, res) => {
  try {
    const { chainId, lotId } = req.params;
    const axisService = AxisService.getInstance();
    const participants = await axisService.getLaunchParticipants(
      Number(chainId),
      Number(lotId)
    );
    res.json(participants);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch participants" });
  }
});

export default router;
