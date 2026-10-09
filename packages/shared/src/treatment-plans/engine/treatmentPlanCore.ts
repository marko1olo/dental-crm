/**
 * DENTE Dental CRM — Multi-Option Treatment Plan & Phased Clinical Estimate Engine
 * Layer 2: Core Treatment Plan Engine & Statutory Appendix 1 Generator
 *
 * Fully compliant with:
 * - Постановление Правительства РФ от 11.05.2023 № 736 «Об утверждении Правил предоставления медицинскими организациями платных медицинских услуг»
 * - Постановление Правительства РФ № 659 (порядок согласования планов лечения и смет с пациентами)
 * - Форма 043/у «Медицинская карта стоматологического пациента»
 * - Приказ Минздрава России от 13.10.2017 № 804н
 * - Стандарт нумерации зубов FDI / ISO 3950
 */

import {
	type Kopecks,
	multiplyKopecks,
	percentageOfKopecks,
	sumKopecks,
	formatKopecksRu,
} from "../../utils/money.js";
import {
	generateTreatmentPlanId,
	generateTreatmentPlanNumber,
} from "../../utils/idGenerators.js";
import { isValidToothFdi } from "../../radiology/hotFolderSyncEngine.js";
import {
	PLAN_STAGE_METADATA,
	PLAN_TIER_CONFIGS,
	DEFAULT_CLINIC_LEGAL_REQUISITES,
	type PlanTierKey,
	type PlanStageKind,
	type TreatmentPlanItemInput,
	type TreatmentPlanItem,
	type TreatmentPlanStageSummary,
	type TreatmentPlanTierEstimate,
	type MultiOptionTreatmentPlanInput,
	type MultiOptionTreatmentPlan,
	type ClinicLegalRequisites,
	type TreatmentPlanAppendix1DocumentData,
} from "./types.js";
import {
	classifyProcedureStage,
	isProcedureHighCostCode02,
} from "./stageSequencingRules.js";
import {
	splitLaborAndMaterials,
	calculateTierInstallments,
	calculateTierNdflDeduction,
	escapeHtml,
	formatRublesFromKopecks,
	convertKopecksToRussianWords,
} from "./financialWarrantyCalculator.js";

/**
 * Создание нормализованного элемента плана лечения.
 */
export function normalizeTreatmentPlanItem(
	input: TreatmentPlanItemInput,
	tierKey: PlanTierKey,
	index: number,
): TreatmentPlanItem {
	const id = input.id || `item_${tierKey}_${index + 1}_${Date.now()}`;
	const quantity = Number.isInteger(input.quantity) && (input.quantity ?? 1) > 0 ? (input.quantity ?? 1) : 1;
	const unitPriceKopecks = Math.max(0, Math.round(input.unitPriceKopecks || 0));
	const grossCostKopecks = multiplyKopecks(unitPriceKopecks, quantity);
	const discountKopecks = Math.min(grossCostKopecks, Math.max(0, Math.round(input.discountKopecks || 0)));
	const netCostKopecks = grossCostKopecks - discountKopecks;

	const stageKind = input.stageKind || classifyProcedureStage(input.code804n, input.categoryRu);
	const stageNumber = PLAN_STAGE_METADATA[stageKind].stageNumber;
	const isHighCost = typeof input.isHighCostCode02 === "boolean"
		? input.isHighCostCode02
		: isProcedureHighCostCode02(input.code804n, input.nameRu, input.categoryRu);

	const { laborKopecks, materialsKopecks } = splitLaborAndMaterials(
		netCostKopecks,
		tierKey,
		input.laborKopecks,
		input.materialsKopecks,
	);

	let toothNumber: number | null = null;
	if (typeof input.toothNumber === "number" && isValidToothFdi(input.toothNumber)) {
		toothNumber = input.toothNumber;
	}

	return {
		id,
		toothNumber,
		surfaces: Array.isArray(input.surfaces) ? [...input.surfaces] : [],
		code804n: (input.code804n || "A16.07.002").trim(),
		nameRu: (input.nameRu || "Стоматологическая процедура").trim(),
		categoryRu: (input.categoryRu || "Терапия").trim(),
		stageKind,
		stageNumber,
		tierKey,
		unitPriceKopecks,
		quantity,
		grossCostKopecks,
		discountKopecks,
		netCostKopecks,
		laborKopecks,
		materialsKopecks,
		totalCostKopecks: netCostKopecks,
		materialNameRu: (input.materialNameRu || "").trim(),
		clinicalRationaleRu: (input.clinicalRationaleRu || "").trim(),
		isHighCostCode02: isHighCost,
		status: input.status || "planned",
		doctorId: input.doctorId ?? null,
		doctorName: input.doctorName ?? null,
		doctorSpecialty: input.doctorSpecialty ?? null,
	};
}

