import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useUsageLimit } from "./useUsageLimit";

const supabaseMocks = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: supabaseMocks.invokeMock,
    },
    from: supabaseMocks.fromMock,
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    session: null,
  }),
}));

describe("useUsageLimit", () => {
  it("resolves the free-user daily limit", async () => {
    supabaseMocks.invokeMock.mockResolvedValue({
      data: {
        conversionsUsed: 1,
        conversionsLimit: 2,
        remaining: 1,
        limitReached: false,
        isAuthenticated: false,
        planType: "free",
      },
      error: null,
    });
    supabaseMocks.fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const { result } = renderHook(() => useUsageLimit());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.conversionsLimit).toBe(2);
    expect(result.current.conversionsUsed).toBe(1);
    expect(result.current.remaining).toBe(1);
    expect(result.current.limitReached).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.planType).toBe("free");
    expect(supabaseMocks.invokeMock).toHaveBeenCalledWith(
      "check-usage-limit",
      expect.objectContaining({
        body: expect.objectContaining({
          timezone: expect.any(String),
        }),
      }),
    );
  });
});
