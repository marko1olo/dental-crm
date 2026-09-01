/**
 * @dental/shared/anesthesia/pkuDisposal.ts
 * SanPiN 3.3686-21 Statutory Anesthesia PKU Ledger & Carpule Disposal Act Engine
 * Subject-quantitative accounting (ПКУ), disinfection Class B waste, nurse/assistant accountability.
 */

import { ANESTHESIA_DRUG_CATALOG } from "./catalog.js";
import type {
	AnesthesiaCarpuleBatchInfo,
	AnesthesiaPkuDisposalRecord,
	AnesthesiaPkuSummaryLedger,
	PreoperativeVitalsChecklist,
} from "./types.js";

/**
 * Валидирует срок годности карпулы/ампулы анестетика с точностью до дня.
 * Использование просроченных анестетиков категорически запрещено!
 */
export function validateCarpuleExpirationDate(
	expDateString: string,
	referenceDateIso?: string,
): {
	isExpired: boolean;
	daysRemaining: number;
	formattedExpDateRu: string;
	warningRu: string | null;
} {
	const trimmed = (expDateString ?? "").trim();
	if (!trimmed) {
		return {
			isExpired: false,
			daysRemaining: 999,
			formattedExpDateRu: "Не указан",
			warningRu: "Внимание: срок годности карпулы не указан в карте!",
		};
	}

	const now = referenceDateIso ? new Date(referenceDateIso) : new Date();
	let expDate: Date;

	// Поддержка форматов "ГГГГ-ММ-ДД", "ГГГГ-ММ", "ММ.ГГГГ", "ДД.ММ.ГГГГ"
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		expDate = new Date(trimmed);
	} else if (/^\d{4}-\d{2}$/.test(trimmed)) {
		const [year, month] = trimmed.split("-").map(Number);
		// Последний день месяца
		expDate = new Date(year ?? 2026, month ?? 1, 0, 23, 59, 59);
	} else if (/^\d{2}\.\d{4}$/.test(trimmed)) {
		const [month, year] = trimmed.split(".").map(Number);
		expDate = new Date(year ?? 2026, month ?? 1, 0, 23, 59, 59);
	} else if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
		const [day, month, year] = trimmed.split(".").map(Number);
		expDate = new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1, 23, 59, 59);
	} else {
		expDate = new Date(trimmed);
	}

	if (Number.isNaN(expDate.getTime())) {
		return {
			isExpired: false,
			daysRemaining: 999,
			formattedExpDateRu: trimmed,
			warningRu: `Нестандартный формат даты срока годности: «${trimmed}». Проверьте маркировку на карпуле.`,
		};
	}

	const diffMs = expDate.getTime() - now.getTime();
	const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	const isExpired = daysRemaining < 0;

	const formattedExpDateRu = expDate.toLocaleDateString("ru-RU", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});

	let warningRu: string | null = null;
	if (isExpired) {
		warningRu = `КРИТИЧЕСКИЙ ЗАПРЕТ: Срок годности партии карпул ИСТЁК ${Math.abs(daysRemaining)} дн. назад (${formattedExpDateRu})! Применение запрещено ст. 69 ФЗ № 323 и СанПиН 3.3686-21.`;
	} else if (daysRemaining <= 30) {
		warningRu = `ВНИМАНИЕ: Срок годности карпул истекает через ${daysRemaining} дн. (${formattedExpDateRu}). Партия подлежит приоритетному списанию.`;
	}

	return {
		isExpired,
		daysRemaining,
		formattedExpDateRu,
		warningRu,
	};
}

/**
 * Оценивает соматическую безопасность пациента по предоперационным витальным показателям (АД, ЧСС, SpO2).
 */