/**
 * Расчет одного варианта сметы (Tier) со структурированием по 3 клиническим этапам.
 */
export function calculateSingleTierEstimate(
	tierKey: PlanTierKey,
	rawItems: readonly TreatmentPlanItemInput[],
): TreatmentPlanTierEstimate {
	const config = PLAN_TIER_CONFIGS[tierKey];
	const filteredInputs = rawItems.filter((it) => !it.tierKey || it.tierKey === tierKey);

	const normalizedItems = filteredInputs.map((it, idx) =>
		normalizeTreatmentPlanItem(it, tierKey, idx),
	);

	// Разделение по 3 клиническим этапам
	const stageKinds: PlanStageKind[] = [
		"stage_1_therapy",
		"stage_2_surgery",
		"stage_3_orthopedics",
	];

	const stages: TreatmentPlanStageSummary[] = stageKinds.map((kind) => {
		const meta = PLAN_STAGE_METADATA[kind];
		const stageItems = normalizedItems.filter((it) => it.stageKind === kind);

		const grossCostKopecks = sumKopecks(stageItems.map((it) => it.grossCostKopecks));
		const discountKopecks = sumKopecks(stageItems.map((it) => it.discountKopecks));
		const laborKopecks = sumKopecks(stageItems.map((it) => it.laborKopecks));
		const materialsKopecks = sumKopecks(stageItems.map((it) => it.materialsKopecks));
		const stageCostKopecks = sumKopecks(stageItems.map((it) => it.netCostKopecks));

		const treatedTeethSet = new Set<number>();
		for (const it of stageItems) {
			if (it.toothNumber !== null) treatedTeethSet.add(it.toothNumber);
		}

		const orderCodesSet = new Set<string>();
		for (const it of stageItems) {
			if (it.code804n) orderCodesSet.add(it.code804n);
		}

		// Расчет визитов и дней: 1 визит на каждые 2-3 процедуры, минимум 1 визит при наличии процедур
		const estimatedVisits = stageItems.length === 0 ? 0 : Math.max(1, Math.ceil(stageItems.length / 2));
		const estimatedDurationDays = estimatedVisits === 0 ? 0 : (estimatedVisits - 1) * 7 + 1;

		const isPennyExact = (laborKopecks + materialsKopecks === stageCostKopecks) &&
			(grossCostKopecks - discountKopecks === stageCostKopecks);

		return {
			stageNumber: meta.stageNumber,
			stageKind: kind,
			titleRu: meta.titleRu,
			subtitleRu: meta.subtitleRu,
			clinicalGoalRu: meta.clinicalGoalRu,
			items: stageItems,
			itemCount: stageItems.length,
			grossCostKopecks,
			discountKopecks,
			laborKopecks,
			materialsKopecks,
			stageCostKopecks,
			estimatedVisits,
			estimatedDurationDays,
			order804nCodes: Array.from(orderCodesSet),
			treatedTeeth: Array.from(treatedTeethSet).sort((a, b) => a - b),
			isPennyExact,
		};
	});

	const grossCostKopecks = sumKopecks(stages.map((s) => s.grossCostKopecks));
	const discountKopecks = sumKopecks(stages.map((s) => s.discountKopecks));
	const laborKopecks = sumKopecks(stages.map((s) => s.laborKopecks));
	const materialsKopecks = sumKopecks(stages.map((s) => s.materialsKopecks));
	const totalCostKopecks = sumKopecks(stages.map((s) => s.stageCostKopecks));

	const totalVisits = stages.reduce((acc, s) => acc + s.estimatedVisits, 0);
	const totalDurationDays = stages.reduce((acc, s) => acc + s.estimatedDurationDays, 0);
	const totalItemsCount = normalizedItems.length;

	const ndflDeduction = calculateTierNdflDeduction(normalizedItems);
	const installments = calculateTierInstallments(totalCostKopecks);

	const isPennyExact = stages.every((s) => s.isPennyExact) &&
		(laborKopecks + materialsKopecks === totalCostKopecks) &&
		(grossCostKopecks - discountKopecks === totalCostKopecks);

	return {
		tierKey,
		tierNameRu: config.tierNameRu,
		badgeRu: config.badgeRu,
		descriptionRu: config.descriptionRu,
		warrantyYears: config.warrantyYears,
		isRecommended: config.isRecommended,
		materialsHeadlineRu: config.defaultMaterialsHeadlineRu,
		keyAdvantagesRu: config.keyAdvantagesRu,
		stages,
		totalItemsCount,
		grossCostKopecks,
		discountKopecks,
		laborKopecks,
		materialsKopecks,
		totalCostKopecks,
		totalCostRu: formatKopecksRu(totalCostKopecks),
		totalVisits,
		totalDurationDays,
		ndflDeduction,
		installments,
		isPennyExact,
	};
}

