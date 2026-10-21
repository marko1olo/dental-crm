/**
 * sampleGuaranteeLetters.ts — Предустановленные гарантийные письма ДМС для демонстрационного режима
 */

import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import type { DmsGuaranteeLetterRecord } from "./types.js";

export const SAMPLE_DMS_GUARANTEE_LETTERS: readonly DmsGuaranteeLetterRecord[] = [
	{
		id: "gl-sogaz-001",
		letterNumber: "ГП-СОГАЗ-2026-8812",
		insurerId: "sogaz",
		insurerName: "АО «СОГАЗ»",
		patientId: "pat-101",
		patientFullName: "Пациент ДМС (Тестовый полис)",
		policyNumber: "СГЗ-77-991283",
		programKey: "standard_therapy",
		issueDate: "2026-08-01",
		validUntil: "2026-09-01",
		totalLimitKopecks: 5000000,
		usedAmountKopecks: 1250000,
		approvedNomenclatureCodes: [
			"A16.07.002.001",
			"A16.07.002.002",
			"A16.07.030.001",
			"A16.07.008.002",
			"A11.07.010",
			"A06.07.003",
		],
		approvedTeeth: ["1.6", "1.5", "2.6"],
		diagnosisMkb10: ["K04.0", "K02.1"],
		status: "active",
		curatorFullName: "Смирнова Елена Викторовна",
		curatorPhone: "+7 (495) 739-21-40 доб. 312",
		curatorEmail: "e.smirnova@sogaz.ru",
		attachedXrayUris: ["/radiology/study-101-tooth16-periapical.png"],
		notes: "Согласовано эндодонтическое лечение зуба 1.6 по диагнозу K04.0 (Острый пульпит). Обязателен контрольный снимок обтурации.",
	},
	{
		id: "gl-ingos-002",
		letterNumber: "ИНГОС-МЕД-26-44091",
		insurerId: "ingosstrakh",
		insurerName: "СПАО «Ингосстрах»",
		patientId: "pat-102",
		patientFullName: "Кузнецова Ольга Дмитриевна",
		policyNumber: "ИНГ-902-11487",
		programKey: "extended_surgery_hygiene",
		issueDate: "2026-08-10",
		validUntil: "2026-09-15",
		totalLimitKopecks: 3500000,
		usedAmountKopecks: 0,
		approvedNomenclatureCodes: [
			"A16.07.001.002",
			"A11.07.010",
			"A06.07.004",
			"A16.07.051",
		],
		approvedTeeth: ["3.8", "4.8"],
		diagnosisMkb10: ["K01.1", "K05.0"],
		status: "active",
		curatorFullName: "Воронов Михаил Петрович",
		curatorPhone: "+7 (495) 956-55-55 доб. 881",
		curatorEmail: "m.voronov@ingos.ru",
		attachedXrayUris: ["/radiology/study-102-optg-retention.png"],
		notes: "Согласовано удаление ретинированных зубов мудрости 3.8 и 4.8 по показаниям дистопии и перикоронита.",
	},
	{
		id: "gl-reso-003",
		letterNumber: "РЕСО-ГАРАНТ-88210",
		insurerId: "reso_garantiya",
		insurerName: "СПАО «РЕСО-Гарантия»",
		patientId: "pat-103",
		patientFullName: "Петров Василий Николаевич",
		policyNumber: "РЕСО-994-0012",
		programKey: "vip_full_coverage",
		issueDate: "2026-07-15",
		validUntil: "2026-08-15",
		totalLimitKopecks: 10000000,
		usedAmountKopecks: 9800000,
		approvedNomenclatureCodes: [
			"A16.07.002.001",
			"A16.07.002.002",
			"A06.07.013",
			"A16.07.051",
		],
		approvedTeeth: ["1.1", "2.1", "2.2"],
		diagnosisMkb10: ["K02.1", "K05.1"],
		status: "expired",
		curatorFullName: "Алексеева Анна Сергеевна",
		curatorPhone: "+7 (800) 234-18-02",
		curatorEmail: "dms-expert@reso.ru",
		attachedXrayUris: [],
		notes: "Срок действия гарантийного письма истек 15.08.2026. Требуется продление через куратора.",
	},
];

export function getStatutoryGuaranteeLetters(
	isDemo = isDemoShowcaseMode(),
): readonly DmsGuaranteeLetterRecord[] {
	return isDemo ? SAMPLE_DMS_GUARANTEE_LETTERS : [];
}
