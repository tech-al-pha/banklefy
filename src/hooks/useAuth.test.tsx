import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { AuthProvider, useAuth } from "./useAuth";

const authMocks = vi.hoisted(() => ({
  onAuthStateChangeMock: vi.fn(),
  getSessionMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: authMocks.onAuthStateChangeMock,
      getSession: authMocks.getSessionMock,
      refreshSession: authMocks.refreshSessionMock,
      signOut: authMocks.signOutMock,
    },
  },
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.onAuthStateChangeMock.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
    authMocks.getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "user@example.com",
          },
        },
      },
      error: null,
    });
    authMocks.refreshSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    authMocks.signOutMock.mockResolvedValue({
      error: null,
    });
  });

  it("clears the auth state when signing out", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.user?.email).toBe("user@example.com");

    await act(async () => {
      await result.current.signOut();
    });

    expect(authMocks.signOutMock).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});
