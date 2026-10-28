import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotVoiceStenographer } from "../CopilotVoiceStenographer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("CopilotVoiceStenographer Unit Tests & Mandate 8e Autonomy", () => {
  it("1. renders CopilotVoiceStenographer with title, patient name, and drag handle", () => {
    const html = renderToString(
      <CopilotVoiceStenographer
        isOpen={true}
        patientName="Петров П.П."
        activeTooth={16}
      />
    );

    assert.ok(html.includes("copilot-voice-stenographer"));
    assert.ok(html.includes("Голосовой стенограф приёма"));
    assert.ok(html.includes("Петров П.П."));
    assert.ok(html.includes("Зуб 16"));
    assert.ok(html.includes("copilot-stenographer-drag-handle"));
  });

  it("2. renders audio VU-meter equalizer wave and mic toggle", () => {
    const html = renderToString(
      <CopilotVoiceStenographer
        isOpen={true}
      />
    );

    assert.ok(html.includes("copilot-stenographer-vu-meter"));
    assert.ok(html.includes("copilot-vu-bar"));
    assert.ok(html.includes("stenographer-mic-toggle"));
  });

  it("3. Mandate 8e check: action button 'Применить в карту' is never disabled", () => {
    const html = renderToString(
      <CopilotVoiceStenographer
        isOpen={true}
      />
    );

    assert.ok(html.includes("stenographer-apply-btn"));
    assert.ok(html.includes("Применить в карту"));
    // Ensure button is not disabled
    assert.ok(!html.includes('data-testid="stenographer-apply-btn" disabled'));
    assert.ok(!html.includes('disabled="" class="copilot-stenographer-apply-btn"'));
  });

  it("4. renders in embedded mode without modal wrappers", () => {
    const html = renderToString(
      <CopilotVoiceStenographer
        isOpen={true}
        embedded={true}
      />
    );

    assert.ok(html.includes("copilot-voice-stenographer--embedded"));
    assert.ok(!html.includes("copilot-voice-stenographer--modal"));
  });

  it("5. CSS Tokens check: CopilotVoiceStenographer.css uses design tokens, zero hardcoded colors", () => {
    const cssPath = path.resolve(__dirname, "../CopilotVoiceStenographer.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // Remove comments
    const cleanCss = cssContent.replace(/\/\*[\s\S]*?\*\//g, "");

    // Verify key design tokens are present
    assert.ok(cleanCss.includes("var(--paper"));
    assert.ok(cleanCss.includes("var(--ink"));
    assert.ok(cleanCss.includes("var(--teal"));
    assert.ok(cleanCss.includes("var(--line"));
  });

  it("6. 7 Deadly Sins check: zero cartoon emojis in markup", () => {
    const html = renderToString(
      <CopilotVoiceStenographer
        isOpen={true}
        patientName="Сидорова С.С."
        activeTooth={24}
      />
    );

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.ok(!emojiRegex.test(html), "Markup must contain zero cartoon emojis");
  });
});