/**
 * Создание комплексного многовариантного плана лечения (Варианты А, Б, В).
 */
export function buildMultiOptionTreatmentPlan(
	input: MultiOptionTreatmentPlanInput,
): MultiOptionTreatmentPlan {
	const now = new Date();
	const createdAtIso = input.createdAtIso || now.toISOString();
	const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 дней срок действия сметы
	const validUntilIso = input.validUntilIso || validUntil.toISOString();

	const planId = input.planId || generateTreatmentPlanId();
	const planNumber =
		input.planNumber ||
		generateTreatmentPlanNumber(now, {
			seedKey: `${input.patientId}:${input.doctorFullName}`,
		});
	const clinicId = input.clinicId || "clinic_main";

	const clinicRequisites: ClinicLegalRequisites = {
		...DEFAULT_CLINIC_LEGAL_REQUISITES,
		...(input.clinicRequisites || {}),
	};

	// Применение глобальной скидки, если указана
	let processedItems = input.items;
	if (typeof input.globalDiscountPercent === "number" && input.globalDiscountPercent > 0) {
		const bp = Math.min(10000, Math.max(0, Math.round(input.globalDiscountPercent * 100)));
		processedItems = input.items.map((it) => {
			const qty = it.quantity || 1;
			const gross = multiplyKopecks(it.unitPriceKopecks, qty);
			const discount = percentageOfKopecks(gross, bp);
			return {
				...it,
				discountKopecks: discount,
			};
		});
	}

	const tiers: Record<PlanTierKey, TreatmentPlanTierEstimate> = {
		economy: calculateSingleTierEstimate("economy", processedItems),
		optimum: calculateSingleTierEstimate("optimum", processedItems),
		premium: calculateSingleTierEstimate("premium", processedItems),
	};

	const availableTierKeys: PlanTierKey[] = ["economy", "optimum", "premium"];
	const selectedTierKey = input.selectedTierKey || "optimum";
	const selectedTier = tiers[selectedTierKey];

	const isPennyExact = Object.values(tiers).every((t) => t.isPennyExact);

	return {
		planId,
		planNumber,
		clinicId,
		patientId: input.patientId,
		patientFullName: input.patientFullName.trim(),
		patientBirthDate: input.patientBirthDate || "01.01.1985",
		patientPhone: input.patientPhone || "+7 (___) ___-__-__",
		patientPassport: input.patientPassport || "Паспорт РФ",
		doctorFullName: input.doctorFullName.trim(),
		doctorSpecialty: input.doctorSpecialty || "Врач-стоматолог общей практики",
		clinicalDiagnosisRu: input.clinicalDiagnosisRu.trim(),
		createdAtIso,
		validUntilIso,
		clinicRequisites,
		tiers,
		availableTierKeys,
		selectedTierKey,
		selectedTier,
		isPennyExact,
	};
}

