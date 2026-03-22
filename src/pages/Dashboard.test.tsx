import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";
import Dashboard from "./Dashboard";

const dashboardMocks = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toastMock: vi.fn(),
  signOutMock: vi.fn(),
  fromMock: vi.fn(),
  storageFromMock: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: dashboardMocks.toastMock }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "user@example.com",
    },
    signOut: dashboardMocks.signOutMock,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: dashboardMocks.fromMock,
    storage: {
      from: dashboardMocks.storageFromMock,
    },
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => dashboardMocks.navigateMock,
  };
});

describe("Dashboard export flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: "conv-123",
              file_name: "Bank Statement.pdf",
              status: "completed",
              created_at: "2024-01-01T10:00:00.000Z",
              processing_total_ms: 1250,
            },
          ],
          error: null,
        }),
      }),
    });

    dashboardMocks.fromMock.mockImplementation((table: string) => {
      if (table === "conversions") {
        return { select: selectMock };
      }
      return {};
    });

    dashboardMocks.storageFromMock.mockReturnValue({
      download: vi.fn().mockResolvedValue({
        data: new Blob(["excel-bytes"], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        error: null,
      }),
    });
  });

  it("downloads the converted Excel file from the derived storage path", { timeout: 10000 }, async () => {
    const user = userEvent.setup();

    render(<Dashboard />);

    const downloadButton = await screen.findByRole("button", { name: /download excel/i });
    await user.click(downloadButton);

    const storageMock = dashboardMocks.storageFromMock.mock.results[0]?.value;
    expect(storageMock.download).toHaveBeenCalledWith("user-1/conv-123/result.xlsx");
    expect(dashboardMocks.navigateMock).not.toHaveBeenCalledWith("/auth");
  });
});