export function evaluatePreoperativeVitalsSafety(vitals: PreoperativeVitalsChecklist): {
	isHemodynamicallyStable: boolean;
	isCrisis: boolean;
	warnings: string[];
	recommendedActionRu: string | null;
} {
	const warnings: string[] = [];
	let isCrisis = false;
	let isHemodynamicallyStable = true;
	let recommendedActionRu: string | null = null;

	const sys = vitals.bpSystolic;
	const dia = vitals.bpDiastolic;
	const hr = vitals.heartRateBpm;
	const spo2 = vitals.spo2Percent;

	// 1. Артериальное давление
	if (typeof sys === "number" && typeof dia === "number") {
		if (sys >= 180 || dia >= 110) {
			isCrisis = true;
			isHemodynamicallyStable = false;
			warnings.push(
				`ГИПЕРТОНИЧЕСКИЙ КРИЗ: АД ${sys}/${dia} мм рт. ст. (Кризовое течение / III стадия). Плановое вмешательство отложить! Вазоконстрикторы абсолютно противопоказаны. Оказание неотложной помощи по протоколу криза.`,
			);
			recommendedActionRu = "Отложить плановое вмешательство. Купировать криз (Каптоприл 25 мг / Моксонидин 0.2 мг). При неотложном приеме — только Мепивакаин 3%.";
		} else if (sys >= 160 || dia >= 100) {
			isHemodynamicallyStable = false;
			warnings.push(
				`АРТЕРИАЛЬНАЯ ГИПЕРТЕНЗИЯ II СТ.: АД ${sys}/${dia} мм рт. ст. Лимит адреналина строго <= 0.04 мг (макс. 2 карпулы 1:100 000 или 4 карпулы 1:200 000). Препарат выбора — Мепивакаин 3% (Скандонест).`,
			);
			if (!recommendedActionRu) {
				recommendedActionRu = "Рекомендуется Скандонест 3% (без адреналина) или Ультракаин Д-С 1:200k с мониторингом АД каждые 15 минут.";
			}
		} else if (sys <= 90 || dia <= 55) {
			warnings.push(
				`АРТЕРИАЛЬНАЯ ГИПОТОНИЯ: АД ${sys}/${dia} мм рт. ст. Риск ортостатического коллапса и синкопе при быстром подъеме кресла. Не использовать препараты с выраженным вазодилатирующим эффектом.`,
			);
		}
	}

	// 2. Частота сердечных сокращений (пульс)
	if (typeof hr === "number") {
		if (hr > 100) {
			warnings.push(
				`ТАХИКАРДИЯ: ЧСС ${hr} уд/мин. Адреналинсодержащие анестетики могут спровоцировать пароксизм аритмии и ишемию миокарда. Препарат выбора — Мепивакаин 3%.`,
			);
			if (!recommendedActionRu) {
				recommendedActionRu = "Использовать Мепивакаин 3% (Скандонест) без вазоконстриктора для предотвращения усиления тахикардии.";
			}
		} else if (hr < 50) {
			warnings.push(
				`ВЫРАЖЕННАЯ БРАДИКАРДИЯ: ЧСС ${hr} уд/мин. Исключить АВ-блокаду II-III степени перед введением анестетиков амидного ряда.`,
			);
		}
	}

	// 3. Сатурация кислорода
	if (typeof spo2 === "number") {
		if (spo2 < 92) {
			isHemodynamicallyStable = false;
			warnings.push(
				`ГИПОКСЕМИЯ: SpO2 ${spo2}%. Немедленная оксигенотерапия (кислород 4-6 л/мин через маску). Исключить бронхоспазм и дыхательную недостаточность.`,
			);
		} else if (spo2 < 95) {
			warnings.push(
				`Умеренное снижение сатурации: SpO2 ${spo2}%. Рекомендуется подача кислорода и контроль экскурсии грудной клетки.`,
			);
		}
	}

	return {
		isHemodynamicallyStable,
		isCrisis,
		warnings,
		recommendedActionRu,
	};
}

/**
 * Создает структурированную запись ПКУ и акта утилизации карпул по СанПиН 3.3686-21.
 */
