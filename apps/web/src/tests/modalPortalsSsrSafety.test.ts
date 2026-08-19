import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommandPalette } from "../components/CommandPalette";
import { SberbankTerminalPaymentModal } from "../components/finance/SberbankTerminalPaymentModal";
import { InventoryConfirmDialog } from "../components/inventory/InventoryConfirmDialog";
import { EndoCanalLogModal } from "../components/odontogram/EndoCanalLogModal";
import { CephalometricAnalysisModal } from "../components/orthodontics/CephalometricAnalysisModal";
import { WaitlistDrawer } from "../components/schedule/WaitlistDrawer";
import { WaitlistQuickFillModal } from "../components/schedule/WaitlistQuickFillModal";
import { CryptoProSigner } from "../components/visit/CryptoProSigner";
import { AppLogicProvider } from "../contexts/AppLogicContext";

// biome-ignore lint/suspicious/noExplicitAny: mock AppLogic value for isolated unit testing
const mockAppLogicValue: any = {
	dashboard: {
		clinicSettings: {
			name: "Стоматология DENTE",
			staff: [{ id: "doc-1", fullName: "Д-р Ковалев", role: "doctor" }],
		},
		patients: [{ id: "p-1", fullName: "Сергей Иванов", phone: "+79001234567" }],
	},
	auth: {
		denteClinicalReadHeaders: () => ({}),
		denteClinicalMutationHeaders: () => ({}),
	},
	patientId: "p-1",
};

describe("Modal Portals & SSR Safety Hardening", () => {
	it("CephalometricAnalysisModal renders SSR-safe static markup when open", () => {
		const html = renderToStaticMarkup(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "p-test-1",
				patientName: "Тестовый Пациент",
			}),
		);
		assert.ok(html.includes("data-testid=\"cephalometric-analysis-modal\""));
		assert.ok(html.includes("Тестовый Пациент"));
	});

	it("WaitlistQuickFillModal renders SSR-safe static markup inside AppLogicProvider", () => {
		const child = createElement(WaitlistQuickFillModal, {
			isOpen: true,
			onClose: () => {},
		});
		const html = renderToStaticMarkup(
			createElement(AppLogicProvider, { value: mockAppLogicValue, children: child }),
		);
		assert.ok(html.includes("Лист ожидания"));
	});

	it("SberbankTerminalPaymentModal renders SSR-safe static markup inside AppLogicProvider", () => {
		const child = createElement(SberbankTerminalPaymentModal, {
			isOpen: true,
			patientId: "p-test-1",
			amountInRubles: 5000,
			onClose: () => {},
			onSuccess: () => {},
		});
		const html = renderToStaticMarkup(
			createElement(AppLogicProvider, { value: mockAppLogicValue, children: child }),
		);
		assert.ok(html.includes("Оплата через терминал Сбербанка"));
	});

	it("InventoryConfirmDialog renders SSR-safe static markup", () => {
		const html = renderToStaticMarkup(
			createElement(InventoryConfirmDialog, {
				title: "Удаление материала",
				message: "Вы уверены, что хотите списать материал со склада?",
				confirmLabel: "Удалить безвозвратно",
				onConfirm: () => {},
				onCancel: () => {},
			}),
		);
		assert.ok(html.includes("Удаление материала"));
		assert.ok(html.includes("Удалить безвозвратно"));
	});

	it("CommandPalette renders nothing when closed", () => {
		const htmlClosed = renderToStaticMarkup(
			createElement(CommandPalette, {
				patients: [],
				onSelectPatient: () => {},
				onNavigate: () => {},
			}),
		);
		assert.equal(htmlClosed, "");
	});

	it("EndoCanalLogModal renders SSR-safe static markup when open", () => {
		const html = renderToStaticMarkup(
			createElement(EndoCanalLogModal, {
				isOpen: true,
				toothNumber: 16,
				patientId: "pat-123",
				onClose: () => {},
			}),
		);
		assert.ok(html.includes("data-testid=\"endo-canal-log-modal\""));
		assert.ok(html.includes("16"));
	});

	it("WaitlistDrawer renders SSR-safe static markup inside AppLogicProvider", () => {
		const child = createElement(WaitlistDrawer, {
			isOpen: true,
			onClose: () => {},
			updateNewAppointmentDraft: () => {},
			focusNewAppointmentEditor: () => {},
		});
		const html = renderToStaticMarkup(
			createElement(AppLogicProvider, { value: mockAppLogicValue, children: child }),
		);
		assert.ok(html.includes("data-testid=\"waitlist-drawer\""));
	});

	it("CryptoProSigner renders SSR-safe static button", () => {
		const html = renderToStaticMarkup(
			createElement(CryptoProSigner, {
				diaryHash: "hash123",
				isLocked: false,
				lockedAt: null,
				ensureDraftSaved: async () => null,
				onLock: async () => {},
			}),
		);
		assert.ok(html.includes("Подписать и закрыть"));
	});
});
