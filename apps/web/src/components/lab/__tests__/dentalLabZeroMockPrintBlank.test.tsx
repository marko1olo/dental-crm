import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DentalLabPrintBlank } from "../DentalLabPrintBlank";

describe("dentalLabZeroMock — Print Blank & Emojis", () => {
	it("рендерит контактные телефоны врача и клиники, окно курьера и 6-этапный маршрутный лист", () => {
		const html = renderToString(
			<DentalLabPrintBlank
				gostOrderNumber="ЗТЛ-2026-101"
				secureToken="ZTL-SEC-TOKEN-42"
				formPatientName="Алексеев В.М."
				formDoctorName="Д-р Григорьев К.А."
				clinicName="ООО «ДЕНТЕ Премиум»"
				clinicPhone="+7 (495) 789-20-20"
				doctorPhone="+7 (916) 123-45-67"
				deliveryTimeSlot="12:00 – 15:00"
				selectedTeeth={[21]}
				constructionType="crown_emax"
				material="emax_press"
				shadeSystem="classical"
				shadeClassical="A1"
				shade3dMaster="1M1"
				shadeBleach="BL1"
				shadeCervical="A2"
				shadeBody="A1"
				shadeIncisal="0M2"
				shadeStump="ND2"
				translucency="HT"
				mamelons={true}
				calcifications={false}
				dueDate="2026-10-25"
				clinicalNotes="Курьерская доставка в термочехле"
				portalUrl="https://clinic.dente/#/portal/lab-order/ZTL-SEC-TOKEN-42"
				handlePrint={() => {}}
				isDraft={false}
				isSigned={true}
				currentStage="in_progress"
			/>,
		);

		assert.ok(html.includes("+7 (495) 789-20-20"));
		assert.ok(html.includes("+7 (916) 123-45-67"));
		assert.ok(html.includes("12:00 – 15:00"));
		assert.ok(html.includes("Окно курьера:"));
		assert.ok(html.includes('data-testid="lab-blank-6stage-lifecycle"'));
		assert.ok(html.includes('data-testid="ztl-blank-6stage-impression_taken"'));
		assert.ok(html.includes('data-testid="ztl-blank-6stage-courier_sent"'));
		assert.ok(html.includes('data-testid="ztl-blank-6stage-framework_fitting"'));
		assert.ok(html.includes('data-testid="ztl-blank-6stage-ceramic_layering"'));
		assert.ok(html.includes('data-testid="ztl-blank-6stage-ready_in_clinic"'));
		assert.ok(html.includes('data-testid="ztl-blank-6stage-patient_fixation"'));
		assert.ok(html.includes("Курьер ЗТЛ (передача):"));
		assert.ok(html.includes("Прием лабораторией ЗТЛ:"));
	});

	it("стили печати содержат защиту от мутных серых фонов", () => {
		const currentFile = fileURLToPath(import.meta.url);
		const blankPath = path.resolve(path.dirname(currentFile), "../DentalLabPrintBlank.tsx");
		const content = fs.readFileSync(blankPath, "utf-8");

		assert.ok(
			content.includes("#printable-lab-order-sheet .bg-slate-50") &&
			content.includes("background-color: transparent !important"),
		);
		assert.ok(
			content.includes("print:bg-transparent") || content.includes("print:bg-white"),
		);
	});

	it("DentalLabPrintBlank.tsx и dentalLabOrderEngine.ts содержат строго 0 эмодзи", () => {
		const currentFile = fileURLToPath(import.meta.url);
		const labDir = path.resolve(path.dirname(currentFile), "..");
		const files = ["DentalLabPrintBlank.tsx", "dentalLabOrderEngine.ts", "labClinicalStages.ts"];
		const emojiRegex = /\p{Extended_Pictographic}/u;

		for (const f of files) {
			const fullPath = path.join(labDir, f);
			const content = fs.readFileSync(fullPath, "utf-8");
			assert.equal(emojiRegex.test(content), false, `Файл ${f} содержит эмодзи`);
		}
	});
});