export function createAnesthesiaPkuRecord(
	params: Omit<AnesthesiaPkuDisposalRecord, "id" | "recordNumber"> & {
		id?: string | undefined;
		recordNumber?: string | undefined;
	},
): AnesthesiaPkuDisposalRecord {
	const genId = params.id || `pku_an_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
	const year = new Date().getFullYear();
	const randomNum = Math.floor(100 + Math.random() * 900);
	const recordNumber = params.recordNumber || `ПКУ-АН-${year}/${randomNum}`;

	return {
		...params,
		id: genId,
		recordNumber,
	};
}

/**
 * Генерирует официальный текстовый Акт списания и утилизации карпул анестетиков по правилам СанПиН 3.3686-21.
 */
export function generateAnesthesiaPkuDisposalAct(record: AnesthesiaPkuDisposalRecord): string {
	const drugSpec = ANESTHESIA_DRUG_CATALOG[record.drugId];
	const drugTradeName = drugSpec?.tradeNamesRu[0] ?? record.drugNameRu;

	const reasonText =
		record.disposalReason === "used_in_procedure"
			? "полное израсходование при проведении анестезии на стоматологическом приеме"
			: record.disposalReason === "damaged_broken"
				? "механическое повреждение / бой карпулы"
				: record.disposalReason === "expired"
					? "истечение установленного срока годности препарата"
					: "вскрытая неиспользованная остаточная доза";

	const disinfectionText =
		record.disinfectionMethod === "chemical_disinfection"
			? `Химическая дезинфекция путем полного погружения в раствор препарата «${record.disinfectantNameRu}» с экспозицией ${record.disinfectantExposureMinutes} мин`
			: "Автоклавирование в паровом стерилизаторе (деструктивный метод)";

	return [
		"═══════════════════════════════════════════════════════════════════════════════",
		"  АКТ СПИСАНИЯ И УТИЛИЗАЦИИ МЕСТНЫХ АНЕСТЕТИКОВ И ПКУ (САНПИН 3.3686-21)",
		`  Регистрационный номер: ${record.recordNumber} от ${record.dateIso} ${record.time}`,
		"═══════════════════════════════════════════════════════════════════════════════",
		`Медицинская организация: ${record.clinicName} (Кабинет № ${record.cabinetNumber})`,
		`Пациент: ${record.patientFullName} | Медкарта 043/у №: ${record.medicalCardNumber043}`,
		`Лечащий врач: ${record.doctorFullName}`,
		`Ответственная медсестра / ассистент: ${record.nurseFullName}`,
		"───────────────────────────────────────────────────────────────────────────────",
		"СВЕДЕНИЯ О СПИСЫВАЕМОМ ПРЕПАРАТЕ:",
		`• Препарат: «${drugTradeName}» (${record.activeSubstanceRu})`,
		`• Серия производителя: ${record.seriesNumber} | Партия: ${record.batchNumber}`,
		`• Срок годности: ${record.expirationDate}`,
		`• Количество израсходованных карпул: ${record.carpulesUsedCount} шт. (${record.volumeMlTotal} мл)`,
		`• Количество утилизированных пустых/поврежденных карпул: ${record.carpulesDisposedCount} шт.`,
		`• Причина списания: ${reasonText}`,
		"───────────────────────────────────────────────────────────────────────────────",
		"ОБЕЗЗАРАЖИВАНИЕ И УТИЛИЗАЦИЯ (СанПиН 3.3686-21 раздел X):",
		`• Класс эпидемиологической опасности медицинских отходов: Класс Б (эпидемиологически опасные)`,
		`• Метод обеззараживания: ${disinfectionText}`,
		`• Тара для сбора: Одноразовый непрокалываемый желтый контейтер с иглосъемником для колющих отходов Класса Б`,
		"───────────────────────────────────────────────────────────────────────────────",
		"ПОДПИСИ ОТВЕТСТВЕННЫХ ЛИЦ:",
		`Врач-стоматолог: ____________________ / ${record.doctorFullName} /`,
		`Медицинская сестра / ассистент: ____________________ / ${record.nurseFullName} / ${record.assistantSignatureConfirmed ? "[ЭЦП ПОДТВЕРЖДЕНА]" : "[ТРЕБУЕТСЯ ПОДПИСЬ]"}`,
		"═══════════════════════════════════════════════════════════════════════════════",
	].join("\n");
}

/**
 * Генерирует журнал/акт утилизации в журнал СанПиН для печати (HTML/CSS).
 */
export function generateAnesthesiaPkuDisposalHtml(record: AnesthesiaPkuDisposalRecord): string {
	const drugSpec = ANESTHESIA_DRUG_CATALOG[record.drugId];
	const drugTradeName = drugSpec?.tradeNamesRu[0] ?? record.drugNameRu;

	return `
<div class="sanpin-pku-act-document" style="font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #0f172a; max-width: 760px; margin: 0 auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff;">
  <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px;">
    <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; color: #0369a1;">${record.clinicName}</div>
    <div style="font-size: 11pt; font-weight: bold; margin-top: 4px;">АКТ СПИСАНИЯ И УТИЛИЗАЦИИ КАРПУЛ АНЕСТЕТИКА (ПКУ)</div>
    <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">В соответствии с СанПиН 3.3686-21 «Санитарно-эпидемиологические требования по профилактике инфекционных болезней» (раздел X)</div>
    <div style="font-size: 9pt; font-weight: 600; margin-top: 6px; color: #0284c7;">Акт № ${record.recordNumber} от ${record.dateIso} ${record.time}</div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 9.5pt;">
    <tr>
      <td style="padding: 4px 8px; font-weight: bold; width: 35%; border-bottom: 1px solid #e2e8f0;">Пациент:</td>
      <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0;">${record.patientFullName} (Карта 043/у № ${record.medicalCardNumber043})</td>
    </tr>
    <tr>
      <td style="padding: 4px 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Кабинет / Врач:</td>
      <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0;">Кабинет № ${record.cabinetNumber} | ${record.doctorFullName}</td>
    </tr>
    <tr>
      <td style="padding: 4px 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Медсестра / Ассистент:</td>
      <td style="padding: 4px 8px; border-bottom: 1px solid #e2e8f0;">${record.nurseFullName}</td>
    </tr>
  </table>

  <div style="font-weight: bold; font-size: 10pt; color: #0369a1; margin-bottom: 6px; border-left: 3px solid #0284c7; padding-left: 6px;">
    1. Сведения об использованном и списанном препарате:
  </div>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 9pt; border: 1px solid #cbd5e1;">
    <thead style="background: #f8fafc;">
      <tr>
        <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">Наименование ЛС</th>
        <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">Серия / Партия</th>
        <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">Срок годности</th>
        <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">Кол-во карпул</th>
        <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">Объем (мл)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 6px;"><strong>«${drugTradeName}»</strong><br><span style="font-size: 8pt; color: #64748b;">${record.activeSubstanceRu}</span></td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">Серия ${record.seriesNumber}<br>Партия № ${record.batchNumber}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${record.expirationDate}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold;">${record.carpulesUsedCount} шт.</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${record.volumeMlTotal} мл</td>
      </tr>
    </tbody>
  </table>

  <div style="font-weight: bold; font-size: 10pt; color: #0369a1; margin-bottom: 6px; border-left: 3px solid #0284c7; padding-left: 6px;">
    2. Обеззараживание и утилизация отходов (СанПиН 3.3686-21):
  </div>
  <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 8.5pt; margin-bottom: 16px;">
    <div><strong>Класс отходов:</strong> Медицинские отходы Класса Б (эпидемиологически опасные).</div>
    <div><strong>Способ дезинфекции:</strong> ${record.disinfectionMethod === "chemical_disinfection" ? `Химическая дезинфекция в растворе «${record.disinfectantNameRu}» (${record.disinfectantExposureMinutes} мин)` : "Паровая стерилизация (автоклавирование)"}.</div>
    <div><strong>Сбор и хранение:</strong> Желтая герметичная непрокалываемая емкость для колюще-режущих отходов.</div>
    <div><strong>Причина списания:</strong> ${record.disposalReason === "used_in_procedure" ? "Израсходовано на приеме (введено пациенту)" : "Повреждение / бой карпулы"}.</div>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 9.5pt;">
    <tr>
      <td style="width: 50%; vertical-align: top;">
        <div>Лечащий врач-стоматолог:</div>
        <div style="margin-top: 24px; border-bottom: 1px solid #000; width: 80%;"></div>
        <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">(подпись) / ${record.doctorFullName} /</div>
      </td>
      <td style="width: 50%; vertical-align: top;">
        <div>Медсестра / Ассистент (списание выполнил):</div>
        <div style="margin-top: 24px; border-bottom: 1px solid #000; width: 80%;"></div>
        <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">(подпись) / ${record.nurseFullName} /</div>
      </td>
    </tr>
  </table>
</div>
`;
}
