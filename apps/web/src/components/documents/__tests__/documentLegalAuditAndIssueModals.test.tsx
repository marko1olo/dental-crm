/**
 * apps/web/src/components/documents/__tests__/documentLegalAuditAndIssueModals.test.tsx
 *
 * RED TEAM INQUISITION: Patient Legal Documentation & Audit Facts Modals
 * Mandates 8d (Святость бланков / 0 эмодзи), 8e (Автономия врача / 0 disabled кнопок),
 * Apple HIG & DENTE Design System (createPortal, CSS tokens, touch targets >= 44x44px).
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { GeneratedDocument, Patient } from "@dental/shared";

import { DocumentAuditFactsModal } from "../tabs/DocumentAuditFactsModal.js";
import { DocumentIssueConfirmationModal } from "../tabs/DocumentIssueConfirmationModal.js";
import { CANONICAL_DOCUMENT_STATUS_LABELS } from "../documentAutonomy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cartoon emoji detector per Mandate 8d
const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

// Minimal DOM mock for React client render & createPortal
function setupMockDom() {
	const winListeners: Record<string, EventListener[]> = {};

	class FakeHTMLIFrameElement {}
	class FakeHTMLElement {}
	class FakeElement {}
	class FakeNode {}

	function createMockStyle(): any {
		const s: any = {
			setProperty(k: string, v: string) {
				s[k] = v;
			},
			removeProperty(k: string) {
				delete s[k];
			},
			getPropertyValue(k: string) {
				return s[k] || "";
			},
		};
		return s;
	}

	function createMockNode(tagName: string): any {
		const listeners: Record<string, EventListener[]> = {};
		const attrs: Record<string, string> = {};
		const children: any[] = [];
		const style = createMockStyle();

		const node: any = {
			nodeType: 1,
			tagName: tagName.toUpperCase(),
			nodeName: tagName.toUpperCase(),
			style,
			dataset: {},
			children,
			childNodes: children,
			attributes: [],
			ownerDocument: null,
			parentNode: null,
			textContent: "",
			disabled: false,
			value: "",
			className: "",
			appendChild(child: any) {
				child.parentNode = node;
				child.ownerDocument = node.ownerDocument;
				children.push(child);
				return child;
			},
			insertBefore(child: any, before: any) {
				child.parentNode = node;
				child.ownerDocument = node.ownerDocument;
				const idx = children.indexOf(before);
				if (idx >= 0) children.splice(idx, 0, child);
				else children.push(child);
				return child;
			},
			removeChild(child: any) {
				const idx = children.indexOf(child);
				if (idx >= 0) {
					children.splice(idx, 1);
					child.parentNode = null;
				}
				return child;
			},
			addEventListener(type: string, fn: EventListener) {
				listeners[type] = listeners[type] || [];
				listeners[type].push(fn);
			},
			removeEventListener(type: string, fn: EventListener) {
				if (listeners[type]) {
					listeners[type] = listeners[type].filter((l) => l !== fn);
				}
			},
			setAttribute(name: string, value: string) {
				attrs[name] = String(value);
				if (name === "class") node.className = String(value);
				if (name === "disabled") node.disabled = true;
				if (name.startsWith("data-")) {
					const prop = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
					node.dataset[prop] = String(value);
				}
			},
			getAttribute(name: string) {
				return attrs[name] ?? null;
			},
			hasAttribute(name: string) {
				return name in attrs;
			},
			removeAttribute(name: string) {
				delete attrs[name];
				if (name === "disabled") node.disabled = false;
			},
			dispatchEvent(ev: any) {
				const list = listeners[ev.type] || [];
				for (const fn of list) {
					fn.call(node, { ...ev, target: node, currentTarget: node });
				}
				if (ev.type === "click") {
					let curr = node;
					while (curr) {
						const reactPropKey = Object.keys(curr).find((k) =>
							k.startsWith("__reactProps$"),
						);
						if (reactPropKey) {
							const props = curr[reactPropKey];
							if (props && typeof props.onClick === "function") {
								props.onClick({
									type: "click",
									preventDefault: () => {},
									stopPropagation: () => {},
									target: node,
									currentTarget: curr,
								});
								break;
							}
						}
						curr = curr.parentNode;
					}
				}
				return true;
			},
			getBoundingClientRect() {
				return { top: 0, left: 0, right: 100, bottom: 44, width: 100, height: 44 };
			},
			focus() {},
			blur() {},
			contains(other: any) {
				let cur = other;
				while (cur) {
					if (cur === node) return true;
					cur = cur.parentNode;
				}
				return false;
			},
		};

		if (tagName.toUpperCase() === "SELECT") {
			node.multiple = false;
			Object.defineProperty(node, "options", {
				get() {
					return children.filter((c: any) => c.tagName === "OPTION");
				},
			});
		}
		if (tagName.toUpperCase() === "OPTION") {
			node.selected = false;
		}

		return node;
	}

	const doc: any = {
		nodeType: 9,
		createTextNode(text: string) {
			const tn: any = {
				nodeType: 3,
				_val: String(text ?? ""),
				get textContent() {
					return this._val;
				},
				set textContent(v: string) {
					this._val = String(v ?? "");
				},
				get nodeValue() {
					return this._val;
				},
				set nodeValue(v: string) {
					this._val = String(v ?? "");
				},
				get data() {
					return this._val;
				},
				set data(v: string) {
					this._val = String(v ?? "");
				},
				style: createMockStyle(),
				parentNode: null,
				ownerDocument: null,
			};
			return tn;
		},
		createComment() {
			return { nodeType: 8, parentNode: null, ownerDocument: null };
		},
		createElement(tagName: string) {
			const n = createMockNode(tagName);
			n.ownerDocument = doc;
			return n;
		},
		createElementNS(_ns: string, tagName: string) {
			const n = createMockNode(tagName);
			n.ownerDocument = doc;
			return n;
		},
		addEventListener(type: string, fn: EventListener) {
			winListeners[type] = winListeners[type] || [];
			winListeners[type].push(fn);
		},
		removeEventListener(type: string, fn: EventListener) {
			if (winListeners[type]) {
				winListeners[type] = winListeners[type].filter((l) => l !== fn);
			}
		},
		activeElement: null,
	};

	const body = createMockNode("body");
	body.ownerDocument = doc;
	doc.body = body;
	doc.documentElement = body;

	const win: any = {
		document: doc,
		addEventListener(type: string, fn: EventListener) {
			winListeners[type] = winListeners[type] || [];
			winListeners[type].push(fn);
		},
		removeEventListener(type: string, fn: EventListener) {
			if (winListeners[type]) {
				winListeners[type] = winListeners[type].filter((l) => l !== fn);
			}
		},
		dispatchEvent(ev: any) {
			const list = winListeners[ev.type] || [];
			for (const fn of list) fn.call(win, ev);
			return true;
		},
		HTMLIFrameElement: FakeHTMLIFrameElement,
		HTMLElement: FakeHTMLElement,
		Element: FakeElement,
		Node: FakeNode,
		getComputedStyle() {
			return {
				getPropertyValue: () => "",
			};
		},
		setTimeout: globalThis.setTimeout,
		clearTimeout: globalThis.clearTimeout,
	};
	doc.defaultView = win;

	(globalThis as any).window = win;
	(globalThis as any).document = doc;
	(globalThis as any).HTMLIFrameElement = FakeHTMLIFrameElement;
	(globalThis as any).HTMLElement = FakeHTMLElement;
	(globalThis as any).Element = FakeElement;
	(globalThis as any).Node = FakeNode;
	(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

	return { doc, win, body };
}

function findNodeByTestId(rootNode: any, testId: string): any {
	if (!rootNode) return null;
	if (rootNode.getAttribute && rootNode.getAttribute("data-testid") === testId) {
		return rootNode;
	}
	for (const child of rootNode.childNodes || rootNode.children || []) {
		const found = findNodeByTestId(child, testId);
		if (found) return found;
	}
	return null;
}

function collectAllText(node: any): string {
	if (!node) return "";
	let text = node.textContent || node._val || "";
	for (const child of node.childNodes || node.children || []) {
		text += " " + collectAllText(child);
	}
	return text;
}

describe("Document Legal Audit and Issue Modals (Red Team Inquisition)", () => {
	const auditModalPath = path.resolve(
		__dirname,
		"../tabs/DocumentAuditFactsModal.tsx",
	);
	const issueModalPath = path.resolve(
		__dirname,
		"../tabs/DocumentIssueConfirmationModal.tsx",
	);
	const patientDocsTabPath = path.resolve(
		__dirname,
		"../../patients/tabs/PatientDocumentsTab.tsx",
	);
	const patientCardPath = path.resolve(
		__dirname,
		"../../patients/PatientCard.tsx",
	);

	const auditFactsDir = path.resolve(__dirname, "../tabs/auditFacts");
	const auditFactsExtra = fs.existsSync(auditFactsDir)
		? fs.readdirSync(auditFactsDir).map((f) => fs.readFileSync(path.join(auditFactsDir, f), "utf8")).join("\n")
		: "";
	const auditModalSource = fs.readFileSync(auditModalPath, "utf8") + "\n" + auditFactsExtra;

	const issueDir = path.resolve(__dirname, "../tabs/issueConfirmation");
	const issueExtra = fs.existsSync(issueDir)
		? fs.readdirSync(issueDir).map((f) => fs.readFileSync(path.join(issueDir, f), "utf8")).join("\n")
		: "";
	const issueModalSource = fs.readFileSync(issueModalPath, "utf8") + "\n" + issueExtra;
	const patientDocsTabSource = fs.readFileSync(patientDocsTabPath, "utf8");
	const patientCardSource = fs.readFileSync(patientCardPath, "utf8");

	let dom: ReturnType<typeof setupMockDom>;

	beforeEach(() => {
		dom = setupMockDom();
	});

	it("1. DocumentAuditFactsModal statically obeys Constitution & Mandate 8d", () => {
		// Must use createPortal to document.body
		assert.ok(
			auditModalSource.includes("createPortal(modalContent, document.body)"),
			"DocumentAuditFactsModal must mount to document.body via createPortal",
		);

		// Must handle Escape key
		assert.ok(
			auditModalSource.includes('e.key === "Escape"'),
			"Must dismiss on Escape key",
		);

		// Must use CSS custom property tokens
		assert.ok(
			auditModalSource.includes("var(--paper"),
			"Must use var(--paper) token",
		);
		assert.ok(
			auditModalSource.includes("var(--ink"),
			"Must use var(--ink) token",
		);
		assert.ok(
			auditModalSource.includes("var(--line"),
			"Must use var(--line) token",
		);

		// Zero raw cartoon emojis
		assert.strictEqual(
			hasCartoonEmojis(auditModalSource),
			false,
			"DocumentAuditFactsModal must contain 0 cartoon emojis (Mandate 8d)",
		);

		// Must support SMS-OTP 63-FZ attestation and UKEP GOST seal
		assert.ok(
			auditModalSource.includes("signatureAttestation"),
			"Must inspect signatureAttestation",
		);
		assert.ok(
			auditModalSource.includes("63-ФЗ"),
			"Must reference 63-FZ for electronic digital signature",
		);
		assert.ok(
			auditModalSource.includes("УКЭП ГОСТ"),
			"Must reference UKEP GOST seal",
		);
	});

	it("2. DocumentIssueConfirmationModal statically obeys Mandates 8d and 8e", () => {
		// Must use createPortal to document.body
		assert.ok(
			issueModalSource.includes("createPortal(modalContent, document.body)"),
			"DocumentIssueConfirmationModal must mount to document.body via createPortal",
		);

		// Must handle Escape key
		assert.ok(
			issueModalSource.includes('e.key === "Escape"'),
			"Must dismiss on Escape key",
		);

		// Zero raw cartoon emojis
		assert.strictEqual(
			hasCartoonEmojis(issueModalSource),
			false,
			"DocumentIssueConfirmationModal must contain 0 cartoon emojis (Mandate 8d)",
		);

		// Zero disabled buttons on confirmation CTA (Mandate 8e)
		assert.ok(
			!issueModalSource.includes("disabled={!documentIssueAttestationReady}"),
			"Primary CTA must not be disabled by attestation readiness checklist (Mandate 8e)",
		);

		// Guided auto-fill in primary CTA
		assert.ok(
			issueModalSource.includes("setDocumentIssueIdentityChecked(true)"),
			"Primary CTA must auto-check missing steps and issue",
		);
	});

	it("3. PatientCard mounts PatientDocumentsTab under activeTab === 'documents'", () => {
		assert.ok(
			patientCardSource.includes("<PatientDocumentsTab"),
			"PatientCard must mount PatientDocumentsTab",
		);
		assert.ok(
			patientCardSource.includes('activeTab === "documents"'),
			"Must mount under activeTab === 'documents'",
		);
		assert.ok(
			!patientCardSource.includes("Печать выписки из амбулаторной карты</span>\n\t\t\t\t\t\t\t\t</button>\n\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t</div>"),
			"Must replace inline fallback placeholder with real clinical tab",
		);
	});

	it("4. PatientDocumentsTab integrates both legal modals and 1-click audit pipeline", () => {
		assert.ok(
			patientDocsTabSource.includes("<DocumentAuditFactsModal"),
			"PatientDocumentsTab must render DocumentAuditFactsModal",
		);
		assert.ok(
			patientDocsTabSource.includes("<DocumentIssueConfirmationModal"),
			"PatientDocumentsTab must render DocumentIssueConfirmationModal",
		);
		assert.ok(
			patientDocsTabSource.includes("loadDocumentAuditFacts(doc.id)"),
			"Must trigger loadDocumentAuditFacts on 1-click audit button",
		);
		assert.ok(
			patientDocsTabSource.includes("btn-patient-audit-doc-"),
			"Must expose test id for patient document audit button",
		);
		assert.ok(
			patientDocsTabSource.includes("printBlankMedicalContract"),
			"Must provide 1-click blank contract printing",
		);
		assert.ok(
			patientDocsTabSource.includes("printBlankMedicalConsent"),
			"Must provide 1-click blank consent printing",
		);
		assert.strictEqual(
			hasCartoonEmojis(patientDocsTabSource),
			false,
			"PatientDocumentsTab must contain 0 cartoon emojis",
		);
	});

	it("5. DocumentAuditFactsModal mounts via createPortal and displays complete legal facts", async () => {
		const facts = {
			documentId: "doc-uuid-12345",
			kind: "treatment_contract",
			status: "issued",
			createdAt: "2026-03-15T10:00:00.000Z",
			issuedAt: "2026-03-15T10:15:00.000Z",
			totalAmountRub: 45000,
			title: "Договор на оказание платных медицинских услуг № ДПМУ-2026-0042",
			patient: {
				id: "patient-123",
				fullName: "Смирнова Екатерина Павловна",
				phone: "+7 (916) 123-45-67",
			},
			visitId: "visit-uuid-777",
			treatmentPlanId: "plan-uuid-888",
			snapshotSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			signatureAttestation: {
				mode: "simple_sms_otp",
				signedAt: "2026-03-15T10:14:30.000Z",
				recipientFullName: "Смирнова Екатерина Павловна",
				recipientRole: "patient",
				staffFullName: "Д-р Воронов А.В.",
				staffRole: "doctor",
				signerFullName: "Смирнова Екатерина Павловна",
				signerPhone: "+7 (916) 123-45-67",
				otpCodeMasked: "••84",
				sha256Digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			},
			cryptoSignaturePkcs7: "MIIE...CERTIFICATE...DATA",
			doctorSignedAt: "2026-03-15T10:15:00.000Z",
		};

		const container = dom.doc.createElement("div");
		dom.body.appendChild(container);

		let closed = false;
		const root = createRoot(container);

		await act(async () => {
			root.render(
				<DocumentAuditFactsModal
					documentAuditFacts={facts}
					documentIssueSignatureModeLabels={{
						simple_sms_otp: "Простая ЭЦП (СМС код)",
					}}
					documentVoidReasonLabels={{}}
					loadDocumentAuditFacts={() => {}}
					setDocumentAuditFacts={() => {
						closed = true;
					}}
					openIssuedDocumentHtml={() => {}}
					downloadIssuedDocumentHtml={() => {}}
					downloadIssuedDocumentPdf={() => {}}
				/>,
			);
		});

		// Modal should be mounted inside dom.body via createPortal
		const modalDialog = findNodeByTestId(dom.body, "modal-document-audit-facts");
		assert.ok(modalDialog, "DocumentAuditFactsModal must mount into document.body via createPortal");

		const allText = collectAllText(modalDialog);
		assert.ok(allText.includes("Аудит юридической чистоты"), "Must contain audit title");
		assert.ok(allText.includes("63-ФЗ"), "Must state 63-FZ compliance");
		assert.ok(allText.includes("Смирнова Екатерина Павловна"), "Must state patient name");
		assert.ok(allText.includes("visit-uu"), "Must reference attached visit ID");
		assert.ok(allText.includes("plan-uui"), "Must reference attached treatment plan ID");
		assert.ok(allText.includes("ГОСТ"), "Must include UKEP GOST seal indicator");
		assert.ok(allText.includes("e3b0c44298"), "Must show SHA-256 integrity hash prefix");

		// Zero cartoon emojis in rendered output
		assert.strictEqual(
			hasCartoonEmojis(allText),
			false,
			"Rendered modal text must contain 0 cartoon emojis",
		);

		await act(async () => {
			root.unmount();
		});
	});

	it("6. DocumentIssueConfirmationModal mounts via createPortal and executes non-blocking CTA", async () => {
		const doc: GeneratedDocument = {
			id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
			organizationId: "b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
			patientId: "patient-123",
			visitId: null,
			kind: "tax_deduction_certificate",
			status: "draft",
			title: "Справка об оплате медицинских услуг для ФНС",
			totalAmountRub: 120000,
			issuedAt: null,
		};

		const container = dom.doc.createElement("div");
		dom.body.appendChild(container);

		let confirmedWithBypass = false;
		let identityChecked = false;
		let documentOpened = false;
		let recipientSigned = false;
		let clinicSigned = false;

		const root = createRoot(container);

		await act(async () => {
			root.render(
				<DocumentIssueConfirmationModal
					documentIssueConfirmation={doc}
					patients={[
						{
							id: "patient-123",
							organizationId: "org-1",
							fullName: "Ковалев Дмитрий Сергеевич",
							phone: "+7 (905) 555-44-33",
							status: "active",
							createdAt: "2026-01-01T00:00:00.000Z",
							updatedAt: "2026-01-01T00:00:00.000Z",
						} as Patient,
					]}
					patientName={(_, id) => (id === "patient-123" ? "Ковалев Дмитрий Сергеевич" : "")}
					money={(val) => `${val} ₽`}
					documentIssueSignatureMode="paper_handwritten"
					setDocumentIssueSignatureMode={() => {}}
					normalizedDocumentIssueSignatureMode={(val) => val}
					documentIssueSignatureModeLabels={{ paper_handwritten: "Бумажный оригинал с личной подписью" }}
					documentIssueSignedAt="2026-03-15T12:00:00.000Z"
					setDocumentIssueSignedAt={() => {}}
					documentIssueRecipientFullName="Ковалев Дмитрий Сергеевич"
					setDocumentIssueRecipientFullName={() => {}}
					documentIssueRecipientRole="patient"
					setDocumentIssueRecipientRole={() => {}}
					documentIssueStaffFullName="Д-р Воронов А.В."
					setDocumentIssueStaffFullName={() => {}}
					documentIssueStaffRole="doctor"
					setDocumentIssueStaffRole={() => {}}
					documentIssueNote=""
					setDocumentIssueNote={() => {}}
					activeDoctor={{ fullName: "Д-р Воронов А.В." }}
					documentIssueIdentityChecked={false}
					setDocumentIssueIdentityChecked={(val) => {
						identityChecked = val;
					}}
					documentIssueDocumentOpenedAndChecked={false}
					setDocumentIssueDocumentOpenedAndChecked={(val) => {
						documentOpened = val;
					}}
					documentIssueRecipientSigned={false}
					setDocumentIssueRecipientSigned={(val) => {
						recipientSigned = val;
					}}
					documentIssueClinicSigned={false}
					setDocumentIssueClinicSigned={(val) => {
						clinicSigned = val;
					}}
					documentIssueAttestationReady={false}
					documentIssueMissingSteps={["Личность не подтверждена"]}
					documentIssueMissingGuidanceId="guidance-1"
					documentIssueSaving={false}
					setDocumentIssueConfirmationId={() => {}}
					confirmDocumentIssue={(bypass) => {
						confirmedWithBypass = Boolean(bypass);
					}}
				/>,
			);
		});

		// Modal should mount into dom.body via createPortal
		const modalNode = findNodeByTestId(dom.body, "modal-document-issue-confirmation");
		assert.ok(modalNode, "DocumentIssueConfirmationModal must mount into document.body via createPortal");

		// Find Primary CTA
		const primaryBtn = findNodeByTestId(modalNode, "btn-confirm-issue-primary");
		assert.ok(primaryBtn, "Must render primary CTA button");
		assert.strictEqual(primaryBtn.disabled, false, "Primary CTA must NOT be disabled (Mandate 8e)");

		// Trigger click
		await act(async () => {
			primaryBtn.dispatchEvent({ type: "click" });
		});

		// Must auto-complete checklist items and confirm with bypass
		assert.strictEqual(identityChecked, true, "Must set identityChecked = true");
		assert.strictEqual(documentOpened, true, "Must set documentOpened = true");
		assert.strictEqual(recipientSigned, true, "Must set recipientSigned = true");
		assert.strictEqual(clinicSigned, true, "Must set clinicSigned = true");
		assert.strictEqual(confirmedWithBypass, true, "Must call confirmDocumentIssue(true)");

		await act(async () => {
			root.unmount();
		});
	});
});
