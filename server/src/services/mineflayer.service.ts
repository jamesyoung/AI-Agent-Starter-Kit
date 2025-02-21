import mineflayer from "mineflayer";
import { IService } from "./base.service.js";
import pathfinder from "mineflayer-pathfinder";
import { Item } from "prismarine-item";
import { ChatMessage } from "prismarine-chat";

const { Movements, goals } = pathfinder;

export class MineflayerService implements IService {
  private static instance: MineflayerService;
  private bot: mineflayer.Bot | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private lastPosition: { x: number; y: number; z: number } | null = null;
  private targetPlayer = "seyivibes";
  private inCombat = false;
  private wagerAmount = 100; // Default wager amount

  private constructor() {}

  public static getInstance(): MineflayerService {
    if (!MineflayerService.instance) {
      MineflayerService.instance = new MineflayerService();
    }
    return MineflayerService.instance;
  }

  public async init(): Promise<void> {
    try {
      const host = process.env.MINECRAFT_HOST || "localhost";
      const port = parseInt(process.env.MINECRAFT_PORT || "25565");

      console.log(`[Mineflayer] Initializing bot with config:
        Host: ${host}
        Port: ${port}
      `);

      const botConfig = {
        host,
        port,
        username: "CombatBot",
        auth: "offline" as const,
        hideErrors: false,
        checkTimeoutInterval: 60000,
        connectTimeout: 30000,
        logErrors: true,
        keepAlive: true,
      };

      this.bot = mineflayer.createBot(botConfig);
      this.setupEventHandlers(this.bot);
      this.bot.loadPlugin(pathfinder.pathfinder);
    } catch (error) {
      console.error("[Mineflayer] Failed to initialize bot:", error);
      throw error;
    }
  }

  private setupEventHandlers(bot: mineflayer.Bot): void {
    // Position logging
    setInterval(() => {
      if (bot.entity?.position) {
        const pos = bot.entity.position;
        const roundedPos = {
          x: Math.round(pos.x * 100) / 100,
          y: Math.round(pos.y * 100) / 100,
          z: Math.round(pos.z * 100) / 100,
        };

        if (
          !this.lastPosition ||
          roundedPos.x !== this.lastPosition.x ||
          roundedPos.y !== this.lastPosition.y ||
          roundedPos.z !== this.lastPosition.z
        ) {
          console.log(`[Mineflayer] Bot position:`, roundedPos);
          this.lastPosition = roundedPos;
        }
      }
    }, 1000);

    bot.once("spawn", () => {
      const movements = new Movements(bot);
      bot.pathfinder.setMovements(movements);
      this.initializeCombatBehavior(bot);
    });

    bot.on("playerCollect", (collector) => {
      if (collector.username === this.targetPlayer) {
        console.log(`[Mineflayer] ${this.targetPlayer} collected items`);
      }
    });

    bot.on("death", () => {
      console.log(`[Mineflayer] Bot died in combat with ${this.targetPlayer}`);
      this.handleCombatLoss();
      // Bot will automatically respawn
    });

    // Standard connection handlers
    this.setupConnectionHandlers(bot);
  }

  private setupConnectionHandlers(bot: mineflayer.Bot): void {
    bot.on("login", () => {
      console.log(`[Mineflayer] Bot logged in successfully`);
    });

    bot.on("end", (reason: string) => {
      console.log(`[Mineflayer] Bot connection ended:`, reason);
      this.bot = null;

      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        console.log(`[Mineflayer] Attempting to reconnect...`);
        this.reconnectAttempts++;
        setTimeout(() => this.init(), 5000);
      }
    });

