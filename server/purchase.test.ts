import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock the Stripe client module
vi.mock("./stripe/client", () => ({
  getStripe: () => ({
    customers: {
      create: vi.fn().mockResolvedValue({
        id: "cus_test_123",
        email: "test@example.com",
      }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/test_session",
        }),
      },
    },
  }),
}));

// Mock the db module
vi.mock("./db", () => ({
  getUserPurchaseStatus: vi.fn().mockResolvedValue({
    gameUnlocked: false,
    stripeCustomerId: null,
  }),
  setStripeCustomerId: vi.fn().mockResolvedValue(undefined),
  markUserUnlocked: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue(null),
}));

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    stripeCustomerId: null,
    gameUnlocked: false,
    unlockedAt: null,
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {
        origin: "https://dothuntergame.app",
      },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("purchase.status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns gameUnlocked false for a new user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.purchase.status();

    expect(result).toEqual({ gameUnlocked: false });
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.purchase.status()).rejects.toThrow();
  });
});

describe("purchase.createCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a checkout session for an unlocked user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.purchase.createCheckout();

    expect(result).toHaveProperty("url");
    expect(result.alreadyUnlocked).toBe(false);
    expect(result.url).toContain("checkout.stripe.com");
  });

  it("returns alreadyUnlocked if user already purchased", async () => {
    const { getUserPurchaseStatus } = await import("./db");
    (getUserPurchaseStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      gameUnlocked: true,
      stripeCustomerId: "cus_existing",
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.purchase.createCheckout();

    expect(result.alreadyUnlocked).toBe(true);
    expect(result.url).toBeNull();
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.purchase.createCheckout()).rejects.toThrow();
  });
});

describe("purchase.adminUnlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin to unlock", async () => {
    const ctx = createAuthContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.purchase.adminUnlock();

    expect(result).toEqual({ success: true });
  });

  it("rejects non-admin users", async () => {
    const ctx = createAuthContext({ role: "user" });
    const caller = appRouter.createCaller(ctx);

    await expect(caller.purchase.adminUnlock()).rejects.toThrow("Not authorized");
  });
});
