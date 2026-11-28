import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientSafetyBanner } from "../tabs/generalInfo/PatientSafetyBanner.js";
import {
	createHealthySomaticNormProfile,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	evaluatePatientSafetyFlags,
	isSomaticProfilePhysiologicalNorm,
	type PatientClinicalSafetyProfile,
} from "../safetyMath.js";

interface MiniNode {
	nodeType: number;
	tagName: string;
	nodeName: string;
	style: Record<string, string>;
	children: MiniNode[];
	childNodes: MiniNode[];
	attrs: Record<string, string>;
	listeners: Record<string, Array<(evt: unknown) => void>>;
	ownerDocument: unknown;
	parentNode: MiniNode | null;
	textContent: string;
	appendChild: (c: MiniNode) => MiniNode;
	insertBefore: (c: MiniNode, b: MiniNode | null) => MiniNode;
	removeChild: (c: MiniNode) => MiniNode;
	addEventListener: (type: string, fn: (evt: unknown) => void) => void;
	removeEventListener: (type: string, fn: (evt: unknown) => void) => void;
	setAttribute: (k: string, v: string) => void;
	getAttribute: (k: string) => string | null;
	removeAttribute: (k: string) => void;
	dispatchEvent: (evt: unknown) => boolean;
}

function createMiniDom() {
	const makeEl = (tag: string, doc: unknown): MiniNode => {
		const node: MiniNode = {
			nodeType: 1,
			tagName: tag.toUpperCase(),
			nodeName: tag.toUpperCase(),
			style: {},
			children: [],
			childNodes: [],
			attrs: {},
			listeners: {},
			ownerDocument: doc,
			parentNode: null,
			textContent: "",
			appendChild(c) {
				c.parentNode = node;
				node.children.push(c);
				node.childNodes.push(c);
				return c;
			},
			insertBefore(c, b) {
				c.parentNode = node;
				const idx = b ? node.childNodes.indexOf(b) : -1;
				if (idx >= 0) {
					node.children.splice(idx, 0, c);
					node.childNodes.splice(idx, 0, c);
				} else {
					node.children.push(c);
					node.childNodes.push(c);
				}
				return c;
			},
			removeChild(c) {
				node.children = node.children.filter((x) => x !== c);
				node.childNodes = node.childNodes.filter((x) => x !== c);
				c.parentNode = null;
				return c;
			},
			addEventListener(type, fn) {
				if (!node.listeners[type]) node.listeners[type] = [];
				node.listeners[type].push(fn);
			},
			removeEventListener(type, fn) {
				if (node.listeners[type]) {
					node.listeners[type] = node.listeners[type].filter((x) => x !== fn);
				}
			},
			setAttribute(k, v) {
				node.attrs[k] = String(v);
			},
			getAttribute(k) {
				return node.attrs[k] ?? null;
			},
			removeAttribute(k) {
				delete node.attrs[k];
			},
			dispatchEvent(evt: unknown) {
				const e = evt as { type: string; bubbles?: boolean; target?: unknown };
				e.target = node;
				for (const fn of node.listeners[e.type] ?? []) fn(e);
				if (e.bubbles && node.parentNode) node.parentNode.dispatchEvent(e);
				return true;
			},
		};
		return node;
	};
	const doc = {
		createElement: (tag: string) => makeEl(tag, doc),
		createElementNS: (_ns: string, tag: string) => makeEl(tag, doc),
		createTextNode: (t: string): MiniNode => ({
			...makeEl("#text", doc),
			nodeType: 3,
			textContent: t,
		}),
		createComment: (t: string): MiniNode => ({
			...makeEl("#comment", doc),
			nodeType: 8,
			textContent: t,
		}),
	};
	return { doc, container: makeEl("div", doc) };
}

function findByTestId(root: MiniNode, id: string): MiniNode | null {
	if (root.attrs["data-testid"] === id) return root;
	for (const c of root.children) {
		const hit = findByTestId(c, id);
		if (hit) return hit;
	}
	return null;
}