    bot.on("error", (err: Error) => {
      console.error(`[Mineflayer] Bot error:`, err);
    });
  }

  private initializeCombatBehavior(bot: mineflayer.Bot): void {
    // Monitor for target player and prepare for combat
    bot.on("playerJoined", async (player) => {
      if (player.username === this.targetPlayer) {
        console.log(`[Mineflayer] Target player ${this.targetPlayer} joined`);
        await this.prepareForCombat(bot);
      }
    });

    // Combat monitoring and movement
    bot.on("entityHurt", async (entity) => {
      if (entity.username === this.targetPlayer || entity === bot.entity) {
        if (!this.inCombat) {
          this.inCombat = true;
          console.log(`[Mineflayer] Combat event detected - Engaging target`);
          this.startCombatLoop(bot);
        }
      }
    });

    // Track player health and equipment
    bot.on("health", () => {
      if (this.inCombat) {
        console.log(`[Mineflayer] Bot health: ${bot.health}`);
        this.checkAndEquipBestGear(bot);

        // Eat food if health is low
        if (bot.health < 10 && bot.food < 20) {
          this.eatFood(bot);
        }
      }
    });

    // Additional combat triggers
    bot.on("playerCollect", async (collector) => {
      if (collector.username === this.targetPlayer && this.inCombat) {
        await this.attackTarget(bot);
      }
    });

    // Watch for target proximity
    setInterval(() => {
      if (!this.inCombat) {
        const target = bot.players[this.targetPlayer]?.entity;
        if (target && bot.entity.position.distanceTo(target.position) < 5) {
          this.inCombat = true;
          console.log(`[Mineflayer] Target in range - Initiating combat`);
          this.startCombatLoop(bot);
        }
      }
    }, 1000);
  }

  private async prepareForCombat(bot: mineflayer.Bot): Promise<void> {
    // Equip best available gear before combat
    await this.checkAndEquipBestGear(bot);

    // Look for target player
    const target = bot.players[this.targetPlayer]?.entity;
    if (target) {
      try {
        // Move to a position near the target
        await bot.pathfinder.goto(
          new goals.GoalNear(
            target.position.x,
            target.position.y,
            target.position.z,
            5
          )
        );

        // Look at target
        await bot.lookAt(target.position.offset(0, target.height, 0));

        // Ready weapon
        const weapon = bot.inventory
          .items()
          .find(
            (item: Item) =>
              item.name.includes("sword") || item.name.includes("axe")
          );
        if (weapon) {
          await bot.equip(weapon, "hand");
        }
      } catch (err) {
        console.log(`[Mineflayer] Initial combat preparation error:`, err);
      }
    }
  }

  private async startCombatLoop(bot: mineflayer.Bot): Promise<void> {
    if (!this.inCombat) return;

    // Main combat loop
    const combatInterval = setInterval(async () => {
      if (!this.inCombat) {
        clearInterval(combatInterval);
        return;
      }

      try {
        await this.performCombatAction(bot);
      } catch (err) {
        console.log(`[Mineflayer] Combat action error:`, err);
      }
    }, 500); // Attack every 500ms
  }

  private async performCombatAction(bot: mineflayer.Bot): Promise<void> {
    const target = bot.players[this.targetPlayer]?.entity;
    if (!target) return;

    const distance = bot.entity.position.distanceTo(target.position);

    // Attack if in range
    if (distance < 3) {
      await this.attackTarget(bot);
    } else {
      // Move closer if too far
      try {
        await bot.pathfinder.goto(
          new goals.GoalNear(
            target.position.x,
            target.position.y,
            target.position.z,
            2
          )
        );
        await bot.lookAt(target.position.offset(0, target.height, 0));
      } catch (err) {
        console.log(`[Mineflayer] Combat movement error:`, err);
      }
    }
  }

  private async attackTarget(bot: mineflayer.Bot): Promise<void> {
    const target = bot.players[this.targetPlayer]?.entity;
    if (!target) return;

    try {
      // Look at target's upper body for better hit registration
      await bot.lookAt(target.position.offset(0, target.height * 0.8, 0));

      // Attack with weapon
      await bot.attack(target);

      // Attempt critical hit by jumping
      if (Math.random() < 0.3) {
        // 30% chance to jump for critical
        bot.setControlState("jump", true);
        setTimeout(() => bot.setControlState("jump", false), 100);
      }
    } catch (err) {
      console.log(`[Mineflayer] Attack error:`, err);
    }
  }

  private async eatFood(bot: mineflayer.Bot): Promise<void> {
    const food = bot.inventory
      .items()
      .find(
        (item: Item) =>
          item.name.includes("apple") ||
          item.name.includes("bread") ||
          item.name.includes("cooked")
      );

    if (food) {
      try {
        await bot.equip(food, "hand");
        await bot.consume();
      } catch (err) {
        console.log(`[Mineflayer] Failed to eat food:`, err);
      }
    }
  }

  private async checkAndEquipBestGear(bot: mineflayer.Bot): Promise<void> {
    const inventory = bot.inventory;
    if (!inventory) return;

    // Check for best weapon
    const weapons = inventory.items().filter((item: Item) => {
      return item.name.includes("sword") || item.name.includes("axe");
    });

    if (weapons.length > 0) {
      // Sort by damage (you might want to implement a more sophisticated comparison)
      const bestWeapon = weapons.sort((a: Item, b: Item) => {
        const getMaterialValue = (item: Item) => {
          if (item.name.includes("diamond")) return 4;
          if (item.name.includes("iron")) return 3;
          if (item.name.includes("stone")) return 2;
          return 1;
        };
        return getMaterialValue(b) - getMaterialValue(a);
      })[0];

      try {
        await bot.equip(bestWeapon, "hand");
        console.log(`[Mineflayer] Equipped ${bestWeapon.name}`);
      } catch (err) {
        console.log(`[Mineflayer] Failed to equip weapon:`, err);
      }
    }

    // Check for best armor
    const armorSlots = ["head", "torso", "legs", "feet"] as const;
    for (const slot of armorSlots) {
      const armorItems = inventory.items().filter((item: Item) => {
        return (
          item.name.includes("helmet") ||
          item.name.includes("chestplate") ||
          item.name.includes("leggings") ||
          item.name.includes("boots")
        );
      });

      if (armorItems.length > 0) {
        const bestArmor = armorItems.sort((a: Item, b: Item) => {
          const getMaterialValue = (item: Item) => {
            if (item.name.includes("diamond")) return 4;
            if (item.name.includes("iron")) return 3;
            if (item.name.includes("chainmail")) return 2;
            return 1;
          };
          return getMaterialValue(b) - getMaterialValue(a);
        })[0];

        try {
          await bot.equip(bestArmor, slot);
          console.log(`[Mineflayer] Equipped ${bestArmor.name}`);
        } catch (err) {
          console.log(`[Mineflayer] Failed to equip armor:`, err);
        }
      }
    }
  }

  private async handlePayment(
    amount: number,
    payer: mineflayer.Bot,
    receiver: string
  ): Promise<void> {
    try {
      await payer.chat(`/pay ${receiver} ${amount}`);
      console.log(
        `[Mineflayer] Attempting payment of ${amount} to ${receiver}`
      );

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          payer.removeListener("message", messageHandler);
          reject(new Error("Payment timeout"));
        }, 10000);

        const messageHandler = (message: ChatMessage) => {
          const msg = message.toString().toLowerCase();

          if (
            msg.includes("paid") ||
            msg.includes("payment sent") ||
            msg.includes("transferred")
          ) {
            clearTimeout(timeout);
            payer.removeListener("message", messageHandler);
            resolve();
          }

          if (
            msg.includes("cannot") ||
            msg.includes("failed") ||
            msg.includes("not enough")
          ) {
            clearTimeout(timeout);
            payer.removeListener("message", messageHandler);
            reject(new Error(`Payment failed: ${msg}`));
          }
        };

        payer.on("message", messageHandler);
      });
    } catch (err) {
      console.error(`[Mineflayer] Payment error:`, err);

      try {
        await payer.chat(`/money pay ${receiver} ${amount}`);
      } catch (altErr) {
        console.error(`[Mineflayer] Alternative payment failed:`, altErr);
        throw altErr; // Re-throw to handle in calling function
      }
    }
  }

  private async handleCombatLoss(): Promise<void> {
    if (!this.bot) return;

    console.log(
      `[Mineflayer] Processing loss payment of ${this.wagerAmount} to ${this.targetPlayer}`
    );

    try {
      await this.handlePayment(this.wagerAmount, this.bot, this.targetPlayer);

      await this.bot.chat(
        `/tell ${this.targetPlayer} Payment of ${this.wagerAmount} sent for combat loss.`
      );
    } catch (err) {
      console.error(`[Mineflayer] Failed to process loss payment:`, err);
      await this.bot.chat(
        `/tell ${this.targetPlayer} Sorry, payment failed. Please contact an admin.`
      );
    }

    this.inCombat = false;

    // Drop equipment on loss if configured
    const itemsToDrop = this.bot.inventory.items();
    for (const item of itemsToDrop) {
      try {
        await this.bot.tossStack(item);
      } catch (err) {
        console.log(`[Mineflayer] Failed to drop item:`, err);
      }
    }
  }

  public async handleCombatWin(): Promise<void> {
    if (!this.bot) return;

    console.log(
      `[Mineflayer] Processing win collection of ${this.wagerAmount} from ${this.targetPlayer}`
    );

    const bot = this.bot; // Store reference to avoid null checking issues

    // Request payment
    await bot.chat(
      `/tell ${this.targetPlayer} Please send ${this.wagerAmount} for combat loss.`
    );

    // Set up payment monitoring
    const paymentPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        bot.removeListener("message", messageHandler);
        reject(new Error("Payment collection timeout"));
      }, 30000); // 30 second timeout

      const messageHandler = (message: ChatMessage) => {
        const msg = message.toString().toLowerCase();
        if (
          (msg.includes("paid") &&
            msg.includes(this.targetPlayer.toLowerCase())) ||
          (msg.includes("received") &&
            msg.includes(this.wagerAmount.toString()))
        ) {
          clearTimeout(timeout);
          bot.removeListener("message", messageHandler);
          resolve(true);
        }
      };

      bot.on("message", messageHandler);
    });

    try {
      await paymentPromise;
      await bot.chat(`/tell ${this.targetPlayer} Payment received, thank you.`);
    } catch (err) {
      console.error(`[Mineflayer] Payment collection failed:`, err);
      await bot.chat(
        `/tell ${this.targetPlayer} Payment not received within timeout.`
      );
    }

    this.inCombat = false;

    // Collect nearby dropped items
    const entity = bot.nearestEntity();
    if (entity && entity.type === "object") {
      try {
        await bot.pathfinder.goto(
          new goals.GoalBlock(
            entity.position.x,
            entity.position.y,
            entity.position.z
          )
        );
      } catch (err) {
        console.log(`[Mineflayer] Failed to collect items:`, err);
      }
    }
  }

  public getBot(): mineflayer.Bot | null {
    return this.bot;
  }

  public async shutdown(): Promise<void> {
    console.log("[Mineflayer] Shutting down bot...");
    if (this.bot) {
      this.bot.end();
      this.bot = null;
    }
  }

  public async start(): Promise<void> {
    await this.init();
  }

  public async stop(): Promise<void> {
    await this.shutdown();
  }

  // New methods for combat settings
  public setWagerAmount(amount: number): void {
    this.wagerAmount = amount;
    console.log(`[Mineflayer] Wager amount set to ${amount}`);
  }

  public isInCombat(): boolean {
    return this.inCombat;
  }
}
