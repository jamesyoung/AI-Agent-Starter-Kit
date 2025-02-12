import { PrimusZKTLS } from "@primuslabs/zktls-js-sdk";
import { BaseService } from "./base.service.js";

export class PrimusService extends BaseService {
  private static instance: PrimusService;
  private primusZKTLS: PrimusZKTLS;
  private appId: string;
  private appSecret: string;
  private _isInitialized: boolean = false;

  private constructor() {
    super();

    this.appId = process.env.PRIMUS_APP_ID || "";
    this.appSecret = process.env.PRIMUS_SECRET_KEY || "";

    if (!this.appId || !this.appSecret) {
      throw new Error(
        "[PRIMUS] Missing required environment variables: Primus_App_ID and/or Primus_Secret_Key"
      );
    }

    this.primusZKTLS = new PrimusZKTLS();
  }

  public static getInstance(): PrimusService {
    if (!PrimusService.instance) {
      PrimusService.instance = new PrimusService();
    }
    return PrimusService.instance;
  }

  public async start(): Promise<void> {
    try {
      if (this._isInitialized) {
        return;
      }

      await this.primusZKTLS.init(this.appId, this.appSecret);
      this._isInitialized = true;
      console.log("[PRIMUS] ✅ Service started");
    } catch (error) {
      this._isInitialized = false;
      console.error("[PRIMUS] 💥 Failed to start service:", error);
      throw error;
    }
  }

  public async sign(signParams: string): Promise<string> {
    if (!this._isInitialized) {
      throw new Error("[PRIMUS] Service not initialized");
    }

    try {
      return await this.primusZKTLS.sign(signParams);
    } catch (error) {
      console.error("[PRIMUS] 💥 Failed to sign:", error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    this._isInitialized = false;
    console.log("[PRIMUS] 🛑 Service stopped");
  }

  public isInitialized(): boolean {
    return this._isInitialized;
  }
}
