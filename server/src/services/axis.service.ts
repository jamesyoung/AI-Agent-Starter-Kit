import axios from "axios";
import { BaseService } from "./base.service.js";
import { createCipheriv, randomBytes } from "crypto";

interface BidParams {
  lotId: string;
  amount: string;
  price: string;
}

export class AxisService extends BaseService {
  private static instance: AxisService;
  private client;

  private constructor() {
    super();
    this.client = axios.create({
      baseURL: process.env.AXIS_API_URL || "https://api.axis.xyz",
    });
  }

  public static getInstance(): AxisService {
    if (!AxisService.instance) {
      AxisService.instance = new AxisService();
    }
    return AxisService.instance;
  }

  async encryptBid(bidData: BidParams) {
    // Simple AES encryption
    const key = randomBytes(32);
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-cbc", key, iv);

    let encrypted = cipher.update(JSON.stringify(bidData), "utf8", "hex");
    encrypted += cipher.final("hex");

    return {
      data: {
        encrypted,
        key: key.toString("hex"),
        iv: iv.toString("hex"),
      },
    };
  }

  async getLaunchMetadata(chainId: number, lotId: number) {
    return this.client.get(`/api/v1/metadata/${chainId}/${lotId}`);
  }

  async getLaunch(chainId: number, lotId: number) {
    return this.client.get(`/api/v1/launches/${chainId}/${lotId}`);
  }

  async getAllLaunches() {
    try {
      const { data } = await this.client.get("/api/v1/launches");
      return data.launches;
    } catch (error) {
      console.error("Error fetching launches:", error);
      throw error;
    }
  }

  async getLaunchParticipants(chainId: number, lotId: number) {
    try {
      const { data } = await this.client.get(
        `/participants/${chainId}/${lotId}`
      );
      return data.launch.participants;
    } catch (error) {
      console.error("Error fetching participants:", error);
      throw error;
    }
  }

  async start() {
    // No initialization needed
  }

  async stop() {
    // No cleanup needed
  }
}

export default AxisService;
