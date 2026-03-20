import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";
import PricingPage from "./PricingPage";

const pricingMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  getSessionMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  getUserMock: vi.fn(),
  invokeMock: vi.fn(),
  authUser: {
    id: "user-1",
    email: "buyer@example.com",
  },
}));

let razorpayOptions: Record<string, unknown> | null = null;
const checkoutMock = {
  on: vi.fn(),
  open: vi.fn(),
};

vi.mock("sonner", () => ({
  toast: {
    success: pricingMocks.toastSuccessMock,
    error: pricingMocks.toastErrorMock,
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: pricingMocks.authUser,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: pricingMocks.onAuthStateChangeMock,
      getSession: pricingMocks.getSessionMock,
      refreshSession: pricingMocks.refreshSessionMock,
      getUser: pricingMocks.getUserMock,
    },
    functions: {
      invoke: pricingMocks.invokeMock,
    },
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => pricingMocks.navigateMock,
  };
});

describe("PricingPage Razorpay flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    razorpayOptions = null;

    pricingMocks.onAuthStateChangeMock.mockImplementation((callback: (event: string, session: { user: { email: string } } | null) => void) => {
      callback("SIGNED_IN", { user: pricingMocks.authUser });
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });
    pricingMocks.getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          user: pricingMocks.authUser,
        },
      },
    });
    pricingMocks.refreshSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          user: pricingMocks.authUser,
        },
      },
      error: null,
    });
    pricingMocks.getUserMock.mockResolvedValue({
      data: {
        user: pricingMocks.authUser,
      },
      error: null,
    });

    pricingMocks.invokeMock.mockImplementation(async (functionName: string) => {
      if (functionName === "razorpay-order") {
        return {
          data: {
            order: {
              id: "order_123",
              amount: 189900,
              currency: "INR",
            },
            razorpayKeyId: "rzp_test_123",
          },
          error: null,
        };
      }

      if (functionName === "razorpay-verify") {
        return {
          data: {
            success: true,
            pages_added: 1000,
            plan_id: "per_page_pack_basic",
          },
          error: null,
        };
      }

      throw new Error(`Unexpected function: ${functionName}`);
    });

    Object.defineProperty(window, "Razorpay", {
      configurable: true,
      writable: true,
      value: vi.fn(function (this: unknown, options: Record<string, unknown>) {
        razorpayOptions = options;
        return checkoutMock;
      }),
    });
  });

  it("creates a Razorpay order, opens checkout, and verifies payment", async () => {
    const user = userEvent.setup();

    render(<PricingPage />);

    const choosePlanButton = await screen.findAllByRole("button", { name: "Choose Plan" });
    await user.click(choosePlanButton[0]);

    await waitFor(() => {
      expect(pricingMocks.invokeMock).toHaveBeenCalledWith(
        "razorpay-order",
        expect.objectContaining({
          body: expect.objectContaining({
            planId: "per_page_pack_basic",
          }),
          headers: expect.objectContaining({
            Authorization: "Bearer access-token",
          }),
        }),
      );
    });

    expect(checkoutMock.open).toHaveBeenCalledTimes(1);
    expect(razorpayOptions).toEqual(
      expect.objectContaining({
        key: "rzp_test_123",
        order_id: "order_123",
        name: "Banklefy",
      }),
    );

    await act(async () => {
      await (razorpayOptions?.handler as ((response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => Promise<void> | void))?.({
        razorpay_order_id: "order_123",
        razorpay_payment_id: "pay_123",
        razorpay_signature: "sig_123",
      });
    });

    await waitFor(() => {
      expect(pricingMocks.invokeMock).toHaveBeenCalledWith(
        "razorpay-verify",
        expect.objectContaining({
          body: expect.objectContaining({
            razorpay_order_id: "order_123",
            razorpay_payment_id: "pay_123",
            razorpay_signature: "sig_123",
          }),
        }),
      );
    });

    expect(sessionStorage.getItem("banklefy:last-plan-purchase")).toContain("per_page_pack_basic");
    expect(pricingMocks.toastSuccessMock).toHaveBeenCalledWith(
      "Plan activated: Basic Pack",
      expect.objectContaining({
        description: expect.stringContaining("pages added to your account"),
      }),
    );
  });
});
