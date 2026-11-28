/**
 * visitSoapTemplatesAutonomy.test.tsx
 *
 * Wave 101 Rendered Runtime Verification Suite:
 * 1. Mandate 8d & Anti-Matryoshka Law: EmkAnesthesiaPresetChips & EmkEndoSection flattened into clean dividers.
 * 2. WCAG AAA Contrast Law: WhatsAppChatHeader & WhatsAppEmptyStatePresets light/dark contrast tokens.
 * 3. Mandate 8p: SettingsOperationsTabContent encapsulates legacy imports inside a collapsible <details> spoiler.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";
import { EmkAnesthesiaPresetChips } from "../emk/EmkAnesthesiaPresetChips";
import { EmkEndoSection } from "../emk/EmkEndoSection";
import { VisitEmkServicesBilling } from "../emkTab/VisitEmkServicesBilling";
import { WhatsAppChatHeader } from "../../chat/WhatsAppChatHeader";
import { WhatsAppEmptyStatePresets } from "../../chat/WhatsAppEmptyStatePresets";
import { SettingsOperationsTabContent } from "../../../views/settingsView/tabRenderers/SettingsOperationsTabContent";
import type { WorkspaceFeatureFlags } from "../../../hooks/useWorkspaceProfile";

test("VisitEmkTab sections: nested card matryoshka is eliminated per Anti-Matryoshka law", () => {
	const anesHtml = renderToStaticMarkup(
		React.createElement(EmkAnesthesiaPresetChips, {
			selectedDrugKey: "ultracain_ds",
			onApplyPreset: () => {},
			onNoAnesthesia: () => {},
			onAntishockEmergency: () => {},
		}),
	);

	assert.equal(
		anesHtml.includes("p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]"),
		false,
		"Anesthesia quick bar must NOT render nested card styling",
	);
	assert.ok(
		anesHtml.includes("border-t border-[var(--line)] bg-transparent"),
		"Anesthesia bar must use clean divider border-t border-[var(--line)]",
	);
	assert.ok(anesHtml.includes('data-testid="btn-anes-ultracain-ds"'), "Preserves Ultracain DS 1:200k preset");
	assert.ok(anesHtml.includes('data-testid="btn-anes-ultracain-ds-forte"'), "Preserves Ultracain DS Forte preset");
	assert.ok(anesHtml.includes('data-testid="btn-anes-scandonest-3"'), "Preserves Scandonest 3% preset");

	const endoHtml = renderToStaticMarkup(
		React.createElement(EmkEndoSection, {
			visitNoteForm: { diagnosis: "Пульпит 16" },
			updateVisitNoteField: () => {},
			activeTooth: 16,
		}),
	);
	assert.equal(
		endoHtml.includes('details class="group rounded-xl border border-[var(--teal,var(--line))]/30 bg-[var(--teal-surface)]'),
		false,
		"Endodontics details must NOT have nested card border/bg",
	);
	assert.ok(
		endoHtml.includes('data-testid="endo-canals-accordion"'),
		"Endodontics details must be flattened with clean divider",
	);

	const billingHtml = renderToStaticMarkup(
		React.createElement(
			React.Suspense,
			{ fallback: null },
			React.createElement(VisitEmkServicesBilling, {
				openVisitId: "visit-1",
				visitNoteForm: {},
				updateVisitNoteField: () => {},
				isLocked: false,
				effectiveActiveTooth: 16,
			}),
		),
	);
	assert.equal(
		billingHtml.includes('details class="group rounded-xl border border-indigo-500/25 bg-indigo-500/5'),
		false,
		"Price catalogue details must NOT have nested card styling",
	);
});

test("WhatsAppChatPanel: WCAG AAA Light/Dark contrast tokens are strictly applied in rendered UI", () => {
	const headerHtml = renderToStaticMarkup(
		React.createElement(WhatsAppChatHeader, {
			effectiveName: "Смирнова Елена",
			formattedPhone: "+7 999 000-00-00",
			effectivePhone: "+79990000000",
			initials: "СЕ",
			avatarColors: { bg: "bg-teal-500/15", text: "text-teal-700", border: "border-teal-500/30" },
			isPatient: true,
			selectedChannel: "whatsapp",
			isLoading: false,
			isSearchOpen: false,
			searchQuery: "",
			onToggleSearch: () => {},
			onSearchChange: () => {},
			onClearSearch: () => {},
			onRefresh: () => {},
			onCallPatient: () => {},
			onLaunchWhatsAppNative: () => {},
			upcomingAppointment: { formattedDate: "01.12.2026", formattedTime: "10:00", doctorName: "Врач А.А." },
			financialSummary: { hasDebt: true, formattedDebt: "3 500 ₽", hasInsurance: true },
		}),
	);

	assert.ok(headerHtml.includes("text-teal-700 dark:text-teal-300"), "Upcoming appointment must use high-contrast teal token");
	assert.ok(
		headerHtml.includes("text-rose-700 bg-rose-100 border border-rose-200 dark:text-rose-300 dark:bg-rose-950/60"),
		"Debt badge must support light theme with dark: variants",
	);
	assert.ok(
		headerHtml.includes("text-cyan-700 bg-cyan-100 border border-cyan-200 dark:text-cyan-300 dark:bg-cyan-950/60"),
		"DMS badge must support light theme with dark: variants",
	);

	const presetsHtml = renderToStaticMarkup(
		React.createElement(WhatsAppEmptyStatePresets, {
			effectiveName: "Смирнова Елена",
			quickTemplates: [
				{ id: "appt_reminder", title: "Напоминание", text: "Ждём вас завтра" },
				{ id: "surgery_memo", title: "Памятка", text: "После удаления" },
				{ id: "appt_confirm", title: "Подтверждение", text: "Подтвердите визит" },
			],
			onApplyTemplate: () => {},
		}),
	);

	assert.ok(
		presetsHtml.includes("hover:bg-teal-50 dark:hover:bg-teal-950/40 text-[var(--ink)] hover:text-teal-700 dark:hover:text-teal-300"),
		"Template chip 1 hover must have high contrast in Light/Dark mode",
	);
	assert.ok(
		presetsHtml.includes("hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[var(--ink)] hover:text-amber-700 dark:hover:text-amber-300"),
		"Template chip 2 hover must have high contrast in Light/Dark mode",
	);
	assert.ok(
		presetsHtml.includes("hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[var(--ink)] hover:text-emerald-700 dark:hover:text-emerald-300"),
		"Template chip 3 hover must have high contrast in Light/Dark mode",
	);
});

test("SettingsView: encapsulates legacy imports inside collapsible details spoiler", () => {
	const flags: WorkspaceFeatureFlags = {
		hasAssistants: true,
		hasMultipleChairs: true,
		hasDentalLab: true,
		hasInsuranceCoPay: true,
		hasInstallments: true,
		hasOrthodontics: true,
		hasGnathology: true,
		hasTasks: true,
		hasReclamations: true,
		workspacePreset: "full",
		onboardingCompleted: true,
		hasPediatricMode: true,
		isOmniRole: false,
		numberOfDoctors: 3,
		hasPayrollModule: true,
		hasMarketingModule: false,
		hasAnalyticsModule: false,
		hasCsoScanner: true,
		hasLeadsKanban: true,
		hasOmnichannel: true,
		hasInventoryModule: true,
		aiEnableTreatmentPlan: true,
		aiEnableRecommendations: true,
		aiEnableDocuments: true,
		hasEngineeringStatus: false,
		hasClinicalRules: false,
		hasReferralModule: false,
		hasBpmWorkflows: false,
	};

	const mockAppLogic = {
		activePatient: { id: "pt-1", fullName: "Тестов И.И." },
		dashboard: { patients: [], activeDoctor: { id: "doc-1", fullName: "Врач А.А." } },
		auth: { currentUser: { name: "Врач А.А." } },
	} as unknown as AppLogicContextType;

	const html = renderToStaticMarkup(
		React.createElement(
			AppLogicProvider,
			{ value: mockAppLogic },
			React.createElement(SettingsOperationsTabContent, {
				settingsTab: "imports",
				settingsProps: { organizationId: "org-1" },
				flags,
			}),
		),
	);

	assert.ok(
		html.includes('<details class="group rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] overflow-hidden">'),
		"SettingsImportsTab must be wrapped in a collapsible details spoiler",
	);
	assert.ok(
		html.includes("Расширенный режим: Индивидуальный импорт и ручные утилиты (legacy)"),
		"SettingsImportsTab summary must label the legacy developer mode",
	);
});
