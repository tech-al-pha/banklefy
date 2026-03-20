import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveEffectiveLimit } from "./limit-resolver.ts";

type TableName = "anonymous_usage" | "subscriptions" | "user_roles";
type TableRow = Record<string, unknown>;

const createSupabaseAdminMock = (seed: Partial<Record<TableName, TableRow[]>> = {}) => {
  const tables: Record<TableName, TableRow[]> = {
    anonymous_usage: [...(seed.anonymous_usage ?? [])],
    subscriptions: [...(seed.subscriptions ?? [])],
    user_roles: [...(seed.user_roles ?? [])],
  };

  const matches = (row: TableRow, filters: Record<string, unknown>) =>
    Object.entries(filters).every(([column, value]) => row[column] === value);

  const query = (table: TableName, filters: Record<string, unknown> = {}) => ({
    select: () => query(table, filters),
    eq: (column: string, value: unknown) => query(table, { ...filters, [column]: value }),
    maybeSingle: async () => ({
      data: tables[table].find((row) => matches(row, filters)) ?? null,
      error: null,
    }),
    insert: (payload: TableRow) => ({
      select: () => ({
        single: async () => {
          const row = { id: `${table}-${tables[table].length + 1}`, ...payload };
          tables[table].push(row);
          return { data: row, error: null };
        },
      }),
    }),
    update: (payload: TableRow) => ({
      eq: async (column: string, value: unknown) => {
        const row = tables[table].find((candidate) => candidate[column] === value);
        if (row) Object.assign(row, payload);
        return { error: null };
      },
    }),
  });

  return {
    tables,
    supabaseAdmin: {
      from: (table: TableName) => query(table),
      rpc: async () => ({ data: false, error: null }),
    },
  };
};

describe("limit-resolver", () => {
  beforeEach(() => {
    vi.stubGlobal("Deno", {
      env: {
        get: vi.fn(() => undefined),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates an anonymous usage row and applies the free limit", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { supabaseAdmin, tables } = createSupabaseAdminMock();

    const result = await resolveEffectiveLimit({
      supabaseAdmin: supabaseAdmin as never,
      user: null,
      trackingKey: "1.2.3.4",
      timezone: "UTC",
    });

    expect(result).toMatchObject({
      isAuthenticated: false,
      conversionsUsed: 0,
      conversionsLimit: 2,
      remaining: 2,
      limitReached: false,
      planType: "free",
    });
    expect(tables.anonymous_usage).toHaveLength(1);
    expect(tables.anonymous_usage[0]).toMatchObject({
      ip_address: "1.2.3.4",
      conversions_count: 0,
      last_reset_date: today,
      timezone: "UTC",
    });
  });

  it("uses the explicit subscription limit for authenticated users", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { supabaseAdmin } = createSupabaseAdminMock({
      subscriptions: [
        {
          id: "sub-1",
          user_id: "user-1",
          conversions_used: 3,
          conversions_limit: 10,
          last_reset_date: today,
          timezone: "UTC",
          tier: "free",
          plan_type: "per_page_lite",
          free_daily_limit: null,
          free_daily_used: null,
          pack_limit: null,
          pack_used: null,
        },
      ],
      user_roles: [
        {
          id: "role-1",
          role: "user",
          user_id: "user-1",
        },
      ],
    });

    const result = await resolveEffectiveLimit({
      supabaseAdmin: supabaseAdmin as never,
      user: {
        id: "user-1",
        email: "buyer@example.com",
      },
      trackingKey: "1.2.3.4",
      timezone: "UTC",
    });

    expect(result).toMatchObject({
      isAuthenticated: true,
      isAdmin: false,
      isOwner: false,
      isUnlimited: false,
      conversionsUsed: 3,
      conversionsLimit: 10,
      remaining: 7,
      limitReached: false,
      planType: "per_page_lite",
    });
  });

  it("treats an unlimited subscription as uncapped", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { supabaseAdmin } = createSupabaseAdminMock({
      subscriptions: [
        {
          id: "sub-2",
          user_id: "user-2",
          conversions_used: 99,
          conversions_limit: 0,
          last_reset_date: today,
          timezone: "UTC",
          tier: "free",
          plan_type: "free",
          is_unlimited: true,
          unlimited: false,
          unlimited_flag: false,
        },
      ],
      user_roles: [
        {
          id: "role-2",
          role: "user",
          user_id: "user-2",
        },
      ],
    });

    const result = await resolveEffectiveLimit({
      supabaseAdmin: supabaseAdmin as never,
      user: {
        id: "user-2",
        email: "vip@example.com",
      },
      trackingKey: "1.2.3.4",
      timezone: "UTC",
    });

    expect(result).toMatchObject({
      isUnlimited: true,
      conversionsUsed: 0,
      conversionsLimit: 999999,
      remaining: 999999,
      limitReached: false,
      planType: "unlimited",
    });
  });
});
