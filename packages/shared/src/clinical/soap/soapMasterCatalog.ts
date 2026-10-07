/**
 * packages/shared/src/clinical/soap/soapMasterCatalog.ts
 *
 * Single Source of Truth (SSOT) Master Catalog for Clinical SOAP Protocols.
 * Covers 6 statutory dental specialties:
 * 1. Therapy (Caries, Pulpitis, Periodontitis, Wedge defects)
 * 2. Surgery (Simple/complex extraction, Implants, RVK apex resection, Periostotomy)
 * 3. Orthopedics (Ceramic inlays/onlays, ZrO2/E.max crowns, Bridges, Removable)
 * 4. Periodontology (SRP curettage, Vector therapy, Gingivitis, Gingivectomy)
 * 5. Pediatric (Adaptation, Primary caries, Pulpotec pulpotomy, Saforide, Fissure sealing)
 * 6. Hygiene (Complex hygiene, Air-Flow glycine, Ultrasonic Piezon)
 *
 * Structured strictly by SOAP:
 * - S: Subjective (Complaints + Anamnesis morbi/vitae)
 * - O: Objective (Status localis + dental exam + tests)
 * - A: Assessment (ICD-10 code + statutory diagnosis)
 * - P: Plan (Statutory Order 804n code + treatment steps + automated BOM deduction)
 *
 * Mandate 8v: Automated Bill of Materials (BOM) deduction without nurse clicking bloat.
 * Mandate 8d item 7: Strictly 0 cartoon emojis in clinical / statutory records.
 */

import { THERAPY_SOAP_PROTOCOLS } from "./soapTherapyProtocols.js";
import { SURGERY_SOAP_PROTOCOLS } from "./soapSurgeryProtocols.js";
import { ORTHOPEDICS_SOAP_PROTOCOLS } from "./soapOrthopedicsProtocols.js";
import { PERIODONT_SOAP_PROTOCOLS } from "./soapPeriodontProtocols.js";
import { PEDIATRIC_SOAP_PROTOCOLS } from "./soapPediatricProtocols.js";
import { HYGIENE_SOAP_PROTOCOLS } from "./soapHygieneProtocols.js";
import type {
	ClinicalPresetCategory,
	ClinicalSoapMasterProtocol,
} from "./soapTypes.js";
import {
	type PopulateTemplateParams,
	populateOutpatientTemplateText,
} from "../../outpatient/stomtOutpatientCatalog.js";

/**
 * Полный объединенный реестр эталонных клинических SOAP-протоколов (SSOT).
 */
export const MASTER_CLINICAL_SOAP_PROTOCOLS: readonly ClinicalSoapMasterProtocol[] = [
	...THERAPY_SOAP_PROTOCOLS,
	...SURGERY_SOAP_PROTOCOLS,
	...ORTHOPEDICS_SOAP_PROTOCOLS,
	...PERIODONT_SOAP_PROTOCOLS,
	...PEDIATRIC_SOAP_PROTOCOLS,
	...HYGIENE_SOAP_PROTOCOLS,
];

/**
 * Возвращает протоколы по клиническому направлению (специальности).
 */
export function getSoapProtocolsByDomain(
	category: ClinicalPresetCategory,
): readonly ClinicalSoapMasterProtocol[] {
	return MASTER_CLINICAL_SOAP_PROTOCOLS.filter((p) => p.category === category);
}

/**
 * Находит клинический протокол по уникальному строковому ID.
 */
export function findSoapProtocolById(
	id: string,
): ClinicalSoapMasterProtocol | undefined {
	return MASTER_CLINICAL_SOAP_PROTOCOLS.find((p) => p.id === id);
}

/**
 * Поиск протоколов по ключевому запросу и опциональной категории.
 */
