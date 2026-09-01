/**
 * DENTE Dental CRM — Treatment Plan Price Lock & Supplementary Agreement Engine (Feature #41).
 *
 * Compliant with:
 * - Постановление Правительства РФ от 11.05.2023 № 736 (Правила предоставления платных мед. услуг)
 * - Закон РФ «О защите прав потребителей» № 2300-1 (ст. 10, ст. 16, ст. 33)
 * - Федеральный закон № 323-ФЗ «Об основах охраны здоровья граждан в РФ»
 *
 * Core Capabilities:
 * 1. Price Lock Policy definitions and validity period evaluation (30, 90, 180 days or contract-fixed).
 * 2. Inflation threshold monitoring and managerial absorption calculation.
 * 3. Generation of formal Supplementary Agreements («Дополнительное соглашение к Договору и Плану лечения»)
 *    when prices change or treatment scope is modified.
 * 4. Exact integer kopeck financial calculations.
 */

import { z } from "zod";
import {
	type Kopecks,
	multiplyKopecks,
	sumKopecks,
	formatKopecksRu,
} from "../utils/money.js";
import { integerToRussianWords } from "../sanpin/sanpinRegistryEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. POLICY TYPES & SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const priceLockPolicyKindSchema = z.enum([
	"standard_30_days",      // Терапевтический план (30 дней гарантии цены)
	"surgery_implant_90_days", // Хирургия и имплантация (90 дней)
	"ortho_vip_180_days",    // Ортодонтия, тотальное протезирование, VIP (180 дней)
	"strict_fixed_contract", // Полная бессрочная фиксация по депозитному договору
	"market_floating",       // Плавающий прайс (автопересчет без фиксации)
]);
export type PriceLockPolicyKind = z.infer<typeof priceLockPolicyKindSchema>;

export interface PriceLockPolicyConfig {
	readonly id: PriceLockPolicyKind;
	readonly titleRu: string;
	readonly subtitleRu: string;
	readonly validityDays: number;
	readonly inflationThresholdPercent: number; // Порог подорожания (напр. 10-15%), выше которого нужен акцепт
	readonly isAutoLockEnabled: boolean;
	readonly disallowArchivedWithoutReplacement: boolean;
	readonly requiresAdminOverrideAboveThreshold: boolean;
	readonly defaultLegalNoticeRu: string;
}

