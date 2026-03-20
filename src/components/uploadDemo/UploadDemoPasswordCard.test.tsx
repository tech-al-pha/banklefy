import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { UploadDemoPasswordCard } from "./UploadDemoPasswordCard";

const createFile = (name: string, size = 1048576) =>
  new File([new Uint8Array(size)], name, { type: "application/pdf", lastModified: 1 });

describe("UploadDemoPasswordCard", () => {
  it("renders nothing when password entry is not needed", () => {
    const { container } = render(
      <UploadDemoPasswordCard
        selectedFile={null}
        selectedFiles={[]}
        showPasswordInput={false}
        limitReached={false}
        pdfPassword=""
        showPassword={false}
        passwordError={false}
        uploading={false}
        converting={false}
        onPasswordChange={vi.fn()}
        onUnlock={vi.fn()}
        onTogglePassword={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("lets the user reveal the password and unlock the protected file", async () => {
    const user = userEvent.setup();
    const onUnlock = vi.fn();

    const Harness = () => {
      const [password, setPassword] = useState("");
      const [showPassword, setShowPassword] = useState(false);

      return (
        <UploadDemoPasswordCard
          selectedFile={createFile("locked-statement.pdf")}
          selectedFiles={[]}
          showPasswordInput={true}
          limitReached={false}
          pdfPassword={password}
          showPassword={showPassword}
          passwordError={true}
          uploading={false}
          converting={false}
          onPasswordChange={setPassword}
          onUnlock={onUnlock}
          onTogglePassword={() => setShowPassword((current) => !current)}
        />
      );
    };

    render(<Harness />);

    expect(screen.getByText("locked-statement.pdf")).toBeInTheDocument();
    expect(screen.getByText("1.00 MB - Password required")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Incorrect password. Please try again.");

    const passwordInput = screen.getByLabelText("PDF password");
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.type(passwordInput, "secret");
    expect(passwordInput).toHaveValue("secret");

    await user.keyboard("{Enter}");
    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlock" })).toBeEnabled();
  });
});
