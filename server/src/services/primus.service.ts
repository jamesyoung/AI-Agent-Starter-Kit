import { PrimusCoreTLS } from "@primuslabs/zktls-core-sdk";
import { BaseService } from "./base.service.js";

export class PrimusService extends BaseService {
  private static instance: PrimusService;
  private primusCore: PrimusCoreTLS;
  private appId: string;
  private appSecret: string;
  private _isInitialized: boolean = false;

  private constructor() {
    super();
    this.appId = process.env.PRIMUS_APP_ID || "";
    this.appSecret = process.env.PRIMUS_SECRET_KEY || "";

    if (!this.appId || !this.appSecret) {
      throw new Error(
        "[PRIMUS] Missing required environment variables: PRIMUS_APP_ID and/or PRIMUS_SECRET_KEY"
      );
    }

    this.primusCore = new PrimusCoreTLS();
    console.log("[PRIMUS] SDK initialized");
  }

  public static getInstance(): PrimusService {
    if (!PrimusService.instance) {
      PrimusService.instance = new PrimusService();
    }
    return PrimusService.instance;
  }

  public async start(): Promise<void> {
    try {
      if (this._isInitialized) return;

      console.log("[PRIMUS] Starting initialization...");
      const initResult = await this.primusCore.init(this.appId, this.appSecret);
      console.log("[PRIMUS] Init result:", initResult);

      // Test request exactly as in example
      const testRequest = {
        url: "https://www.okx.com/api/v5/public/instruments?instType=SPOT&instId=BTC-USD",
        method: "GET",
        header: {},
        body: "",
      };

      // Response resolvers as in example
      const responseResolves = [
        {
          keyName: "instType",
          parsePath: "$.data[0].instType",
        },
      ];

      // Generate attestation request
      const generateRequest = this.primusCore.generateRequestParams(
        testRequest,
        responseResolves
      );

      // Set zkTLS mode as in example
      generateRequest.setAttMode({
        algorithmType: "proxytls",
      });

      // Start attestation process
      const attestation =
        await this.primusCore.startAttestation(generateRequest);
      console.log("[PRIMUS] Attestation:", attestation);

      // Verify attestation
      const verifyResult = this.primusCore.verifyAttestation(attestation);
      console.log("[PRIMUS] Verify result:", verifyResult);

      if (!verifyResult) {
        throw new Error("Attestation verification failed");
      }

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
      console.log("[PRIMUS] Starting attestation process...");
      const params = JSON.parse(signParams);

      // Create request object following example format
      const request = {
        url: params.url || "https://api.example.com",
        method: params.method || "GET",
        header: params.headers || {},
        body: params.body || "",
      };

      // Generate attestation request
      const generateRequest = this.primusCore.generateRequestParams(
        request,
        params.responseResolves || []
      );

      // Set zkTLS mode
      generateRequest.setAttMode({
        algorithmType: "proxytls",
      });

      // Start attestation process
      const attestation =
        await this.primusCore.startAttestation(generateRequest);
      console.log("[PRIMUS] Attestation generated");

      // Verify attestation
      const verifyResult = this.primusCore.verifyAttestation(attestation);
      if (!verifyResult) {
        throw new Error("Attestation verification failed");
      }

      return attestation;
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
