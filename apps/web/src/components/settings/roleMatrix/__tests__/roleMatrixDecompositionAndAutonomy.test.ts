import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GRANULAR_ROLE_MATRIX, PERMISSION_DEFINITIONS } from "@dental/shared";
import { GranularRoleMatrixView } from "../../GranularRoleMatrixView.js";
import { RoleActionButtons } from "../RoleActionButtons.js";
import { PermissionRowItem } from "../PermissionRowItem.js";
import { RoleSummaryHeroCard } from "../RoleSummaryHeroCard.js";

describe("Role Matrix Behavioral Render & Doctor Autonomy", () => {
	it("1. GranularRoleMatrixView renders 4 canonical roles and clean CSS tokens (zero bg-white)", () => {
		const html = renderToStaticMarkup(React.createElement(GranularRoleMatrixView, { initialRole: "doctor" }));
		assert.ok(html.includes('data-testid="granular-role-matrix-panel"'));
		assert.ok(html.includes("Матрица прав доступа"));
		assert.ok(html.includes("Врач"));
		assert.ok(html.includes("Администратор"));
		assert.ok(html.includes("Ассистент"));
		assert.ok(html.includes("Главврач"));
		assert.equal(html.includes("bg-white"), false);
	});

	it("2. RoleActionButtons Save button is NEVER disabled (Mandates 8e, 8n) and keeps 44px mobile touch target", () => {
		const html = renderToStaticMarkup(
			React.createElement(RoleActionButtons, {
				onSave: () => {},
				onReset: () => {},
				isSaving: false,
				hasUnsavedChanges: true,
				grantedCount: 12,
				blockedCount: 3,
			}),
		);
		assert.equal(/<button[^>]*\bdisabled\b/i.test(html), false);
		assert.ok(html.includes("min-h-[44px]"));
		assert.ok(html.includes("12 разрешено"));
		assert.ok(html.includes("3 закрыто"));
	});

	it("3. PermissionRowItem renders role='switch' and 44x44px hit target", () => {
		const firstPerm = PERMISSION_DEFINITIONS[0]!;
		const html = renderToStaticMarkup(
			React.createElement(PermissionRowItem, {
				permission: firstPerm,
				level: "full",
				onToggle: () => {},
				onCycleLevel: () => {},
			}),
		);
		assert.ok(html.includes('role="switch"'));
		assert.ok(html.includes("w-11 h-11"));
		assert.ok(html.includes("w-11 h-6"));
	});

	it("4. Doctor canonical role matrix grants clinical.records.write = full and RoleSummaryHeroCard renders doctor barriers", () => {
		assert.equal(GRANULAR_ROLE_MATRIX.doctor["clinical.records.write"], "full");
		const html = renderToStaticMarkup(
			React.createElement(RoleSummaryHeroCard, {
				role: "doctor",
				onApplyDoctorPreset: () => {},
				onResetToStandard: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="doctor-security-barriers"'));
		assert.ok(html.includes("100%"));
	});
});
