/**
 * apps/web/src/components/settings/__tests__/settingsStaffFourCanonicalRolesAndAutonomy.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GranularRoleMatrixView, CANONICAL_ROLE_PROFILES } from "../GranularRoleMatrixView.js";
import { DoctorSnilsValidationWidget } from "../DoctorSnilsValidationWidget.js";
import { StaffProfileFooter } from "../staff/profile/StaffProfileFooter.js";
import { MobileSettingsRootView } from "../mobile/MobileSettingsRootView.js";
import { ClinicChairCard } from "../clinic/chairsModules/ClinicChairCard.js";

describe("Settings & Staff Four Canonical Roles & Autonomy Inquisition", () => {
	it("1. Four canonical role keys cover doctor, administrator/registrar, assistant, owner", () => {
		const keys = CANONICAL_ROLE_PROFILES.map((p) => p.id);
		assert.ok(keys.includes("doctor"));
		assert.ok(keys.includes("registrar"));
		assert.ok(keys.includes("assistant"));
		assert.ok(keys.includes("owner"));
	});

	it("2. GranularRoleMatrixView renders 4 canonical profiles without bg-white", () => {
		const html = renderToStaticMarkup(React.createElement(GranularRoleMatrixView, { initialRole: "doctor" }));
		assert.ok(html.includes("Врач"));
		assert.ok(html.includes("Администратор"));
		assert.ok(html.includes("Ассистент"));
		assert.ok(html.includes("Главврач"));
		assert.equal(html.includes("bg-white"), false);
	});

	it("3. ClinicChairCard & MobileSettingsRootView eradicate competitor brands (StomX, IDENT)", () => {
		const chairHtml = renderToStaticMarkup(
			React.createElement(ClinicChairCard, {
				chair: { id: "ch-1", name: "Кресло 1", active: true, workingDays: [1, 2, 3, 4, 5], startHour: 9, endHour: 18 } as never,
				rawScheduleDraft: undefined,
				scheduleSaveState: "idle",
				scheduleSaving: false,
				scheduleSaveLabel: "",
				specialtyLabels: { therapist: "Терапия" },
				typedWeekdayOptions: [{ value: 1, label: "Пн", shortLabel: "Пн" }] as never,
				updateChairScheduleDraft: () => {},
				toggleChairWorkingDay: () => {},
				updateChairScheduleDay: () => {},
				setChairPresetDays: () => {},
				applyChairHoursToAll: () => {},
				saveChairSchedule: async () => {},
				deleteChair: async () => {},
				showToast: () => {},
				onEditChair: () => {},
			}),
		);
		assert.equal(chairHtml.includes("StomX"), false);

		const mobileHtml = renderToStaticMarkup(
			React.createElement(MobileSettingsRootView, {
				appLogic: { dashboard: null } as never,
				onSelectSection: () => {},
			}),
		);
		assert.equal(mobileHtml.includes("Импорт из IDENT"), false);
		assert.equal(mobileHtml.includes("StomX"), false);
	});

	it("4. DoctorSnilsValidationWidget renders with var(--paper-soft) and var(--line) tokens, zero bg-white", () => {
		const html = renderToStaticMarkup(React.createElement(DoctorSnilsValidationWidget, { initialSnils: "" }));
		assert.equal(html.includes("bg-white"), false);
		assert.ok(html.includes("var(--paper-soft)") && html.includes("var(--line)"));
	});

	it("5. StaffProfileFooter Save button is enabled when not saving and has >= 44px touch target", () => {
		const html = renderToStaticMarkup(
			React.createElement(StaffProfileFooter, {
				onClose: () => {},
				onSave: () => {},
				isSaving: false,
			}),
		);
		assert.ok(html.includes("min-h-[44px]"));
		assert.equal(/<button[^>]*\sdisabled(?:=|(?=\s|>|$))/i.test(html), false);
	});
});
