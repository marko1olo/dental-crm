/**
 * apps/web/src/components/settings/clinic/__tests__/TaxationAndFiscalizationCard.test.tsx
 *
 * Test suite for Clinic Taxation (СНО) & KKT Fiscalization Card.
 * Compliant with 54-FZ, FFD 1.2 (Tags 1055, 1057, 1222), Mandates 8b, 8d, 8e, 8s.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	FFD12_TAG_1055_TAXATION_CODES,
	FFD12_TAG_1057_AGENT_CODES,
} from "@dental/shared";
import {
	BRANCH_OPTIONS,
	FISCAL_AGENT_OPTIONS,
	KKM_MODEL_OPTIONS,
	normalizeTaxationId,
	OFD_PROVIDER_OPTIONS,
	TAXATION_SYSTEMS,
} from "../taxationModules/TaxationCardTypes";
import { FiscalAgentSettings } from "../taxationModules/FiscalAgentSettings";
import { KktConnectionCard } from "../taxationModules/KktConnectionCard";
import { TaxSystemSelector } from "../taxationModules/TaxSystemSelector";
import { TaxationAndFiscalizationCard } from "../TaxationAndFiscalizationCard";

describe("TaxationAndFiscalizationCard — Statutory 54-FZ & FFD 1.2 Suite", () => {
	it("1. Statutory СНО regimes: exactly 4 canonical Russian dental tax systems", () => {
		expect(TAXATION_SYSTEMS.length).toBe(4);

		const ids = TAXATION_SYSTEMS.map((s) => s.id);
		expect(ids.includes("usn_income")).toBe(true);
		expect(ids.includes("usn_income_expense")).toBe(true);
		expect(ids.includes("psn")).toBe(true);
		expect(ids.includes("osn")).toBe(true);

		// Validate FFD 1.2 Tag 1055 values against statutory constants
		const usnIncome = TAXATION_SYSTEMS.find((s) => s.id === "usn_income");
		expect(usnIncome?.ffdTagCode).toBe(FFD12_TAG_1055_TAXATION_CODES.usn_income);

		const psn = TAXATION_SYSTEMS.find((s) => s.id === "psn");
		expect(psn?.ffdTagCode).toBe(FFD12_TAG_1055_TAXATION_CODES.psn);

		const osn = TAXATION_SYSTEMS.find((s) => s.id === "osn");
		expect(osn?.ffdTagCode).toBe(FFD12_TAG_1055_TAXATION_CODES.osn);
	});

	it("2. Normalization: handles legacy and alternative tax identifiers safely", () => {
		expect(normalizeTaxationId("usn_income")).toBe("usn_income");
		expect(normalizeTaxationId("usn_income_expense")).toBe("usn_income_expense");
		expect(normalizeTaxationId("patent")).toBe("psn");
		expect(normalizeTaxationId("psn")).toBe("psn");
		expect(normalizeTaxationId("osno")).toBe("osn");
		expect(normalizeTaxationId("osn")).toBe("osn");
		expect(normalizeTaxationId("")).toBe("usn_income");
		expect(normalizeTaxationId(null)).toBe("usn_income");
		expect(normalizeTaxationId(undefined)).toBe("usn_income");
	});

	it("3. Fiscal hardware and OFD provider presets are populated", () => {
		expect(KKM_MODEL_OPTIONS.some((m) => m.value.includes("АТОЛ"))).toBe(true);
		expect(KKM_MODEL_OPTIONS.some((m) => m.value.includes("Штрих-М"))).toBe(true);
		expect(KKM_MODEL_OPTIONS.some((m) => m.value.includes("Эвотор"))).toBe(true);

		expect(BRANCH_OPTIONS.some((b) => b.value === "main")).toBe(true);
		expect(BRANCH_OPTIONS.some((b) => b.value === "chair_side")).toBe(true);

		expect(OFD_PROVIDER_OPTIONS.some((o) => o.value === "platforma_ofd")).toBe(true);
		expect(OFD_PROVIDER_OPTIONS.some((o) => o.value === "taxcom")).toBe(true);
	});

	it("4. Fiscal Agent (FFD 1.2 Tag 1057 / 1222) presets support chair rental & labs", () => {
		expect(FISCAL_AGENT_OPTIONS.length >= 4).toBe(true);

		const payingAgent = FISCAL_AGENT_OPTIONS.find((a) => a.value === "paying_agent");
		expect(payingAgent?.tag1057Code).toBe(FFD12_TAG_1057_AGENT_CODES.paying_agent);

		const commissionAgent = FISCAL_AGENT_OPTIONS.find((a) => a.value === "commission_agent");
		expect(commissionAgent?.tag1057Code).toBe(FFD12_TAG_1057_AGENT_CODES.commission_agent);

		const agent = FISCAL_AGENT_OPTIONS.find((a) => a.value === "agent");
		expect(agent?.tag1057Code).toBe(FFD12_TAG_1057_AGENT_CODES.agent);
	});

	it("5. TaxSystemSelector: renders with test-ids and accessibility attributes", () => {
		const html = renderToStaticMarkup(
			<TaxSystemSelector
				activeTaxation="usn_income"
				onSelectTaxation={() => {}}
			/>,
		);

		expect(html.includes('data-testid="tax-system-selector-section"')).toBe(true);
		expect(html.includes('data-testid="btn-taxation-usn_income"')).toBe(true);
		expect(html.includes('aria-pressed="true"')).toBe(true);
		expect(html.includes('data-testid="btn-taxation-psn"')).toBe(true);
		expect(html.includes('aria-pressed="false"')).toBe(true);
		expect(html.includes("УСН «Доходы» (6%)")).toBe(true);
	});

	it("6. KktConnectionCard: renders hardware inputs, serial and active state", () => {
		const html = renderToStaticMarkup(
			<KktConnectionCard
				kkmActive={true}
				kkmModel="АТОЛ-55Ф"
				kkmSerialNumber="00108204958112"
				branchId="main"
				cashBoxName="Основная касса"
				onToggleKkmActive={() => {}}
				onChangeKkmModel={() => {}}
				onChangeSerialNumber={() => {}}
				onChangeBranch={() => {}}
				onChangeCashBoxName={() => {}}
			/>,
		);

		expect(html.includes('data-testid="kkt-connection-card-section"')).toBe(true);
		expect(html.includes('data-testid="checkbox-kkm-active"')).toBe(true);
		expect(html.includes('data-testid="select-kkm-model"')).toBe(true);
		expect(html.includes('data-testid="input-kkm-serial"')).toBe(true);
		expect(html.includes('value="00108204958112"')).toBe(true);
		expect(html.includes('data-testid="input-cashbox-name"')).toBe(true);
	});

	it("7. FiscalAgentSettings: renders OFD, FFD version and non-blocking autonomy text", () => {
		const html = renderToStaticMarkup(
			<FiscalAgentSettings
				ofdProvider="platforma_ofd"
				ffdVersion="1.2"
				autoSendReceipt={true}
				allowAutonomousBuffer={true}
				agentSign="agent"
				onChangeOfdProvider={() => {}}
				onChangeFfdVersion={() => {}}
				onToggleAutoSendReceipt={() => {}}
				onToggleAutonomousBuffer={() => {}}
				onChangeAgentSign={() => {}}
			/>,
		);

		expect(html.includes('data-testid="fiscal-agent-settings-section"')).toBe(true);
		expect(html.includes('data-testid="select-ofd-provider"')).toBe(true);
		expect(html.includes('data-testid="select-ffd-version"')).toBe(true);
		expect(html.includes('data-testid="checkbox-auto-send-receipt"')).toBe(true);
		expect(html.includes('data-testid="checkbox-autonomous-buffer"')).toBe(true);
		expect(html.includes('data-testid="select-agent-sign"')).toBe(true);
		// Mandate 8e: Doctor & Cashier Autonomy: zero mandatory INN for individuals
		expect(html.includes("Оплата физлиц принимается без обязательного ИНН")).toBe(true);
	});

	it("8. TaxationAndFiscalizationCard: root container renders without crash", () => {
		const html = renderToStaticMarkup(<TaxationAndFiscalizationCard />);

		expect(html.includes('data-testid="taxation-and-fiscalization-card"')).toBe(true);
		expect(html.includes('data-testid="btn-save-fiscal-settings"')).toBe(true);
		expect(html.includes("Налогообложение (СНО) и касса клиники")).toBe(true);
		// Mandate 8d: Zero cartoon emojis
		expect(html.includes("⚡")).toBe(false);
		expect(html.includes("⭐")).toBe(false);
		expect(html.includes("✨")).toBe(false);
	});
});
