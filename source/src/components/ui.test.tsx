// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmptyState } from "./lp";
import { FindingsFilters } from "./FindingsFilters";
import { UploadPanel } from "./UploadPanel";
import { uploadErrorMessage } from "../lib/upload/messages";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function chooseFile(name = "mix.csv") {
  const input = screen.getByLabelText("Synthetic file") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(["synthetic"], name, { type: "text/csv" })] } });
  fireEvent.submit(input.closest("form")!);
}

describe("UploadPanel", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("renders masked values in the result table", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          scanId: "s1",
          safeName: "mix.csv",
          sizeBytes: 10,
          fileRisk: "Critical",
          findings: [
            { type: "payment_card", risk: "Critical", count: 1, maskedExample: "************1111" },
            { type: "email", risk: "Low", count: 2, maskedExample: "a***@example.test" },
          ],
        }),
      ),
    );
    render(<UploadPanel />);
    chooseFile();
    const table = await screen.findByRole("table", { name: "Findings in this file" });
    expect(within(table).getByText("************1111")).toBeInTheDocument();
    expect(within(table).getByText("a***@example.test")).toBeInTheDocument();
    expect(within(table).getByText("Payment card")).toBeInTheDocument();
    // Risk is shown as text, not colour alone.
    expect(within(table).getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("Result: mix.csv")).toBeInTheDocument();
  });

  it.each([
    ["EMPTY", 400],
    ["TOO_LARGE", 413],
    ["UNSUPPORTED_TYPE", 415],
    ["BINARY", 415],
    ["INVALID_UTF8", 415],
    ["SAVE_FAILED", 500],
  ])("maps %s to a calm, specific message", async (code, status) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: code }, { status })));
    render(<UploadPanel />);
    chooseFile();
    const alert = await screen.findByRole("alert");
    const expected = uploadErrorMessage(code);
    expect(within(alert).getByText(expected.title)).toBeInTheDocument();
    expect(within(alert).getByText(expected.body)).toBeInTheDocument();
    expect(alert.textContent).not.toContain(code);
  });

  it("shows a loading state while scanning", async () => {
    let resolve!: (r: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((r) => (resolve = r))));
    render(<UploadPanel />);
    chooseFile();
    expect(await screen.findByText("Scanning file…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scan file" })).toBeDisabled();
    resolve(Response.json({ error: "EMPTY" }, { status: 400 }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Scan file" })).toBeEnabled());
  });

  it("each error code has distinct copy", () => {
    const titles = ["EMPTY", "TOO_LARGE", "UNSUPPORTED_TYPE", "BINARY", "INVALID_UTF8", "SAVE_FAILED"].map(
      (c) => uploadErrorMessage(c).title,
    );
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("Findings empty state", () => {
  it("renders the message", () => {
    render(<EmptyState message="No findings match these filters. Change or clear the filters to see more results." />);
    expect(screen.getByText(/No findings match these filters/)).toBeInTheDocument();
  });
});

describe("FindingsFilters", () => {
  beforeEach(() => push.mockReset());

  it("selecting a type builds the correct query params", () => {
    render(<FindingsFilters filters={{ risk: "High" }} />);
    fireEvent.click(screen.getByRole("button", { name: /All types/ }));
    fireEvent.click(screen.getByRole("option", { name: "National Insurance number" }));
    expect(push).toHaveBeenCalledWith("/findings?type=uk_nino&risk=High");
  });

  it("selecting a risk builds the correct query params", () => {
    render(<FindingsFilters filters={{ type: "email" }} />);
    fireEvent.click(screen.getByRole("button", { name: /All risks/ }));
    fireEvent.click(screen.getByRole("option", { name: "Critical" }));
    expect(push).toHaveBeenCalledWith("/findings?type=email&risk=Critical");
  });

  it("clear filters returns to the unfiltered list", () => {
    render(<FindingsFilters filters={{ type: "email", risk: "Low" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(push).toHaveBeenCalledWith("/findings");
  });

  it("Escape closes the dropdown panel", () => {
    render(<FindingsFilters filters={{}} />);
    const trigger = screen.getByRole("button", { name: /All types/ });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(push).not.toHaveBeenCalled();
  });
});