/**
 * Подготовка структурированных данных для официального бланка Приложения №1.
 */
export function buildTreatmentPlanAppendix1Data(
	plan: MultiOptionTreatmentPlan,
	selectedTierKey?: PlanTierKey,
): TreatmentPlanAppendix1DocumentData {
	const tierKey = selectedTierKey || plan.selectedTierKey;
	const tier = plan.tiers[tierKey];

	const createdDate = new Date(plan.createdAtIso);
	const documentDateRu = createdDate.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	const contractNumber = `ДОГ-${createdDate.getFullYear()}-${plan.patientId.slice(0, 6).toUpperCase()}`;
	const licenseText = `Лицензия № ${plan.clinicRequisites.medicalLicenseNumber} от ${plan.clinicRequisites.medicalLicenseDate}, выданная ${plan.clinicRequisites.medicalLicenseIssuer}`;

	return {
		planNumber: plan.planNumber,
		contractNumber,
		documentDateRu,
		clinicFullName: plan.clinicRequisites.clinicFullName,
		clinicInn: plan.clinicRequisites.clinicInn,
		clinicOgrn: plan.clinicRequisites.clinicOgrn,
		clinicAddress: plan.clinicRequisites.clinicAddress,
		clinicLicense: licenseText,
		patientFullName: plan.patientFullName,
		patientBirthDate: plan.patientBirthDate,
		patientPhone: plan.patientPhone,
		doctorFullName: plan.doctorFullName,
		doctorSpecialty: plan.doctorSpecialty,
		clinicalDiagnosisRu: plan.clinicalDiagnosisRu,
		selectedTierNameRu: tier.tierNameRu,
		selectedTierBadgeRu: tier.badgeRu,
		stages: tier.stages,
		totalGrossCostRu: formatRublesFromKopecks(tier.grossCostKopecks),
		totalDiscountRu: formatRublesFromKopecks(tier.discountKopecks),
		totalLaborCostRu: formatRublesFromKopecks(tier.laborKopecks),
		totalMaterialsCostRu: formatRublesFromKopecks(tier.materialsKopecks),
		totalCostKopecks: tier.totalCostKopecks,
		totalCostRu: formatRublesFromKopecks(tier.totalCostKopecks),
		totalCostInWordsRu: convertKopecksToRussianWords(tier.totalCostKopecks),
		warrantyPeriodRu: typeof tier.warrantyYears === "number" ? `${tier.warrantyYears} года (лет)` : String(tier.warrantyYears),
		ndflRefundRu: tier.ndflDeduction.refundRu,
		installment12Ru: tier.installments[12]?.monthlyPaymentRu || "0 ₽",
		termsAndConditionsAccepted: true,
	};
}

/**
 * Генератор официального печатного бланка:
 * «Приложение №1 к Договору на оказание платных медицинских услуг — Предварительный план лечения и смета»
 * строго по Постановлению Правительства РФ № 736.
 */
