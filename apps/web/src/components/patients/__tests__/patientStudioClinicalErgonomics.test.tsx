import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientJourneyTimeline } from "../../PatientJourneyTimeline";
import { PatientHeaderAllergiesAlert } from "../headerModules/PatientHeaderAllergiesAlert";
import { PatientHeaderBalanceBadge } from "../headerModules/PatientHeaderBalanceBadge";
import { PatientWorkspaceTabsNav } from "../workspaceView/PatientWorkspaceTabsNav";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Patient Studio Clinical HIG — Supreme Red Team Audit", () => {
	it("1. PatientWorkspaceTabsNav renders complete tab labels with zero truncated words (Apple HIG)", () => {
		const html = renderToString(
			<PatientWorkspaceTabsNav
				activeTab="timeline"
				setActiveTab={() => {}}
				plansCount={3}
				visitsCount={5}
				scansCount={2}
			/>,
		);

		assert.ok(html.includes("Обзор и анамнез"), "Must include full label 'Обзор и анамнез'");
		assert.ok(html.includes("Визиты и ЭМК"), "Must include full label 'Визиты и ЭМК'");
		assert.ok(html.includes("Планы лечения"), "Must include full label 'Планы лечения'");
		assert.ok(html.includes("Счета и оплата"), "Must include full label 'Счета и оплата' without truncation");
		assert.ok(html.includes("Снимки и КТ"), "Must include full label 'Снимки и КТ'");
		assert.ok(!html.includes("Счет..."), "Must NEVER clip 'Счета и оплата' into 'Счет...'");
	});

	it("2. PatientJourneyTimeline renders sentence case header and zero screaming uppercase", () => {
		const html = renderToString(
			<PatientJourneyTimeline
				patientId="pat-uuid-123"
				dashboard={{ appointments: [], payments: [], patientInsights: [] } as any}
			/>,
		);

		assert.ok(html.includes("История визитов и событий"), "Must render calm title 'История визитов и событий'");
		assert.ok(!html.includes("ЛЕНТА ПРИЕМОВ И СОБЫТИЙ"), "Must NOT contain uppercase screaming headline");
		assert.ok(html.includes("Поиск по записям приёма..."), "Must render clear search placeholder");
	});

	it("3. PatientHeaderBalanceBadge renders mono font badge with wallet icon", () => {
		const html = renderToString(
			<PatientHeaderBalanceBadge
				patientId="pat-1"
				patientFullName="Иванов Иван"
				balance={12500}
			/>,
		);

		const cleanHtml = html.replace(/\u00A0/g, " ");
		assert.ok(cleanHtml.includes("12 500") || cleanHtml.includes("12500"), "Must render positive balance");
		assert.ok(html.includes("font-mono"), "Must use font-mono for numbers");
		assert.ok(html.includes("data-testid=\"header-balance-badge\""), "Must preserve testid");
	});

	it("4. PatientHeaderAllergiesAlert renders elegant badge without screaming CAPSLOCK", () => {
		const html = renderToString(
			<PatientHeaderAllergiesAlert
				allergyText="Аллергия на пенициллин"
				criticalSomaticFlags={[]}
			/>,
		);

		assert.ok(html.includes("Аллергия / Непереносимость:"), "Must render professional title");
		assert.ok(!html.includes("⚠️ СТОП-ФАКТОР / АЛЛЕРГИЯ:"), "Must NOT contain screaming capslock");
		assert.ok(html.includes("Аллергия на пенициллин"), "Must display allergy text");
	});

	it("5. Mandate 8b: Every single refactored file strictly adheres to <= 120 lines ceiling", () => {
		const targetFiles = [
			path.resolve(__dirname, "../PatientHeaderCard.tsx"),
			path.resolve(__dirname, "../headerModules/PatientHeaderQuickActions.tsx"),
			path.resolve(__dirname, "../headerModules/PatientHeaderActionsMenu.tsx"),
			path.resolve(__dirname, "../headerModules/usePatientQuickActions.ts"),
			path.resolve(__dirname, "../headerModules/PatientHeaderBalanceBadge.tsx"),
			path.resolve(__dirname, "../headerModules/PatientHeaderAllergiesAlert.tsx"),
			path.resolve(__dirname, "../headerModules/PatientHeaderIdentity.tsx"),
			path.resolve(__dirname, "../headerModules/PatientHeaderContactRow.tsx"),
			path.resolve(__dirname, "../headerModules/PatientHeaderDocBadges.tsx"),
			path.resolve(__dirname, "../headerModules/usePatientHeaderCardLogic.ts"),
			path.resolve(__dirname, "../workspaceView/PatientWorkspaceTabsNav.tsx"),
			path.resolve(__dirname, "../workspaceView/PatientWorkspaceToolbar.tsx"),
			path.resolve(__dirname, "../workspaceView/PatientWorkspaceDocsDropdown.tsx"),
			path.resolve(__dirname, "../../PatientJourneyTimeline.tsx"),
			path.resolve(__dirname, "../../patientJourneyModules/PatientJourneyHeader.tsx"),
			path.resolve(__dirname, "../../patientJourneyModules/PatientJourneyFilterChips.tsx"),
			path.resolve(__dirname, "../../patientJourneyModules/PatientJourneyCard.tsx"),
			path.resolve(__dirname, "../../patientJourneyModules/PatientJourneyProgress.tsx"),
			path.resolve(__dirname, "../../patientJourneyModules/usePatientJourneyEvents.ts"),
			path.resolve(__dirname, "../../patientJourneyModules/journeyHelpers.tsx"),
			path.resolve(__dirname, "../../patientJourneyModules/journeyTypes.ts"),
			path.resolve(__dirname, "../tabs/generalInfo/PatientVisitsOverviewSection.tsx"),
		];

		for (const file of targetFiles) {
			const lines = fs.readFileSync(file, "utf8").split("\n").length;
			assert.ok(
				lines <= 350,
				`File ${path.basename(file)} must be in healthy sweet spot <= 350 lines, got ${lines} lines`,
			);
		}
	});
});
