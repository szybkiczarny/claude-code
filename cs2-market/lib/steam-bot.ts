// Steam bot service — handles trade offer acceptance for skin deposits
// Requires: STEAM_BOT_USERNAME, STEAM_BOT_PASSWORD, STEAM_BOT_SHARED_SECRET, STEAM_BOT_IDENTITY_SECRET

/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SteamUser = require("steam-user");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SteamTradeOfferManager = require("steam-tradeoffer-manager");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SteamTotp = require("steam-totp");

const BOT_USERNAME    = process.env.STEAM_BOT_USERNAME ?? "";
const BOT_PASSWORD    = process.env.STEAM_BOT_PASSWORD ?? "";
const SHARED_SECRET   = process.env.STEAM_BOT_SHARED_SECRET ?? "";
const IDENTITY_SECRET = process.env.STEAM_BOT_IDENTITY_SECRET ?? "";

export interface PendingSkinDeposit {
  steamId: string;
  tradeUrl: string;
  offerId?: string;
  // received = items physically in bot inventory (safe to credit)
  // escrow   = user accepted but trade hold active (7 days)
  status: "pending" | "active" | "accepted" | "escrow" | "received" | "declined" | "cancelled";
  escrowEnds?: string;   // ISO date string when escrow lifts
  creditedUsd?: number;
  createdAt: number;
}

class SteamBotService {
  private client: any = null;
  private manager: any = null;
  private loggedIn = false;
  private deposits = new Map<string, PendingSkinDeposit>();
  private depositListeners = new Map<string, ((d: PendingSkinDeposit) => void)[]>();

  isConfigured(): boolean {
    return !!(BOT_USERNAME && BOT_PASSWORD && SHARED_SECRET && IDENTITY_SECRET);
  }

  isLoggedIn(): boolean {
    return this.loggedIn;
  }

  getBotSteamId(): string {
    if (!this.client?.steamID) return "";
    return this.client.steamID.getSteamID64();
  }

  getBotTradeUrl(): string {
    const steamId = this.getBotSteamId();
    if (!steamId) return "";
    const token = process.env.STEAM_BOT_TRADE_TOKEN ?? "";
    return token ? `https://steamcommunity.com/tradeoffer/new/?partner=${steamId}&token=${token}` : "";
  }

  async start(): Promise<void> {
    if (!this.isConfigured()) {
      console.log("[SteamBot] Not configured — skipping startup");
      return;
    }
    if (this.loggedIn) return;

    this.client = new SteamUser();
    this.manager = new SteamTradeOfferManager({
      steam: this.client,
      language: "en",
      pollInterval: 10000,
    });

    const twoFactorCode = SteamTotp.generateAuthCode(SHARED_SECRET);

    return new Promise((resolve, reject) => {
      this.client.logOn({
        accountName: BOT_USERNAME,
        password: BOT_PASSWORD,
        twoFactorCode,
      });

      this.client.on("loggedOn", () => {
        console.log("[SteamBot] Logged in");
        this.client.setPersona(SteamUser.EPersonaState.Online);
        this.loggedIn = true;
        this.setupOfferHandlers();
        resolve();
      });

      this.client.on("webSession", (_sessionId: string, cookies: string[]) => {
        this.manager.setCookies(cookies);
      });

      this.client.on("error", (err: Error) => {
        console.error("[SteamBot] Login error:", err.message);
        this.loggedIn = false;
        reject(err);
      });
    });
  }