export function searchSoapMasterProtocols(
	query: string,
	category?: ClinicalPresetCategory,
): readonly ClinicalSoapMasterProtocol[] {
	const normalized = query.trim().toLowerCase();
	let pool = MASTER_CLINICAL_SOAP_PROTOCOLS;

	if (category) {
		pool = pool.filter((p) => p.category === category);
	}

	if (!normalized) {
		return pool;
	}

	return pool.filter((p) => {
		const inId = p.id.toLowerCase().includes(normalized);
		const inTitle = p.title.toLowerCase().includes(normalized);
		const inShort = p.shortBadge.toLowerCase().includes(normalized);
		const inIcd = p.icd10.toLowerCase().includes(normalized);
		const inIcdLabel = p.icd10Label.toLowerCase().includes(normalized);
		const inCode804n = p.service804n?.code804n.toLowerCase().includes(normalized);
		const inTags = p.tags?.some((t) => t.toLowerCase().includes(normalized));
		const inMaterials = p.materialsToDeduct.some((m) =>
			m.name.toLowerCase().includes(normalized),
		);

		return inId || inTitle || inShort || inIcd || inIcdLabel || inCode804n || inTags || inMaterials;
	});
}

/**
 * Рассчитывает суммарную себестоимость списания материалов (BOM) по протоколу.
 * Mandate 8v & 8s: точный финансовый учет без участия ассистента или медсестры.
 */
export function calculateProtocolBomTotalCostRub(
	protocol: ClinicalSoapMasterProtocol,
): number {
	return protocol.materialsToDeduct.reduce((acc, m) => {
		const unitCost = m.unitCostRub ?? 0;
		return acc + Math.round(unitCost * m.quantity);
	}, 0);
}

/**
 * Формирует структурированный текст дневника Формы 043/у (SOAP) с подстановкой параметров зуба.
 * STRICTLY 0 CARTOON EMOJIS per Mandate 8d item 7.
 */
export function formatSoapDiaryFromProtocol(
	protocol: ClinicalSoapMasterProtocol,
	params: PopulateTemplateParams = {},
): string {
	const toothNum = params.toothNumber ?? protocol.defaultTooth;
	const toothHeader = toothNum ? ` (Зуб ${toothNum})` : "";
	const surfaceText = params.surfaces ? ` [Поверхности: ${params.surfaces}]` : "";

	const lines: string[] = [];
	lines.push(`=== ${protocol.title}${toothHeader}${surfaceText} ===`);
	lines.push("");

	// S: Subjective
	lines.push("ЖАЛОБЫ:");
	lines.push(populateOutpatientTemplateText(protocol.complaint, params));
	lines.push("");

	lines.push("АНАМНЕЗ:");
	lines.push(populateOutpatientTemplateText(protocol.anamnesis, params));
	lines.push("");

	// O: Objective
	lines.push("ОБЪЕКТИВНЫЙ СТАТУС:");
	lines.push(populateOutpatientTemplateText(protocol.statusLocalis, params));
	lines.push("");

	// A: Assessment
	lines.push("ДИАГНОЗ:");
	lines.push(`${protocol.icd10} ${protocol.icd10Label}${toothHeader}`);
	lines.push("");

	// P: Plan (Manipulation + Order 804n + BOM)
	lines.push("ПРОТОКОЛ ЛЕЧЕНИЯ:");
	if (protocol.informedConsent) {
		lines.push(`[ИДС]: ${protocol.informedConsent}`);
	}
	if (protocol.anesthetic) {
		lines.push(
			`Местная анестезия: ${protocol.anesthetic.drugName} (${protocol.anesthetic.volumeMl} мл, ${protocol.anesthetic.carpulesCount} карп.)`,
		);
	}
	lines.push(populateOutpatientTemplateText(protocol.treatmentDescription, params));
	lines.push("");

	if (protocol.service804n) {
		lines.push(
			`Основная услуга (Номенклатура 804н): [${protocol.service804n.code804n}] ${protocol.service804n.title} — ${protocol.service804n.basePriceRub.toLocaleString("ru-RU")} руб.`,
		);
	}
	if (protocol.additionalServices804n && protocol.additionalServices804n.length > 0) {
		for (const s of protocol.additionalServices804n) {
			lines.push(
				`Сопутствующая услуга (Номенклатура 804н): [${s.code804n}] ${s.title} — ${s.basePriceRub.toLocaleString("ru-RU")} руб.`,
			);
		}
	}

	if (protocol.materialsToDeduct.length > 0) {
		lines.push("");
		lines.push("СПИСАНИЕ МАТЕРИАЛОВ СО СКЛАДА (АВТОМАТИЧЕСКИЙ BOM ПО ПРИКАЗУ 804н):");
		for (const m of protocol.materialsToDeduct) {
			lines.push(`- ${m.name}: ${m.quantity} ${m.unit}`);
		}
	}

	if (protocol.recommendations) {
		lines.push("");
		lines.push("РЕКОМЕНДАЦИИ:");
		lines.push(populateOutpatientTemplateText(protocol.recommendations, params));
	}

	if (protocol.warrantyMonths) {
		lines.push("");
		lines.push(
			`ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА: Гарантийный срок — ${protocol.warrantyMonths} мес.` +
				(protocol.serviceLifeMonths ? `, срок службы — ${protocol.serviceLifeMonths} мес.` : ""),
		);
	}

	return lines.join("\n");
}