export const PRICE_LOCK_POLICY_CONFIGS: Record<PriceLockPolicyKind, PriceLockPolicyConfig> = {
	standard_30_days: {
		id: "standard_30_days",
		titleRu: "Стандартный терапевтический регламент (30 дней)",
		subtitleRu: "Гарантия неизменности цен в течение 30 календарных дней с момента утверждения плана",
		validityDays: 30,
		inflationThresholdPercent: 10,
		isAutoLockEnabled: true,
		disallowArchivedWithoutReplacement: true,
		requiresAdminOverrideAboveThreshold: true,
		defaultLegalNoticeRu:
			"Цены на терапевтическое лечение зафиксированы на 30 дней с даты подписания предварительного плана лечения.",
	},
	surgery_implant_90_days: {
		id: "surgery_implant_90_days",
		titleRu: "Хирургия и дентальная имплантация (90 дней)",
		subtitleRu: "Фиксация стоимости хирургического этапа и остеоинтеграции на 3 месяца",
		validityDays: 90,
		inflationThresholdPercent: 15,
		isAutoLockEnabled: true,
		disallowArchivedWithoutReplacement: true,
		requiresAdminOverrideAboveThreshold: true,
		defaultLegalNoticeRu:
			"Стоимость хирургических манипуляций и компонентов имплантационных систем зафиксирована на 90 календарных дней.",
	},
	ortho_vip_180_days: {
		id: "ortho_vip_180_days",
		titleRu: "Ортодонтия & VIP-реабилитация (180 дней)",
		subtitleRu: "Полугодовая заморозка цен для ортодонтических капп, брекет-систем и тотальных реконструкций",
		validityDays: 180,
		inflationThresholdPercent: 20,
		isAutoLockEnabled: true,
		disallowArchivedWithoutReplacement: true,
		requiresAdminOverrideAboveThreshold: true,
		defaultLegalNoticeRu:
			"Цены на ортодонтическое лечение и комплексную ортопедию зафиксированы на 180 дней по соглашению сторон.",
	},
	strict_fixed_contract: {
		id: "strict_fixed_contract",
		titleRu: "Бессрочная договорная фиксация (100% предоплата / депозит)",
		subtitleRu: "Полная фиксация общей сметы на весь период лечения пациента",
		validityDays: 365,
		inflationThresholdPercent: 0,
		isAutoLockEnabled: true,
		disallowArchivedWithoutReplacement: true,
		requiresAdminOverrideAboveThreshold: true,
		defaultLegalNoticeRu:
			"Общая стоимость лечения зафиксирована в полном объеме на основании внесения авансового депозита.",
	},
	market_floating: {
		id: "market_floating",
		titleRu: "Прейскурант на дату оказания услуги",
		subtitleRu: "Списание процедур в наряд по действующему на момент визита прейскуранту",
		validityDays: 0,
		inflationThresholdPercent: 5,
		isAutoLockEnabled: false,
		disallowArchivedWithoutReplacement: true,
		requiresAdminOverrideAboveThreshold: false,
		defaultLegalNoticeRu:
			"Оплата медицинских услуг производится по действующему прейскуранту клиники на день фактического оказания.",
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. SUPPLEMENTARY AGREEMENT (ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ)
// ─────────────────────────────────────────────────────────────────────────────

export interface SupplementaryAgreementItemChange {
	readonly toothNumber: number | null;
	readonly code804n: string;
	readonly serviceTitle: string;
	readonly quantity: number;
	readonly oldUnitPriceKopecks: Kopecks;
	readonly newUnitPriceKopecks: Kopecks;
	readonly deltaUnitPriceKopecks: Kopecks;
	readonly lineOldTotalKopecks: Kopecks;
	readonly lineNewTotalKopecks: Kopecks;
	readonly changeReasonRu: string;
}

export interface SupplementaryAgreementDraft {
	readonly agreementNumber: string;
	readonly agreementDateIso: string;
	readonly contractNumber: string;
	readonly contractDateIso?: string;
	readonly planNumber: string;
	readonly patientFullName: string;
	readonly patientPassportOrDoc?: string;
	readonly clinicBrandName: string;
	readonly clinicLegalName: string;
	readonly clinicAddress: string;
	readonly clinicInn: string;
	readonly clinicOgrn: string;
	readonly doctorFullName: string;
	readonly modifiedItems: readonly SupplementaryAgreementItemChange[];
	readonly previousPlanTotalKopecks: Kopecks;
	readonly newPlanTotalKopecks: Kopecks;
	readonly deltaKopecks: Kopecks; // new - previous
	readonly isClinicAbsorption: boolean;
	readonly clinicAbsorptionKopecks: Kopecks;
	readonly patientPayableDeltaKopecks: Kopecks;
	readonly justificationRu: string;
}

/**
 * Рендерит официальное Дополнительное соглашение к Договору и Плану лечения (HTML).
 */
export function renderSupplementaryAgreementHtml(draft: SupplementaryAgreementDraft): string {
	const deltaFormatted = formatKopecksRu(Math.abs(draft.deltaKopecks) as Kopecks);
	const deltaWords = integerToRussianWords(Math.round(Math.abs(draft.deltaKopecks) / 100));
	const newTotalFormatted = formatKopecksRu(draft.newPlanTotalKopecks);
	const newTotalWords = integerToRussianWords(Math.round(draft.newPlanTotalKopecks / 100));

	const itemsHtml = draft.modifiedItems
		.map(
			(item, idx) => `
		<tr>
			<td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;">${idx + 1}</td>
			<td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;">${item.toothNumber ? `Зуб ${item.toothNumber}` : "—"}</td>
			<td style="border:1px solid #cbd5e1;padding:6px 8px;"><strong>${item.code804n}</strong> ${item.serviceTitle}</td>
			<td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;">${item.quantity}</td>
			<td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:right;">${formatKopecksRu(item.oldUnitPriceKopecks)}</td>
			<td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:right;">${formatKopecksRu(item.newUnitPriceKopecks)}</td>
			<td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:right;font-weight:600;">${formatKopecksRu(item.lineNewTotalKopecks)}</td>
			<td style="border:1px solid #cbd5e1;padding:6px 8px;font-size:11px;">${item.changeReasonRu}</td>
		</tr>
	`,
		)
		.join("");

	return `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>Дополнительное соглашение № ${draft.agreementNumber}</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 13px; color: #0f172a; line-height: 1.5; padding: 24px; }
		h1 { font-size: 17px; text-align: center; margin-bottom: 4px; text-transform: uppercase; }
		.subtitle { text-align: center; color: #475569; font-size: 12px; margin-bottom: 20px; }
		.parties { margin-bottom: 16px; text-align: justify; }
		table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
		th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
		.totals { margin: 16px 0; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
		.signatures { display: flex; justify-content: space-between; margin-top: 40px; }
		.sig-col { width: 45%; }
		.sig-line { border-bottom: 1px solid #0f172a; margin-top: 40px; }
	</style>
</head>
<body>
	<h1>ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ № ${draft.agreementNumber}</h1>
	<div class="subtitle">к Договору на оказание платных медицинских услуг № ${draft.contractNumber || draft.planNumber} и Плану лечения № ${draft.planNumber}</div>
	
	<div class="parties">
		<strong>${draft.clinicLegalName}</strong>, именуемое в дальнейшем «Исполнитель», в лице лечащего врача <strong>${draft.doctorFullName}</strong>, с одной стороны, и Пациент (Заказчик) <strong>${draft.patientFullName}</strong>, с другой стороны, совместно именуемые «Стороны», заключили настоящее Дополнительное соглашение о нижеследующем:
	</div>

	<p>1. В связи с изменением клинической картины / актуализацией прейскуранта медицинских услуг Стороны пришли к соглашению изложить стоимость следующих позиций плана лечения в новой редакции:</p>

	<table>
		<thead>
			<tr>
				<th style="width:30px;text-align:center;">№</th>
				<th style="width:60px;text-align:center;">Область</th>
				<th>Наименование услуги (Номенклатура 804н)</th>
				<th style="width:40px;text-align:center;">Кол-во</th>
				<th style="width:90px;text-align:right;">Старая цена</th>
				<th style="width:90px;text-align:right;">Новая цена</th>
				<th style="width:100px;text-align:right;">Итого</th>
				<th>Основание</th>
			</tr>
		</thead>
		<tbody>
			${itemsHtml}
		</tbody>
	</table>

	<div class="totals">
		<div><strong>Прежняя согласованная стоимость плана:</strong> ${formatKopecksRu(draft.previousPlanTotalKopecks)}</div>
		<div><strong>Скорректированная общая стоимость плана:</strong> ${newTotalFormatted} (${newTotalWords} рублей 00 коп.)</div>
		<div><strong>Дельта изменения стоимости:</strong> ${draft.deltaKopecks >= 0 ? "+" : ""}${deltaFormatted} (${deltaWords} рублей)</div>
		${
			draft.clinicAbsorptionKopecks > 0
				? `<div style="color:#059669;font-weight:600;margin-top:4px;">Гарантийная скидка/абсорбция клиникой в рамках фиксации цен: ${formatKopecksRu(draft.clinicAbsorptionKopecks)}</div>`
				: ""
		}
	</div>

	<p>2. Основание внесения изменений: ${draft.justificationRu}</p>
	<p>3. Настоящее Дополнительное соглашение составлено в двух экземплярах, имеющих равную юридическую силу, по одному для каждой из Сторон, и вступает в силу с момента его подписания.</p>

	<div class="signatures">
		<div class="sig-col">
			<strong>ИСПОЛНИТЕЛЬ:</strong><br />
			${draft.clinicLegalName}<br />
			ИНН ${draft.clinicInn} ОГРН ${draft.clinicOgrn}<br />
			Адрес: ${draft.clinicAddress}<br />
			Врач: ${draft.doctorFullName}<br />
			<div class="sig-line"></div>
			<div style="font-size:10px;color:#64748b;text-align:center;margin-top:2px;">(подпись, М.П.)</div>
		</div>
		<div class="sig-col">
			<strong>ПАЦИЕНТ (ЗАКАЗЧИК):</strong><br />
			${draft.patientFullName}<br />
			Документ: ${draft.patientPassportOrDoc ?? "Паспорт гражданина РФ"}<br />
			<br />
			Со стоимостью и объемом согласен:<br />
			<div class="sig-line"></div>
			<div style="font-size:10px;color:#64748b;text-align:center;margin-top:2px;">(личная подпись Пациента / Заказчика)</div>
		</div>
	</div>
</body>
</html>
	`.trim();
}

export interface PriceLockEvaluationStatus {
	readonly isLocked: boolean;
	readonly isExpired: boolean;
	readonly daysRemaining: number;
	readonly daysElapsed: number;
	readonly badgeText: string;
	readonly policy: PriceLockPolicyConfig;
}

export function calculatePriceLockStatus(
	createdAtIso: string,
	policy: PriceLockPolicyConfig = PRICE_LOCK_POLICY_CONFIGS.standard_30_days,
	isSignedWithPatient = false,
): PriceLockEvaluationStatus {
	const createdMs = new Date(createdAtIso).getTime();
	const nowMs = Date.now();
	const daysElapsed = Math.max(0, Math.floor((nowMs - createdMs) / (1000 * 60 * 60 * 24)));
	const validityDays = policy.validityDays;

	let isLocked = false;
	let isExpired = false;
	let daysRemaining = 0;

	if (policy.id === "strict_fixed_contract") {
		isLocked = isSignedWithPatient;
		isExpired = false;
		daysRemaining = 365;
	} else if (policy.id === "market_floating") {
		isLocked = false;
		isExpired = false;
		daysRemaining = 0;
	} else {
		if (daysElapsed <= validityDays) {
			isLocked = true;
			isExpired = false;
			daysRemaining = validityDays - daysElapsed;
		} else {
			isLocked = isSignedWithPatient;
			isExpired = !isSignedWithPatient;
			daysRemaining = 0;
		}
	}

	const badgeText = isLocked
		? `Фиксация цены (${daysRemaining > 0 ? `осталось ${daysRemaining} дн.` : "по договору"})`
		: isExpired
			? `Срок гарантии цены истек (${daysElapsed} дн.)`
			: "По прайсу клиники";

	return {
		isLocked,
		isExpired,
		daysRemaining,
		daysElapsed,
		badgeText,
		policy,
	};
}