describe("Somatic Anamnesis Physiological Norm (Mandates 8e, 8k, 8n — 6G Live SUT)", () => {
	it("3.1. guarantees createHealthySomaticNormProfile produces 100% clean profile", () => {
		const norm = createHealthySomaticNormProfile();
		assert.strictEqual(norm.hasLidocaineAllergy, false);
		assert.strictEqual(norm.hasArticaineAllergy, false);
		assert.strictEqual(norm.takesAnticoagulants, false);
		assert.strictEqual(norm.hasPacemakerExs, false);
		assert.ok(norm.customChronicNotes?.includes("Соматически здоров"));
		assert.strictEqual(isSomaticProfilePhysiologicalNorm(norm), true);
	});

	it("3.2. guarantees evaluatePatientSafetyFlags gives zero active stop flags on norm profile", () => {
		const norm = createHealthySomaticNormProfile();
		const evalResult = evaluatePatientSafetyFlags(norm);
		assert.strictEqual(evalResult.hasCriticalStopFlags, false);
		assert.strictEqual(evalResult.totalAlertCount, 0);
	});

	it("3.3. clicking btn-somatic-healthy-norm invokes onApplySomaticNorm and updates profile to DEFAULT_SOMATIC_HEALTHY_NORM", async () => {
		const prevDoc = globalThis.document;
		const { doc, container } = createMiniDom();
		(globalThis as { document?: unknown }).document = doc;

		let normCalls = 0;
		let updatedProfile: PatientClinicalSafetyProfile | null = null;
		let root: Root | null = null;

		try {
			root = createRoot(container as unknown as HTMLElement);
			await act(async () => {
				root?.render(
					React.createElement(PatientSafetyBanner, {
						mode: "full",
						currentProfile: { pregnancyTrimester: "none", hasNsaidAllergy: true },
						patientId: "pat-norm-click",
						patientName: "Васильев Игорь Олегович",
						onToggleAllergy: () => {},
						onUpdateSafetyProfile: (profile) => {
							updatedProfile = profile;
						},
					}),
				);
			});

			const btn = findByTestId(container, "btn-somatic-healthy-norm");
			assert.ok(btn, "Norm button must be mounted in DOM");
			await act(async () => {
				btn.dispatchEvent({ type: "click", bubbles: true });
			});

			assert.ok(updatedProfile !== null, "Clicking Norm must emit updated healthy profile");
			const profileSnapshot = updatedProfile as PatientClinicalSafetyProfile;
			assert.strictEqual(profileSnapshot.hasNsaidAllergy, DEFAULT_SOMATIC_HEALTHY_NORM.hasNsaidAllergy);
			assert.strictEqual(isSomaticProfilePhysiologicalNorm(profileSnapshot), true);

			await act(async () => {
				root?.render(
					React.createElement(PatientSafetyBanner, {
						mode: "full",
						currentProfile: { pregnancyTrimester: "none", hasPenicillinAllergy: true },
						patientId: "pat-norm-click",
						onToggleAllergy: () => {},
						onApplySomaticNorm: () => {
							normCalls += 1;
						},
					}),
				);
			});
			const btn2 = findByTestId(container, "btn-somatic-healthy-norm");
			assert.ok(btn2);
			await act(async () => {
				btn2.dispatchEvent({ type: "click", bubbles: true });
			});
			assert.strictEqual(normCalls, 1);
		} finally {
			await act(async () => {
				root?.unmount();
			});
			(globalThis as { document?: unknown }).document = prevDoc;
		}
	});

	it("3.4. renders PatientSafetyBanner and displays somatic norm preset button without disabling actions", () => {
		const norm = createHealthySomaticNormProfile();
		const html = renderToStaticMarkup(
			React.createElement(PatientSafetyBanner, {
				mode: "full",
				currentProfile: norm,
				patientId: "pat-autonomy-001",
				patientName: "Васильев Игорь Олегович",
				onToggleAllergy: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="btn-somatic-healthy-norm"'));
		assert.ok(html.includes("Норма"));
		assert.strictEqual(html.includes('disabled=""'), false);
	});

	it("3.5. isSomaticProfilePhysiologicalNorm detects non-norm flags correctly", () => {
		const norm = createHealthySomaticNormProfile();
		assert.strictEqual(isSomaticProfilePhysiologicalNorm(norm), true);
		assert.strictEqual(
			isSomaticProfilePhysiologicalNorm({ ...norm, hasArticaineAllergy: true }),
			false,
		);
		assert.strictEqual(
			isSomaticProfilePhysiologicalNorm({ ...norm, takesAnticoagulants: true }),
			false,
		);
		assert.strictEqual(
			isSomaticProfilePhysiologicalNorm({ ...norm, hasPacemakerExs: true }),
			false,
		);
	});
});
