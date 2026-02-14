import { describe, it, expect } from "vitest";
import {
  headerBlock,
  sectionBlock,
  fieldsBlock,
  dividerBlock,
  contextBlock,
  buttonBlock,
} from "./client";

describe("headerBlock", () => {
  it("creates header block with plain text and emoji", () => {
    expect(headerBlock("Hello World")).toEqual({
      type: "header",
      text: { type: "plain_text", text: "Hello World", emoji: true },
    });
  });
});

describe("sectionBlock", () => {
  it("creates section block with mrkdwn text", () => {
    expect(sectionBlock("*Bold* _italic_")).toEqual({
      type: "section",
      text: { type: "mrkdwn", text: "*Bold* _italic_" },
    });
  });
});

describe("fieldsBlock", () => {
  it("creates section block with multiple mrkdwn fields", () => {
    expect(fieldsBlock(["A", "B", "C"])).toEqual({
      type: "section",
      fields: [
        { type: "mrkdwn", text: "A" },
        { type: "mrkdwn", text: "B" },
        { type: "mrkdwn", text: "C" },
      ],
    });
  });

  it("handles empty fields array", () => {
    expect(fieldsBlock([])).toEqual({ type: "section", fields: [] });
  });
});

describe("dividerBlock", () => {
  it("creates divider block", () => {
    expect(dividerBlock()).toEqual({ type: "divider" });
  });
});

describe("contextBlock", () => {
  it("creates context block with mrkdwn element", () => {
    expect(contextBlock("Some context")).toEqual({
      type: "context",
      elements: [{ type: "mrkdwn", text: "Some context" }],
    });
  });
});

describe("buttonBlock", () => {
  it("creates actions block with button element", () => {
    expect(buttonBlock("Click", "https://example.com", "btn_1")).toEqual({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Click", emoji: true },
          url: "https://example.com",
          action_id: "btn_1",
        },
      ],
    });
  });
});