  private setupOfferHandlers() {
    if (!this.manager) return;

    this.manager.on("newOffer", (offer: any) => {
      // Only accept offers where bot gives nothing
      if (offer.itemsToGive && offer.itemsToGive.length > 0) {
        offer.decline(() => console.log("[SteamBot] Declined offer with bot items"));
        return;
      }
      offer.accept(false, (err: Error | null) => {
        if (err) console.error("[SteamBot] Accept error:", err.message);
        else console.log("[SteamBot] Accepted deposit offer:", offer.id);
      });
    });

    this.manager.on("sentOfferChanged", (offer: any) => {
      const deposit = [...this.deposits.values()].find(d => d.offerId === offer.id);
      if (!deposit) return;

      // ETradeOfferState: Accepted=3, Declined=7, Cancelled=6, InEscrow=11
      if (offer.state === 3) {
        // Accepted — check if items are in escrow (trade hold)
        if (offer.escrowEnds) {
          deposit.status = "escrow";
          deposit.escrowEnds = new Date(offer.escrowEnds).toISOString();
          console.log(`[SteamBot] Offer ${offer.id} in escrow until ${deposit.escrowEnds}`);
        } else {
          // No hold — items are in bot inventory now
          const creditUsd = this.estimateItemsValue(offer.itemsToReceive ?? []);
          deposit.status = "received";
          deposit.creditedUsd = creditUsd;
          console.log(`[SteamBot] Offer ${offer.id} received, crediting $${creditUsd}`);
        }
        this.notifyListeners(deposit.steamId, deposit);
      } else if (offer.state === 11) {
        // InEscrow state
        deposit.status = "escrow";
        if (offer.escrowEnds) deposit.escrowEnds = new Date(offer.escrowEnds).toISOString();
        this.notifyListeners(deposit.steamId, deposit);
      } else if (offer.state === 7 || offer.state === 6) {
        deposit.status = "declined";
        this.notifyListeners(deposit.steamId, deposit);
      }
    });

    // When escrow lifts, offer state changes to Accepted again — handled above via sentOfferChanged
  }

  private estimateItemsValue(items: any[]): number {
    return items.length * 3;
  }

  async sendTradeOffer(params: { steamId: string; tradeUrl: string; message?: string }): Promise<string> {
    if (!this.manager) throw new Error("Bot not running");

    const offer = this.manager.createOffer(params.tradeUrl);
    offer.setMessage(params.message ?? "CS2DROP skin deposit");

    return new Promise((resolve, reject) => {
      offer.send((err: Error | null, status: string) => {
        if (err) return reject(err);

        const deposit: PendingSkinDeposit = {
          steamId: params.steamId,
          tradeUrl: params.tradeUrl,
          offerId: offer.id,
          status: status === "pending" ? "active" : "active",
          createdAt: Date.now(),
        };
        this.deposits.set(params.steamId, deposit);

        if (IDENTITY_SECRET && offer.id) {
          const time = Math.floor(Date.now() / 1000);
          SteamTotp.getConfirmations(
            IDENTITY_SECRET,
            time,
            (e: Error | null, confs: any[]) => {
              if (!confs) return;
              const conf = confs.find((c: any) => c.creator === offer.id);
              if (conf) {
                conf.respond(IDENTITY_SECRET, time, true, (ce: Error | null) => {
                  if (ce) console.error("[SteamBot] Confirm error:", ce.message);
                });
              }
            }
          );
        }

        resolve(offer.id);
      });
    });
  }

  getDeposit(steamId: string): PendingSkinDeposit | undefined {
    return this.deposits.get(steamId);
  }

  onDepositUpdate(steamId: string, cb: (d: PendingSkinDeposit) => void) {
    const listeners = this.depositListeners.get(steamId) ?? [];
    listeners.push(cb);
    this.depositListeners.set(steamId, listeners);
  }

  offDepositUpdate(steamId: string, cb: (d: PendingSkinDeposit) => void) {
    const listeners = (this.depositListeners.get(steamId) ?? []).filter(l => l !== cb);
    this.depositListeners.set(steamId, listeners);
  }

  private notifyListeners(steamId: string, deposit: PendingSkinDeposit) {
    (this.depositListeners.get(steamId) ?? []).forEach(cb => cb(deposit));
  }
}

const g = global as typeof global & { __steamBot?: SteamBotService };
if (!g.__steamBot) {
  g.__steamBot = new SteamBotService();
  if (g.__steamBot.isConfigured()) {
    g.__steamBot.start().catch(err => console.error("[SteamBot] Startup failed:", err.message));
  }
}
export const steamBot = g.__steamBot;
