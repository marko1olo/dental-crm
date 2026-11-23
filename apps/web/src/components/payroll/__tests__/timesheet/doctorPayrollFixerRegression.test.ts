/**
 * doctorPayrollFixerRegression.test.ts — Regression Suite for Doctor Payroll Domain Fixes
 * Covers:
 * 1. Absence of hardcoded clinic name in GlobalDoctorPayrollModal (Mandate 8z/8wy).
 * 2. Elimination of Soviet Goskomstat T-13 naming in favor of isShiftTimesheetOpen (Mandate 8x/8ap).
 * 3. Synchronization of commissionPercent across UI query builder and API schema (Mandate 8bf/8bm).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { payrollCalculationsQuerySchema } from "../../../../../../api/src/routes/payroll";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcDir = path.resolve(__dirname, "../../../../");

describe("Doctor Payroll Fixer Surgeon Regression Suite (Mandates 8z, 8x, 8bf, 8bm)", () => {
	it("1.1 GlobalDoctorPayrollModal has zero hardcoded 'ООО «Денте Стоматология»' and uses branding store", () => {
		const modalPath = path.join(
			webSrcDir,
			"components/appLayout/viewRouterModules/GlobalDoctorPayrollModal.tsx",
		);
		assert.ok(fs.existsSync(modalPath), "GlobalDoctorPayrollModal.tsx must exist");
		const content = fs.readFileSync(modalPath, "utf8");

		assert.ok(
			!content.includes("ООО «Денте Стоматология»"),
			"Forbidden hardcoded clinic name must not be present in GlobalDoctorPayrollModal",
		);
		assert.ok(
			content.includes("useDocumentBrandingStore"),
			"Must connect to useDocumentBrandingStore for multi-tenant clinic name",
		);
	});

	it("1.2 Finance navigation and modals host use canonical isShiftTimesheetOpen", () => {
		const navHookPath = path.join(
			webSrcDir,
			"views/financeView/hooks/useFinanceModalsNavigation.ts",
		);
		const modalsSubhostPath = path.join(
			webSrcDir,
			"views/financeView/modalModules/FinancePatientModalsSubhost.tsx",
		);

		const navContent = fs.readFileSync(navHookPath, "utf8");
		const subhostContent = fs.readFileSync(modalsSubhostPath, "utf8");

		assert.ok(
			navContent.includes("isShiftTimesheetOpen"),
			"useFinanceModalsNavigation must define isShiftTimesheetOpen",
		);
		assert.ok(
			subhostContent.includes("isShiftTimesheetOpen"),
			"FinancePatientModalsSubhost must listen to isShiftTimesheetOpen",
		);
	});

	it("1.3 payrollCalculationsQuerySchema validates and accepts optional commissionPercent", () => {
		// Valid without commissionPercent
		const parsedStandard = payrollCalculationsQuerySchema.safeParse({
			doctorId: "doc-1",
			from: "2026-05-01",
			to: "2026-05-31",
		});
		assert.ok(parsedStandard.success, "Must accept query without commissionPercent");

		// Valid with commissionPercent as number
		const parsedWithNum = payrollCalculationsQuerySchema.safeParse({
			doctorId: "doc-1",
			from: "2026-05-01",
			to: "2026-05-31",
			commissionPercent: 35,
		});
		assert.ok(parsedWithNum.success, "Must accept commissionPercent as number");
		assert.equal(parsedWithNum.data?.commissionPercent, 35);

		// Valid with commissionPercent as string
		const parsedWithStr = payrollCalculationsQuerySchema.safeParse({
			doctorId: "all",
			from: "2026-05-01",
			to: "2026-05-31",
			commissionPercent: "27.5",
		});
		assert.ok(parsedWithStr.success, "Must accept commissionPercent as string");
	});

	it("1.4 fetchDoctorEarningsApi and DoctorPayrollStudioModal forward custom commissionPercent", () => {
		const apiPath = path.join(
			webSrcDir,
			"components/payroll/fetchDoctorEarningsApi.ts",
		);
		const studioPath = path.join(
			webSrcDir,
			"components/payroll/DoctorPayrollStudioModal.tsx",
		);

		const apiContent = fs.readFileSync(apiPath, "utf8");
		const studioContent = fs.readFileSync(studioPath, "utf8");

		assert.ok(
			apiContent.includes("commissionPercent"),
			"fetchDoctorEarningsApi must include commissionPercent parameter",
		);
		assert.ok(
			studioContent.includes("activeTabCustomPercent"),
			"DoctorPayrollStudioModal must track activeTabCustomPercent in calculation query",
		);
		assert.ok(
			studioContent.includes("commissionPercent"),
			"DoctorPayrollStudioModal must pass commissionPercent into URLSearchParams",
		);
	});
});
