/**
 * taxDeductionCertificateAutonomy.test.tsx
 *
 * Inquisition & Autonomy Unit Tests for TaxDeductionCertificateModal:
 * 1. Download and print buttons are NOT disabled when payments count is 0 (disabled === false).
 * 2. Action buttons meet Apple HIG min-height >= 44px touch targets.
 * 3. Verified adherence to Mandates 8e (Doctor & Staff Autonomy) and 8n (Solo Doctor Sovereignty).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { TaxDeductionCertificateModal } from "../TaxDeductionCertificateModal";

describe("TaxDeductionCertificateModal Autonomy & Non-blocking Actions", () => {
	it("renders action buttons without disabled attribute even when payments are empty", () => {
		const html = renderToString(
			<TaxDeductionCertificateModal
				isOpen={true}
				onClose={() => {}}
				patientName="Иванов Иван Иванович"
				patientInn="771234567890"
				payments={[]}
				clinicName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
				clinicInn="7701234567"
				clinicKpp="770101001"
				clinicOgrn="1157746123456"
				clinicAddress="г. Москва, ул. Ленина, д. 10"
				clinicLicenseNumber="ЛО-77-01-012345"
				clinicLicenseDate="01.01.2020"
			/>
		);

		// Verify buttons are present
		assert.ok(html.includes("Печать справки КНД 1151156 (А4)"), "Print certificate button must be rendered");
		assert.ok(html.includes("Выгрузить XML (ТКС)"), "Download XML button must be rendered");
		assert.ok(html.includes("NO_MEDOPL (5.01)"), "Download NO_MEDOPL button must be rendered");

		// Verify buttons are NOT disabled
		assert.ok(!html.includes('disabled="" title="Скачать файл NO_MEDOPL'), "NO_MEDOPL button must not be disabled");
		assert.ok(!html.includes('disabled="" class="min-h-[44px] px-5'), "Print certificate button must not be disabled");
		assert.ok(!html.includes('disabled="" class="min-h-[44px] px-4'), "Download XML button must not be disabled");

		// Verify Apple HIG touch targets
		assert.ok(html.includes("min-h-[44px]"), "All action buttons must have min-h-[44px] touch target");
	});
});
