import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UploadDemoUploadCard } from "./UploadDemoUploadCard";

const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  count === 1 ? singular : plural;

const createFile = (name: string) => new File(["file"], name, { type: "application/pdf" });

describe("UploadDemoUploadCard", () => {
  it("routes file selection, upload clicks, and file management actions", async () => {
    const user = userEvent.setup();
    const onUploadClick = vi.fn();
    const onFileSelect = vi.fn();
    const onRemoveFile = vi.fn();
    const onClearAll = vi.fn();

    const { container } = render(
      <UploadDemoUploadCard
        selectedFiles={[createFile("statement-a.pdf"), createFile("statement-b.pdf")]}
        limitReached={false}
        uploading={false}
        converting={false}
        fileInputRef={{ current: null }}
        onUploadClick={onUploadClick}
        onFileSelect={onFileSelect}
        onRemoveFile={onRemoveFile}
        onClearAll={onClearAll}
        uploadPrepActive={true}
        uploadPrepProgress={42}
        uploadPrepLabel="Reading document..."
        uploadPrepFileName="statement-a.pdf"
        pluralize={pluralize}
      />,
    );

    expect(screen.getByText("2 files selected")).toBeInTheDocument();
    expect(screen.getAllByText("statement-a.pdf")).toHaveLength(2);
    expect(screen.getByText("statement-b.pdf")).toBeInTheDocument();
    expect(screen.getByText("Preparing...")).toBeInTheDocument();
    expect(screen.getByText("Reading document...")).toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [createFile("uploaded.pdf")] },
    });
    expect(onFileSelect).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Add Files" }));
    expect(onUploadClick).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Remove statement-a.pdf" }));
    expect(onRemoveFile).toHaveBeenCalledWith(0);

    await user.click(screen.getByRole("button", { name: "Clear All" }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("disables upload controls when the limit is reached", () => {
    render(
      <UploadDemoUploadCard
        selectedFiles={[]}
        limitReached={true}
        uploading={false}
        converting={false}
        fileInputRef={{ current: null }}
        onUploadClick={vi.fn()}
        onFileSelect={vi.fn()}
        onRemoveFile={vi.fn()}
        onClearAll={vi.fn()}
        uploadPrepActive={false}
        uploadPrepProgress={0}
        uploadPrepLabel="Reading document..."
        uploadPrepFileName={null}
        pluralize={pluralize}
      />,
    );

    const uploadButton = screen.getByRole("button", { name: "Limit Reached" });
    expect(uploadButton).toBeDisabled();
    expect(screen.getByText("Daily limit reached")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /daily limit reached/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
