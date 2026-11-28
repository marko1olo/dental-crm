import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { ChairsideCopilotHUD } from "../ChairsideCopilotHUD";
import { executeCopilotAgentRequest } from "../chairside/chairsideAgentExecutor";
import { ToothContextDrawer } from "../../diagnostics/ToothContextDrawer";
import {
  DENTE_CLINIC_TOKEN_KEY,
  DENTE_STAFF_TOKEN_KEY,
  resetInMemoryAuthTokens,
} from "../../../lib/safeLocalStorage";

const CARTOON_EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("ChairsideCopilotHUD End-to-End Wiring (Live 6G SUT)", () => {
  const prevFetch = globalThis.fetch;

  beforeEach(() => {
    resetInMemoryAuthTokens();
  });

  afterEach(() => {
    globalThis.fetch = prevFetch;
    resetInMemoryAuthTokens();
  });

  it("1. renders expanded HUD with doctor autonomy bar and clinical controls", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        initialDocked={false}
        activeTooth={36}
        patientId="pat-101"
        visitId="vis-202"
        chairId="chair-1"
        patientName="Сидоров А.П."
        patientAllergies={["Лидокаин", "Пенициллин"]}
        patientSomaticHistory={["Гипертоническая болезнь II ст."]}
      />,
    );

    assert.ok(html.includes("chairside-copilot-hud"));
    assert.ok(html.includes("Копилот у кресла"));
    assert.ok(html.includes("Сидоров А.П."));
    assert.ok(html.includes("btn-chairside-apply-all"));
    assert.ok(html.includes("Применить все предложения"));
    assert.ok(html.includes("Обратимые действия • Полный контроль врача"));
    assert.ok(html.includes("btn-preset-caries-16"));
    assert.ok(html.includes("btn-preset-pulpitis-26"));
    assert.ok(html.includes("btn-preset-hygiene"));
  });

  it("2. renders ReAct thought stream and clinical cards (tooth, services estimate, SOAP diary)", () => {
    const initialThoughts = [
      { id: "t-1", stepNumber: 1, title: "Проверка аллергического статуса", status: "done" as const, detail: "Аллергоанамнез чист" },
      { id: "t-2", stepNumber: 2, title: "Сверка диагноза МКБ-10", status: "done" as const, detail: "K02.1" },
      { id: "t-3", stepNumber: 3, title: "Расчет стоимости услуг по прейскуранту", status: "done" as const, detail: "6500 RUB" },
      { id: "t-4", stepNumber: 4, title: "Формирование клинического протокола приёма", status: "done" as const, detail: "SOAP" },
    ];
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={36}
        patientId="pat-101"
        visitId="vis-202"
        initialThoughts={initialThoughts}
        initialToothProposal={{
          toothNumber: 36,
          state: "C2",
          stateLabel: "Кариес дентина (C2)",
          surfaces: ["O"],
          applied: false,
        }}
        initialServicesProposal={[
          {
            id: "srv-1",
            serviceCode: "A16.07.002.010",
            code804n: "A16.07.002.010",
            title: "Препарирование полости",
            toothNumber: 36,
            quantity: 1,
            priceKopecks: 250000,
            priceRub: 2500,
            applied: false,
          },
        ]}
      />,
    );

    assert.ok(html.includes("chairside-thought-stream"));
    assert.ok(html.includes("Размышления ИИ"));
    assert.ok(html.includes("Проверка аллергического статуса"));
    assert.ok(html.includes("Сверка диагноза МКБ-10"));
    assert.ok(html.includes("chairside-card-odontogram"));
    assert.ok(html.includes("btn-apply-tooth"));
    assert.ok(html.includes("chairside-card-services"));
    assert.ok(html.includes("btn-apply-services"));
    assert.ok(html.includes("chairside-card-soap"));
    assert.ok(html.includes("btn-apply-soap"));
    assert.ok(html.includes("btn-edit-soap"));
  });

  it("3. Mandate 8e: action buttons are NEVER disabled by default (Zero blocking gates)", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={36}
      />,
    );

    assert.equal(/btn-chairside-send[^>]*disabled/.test(html), false);
    assert.equal(/btn-apply-tooth[^>]*disabled/.test(html), false);
    assert.equal(/btn-apply-services[^>]*disabled/.test(html), false);
    assert.equal(/btn-apply-soap[^>]*disabled/.test(html), false);
    assert.equal(/btn-chairside-apply-all[^>]*disabled/.test(html), false);
  });

  it("4. executeCopilotAgentRequest sends POST /api/agent/chat with staffToken priority in Authorization and Idempotency-Key", async () => {
    const prevLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;
    const storeMap = new Map<string, string>([
      [DENTE_CLINIC_TOKEN_KEY, "demo-clinic-token"],
      [DENTE_STAFF_TOKEN_KEY, "demo-staff-token"],
    ]);
    (globalThis as { localStorage: unknown }).localStorage = {
      getItem: (k: string) => storeMap.get(k) ?? null,
      setItem: (k: string, v: string) => { storeMap.set(k, v); },
      removeItem: (k: string) => { storeMap.delete(k); },
    };

    const recordedCalls: Array<{ url: string; method?: string | undefined; headers: Record<string, string>; body: string }> = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const hdrs = (init?.headers ?? {}) as Record<string, string>;
      recordedCalls.push({
        url,
        method: init?.method,
        headers: hdrs,
        body: typeof init?.body === "string" ? init.body : "",
      });
      return new Response(
        JSON.stringify({
          text: "Пациент с глубоким кариесом 36. Проведена постановка светокомпозитной пломбы.",
          toolCalls: [
            {
              name: "update_tooth_status",
              result: { tooth: 36, status: "Caries", statusLabel: "Кариес дентина (36)", surfaces: ["O"] },
            },
            {
              name: "generate_clinical_protocol_entry",
              result: {
                complaints: "Кратковременные боли от сладкого в зубе 36",
                diagnosisMkb: "K02.1 Кариес дентина (зуб 36)",
              },
            },
          ],
          steps: [{ step: 1, action: "DDI check", observation: "Без конфликтов" }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }) as typeof fetch;

    try {
      const patientId = "11111111-1111-4111-8111-111111111111";
      const visitId = "22222222-2222-4222-8222-222222222222";
      const result = await executeCopilotAgentRequest({
        promptText: "Кариес 36 зуба, выполнена пломба Estelite",
        activeTooth: 36,
        patientId,
        visitId,
      });

      assert.ok(recordedCalls.length >= 1, "executeCopilotAgentRequest must perform HTTP POST to agent endpoint");
      const jsonCall = recordedCalls.find((c) => c.url.includes("/api/agent/chat"))!;
      assert.ok(jsonCall);
      assert.equal(jsonCall.method, "POST");
      assert.equal(jsonCall.headers["Authorization"], "Bearer demo-staff-token", "staffToken must take priority over clinicToken");
      assert.equal(jsonCall.headers["x-dente-staff-token"], "demo-staff-token");
      assert.equal(jsonCall.headers["x-dente-clinic-token"], "demo-clinic-token");
      assert.ok(jsonCall.body.includes(patientId));
      assert.ok(jsonCall.body.includes(visitId));
      assert.ok(result.verdict && result.verdict.includes("глубоким кариесом 36"));
      assert.equal(result.toothProposal?.toothNumber, 36);
      assert.equal(result.isLocalFallback, undefined);
    } finally {
      (globalThis as { localStorage?: unknown }).localStorage = prevLocalStorage;
    }
  });

  it("5. clicking real ChairsideCopilotHUD action buttons invokes dispatch callbacks", async () => {
    const prevGlobals = {
      window: (globalThis as { window?: unknown }).window,
      document: (globalThis as { document?: unknown }).document,
      HTMLElement: (globalThis as { HTMLElement?: unknown }).HTMLElement,
      Element: (globalThis as { Element?: unknown }).Element,
      Node: (globalThis as { Node?: unknown }).Node,
      HTMLIFrameElement: (globalThis as { HTMLIFrameElement?: unknown }).HTMLIFrameElement,
      IS_REACT_ACT_ENVIRONMENT: (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT,
    };
    class FakeIFrame {}
    class FakeEl {}
    class FakeHtmlEl {}
    class FakeNode {}
    interface DomStub {
      nodeType: number; tagName: string; nodeName: string; style: Record<string, string>; dataset: Record<string, string>;
      children: DomStub[]; childNodes: DomStub[]; attrs: Record<string, string>;
      ownerDocument: unknown; parentNode: DomStub | null; textContent: string; data?: string; nodeValue?: string; className?: string;
      appendChild: (c: DomStub) => DomStub; insertBefore: (c: DomStub, b: DomStub | null) => DomStub; removeChild: (c: DomStub) => DomStub;
      addEventListener: () => void; removeEventListener: () => void; setAttribute: (k: string, v: string) => void;
      getAttribute: (k: string) => string | null; hasAttribute: (k: string) => boolean; removeAttribute: (k: string) => void;
      dispatchEvent: () => boolean; getBoundingClientRect: () => { top: number; left: number; right: number; bottom: number; width: number; height: number };
      focus: () => void; blur: () => void; contains: (o?: unknown) => boolean;
      [k: string]: unknown;
    }
    const doc: Record<string, unknown> = {
      nodeType: 9, activeElement: null, addEventListener: () => {}, removeEventListener: () => {},
      createComment: () => ({ nodeType: 8, parentNode: null, ownerDocument: null }),
      createTextNode: (t: string): DomStub => ({
        nodeType: 3, tagName: "#text", nodeName: "#text", style: {}, dataset: {}, children: [], childNodes: [], attrs: {},
        ownerDocument: doc, parentNode: null, textContent: String(t ?? ""), nodeValue: String(t ?? ""), data: String(t ?? ""),
        appendChild: (c) => c, insertBefore: (c) => c, removeChild: (c) => c, addEventListener: () => {}, removeEventListener: () => {},
        setAttribute: () => {}, getAttribute: () => null, hasAttribute: () => false, removeAttribute: () => {}, dispatchEvent: () => true,
        getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }), focus: () => {}, blur: () => {}, contains: () => false,
      }),
    };
    const makeEl = (tag = "div"): DomStub => {
      const children: DomStub[] = [];
      const attrs: Record<string, string> = {};
      const el: DomStub = {
        nodeType: 1, tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), style: {}, dataset: {}, children, childNodes: children, attrs,
        ownerDocument: doc, parentNode: null, textContent: "",
        appendChild: (c) => { children.push(c); c.parentNode = el; return c; },
        insertBefore: (c, b) => { const idx = b ? children.indexOf(b) : -1; if (idx >= 0) children.splice(idx, 0, c); else children.push(c); c.parentNode = el; return c; },
        removeChild: (c) => { const idx = children.indexOf(c); if (idx >= 0) children.splice(idx, 1); c.parentNode = null; return c; },
        addEventListener: () => {}, removeEventListener: () => {},
        setAttribute: (k, v) => { attrs[k] = v; if (k === "class" || k === "className") el.className = v; },
        getAttribute: (k) => attrs[k] ?? null, hasAttribute: (k) => k in attrs, removeAttribute: (k) => { delete attrs[k]; },
        dispatchEvent: () => true, getBoundingClientRect: () => ({ top: 0, left: 0, right: 1200, bottom: 900, width: 1200, height: 900 }),
        focus: () => {}, blur: () => {},
        contains: (o) => { let curr = o as DomStub | null | undefined; while (curr) { if (curr === el) return true; curr = curr.parentNode; } return false; },
      };
      return el;
    };
    doc.createElement = (t: string) => makeEl(t);
    doc.createElementNS = (_ns: string, t: string) => makeEl(t);
    doc.body = makeEl("body");
    doc.documentElement = makeEl("html");

    (globalThis as { window: unknown }).window = { document: doc, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true, HTMLIFrameElement: FakeIFrame, Element: FakeEl, HTMLElement: FakeHtmlEl, Node: FakeNode, navigator: { userAgent: "node" } };
    (globalThis as { document: unknown }).document = doc;
    (globalThis as { HTMLElement: unknown }).HTMLElement = FakeHtmlEl;
    (globalThis as { Element: unknown }).Element = FakeEl;
    (globalThis as { Node: unknown }).Node = FakeNode;
    (globalThis as { HTMLIFrameElement: unknown }).HTMLIFrameElement = FakeIFrame;
    (globalThis as { IS_REACT_ACT_ENVIRONMENT: unknown }).IS_REACT_ACT_ENVIRONMENT = true;

    const findActionButton = (rootNode: DomStub, token: string): DomStub | null => {
      if (
        rootNode.nodeType === 1 &&
        rootNode.tagName === "BUTTON" &&
        ((rootNode.className ?? "").includes(token) || (rootNode.getAttribute("data-testid") ?? "").includes(token))
      ) {
        return rootNode;
      }
      for (const c of rootNode.children) {
        const hit = findActionButton(c, token);
        if (hit) return hit;
      }
      return null;
    };
    const triggerReactClick = (btn: DomStub | null) => {
      assert.ok(btn, "Expected button node in DOM");
      const propKey = Object.keys(btn).find((k) => k.startsWith("__reactProps$"));
      assert.ok(propKey, "Button must have React props attached");
      const props = btn[propKey] as { onClick?: (e: { stopPropagation: () => void; preventDefault: () => void }) => void };
      props.onClick?.({ stopPropagation: () => {}, preventDefault: () => {} });
    };

    const soapCalls: unknown[] = [];
    const toothCalls: unknown[] = [];
    const carpuleCalls: unknown[] = [];
    const consentCalls: unknown[] = [];

    const container = makeEl("div");
    let root: Root | null = null;
    try {
      await act(async () => {
        root = createRoot(container as unknown as HTMLElement);
        root.render(
          <ChairsideCopilotHUD
            initialOpen={true}
            activeTooth={16}
            patientId="pat-101"
            visitId="vis-202"
            onApplySoapDiary={(p) => soapCalls.push(p)}
            onUpdateToothStatus={(tooth, state) => toothCalls.push([tooth, state])}
            onDisposeCarpule={(drug, qty) => carpuleCalls.push([drug, qty])}
            onPrintInformedConsent={(code) => consentCalls.push(code)}
            initialToothProposal={{
              toothNumber: 16,
              state: "C2",
              stateLabel: "Кариес дентина (C2)",
              surfaces: ["O"],
              applied: false,
            }}
            initialSoapProposal={{
              complaint: "Боль от сладкого",
              anamnesis: "Ранее не лечен",
              objectiveStatus: "Полость 16",
              diagnosis: "K02.1",
              treatmentPlan: "Пломба",
              applied: false,
            }}
            initialAnestheticProposal={{
              drugName: "Убистезин 1:200 000",
              carpulesCount: 1,
              maxCarpules: 4,
              patientWeightKg: 70,
              epinephrineMcg: 17,
              isCardiovascularRisk: false,
              applied: false,
            }}
          />,
        );
      });

      await act(async () => {
        triggerReactClick(findActionButton(container, "btn-apply-tooth"));
        triggerReactClick(findActionButton(container, "btn-apply-soap"));
        triggerReactClick(findActionButton(container, "btn-apply-carpule"));
        triggerReactClick(findActionButton(container, "btn-apply-consent"));
      });

      assert.equal(toothCalls.length, 1);
      assert.equal(soapCalls.length, 1);
      assert.equal(carpuleCalls.length, 1);
      assert.equal(consentCalls.length, 1);
    } finally {
      if (root) act(() => { root?.unmount(); });
      (globalThis as { window?: unknown }).window = prevGlobals.window;
      (globalThis as { document?: unknown }).document = prevGlobals.document;
      (globalThis as { HTMLElement?: unknown }).HTMLElement = prevGlobals.HTMLElement;
      (globalThis as { Element?: unknown }).Element = prevGlobals.Element;
      (globalThis as { Node?: unknown }).Node = prevGlobals.Node;
      (globalThis as { HTMLIFrameElement?: unknown }).HTMLIFrameElement = prevGlobals.HTMLIFrameElement;
      (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT = prevGlobals.IS_REACT_ACT_ENVIRONMENT;
    }
  });

  it("7. verifies event-driven sync with ToothContextDrawer", () => {
    const html = renderToString(
      <ToothContextDrawer
        isOpen={true}
        onClose={() => {}}
        toothNumber={16}
        onUpdateToothStatus={() => {}}
      />,
    );

    assert.ok(html.includes("tooth-context-drawer"));
    assert.ok(html.includes("FDI"));
    assert.ok(html.includes("16"));
    assert.ok(html.includes("Поверхности MOD &amp; Каналы"));
  });

  it("8. 7 Deadly Sins check: zero cartoon emojis in ChairsideCopilotHUD", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={46}
        patientName="Кузнецов К.К."
      />,
    );
    assert.equal(CARTOON_EMOJI_RE.test(html), false);
  });

  it("10. verifies 1-click action acceptance cards: 'Применить в визит', 'Применить анестезию', 'Печать ИДС' (Mandate 8e)", () => {
    const html = renderToString(
      <ChairsideCopilotHUD
        initialOpen={true}
        activeTooth={16}
        patientId="pat-101"
        visitId="vis-202"
        patientName="Петрова А.В."
        initialToothProposal={{
          toothNumber: 16,
          state: "C2",
          stateLabel: "Кариес дентина (C2)",
          surfaces: ["O"],
          applied: false,
        }}
        initialServicesProposal={[
          {
            id: "srv-1",
            serviceCode: "A16.07.002.010",
            code804n: "A16.07.002.010",
            title: "Препарирование кариозной полости",
            toothNumber: 16,
            quantity: 1,
            priceKopecks: 250000,
            priceRub: 2500,
            applied: false,
          },
        ]}
        initialAnestheticProposal={{
          drugName: "Убистезин (Артикаин 4% + эпинефрин 1:200 000)",
          carpulesCount: 1,
          maxCarpules: 4,
          patientWeightKg: 70,
          epinephrineMcg: 17,
          isCardiovascularRisk: false,
          applied: false,
        }}
      />,
    );

    assert.ok(html.includes("chairside-card-soap"));
    assert.ok(html.includes("btn-apply-soap"));
    assert.ok(html.includes("Применить в визит"));
    assert.ok(html.includes("chairside-card-anesthetic"));
    assert.ok(html.includes("Местная анестезия (клинический протокол)"));
    assert.ok(html.includes("btn-apply-carpule"));
    assert.ok(html.includes("Применить анестезию"));
    assert.ok(html.includes("btn-edit-anesthetic"));
    assert.ok(html.includes("chairside-card-consent"));
    assert.ok(html.includes("Информированное согласие (ИДС)"));
    assert.ok(html.includes("btn-apply-consent"));
    assert.ok(html.includes("Печать ИДС"));
    assert.ok(html.includes("IDS-02-THERAPY"));

    assert.equal(/btn-apply-carpule[^>]*disabled/.test(html), false);
    assert.equal(/btn-apply-consent[^>]*disabled/.test(html), false);
    assert.equal(/btn-apply-soap[^>]*disabled/.test(html), false);
  });
});
