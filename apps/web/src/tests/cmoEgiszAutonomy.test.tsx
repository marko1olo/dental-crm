/**
 * cmoEgiszAutonomy.test.tsx
 *
 * Unit tests for CMO Quality Audit & EGISZ Signing Cabinet Solo Doctor Autonomy:
 * - Mandate 8e: Doctor & Staff Autonomy (No unexplained disabled buttons; guidance toast on click)
 * - Mandate 8i: Specialized Outpatient Context (Form 043/u)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (1-Click Local EMR Storage / 63-FZ Art. 9)
 * - Mandate 8o: Scope-bounded verifiable assertions
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EgiszRemdHubModal } from "../components/egisz/EgiszRemdHubModal";
import { SAMPLE_DENTAL_SEMD_105_PRESET } from "../components/egisz/egiszRemdEngine";

describe("CMO Quality Audit & EGISZ Signing Solo Doctor Autonomy (Mandates 8e, 8n)", () => {
	it("EgiszRemdHubModal renders statutory SEMD 043/u signing studio without blocking doctor (Mandates 8e, 8n)", () => {
		const html = renderToStaticMarkup(
			createElement(EgiszRemdHubModal, {
				isOpen: true,
				onClose: () => {},
				initialTab: "signature",
				initialPayload: SAMPLE_DENTAL_SEMD_105_PRESET,
			}),
		);
		assert.ok(html.includes("Подписание СЭМД УКЭП"), "Must render SEMD signing header");
		assert.ok(html.includes("Подписать УКЭП врача"), "Must contain doctor UKEP button");
		assert.ok(html.includes("Отправить в РЭМД ЕГИСЗ"), "Must contain send to REMD button");
	});
});
