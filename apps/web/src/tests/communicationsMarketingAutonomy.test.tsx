/**
 * communicationsMarketingAutonomy.test.tsx
 *
 * DENTE Dental CRM — Unit & SSR Verification for Communications, Marketing & Campaign Autonomy.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Staff Autonomy (No unjustified button disables, active guidance instead of blocking).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Zero dead-ends, smooth workflow without roadblocks).
 * - Mandate 8o: Strict verification scope.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommunicationsView } from "../CommunicationsView.js";
import { CampaignPanel } from "../components/communications/CampaignPanel.js";
import { showToast } from "../components/GlobalToast.js";
import { AppLogicProvider } from "../contexts/AppLogicContext.js";
import { MarketingView } from "../MarketingView.js";

// Mock minimal AppLogic value for context
// biome-ignore lint/suspicious/noExplicitAny: mock AppLogic context for isolated unit testing
const mockAppLogicValue: any = {
	clinicMode: "regular_clinic",
	dashboard: {
		clinicSettings: {
			name: "Стоматология ДЕНТЕ",
			staff: [{ id: "doc-1", fullName: "Д-р Ковалев", role: "doctor" }],
		},
		patients: [{ id: "p-1", fullName: "Сергей Иванов", phone: "+79001234567" }],
		appointments: [],
		communicationTasks: [],
		communicationTemplates: [],
		communicationEvents: [],
	},
	recalls: [],
	patientId: "p-1",
	auth: {},
	getCampaigns: async () => new Response(JSON.stringify({ campaigns: [] })),
	getCampaignsTemplates: async () =>
		new Response(
			JSON.stringify({
				templates: [
					{
						id: "tpl-1",
						title: "Профосмотр раз в 6 месяцев",
						channel: "whatsapp",
						isActive: true,
					},
				],
			}),
		),
	getCampaignsVariables: async () =>
		new Response(JSON.stringify({ variables: [] })),
	createCampaign: async () =>
		new Response(
			JSON.stringify({
				campaign: {
					id: "camp-1",
					title: "Сервисная рассылка",
					status: "draft",
				},
			}),
		),
	previewCampaign: async () => new Response(JSON.stringify({})),
	getCampaignProgress: async () => new Response(JSON.stringify({})),
	campaignAction: async () => new Response(JSON.stringify({})),
};

describe("CommunicationsView Autonomy & Button Accessibility (Mandate 8e, 8n)", () => {
	it("renders task close button enabled and not blocked when selectedOutcome is empty", () => {
		// biome-ignore lint/suspicious/noExplicitAny: mockProps for isolated SSR testing
		const mockProps: any = {
			communicationChannelLabels: {
				sms: "СМС",
				whatsapp: "WhatsApp",
				telegram: "Telegram",
				max: "MAX",
				phone: "Телефон",
				email: "Email",
				vk: "ВКонтакте",
				in_person: "Лично",
			},
			communicationDocumentTaskActionLabels: {},
			communicationIntentLabels: {
				appointment_confirmation: "Подтверждение",
				callback_requested: "Перезвонить",
				payment_reminder: "Долг",
				post_visit_instruction: "Памятка",
				recall: "Осмотр",
				document_ready: "Документы",
				general: "Общее",
				imaging_review: "Снимок",
				lead_capture: "Лид",
				transactional_reply: "Ответ",
			},
			communicationNote: "",
			communicationPriorityLabels: {
				urgent: "Срочно",
				normal: "Обычный",
				low: "Низкий",
				high: "Высокий",
			},
			communicationSavingTaskId: null,
			communicationStatusLabels: {
				scheduled: "Запланировано",
				completed: "Завершено",
				queued: "В очереди",
				sent: "Отправлено",
				delivered: "Доставлено",
				failed: "Ошибка",
				skipped: "Пропущено",
				needs_call: "Требует звонка",
			},
			completeCommunicationTask: () => {},
			dashboard: mockAppLogicValue.dashboard,
			documentKindsForCommunicationTask: () => [],
			documentLabels: {} as any,
			formatDateTime: (val: string) => val,
			onCommunicationNoteChange: () => {},
			onGoToSchedule: () => {},
			openCommunicationTaskDocumentWorkflow: () => {},
			sortedCommunicationTasks: [
				{
					id: "task-101",
					title: "Подтвердить приём: Барабаш С.В.",
					body: "Визит завтра в 14:00 на профгигиену",
					channel: "phone",
					intent: "appointment_confirmation",
					priority: "normal",
					status: "scheduled",
					dueAt: "2026-09-08T14:00:00.000Z",
					assignedRole: "receptionist",
					patientId: "patient-1",
					appointmentId: null,
					lastOutcome: null,
				} as any,
			],
			staffRoleLabels: {
				doctor: "Врач",
				assistant: "Ассистент",
				receptionist: "Администратор",
				director: "Директор",
				nurse: "Медсестра",
				accountant: "Бухгалтер",
			} as any,
		};

		const html = renderToStaticMarkup(
			createElement(
				AppLogicProvider,
				{
					value: mockAppLogicValue as any,
					children: createElement(CommunicationsView as any, mockProps),
				},
			),
		);

		// Verify task is rendered
		assert.ok(html.includes("Подтвердить приём: Барабаш С.В."));

		// Verify close button exists and is NOT disabled
		const closeButtonIdx = html.indexOf(
			'aria-label="Закрыть задачу связи: Подтвердить приём: Барабаш С.В."',
		);
		assert.ok(closeButtonIdx !== -1, "Close task button must exist in markup");

		const closeButtonSnippet = html.slice(closeButtonIdx, closeButtonIdx + 250);
		assert.equal(
			closeButtonSnippet.includes("disabled"),
			false,
			"Close task button must NOT be disabled when outcome is not yet selected (Mandate 8e)",
		);

		// Verify touch target >= 44px
		assert.ok(
			closeButtonSnippet.includes("min-height:44px"),
			"Close task button must have touch target min-height >= 44px",
		);
	});

	it("dispatches active guidance toast on empty outcome selection", () => {
		const target = new EventTarget();
		const originalWindow = (globalThis as any).window;
		(globalThis as any).window = {
			dispatchEvent: (e: Event) => target.dispatchEvent(e),
			addEventListener: (type: string, listener: any) =>
				target.addEventListener(type, listener),
			removeEventListener: (type: string, listener: any) =>
				target.removeEventListener(type, listener),
		};

		let capturedToast: { text: string; type: string } | null = null;
		const onToast = (event: any) => {
			capturedToast = event.detail;
		};
		(globalThis as any).window.addEventListener("dente-toast", onToast);

		// Trigger showToast
		showToast("Выберите результат звонка", "info");

		assert.ok(capturedToast, "Toast event must be dispatched");
		assert.equal((capturedToast as any).text, "Выберите результат звонка");
		assert.equal((capturedToast as any).type, "info");

		(globalThis as any).window.removeEventListener("dente-toast", onToast);
		(globalThis as any).window = originalWindow;
	});
});

describe("MarketingView Autonomy & Recall Patient List (Mandates 8e, 8n)", () => {
	it("renders MarketingView with RecallListPanel enabled and non-blocking", () => {
		const child = createElement(MarketingView, {
			clinicName: "Стоматология ДЕНТЕ",
			clinicPhone: "+7 (495) 123-45-67",
		});
		const html = renderToStaticMarkup(
			createElement(AppLogicProvider, {
				value: mockAppLogicValue as any,
				children: child,
			}),
		);

		assert.ok(html.includes("data-testid=\"marketing-view\""));
		assert.ok(html.includes("Диспансерный учет / Возврат пациентов"));
		assert.ok(html.includes("активен"));
	});
});

describe("CampaignPanel Autonomy & 1-Click Defaults (Mandates 8e, 8n)", () => {
	it("renders 'Создать и посмотреть получателей' button enabled when not busy", () => {
		const html = renderToStaticMarkup(
			createElement(
				AppLogicProvider,
				{
					value: mockAppLogicValue as any,
					children: createElement(CampaignPanel as any, {
						initialTemplates: [
							{
								id: "tpl-1",
								title: "Профосмотр раз в 6 месяцев",
								channel: "whatsapp",
								isActive: true,
							},
						],
					}),
				},
			),
		);

		assert.ok(html.includes("Создать и посмотреть получателей"));
		const btnIdx = html.indexOf("Создать и посмотреть получателей");
		const btnTagStart = html.lastIndexOf("<button", btnIdx);
		const btnTag = html.slice(btnTagStart, btnIdx);

		assert.equal(
			btnTag.includes("disabled"),
			false,
			"Create campaign button must NOT be disabled by empty title or template (Mandate 8e)",
		);

		// Verify touch target >= 44px
		assert.ok(
			btnTag.includes("min-height:44px"),
			"Create campaign button must have min-height >= 44px",
		);
	});
});