/**
 * Валидатор протокола на соответствие требованиям Минздрава РФ и Мандатов:
 * - Все секции SOAP непустые
 * - Валидный код МКБ-10
 * - Валидный код услуги по Номенклатуре 804н
 * - Непустой список списываемых материалов с положительными объемами
 */
export function validateSoapProtocol(protocol: ClinicalSoapMasterProtocol): {
	readonly isValid: boolean;
	readonly errors: readonly string[];
} {
	const errors: string[] = [];

	if (!protocol.id || protocol.id.trim().length === 0) {
		errors.push("Идентификатор протокола (id) обязателен");
	}
	if (!protocol.title || protocol.title.trim().length === 0) {
		errors.push("Название протокола (title) обязательно");
	}
	if (!protocol.complaint || protocol.complaint.trim().length === 0) {
		errors.push("Секция S (Жалобы / complaint) не может быть пустой");
	}
	if (!protocol.anamnesis || protocol.anamnesis.trim().length === 0) {
		errors.push("Секция S (Анамнез / anamnesis) не может быть пустой");
	}
	if (!protocol.statusLocalis || protocol.statusLocalis.trim().length === 0) {
		errors.push("Секция O (Объективный статус / statusLocalis) не может быть пустой");
	}
	if (!protocol.icd10 || !/^[A-Z]\d{2}(\.\d{1,4})?$/i.test(protocol.icd10)) {
		errors.push(`Некорректный код МКБ-10: «${protocol.icd10}»`);
	}
	if (!protocol.treatmentDescription || protocol.treatmentDescription.trim().length === 0) {
		errors.push("Секция P (Протокол лечения / treatmentDescription) не может быть пустой");
	}

	if (protocol.service804n) {
		if (!protocol.service804n.code804n || !/^[A-B]\d{2}\.\d{2,3}(?:\.\d{2,3}){1,2}$/i.test(protocol.service804n.code804n)) {
			errors.push(`Некорректный код Номенклатуры 804н: «${protocol.service804n.code804n}»`);
		}
		if (protocol.service804n.basePriceRub < 0) {
			errors.push("Базовая стоимость услуги 804н не может быть отрицательной");
		}
	}

	if (!protocol.materialsToDeduct || protocol.materialsToDeduct.length === 0) {
		errors.push("Список материалов для списания (BOM) не может быть пустым");
	} else {
		for (const m of protocol.materialsToDeduct) {
			if (!m.name || m.name.trim().length === 0) {
				errors.push("Наименование материала не может быть пустым");
			}
			if (!Number.isFinite(m.quantity) || m.quantity <= 0) {
				errors.push(`Количество материала «${m.name}» должно быть строго больше 0`);
			}
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}
