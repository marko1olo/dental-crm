/**
 * chairsideCopilotAgentExecution.test.tsx
 *
 * Unit tests for Chairside AI Copilot agent execution and canonical tooth state mapping:
 * - Mandate 8c: Universal 3-tier architecture.
 * - Mandate 8e: Doctor & Staff Autonomy.
 * - Mandate 8z: Zero mock penicillin allergy / honest execution payload.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapToCanonicalToothState } from "../ChairsideCopilotHUD";
import { executeCopilotAgentRequest } from "../chairside/chairsideAgentExecutor";

const expect = (actual: any) => ({
  toBe: (expected: any) => {
    assert.strictEqual(actual, expected);
  },
  toContain: (expected: string) => {
    assert.ok(
      typeof actual === "string" && actual.includes(expected),
      `Expected string to contain ${JSON.stringify(expected)}`,
    );
  },
});

describe("Chairside Copilot Agent Execution and Canonical State Mapping", () => {
  it("1. Canonical tooth state mapping: converts clinical shortcodes to canonical ToothState", () => {
    expect(mapToCanonicalToothState("C2")).toBe("Caries");
    expect(mapToCanonicalToothState("C1")).toBe("Caries");
    expect(mapToCanonicalToothState("C3")).toBe("Caries");
    expect(mapToCanonicalToothState("P")).toBe("Pulpitis");
    expect(mapToCanonicalToothState("Pt")).toBe("Periodontitis");
    expect(mapToCanonicalToothState("CR")).toBe("Crown");
    expect(mapToCanonicalToothState("K")).toBe("Crown");
    expect(mapToCanonicalToothState("R")).toBe("Root");
    expect(mapToCanonicalToothState("IMPL")).toBe("Implant");
    expect(mapToCanonicalToothState("X")).toBe("Missing");
    expect(mapToCanonicalToothState("NORM")).toBe("Healthy");
  });

  it("2. executeCopilotAgentRequest sends clean patient data without fake penicillin allergy and parses 200 OK data", async () => {
    let capturedBody: any = null;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("/api/agent/chat") || String(url).includes("/api/v1/copilot/agent/execute")) {
        capturedBody = JSON.parse(String(init?.body || "{}"));
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            ok: true,
            data: {
              verdict: "Рекомендовано лечение кариеса зуба 16",
              thoughts: [{ id: "step-1", stepNumber: 1, title: "Проверка", status: "done" }],
              toothProposal: {
                toothNumber: 16,
                state: "C2",
                stateLabel: "Кариес дентина (C2)",
                surfaces: ["O"],
              },
              servicesProposal: [
                {
                  id: "srv-1",
                  serviceCode: "A16.07.002.010",
                  code804n: "A16.07.002.010",
                  title: "Препарирование кариозной полости",
                  toothNumber: 16,
                  quantity: 1,
                  priceRub: 2500,
                },
              ],
              soapProposal: {
                complaint: "Боль от сладкого",
                anamnesis: "Не лечен",
                objectiveStatus: "Кариозная полость",
                diagnosis: "K02.1 Кариес дентина",
                treatmentPlan: "Пломбирование",
                recommendations: "Осмотр через 6 мес.",
              },
              safetyAlert: null,
            },
          }),
        } as unknown as Response;
      }
      return originalFetch(url, init);
    }) as typeof fetch;

    try {
      const res = await executeCopilotAgentRequest({
        promptText: "кариес 16 зуба",
        activeTooth: 16,
        patientId: "pat-real-123",
        // patientAllergies are NOT provided! Must default to [] (no fake penicillin!)
      });

      // Assertions on captured request body
      assert.strictEqual(capturedBody.patientId, "pat-real-123");
      assert.strictEqual(capturedBody.allergies, undefined, "Fake penicillin allergy must NOT be present!");
      assert.strictEqual(capturedBody.toothNumber, 16);

      // Assertions on parsed response
      assert.strictEqual(res.verdict, "Рекомендовано лечение кариеса зуба 16");
      assert.ok(res.toothProposal, "Tooth proposal must be parsed");
      assert.strictEqual(res.toothProposal?.toothNumber, 16);
      assert.strictEqual(res.toothProposal?.state, "C2");
      assert.ok(Array.isArray(res.servicesProposal), "Services proposal must be parsed");
      assert.strictEqual(res.servicesProposal?.[0]?.serviceCode, "A16.07.002.010");
      assert.ok(res.soapProposal, "SOAP proposal must be parsed");
      assert.strictEqual(res.soapProposal?.diagnosis, "K02.1 Кариес дентина");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
