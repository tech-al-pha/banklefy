import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UploadDemoPasswordErrorCard } from "./UploadDemoPasswordErrorCard";

const createFile = (name: string, size = 1048576) =>
  new File([new Uint8Array(size)], name, { type: "application/pdf", lastModified: 1 });

describe("UploadDemoPasswordErrorCard", () => {
  it("renders a clear incorrect-password card", () => {
    render(
      <UploadDemoPasswordErrorCard
        selectedFile={createFile("locked-statement.pdf")}
        selectedFiles={[]}
        passwordError={true}
        limitReached={false}
        uploading={false}
        converting={false}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Incorrect password");
    expect(screen.getByRole("alert")).toHaveTextContent("locked-statement.pdf");
    expect(screen.getByText(/the password entered/i)).toBeInTheDocument();
  });

  it("renders nothing when password error is not active", () => {
    const { container } = render(
      <UploadDemoPasswordErrorCard
        selectedFile={createFile("locked-statement.pdf")}
        selectedFiles={[]}
        passwordError={false}
        limitReached={false}
        uploading={false}
        converting={false}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
