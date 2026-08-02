import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ClearButton } from "@/components/tools/tool-controls";

describe("ClearButton", () => {
  it("invokes the clear callback", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<ClearButton onClear={onClear} />);
    await user.click(screen.getByRole("button", { name: "ล้างข้อมูล" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
