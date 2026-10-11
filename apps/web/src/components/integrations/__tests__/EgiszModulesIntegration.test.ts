import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	cleanBlankLabel,
	DOCTOR_SPECIALTIES_REGISTRY,
	readBlankPermissions,
	TONE_STYLES,
} from "../egiszModules/egiszWidgetTypes";

describe("Egisz Frontend Modules — Unit Tests", () => {
	it("cleanBlankLabel formats dental blanks correctly", () => {
		const form043 = cleanBlankLabel("043/у", "");
		assert.equal(form043.title, "Медицинская карта стоматологического больного (043/у)");
		assert.equal(form043.subtitle, "Анамнез, дневник приёма и зубная формула");

		const semd101 = cleanBlankLabel("101", "Консультация");
		assert.equal(semd101.title, "Протокол консультации и осмотра");

		const klkt = cleanBlankLabel("КЛКТ 3D", "Исследование");
		assert.equal(klkt.title, "Протокол КЛКТ 3D и рентген-снимков");

		const ids = cleanBlankLabel("ИДС", "Согласие");
		assert.equal(ids.title, "Информированное добровольное согласие (ИДС)");

		const tax = cleanBlankLabel("1151156", "Налоговая справка");
		assert.equal(tax.title, "Справка об оплате медицинских услуг для налогового вычета");

		const fallback = cleanBlankLabel("CUSTOM_CODE", "Кастомное поле");
		assert.equal(fallback.title, "CUSTOM_CODE");
		assert.equal(fallback.subtitle, "Кастомное поле");
	});

	it("DOCTOR_SPECIALTIES_REGISTRY provides granular UKEP signing permissions", () => {
		assert.ok(DOCTOR_SPECIALTIES_REGISTRY.length >= 5);

		const therapist = DOCTOR_SPECIALTIES_REGISTRY.find((d) => d.code === "therapist");
		assert.ok(therapist);
		assert.equal(therapist?.canSignDoctorUkep, true);
		assert.equal(therapist?.canSignClinicUkep, false);

		const chief = DOCTOR_SPECIALTIES_REGISTRY.find((d) => d.code === "chief");
		assert.ok(chief);
		assert.equal(chief?.canSignDoctorUkep, true);
		assert.equal(chief?.canSignClinicUkep, true);
		assert.ok(chief?.defaultAllowedForms.includes("Справка 1151156"));
	});

	it("readBlankPermissions parses valid and edge cases cleanly", () => {
		assert.deepEqual(readBlankPermissions("bad"), { kind: "unreadable" });
		assert.deepEqual(readBlankPermissions(null), { kind: "unreadable" });
		assert.deepEqual(readBlankPermissions([]), { kind: "ok", data: [] });

		const parsed = readBlankPermissions([
			{
				id: "item-1",
				formCode: "043/у",
				fieldName: "Дневник приёма",
				isExportAllowed: true,
				patientOptOutRespect: true,
				requiredStaffRole: "Врач-стоматолог",
			},
		]);

		assert.equal(parsed.kind, "ok");
		if (parsed.kind === "ok") {
			assert.equal(parsed.data.length, 1);
			assert.equal(parsed.data[0]?.id, "item-1");
			assert.equal(parsed.data[0]?.formCode, "043/у");
			assert.equal(parsed.data[0]?.isExportAllowed, true);
			assert.equal(parsed.data[0]?.patientOptOutRespect, true);
			assert.equal(parsed.data[0]?.requiredStaffRole, "Врач-стоматолог");
		}
	});

	it("TONE_STYLES supports all semantic status tones", () => {
		assert.ok(TONE_STYLES.neutral);
		assert.ok(TONE_STYLES.info);
		assert.ok(TONE_STYLES.warning);
		assert.ok(TONE_STYLES.danger);
		assert.ok(TONE_STYLES.success);
	});
});
