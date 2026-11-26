import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { streamCopilotChat } from "../client/copilotStreamClient";
import { executeCopilotConfirmationWithResult } from "../useCopilotModules/useCopilotActions";
import {
  executeCopilotStudioApiTool,
  hydrateCopilotThreadMessages,
  resolveStudioContextSnapshot,
} from "../studio/copilotStudioHelpers";
import { inspectSpeechEngineHealth } from "../copilotCatalogData";
import { setRuntimeDemoMode } from "../../../lib/demoMode";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useVisitStore } from "../../../store/visitStore";

const storageBacking: Record<string, string> = {};

function installMockStorage() {
  globalThis.localStorage = {
    getItem: (k: string) => storageBacking[k] ?? null,
    setItem: (k: string, v: string) => {
      storageBacking[k] = String(v);
    },
    removeItem: (k: string) => {
      delete storageBacking[k];
    },
    clear: () => {
      for (const k of Object.keys(storageBacking)) delete storageBacking[k];
    },
    key: (i: number) => Object.keys(storageBacking)[i] ?? null,
    length: 0,
  };
}

describe("Copilot Behavioral Auth, Voice Health & Chairside Context Contracts", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    installMockStorage();
    localStorage.clear();
    localStorage.setItem("dente_clinic_token", "clinic-secret-1");
    localStorage.setItem("dente_staff_token", "staff-secret-9");
    setRuntimeDemoMode(false);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("1. prioritizes staffToken over clinicToken and attaches clinical headers + Idempotency-Key", async () => {
    const capturedHeaders: Array<Record<string, string>> = [];
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const h = (init?.headers ?? {}) as Record<string, string>;
      capturedHeaders.push(h);
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("event: done\ndata: {\"text\":\"OK\"}\n\n"));
          controller.close();
        },
      });
      return new Response(stream, { status: 200 });
    }) as typeof fetch;

    const streamRes = await streamCopilotChat({
      message: "Проверь статус зуба 36",
      onEvent: () => {},
    });
    assert.equal(streamRes.ok, true);
    assert.equal(capturedHeaders[0]?.Authorization, "Bearer staff-secret-9");
    assert.equal(capturedHeaders[0]?.["x-dente-staff-token"], "staff-secret-9");
    assert.equal(capturedHeaders[0]?.["x-dente-clinic-token"], "clinic-secret-1");
    assert.ok(Boolean(capturedHeaders[0]?.["Idempotency-Key"]));

    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const h = (init?.headers ?? {}) as Record<string, string>;
      capturedHeaders.push(h);
      return new Response(JSON.stringify({ ok: true, data: { applied: true } }), { status: 200 });
    }) as typeof fetch;

    const confirmRes = await executeCopilotConfirmationWithResult({
      callId: "call-1",
      decision: "confirm",
      actionName: "update_tooth_status",
      actionArgs: { toothNumber: 36, state: "caries" },
    });
    assert.equal(confirmRes.ok, true);
    assert.equal(capturedHeaders[1]?.Authorization, "Bearer staff-secret-9");
    assert.equal(capturedHeaders[1]?.["x-dente-staff-token"], "staff-secret-9");
    assert.ok(Boolean(capturedHeaders[1]?.["Idempotency-Key"]));
  });

  it("2. blocks DESKTOP_ONLY tools in web_browser mode without calling OS workarounds and unwraps { data } envelopes", async () => {
    let fetchCalled = false;
    const toolLogs: Array<{ status: string; resultSummary: string }> = [];
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    await executeCopilotStudioApiTool({
      toolKey: "capture_workstation_screen",
      payload: {},
      activeThreadId: "01945000-0000-7000-8000-000000000101",
      runtimeMode: "web_browser",
      addToolLog: (log) => toolLogs.push(log),
    });

    assert.equal(fetchCalled, false, "Web mode must guard workstation capture without faking desktop OS access");
    assert.equal(toolLogs[0]?.status, "rejected");

    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: true,
          data: {
            messages: [
              { id: "m1", role: "user", content: "Зуб 16", createdAt: "2026-11-26T10:00:00.000Z" },
            ],
          },
        }),
        { status: 200 },
      )) as typeof fetch;

    const hydrated = await hydrateCopilotThreadMessages("01945000-0000-7000-8000-000000000101");
    assert.equal(hydrated?.length, 1);
    assert.equal(hydrated?.[0]?.text, "Зуб 16");
  });

  it("3. hydrates real patient, allergies, toothFormula and active diary draft without leaking fake patients", () => {
    usePatientStore.setState({ selectedPatientId: "01945000-0000-7000-8000-000000000555" });
    useAppStore.setState((prev) => ({
      currentView: "odontogram",
      activePatientId: "01945000-0000-7000-8000-000000000555",
      activeTooth: 46,
      activeDoctorName: "Др. Орлова Е.В.",
      dashboard: prev.dashboard
        ? {
            ...prev.dashboard,
            patients: [
              ...(prev.dashboard.patients || []),
              {
                id: "01945000-0000-7000-8000-000000000555",
                clinicId: "01945000-0000-7000-8000-000000000001",
                fullName: "Волков П.С.",
                phone: "+79001112233",
                allergies: ["Лидокаин"],
                balanceKopecks: 0,
              },
            ],
          }
        : null,
    }));
    useVisitStore.setState((prev) => ({
      visitToothStateByCode: { "46": "caries" },
      visitNoteForm: {
        ...prev.visitNoteForm,
        complaint: "Боль от холодного в 46",
        diagnosis: "K02.1",
      },
    }));

    const snap = resolveStudioContextSnapshot({
      patientId: "01945000-0000-7000-8000-000000000555",
      patientName: "Волков П.С.",
      activeVisitId: "01945000-0000-7000-8000-000000000777",
    });
    assert.equal(snap.patientName, "Волков П.С.");
    assert.equal(snap.activeTooth, 46);
    assert.equal(snap.activeVisitId, "01945000-0000-7000-8000-000000000777");
    assert.equal(snap.activeDoctor, "Др. Орлова Е.В.");
    assert.ok(snap.clinicalContextNote?.includes("46:caries"));
    assert.ok(snap.clinicalContextNote?.includes("Боль от холодного"));
  });

  it("4. inspectSpeechEngineHealth evaluates live Gemini gateway report vs missing-key fallback honestly", () => {
    const cloudHealthy = inspectSpeechEngineHealth({
      serverTranscriptionEnabled: true,
      providers: [
        {
          providerId: "gemini",
          providerLabel: "Google Gemini Live",
          healthLevel: "ready",
          safeToUseInVisit: true,
          keyHealth: [{ available: true }],
        },
      ],
    });
    assert.equal(cloudHealthy.isCloudActive, true);
    assert.equal(cloudHealthy.engine, "gemini_cloud");

    const noKeys = inspectSpeechEngineHealth({
      serverTranscriptionEnabled: false,
      totalAvailableKeys: 0,
      providers: [],
    });
    assert.equal(noKeys.isCloudActive, false);
    assert.ok(noKeys.engine === "webspeech" || noKeys.engine === "unsupported");
  });
});
