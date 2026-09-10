import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { OrthopedicsChairsidePanel } from "../OrthopedicsChairsidePanel.js";
import {
	ORTHOPEDIC_CANONICAL_PROTOCOLS,
	createDoctorClinicalOverride,
	applyOrthopedicProtocolToVisit,
} from "../orthopedicProtocols.js";
import {
	VisiographAnalyzer,
	type XrayScan,
} from "../../imaging/VisiographAnalyzer.js";
import { AppLogicProvider } from "../../../contexts/AppLogicContext.js";

const mockAppLogic = {
	auth: {
		denteClinicalReadHeaders: (extra?: Record<string, string>) => ({ ...extra }),
		denteClinicalMutationHeaders: (extra?: Record<string, string>) => ({ ...extra }),
	},
};

describe("Wave 41: Doctor Autonomy & Eradication of Locked Disabled States (Mandate 8e, 8i, 8k, 8n)", () => {
	describe("1. Orthopedics Chairside Panel Autonomy (Mandate 8e)", () => {
		it("OrthopedicsChairsidePanel protocol buttons are NOT disabled when isLocked=true", () => {
			const html = renderToString(
				<OrthopedicsChairsidePanel
					isLocked={true}
					activeToothFdi={16}
					selectedTeeth={[16]}
				/>,
			);

			for (const proto of ORTHOPEDIC_CANONICAL_PROTOCOLS) {
				const testId = `apply-ortho-protocol-${proto.id}`;
				assert.ok(
					html.includes(`data-testid="${testId}"`),
					`Кнопка протокола ${proto.id} должна присутствовать в разметке`,
				);

				const regex = new RegExp(
					`<button[^>]*data-testid="${testId}"[^>]*>`,
					"i",
				);
				const match = html.match(regex);
				assert.ok(match, `Тег кнопки ${testId} должен быть найден`);
				assert.ok(
					!match[0].includes("disabled"),
					`Кнопка ${testId} НЕ должна иметь атрибут disabled при isLocked=true (Мандат 8e)`,
				);
			}
		});

		it("Клинический оверрайд врача («Исправленному верить: дополнение ортопедического протокола») создает валидный аудит-объект", () => {
			const reason =
				"Исправленному верить: дополнение ортопедического протокола";
			const override = createDoctorClinicalOverride({
				reason,
				doctorName: "Д-р Ортопедов А. В.",
			});

			assert.equal(override.doctorClinicalOverride, true);
			assert.equal(override.mandate8e, true);
			assert.equal(override.doctorName, "Д-р Ортопедов А. В.");
			assert.equal(override.doctorOverrideReason, reason);
			assert.ok(override.timestampIso.length > 10);
			assert.ok(override.notice.includes("Мандат 8e"));
		});

		it("Внесение ортопедического протокола при блокировке визита генерирует события Form 043/у, сметы и счета без ошибок", () => {
			const proto = ORTHOPEDIC_CANONICAL_PROTOCOLS[0];
			assert.ok(proto);

			const dispatchedEvents: Array<{ type: string; detail: unknown }> = [];
			const originalWindow = globalThis.window;

			try {
				(globalThis as unknown as { window: unknown }).window = {
					dispatchEvent: (event: { type: string; detail: unknown }) => {
						dispatchedEvents.push({ type: event.type, detail: event.detail });
						return true;
					},
				};

				let addedServices: unknown = null;
				const result = applyOrthopedicProtocolToVisit({
					protocol: proto,
					options: {
						toothFdi: 16,
						material: "ZrO2 Multi-Layer",
						colorVita: "A2",
					},
					showNotification: false,
					copyToClipboard: false,
					onAddToInvoice: (services) => {
						addedServices = services;
					},
				});

				assert.ok(result.summary.includes("Зуб 16"));
				assert.ok(result.services.length > 0);
				assert.ok(addedServices !== null);

				const eventTypes = dispatchedEvents.map((e) => e.type);
				assert.ok(
					eventTypes.includes("dente-apply-soap-protocol"),
					"Событие внесения в 043/у должно быть отправлено",
				);
				assert.ok(
					eventTypes.includes("dente-add-services-to-invoice"),
					"Событие начисления услуг в счет должно быть отправлено",
				);
				assert.ok(
					eventTypes.includes("dente-estimate-stage-add"),
					"Событие добавления в Этап 3 плана лечения должно быть отправлено",
				);
			} finally {
				globalThis.window = originalWindow;
			}
		});
	});

	describe("2. Visiograph Analyzer Clinical Autonomy (Mandate 8e)", () => {
		it("Кнопка применения находок ИИ к зубной формуле НЕ заблокирована", () => {
			const mockScan: XrayScan = {
				id: "scan-test-41",
				patientId: "patient-test-41",
				status: "done",
				kind: "periapical",
				toothCode: "16",
				hasImage: true,
				capturedAt: new Date().toISOString(),
				createdAt: new Date().toISOString(),
				aiReport:
					"Контрольный прицельный снимок зуба 16: периапикальные ткани без патологических теней. Кариозных полостей не обнаружено.",
				aiToothStates: { "16": "watch" },
			};

			const html = renderToString(
				<AppLogicProvider value={mockAppLogic as any}>
					<VisiographAnalyzer initialScan={mockScan} toothCode="16" />
				</AppLogicProvider>,
			);

			assert.ok(
				html.includes('data-testid="btn-apply-findings-to-chart"'),
				"Кнопка применения находок ИИ к зубной формуле должна присутствовать в разметке",
			);

			const match = html.match(
				/<button[^>]*data-testid="btn-apply-findings-to-chart"[^>]*>/,
			);
			assert.ok(match, "Тег кнопки применения находок ИИ должен быть найден");
			assert.ok(
				!match[0].includes("disabled"),
				"Кнопка применения находок ИИ НЕ должна иметь атрибут disabled (Мандат 8e)",
			);
		});
	});
});
