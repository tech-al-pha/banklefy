import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";
import Auth from "./Auth";

const authMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toastMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  signUpMock: vi.fn(),
  resetPasswordForEmailMock: vi.fn(),
  updateUserMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  getSessionMock: vi.fn(),
  refreshSessionMock: vi.fn(),
}));

const translationMap: Record<string, string> = {
  "common.backToHome": "Back to Home",
  "auth.secureAccess": "Secure Access",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.signIn": "Sign In",
  "auth.signUp": "Create Account",
  "auth.noAccount": "Need an account?",
  "auth.hasAccount": "Have an account?",
  "auth.forgotPassword": "Forgot Password?",
  "auth.welcome": "Welcome back!",
  "auth.signedIn": "Signed in successfully.",
  "auth.accountCreated": "Account created!",
  "auth.canUse": "You can use the app now.",
};

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: authMocks.toastMock }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => translationMap[key] ?? key,
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: authMocks.onAuthStateChangeMock,
      getSession: authMocks.getSessionMock,
      refreshSession: authMocks.refreshSessionMock,
      resetPasswordForEmail: authMocks.resetPasswordForEmailMock,
      updateUser: authMocks.updateUserMock,
      signInWithPassword: authMocks.signInWithPasswordMock,
      signUp: authMocks.signUpMock,
      signInWithOAuth: authMocks.signInWithOAuthMock,
    },
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => authMocks.navigateMock,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

describe("Auth page", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    authMocks.onAuthStateChangeMock.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
    authMocks.getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    authMocks.refreshSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    authMocks.resetPasswordForEmailMock.mockResolvedValue({
      data: {},
      error: null,
    });
    authMocks.updateUserMock.mockResolvedValue({
      data: {},
      error: null,
    });
    authMocks.signInWithPasswordMock.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    authMocks.signUpMock.mockResolvedValue({
      data: { session: { user: { id: "user-2" } } },
      error: null,
    });
    authMocks.signInWithOAuthMock.mockResolvedValue({
      data: {},
      error: null,
    });
  });

  it("logs a returning user in", async () => {
    localStorage.setItem("banklefy_remembered_email", "saved@example.com");
    const user = userEvent.setup();

    render(<Auth />);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    expect(emailInput).toHaveValue("saved@example.com");

    await user.type(passwordInput, "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(authMocks.signInWithPasswordMock).toHaveBeenCalledWith({
        email: "saved@example.com",
        password: "password123",
      });
    });
    expect(authMocks.navigateMock).toHaveBeenCalledWith("/");
    expect(authMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Welcome back!",
      }),
    );
  }, 10000);

  it("creates a new account after accepting terms", async () => {
    const user = userEvent.setup();

    render(<Auth />);

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(authMocks.signUpMock).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
    });
    expect(authMocks.updateUserMock).toHaveBeenCalledWith({
      data: { terms_accepted: "true" },
    });
    expect(authMocks.navigateMock).toHaveBeenCalledWith("/");
    expect(authMocks.toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Account created!",
      }),
    );
  });
});