export function renderTreatmentPlanContractAppendix1Html(
	data: TreatmentPlanAppendix1DocumentData,
): string {
	let itemRowCounter = 0;

	const stagesHtml = data.stages
		.filter((s) => s.itemCount > 0)
		.map((stage) => {
			const itemsRows = stage.items
				.map((it) => {
					itemRowCounter += 1;
					const toothDisplay = it.toothNumber ? `Зуб ${it.toothNumber}` : "—";
					const surfacesDisplay = it.surfaces.length > 0 ? ` (${it.surfaces.join(", ")})` : "";
					const materialDisplay = it.materialNameRu ? `<br><small style="color: #475569;">Материал: ${escapeHtml(it.materialNameRu)}</small>` : "";

					return `
					<tr>
						<td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${itemRowCounter}</td>
						<td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; font-weight: bold; font-family: monospace;">${escapeHtml(it.code804n)}</td>
						<td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">
							<strong>${escapeHtml(it.nameRu)}</strong>${surfacesDisplay}${materialDisplay}
						</td>
						<td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; font-weight: bold;">${toothDisplay}</td>
						<td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${it.quantity}</td>
						<td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${formatRublesFromKopecks(it.unitPriceKopecks)}</td>
						<td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${formatRublesFromKopecks(it.discountKopecks)}</td>
						<td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; font-weight: bold;">${formatRublesFromKopecks(it.totalCostKopecks)}</td>
					</tr>
				`;
				})
				.join("");

			return `
			<div class="stage-section" style="margin-top: 14px; margin-bottom: 14px; page-break-inside: avoid;">
				<div style="background-color: #f1f5f9; padding: 8px 12px; border-left: 4px solid #0284c7; font-weight: bold; font-size: 12px; margin-bottom: 4px; display: flex; justify-content: space-between;">
					<span>${escapeHtml(stage.titleRu)}</span>
					<span style="color: #0369a1;">Итого по этапу: ${formatRublesFromKopecks(stage.stageCostKopecks)}</span>
				</div>
				<p style="font-size: 10px; color: #64748b; margin: 2px 0 6px 0; font-style: italic;">
					Цель этапа: ${escapeHtml(stage.clinicalGoalRu)} (Ориентировочно: ${stage.estimatedVisits} визита(ов), ${stage.estimatedDurationDays} дн.)
				</p>
				<table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
					<thead>
						<tr style="background-color: #f8fafc; font-size: 10px; text-transform: uppercase; color: #475569;">
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 30px;">№</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 90px;">Код 804н</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px;">Наименование медицинской услуги</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 60px;">Локализация (FDI)</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 40px;">Кол-во</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 75px;">Цена, руб.</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 65px;">Скидка</th>
							<th style="border: 1px solid #cbd5e1; padding: 6px; width: 85px;">Стоимость</th>
						</tr>
					</thead>
					<tbody>
						${itemsRows}
					</tbody>
				</table>
			</div>
		`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Приложение №1 к Договору — План лечения № ${escapeHtml(data.planNumber)}</title>
	<style>
		@page {
			size: A4;
			margin: 12mm 15mm 15mm 15mm;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			color: #0f172a;
			line-height: 1.35;
			font-size: 11px;
			background-color: #ffffff;
			margin: 0;
			padding: 0;
		}
		.document-header {
			text-align: right;
			font-size: 10px;
			color: #475569;
			margin-bottom: 12px;
		}
		.document-title {
			text-align: center;
			font-size: 14px;
			font-weight: 800;
			text-transform: uppercase;
			margin-bottom: 4px;
			letter-spacing: 0.5px;
		}
		.document-subtitle {
			text-align: center;
			font-size: 11px;
			color: #334155;
			margin-bottom: 14px;
		}
		.meta-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 10px;
			margin-bottom: 14px;
			padding: 10px;
			border: 1px solid #e2e8f0;
			border-radius: 4px;
			background-color: #f8fafc;
		}
		.meta-item {
			font-size: 10.5px;
		}
		.meta-label {
			font-weight: 600;
			color: #475569;
		}
		.summary-box {
			margin-top: 14px;
			padding: 10px;
			border: 1px solid #cbd5e1;
			background-color: #f8fafc;
			border-radius: 4px;
			page-break-inside: avoid;
		}
		.legal-notice {
			font-size: 9.5px;
			color: #475569;
			line-height: 1.3;
			margin-top: 12px;
			margin-bottom: 16px;
			text-align: justify;
		}
		.signatures-table {
			width: 100%;
			margin-top: 18px;
			border-collapse: collapse;
			page-break-inside: avoid;
		}
		.signatures-table td {
			vertical-align: top;
			padding: 0 10px;
			font-size: 10.5px;
		}
		.sign-line {
			border-bottom: 1px solid #0f172a;
			margin-top: 35px;
			margin-bottom: 4px;
		}
		@media print {
			body {
				-webkit-print-color-adjust: exact;
				print-color-adjust: exact;
			}
		}
	</style>
</head>
<body>

	<div class="document-header">
		Приложение № 1<br>
		к Договору на оказание платных медицинских услуг № ${escapeHtml(data.contractNumber)}<br>
		от «${escapeHtml(data.documentDateRu)}»
	</div>

	<div class="document-title">
		ПРЕДВАРИТЕЛЬНЫЙ ПЛАН ЛЕЧЕНИЯ И СМЕТА РАСХОДОВ № ${escapeHtml(data.planNumber)}
	</div>
	<div class="document-subtitle">
		(в соответствии с Постановлением Правительства РФ от 11.05.2023 № 736 и Номенклатурой услуг Приказа МЗ РФ № 804н)
	</div>

	<div class="meta-grid">
		<div>
			<div class="meta-item"><span class="meta-label">Медицинская организация:</span> ${escapeHtml(data.clinicFullName)}</div>
			<div class="meta-item"><span class="meta-label">ИНН / ОГРН:</span> ${escapeHtml(data.clinicInn)} / ${escapeHtml(data.clinicOgrn)}</div>
			<div class="meta-item"><span class="meta-label">Адрес клиники:</span> ${escapeHtml(data.clinicAddress)}</div>
			<div class="meta-item"><span class="meta-label">Лицензия:</span> ${escapeHtml(data.clinicLicense)}</div>
		</div>
		<div>
			<div class="meta-item"><span class="meta-label">Пациент (ФИО):</span> <strong>${escapeHtml(data.patientFullName)}</strong></div>
			<div class="meta-item"><span class="meta-label">Дата рождения:</span> ${escapeHtml(data.patientBirthDate)} (Тел: ${escapeHtml(data.patientPhone)})</div>
			<div class="meta-item"><span class="meta-label">Лечащий врач:</span> <strong>${escapeHtml(data.doctorFullName)}</strong> (${escapeHtml(data.doctorSpecialty)})</div>
			<div class="meta-item"><span class="meta-label">Клинический диагноз:</span> ${escapeHtml(data.clinicalDiagnosisRu)}</div>
			<div class="meta-item"><span class="meta-label">Выбранный план лечения:</span> <strong style="color: #0284c7;">${escapeHtml(data.selectedTierNameRu)}</strong></div>
		</div>
	</div>

	<!-- ТАБЛИЦЫ ЭТАПОВ ЛЕЧЕНИЯ -->
	${stagesHtml}

	<!-- ИТОГОВЫЙ ФИНАНСОВЫЙ БЛОК -->
	<div class="summary-box">
		<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
			<tr>
				<td style="padding: 3px 0; color: #475569;">Сумма по прейскуранту (без учета скидки):</td>
				<td style="padding: 3px 0; text-align: right; font-family: monospace;">${escapeHtml(data.totalGrossCostRu)}</td>
			</tr>
			<tr>
				<td style="padding: 3px 0; color: #475569;">Предоставленная скидка клиники:</td>
				<td style="padding: 3px 0; text-align: right; font-family: monospace; color: #16a34a;">− ${escapeHtml(data.totalDiscountRu)}</td>
			</tr>
			<tr>
				<td style="padding: 3px 0; color: #64748b; font-size: 10px;">В том числе стоимость медицинских работ (оплата труда персонала):</td>
				<td style="padding: 3px 0; text-align: right; font-family: monospace; color: #64748b; font-size: 10px;">${escapeHtml(data.totalLaborCostRu)}</td>
			</tr>
			<tr>
				<td style="padding: 3px 0; color: #64748b; font-size: 10px;">В том числе стоимость медикаментов и стоматологических материалов:</td>
				<td style="padding: 3px 0; text-align: right; font-family: monospace; color: #64748b; font-size: 10px;">${escapeHtml(data.totalMaterialsCostRu)}</td>
			</tr>
			<tr style="border-top: 1px solid #cbd5e1; font-weight: bold; font-size: 13px;">
				<td style="padding: 6px 0; color: #0f172a;">ИТОГО К ОПЛАТЕ ПО СМЕТЕ:</td>
				<td style="padding: 6px 0; text-align: right; color: #0284c7; font-family: monospace;">${escapeHtml(data.totalCostRu)}</td>
			</tr>
		</table>
		<div style="margin-top: 6px; font-size: 10.5px; font-style: italic; color: #334155;">
			Сумма прописью: <strong>${escapeHtml(data.totalCostInWordsRu)}</strong>
		</div>
		<div style="margin-top: 6px; font-size: 10px; color: #475569; display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
			<span>Гарантийный срок на выполненные работы: <strong>${escapeHtml(data.warrantyPeriodRu)}</strong></span>
			<span>Возврат НДФЛ 13% (ст. 219 НК РФ): <strong>до ${escapeHtml(data.ndflRefundRu)}</strong></span>
			<span>Рассрочка 0% на 12 мес.: <strong>${escapeHtml(data.installment12Ru)} / мес.</strong></span>
		</div>
	</div>

	<div class="legal-notice">
		1. Настоящий План лечения и смета являются предварительными и согласованы Сторонами при первичном клиническом обследовании.<br>
		2. В случае необходимости изменения плана лечения в процессе его реализации (выявление скрытых кариозных полостей, анатомических особенностей каналов, необходимость дополнительной костной пластики) Исполнитель своевременно предупреждает Пациента и составляет Дополнительное соглашение (п. 22 Правил № 736).<br>
		3. Пациент уведомлен о применяемых лекарственных средствах, медицинских изделиях, гарантийных обязательствах и правилах личной гигиены полости рта.
	</div>

	<!-- ПОЛЯ ПОДПИСЕЙ СТОРОН -->
	<table class="signatures-table">
		<tr>
			<td style="width: 48%;">
				<strong>ИСПОЛНИТЕЛЬ:</strong><br>
				Врач: ${escapeHtml(data.doctorFullName)}<br>
				Специальность: ${escapeHtml(data.doctorSpecialty)}<br>
				<div class="sign-line"></div>
				<div style="font-size: 9px; color: #64748b; text-align: center;">(подпись, личная печать врача)</div>
				<div style="margin-top: 6px;">М.П. Клиники «${escapeHtml(data.documentDateRu)}»</div>
			</td>
			<td style="width: 4%;"></td>
			<td style="width: 48%;">
				<strong>ПАЦИЕНТ (ПОТРЕБИТЕЛЬ):</strong><br>
				ФИО: ${escapeHtml(data.patientFullName)}<br>
				С планом лечения, сроками и сметой расходов ознакомлен и согласен.<br>
				<div class="sign-line"></div>
				<div style="font-size: 9px; color: #64748b; text-align: center;">(личная подпись Пациента / законного представителя)</div>
				<div style="margin-top: 6px;">«${escapeHtml(data.documentDateRu)}»</div>
			</td>
		</tr>
	</table>

</body>
</html>`;
}
