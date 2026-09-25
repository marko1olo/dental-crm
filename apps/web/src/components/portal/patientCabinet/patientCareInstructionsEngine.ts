/**
 * patientCareInstructionsEngine.ts
 *
 * Интеллектуальный генератор постоперационных памяток пациенту после приема,
 * генерация WhatsApp/SMS-рекомендаций, печать памятки А4, QR-коды для сохранения в телефон
 * и понятная детализация счетов (без сложной латыни и номенклатуры 804н).
 */

import { generateQrCodeSvg } from "./patientCabinetEngine.js";
import {
	CARE_PRESETS_MAP,
	CARIES_CARE_PRESET,
	type CareInterventionType,
	type CareRecommendationItem,
	type PrescribedMedicationItem,
} from "./patientCarePresets.js";

// Transparent re-exports of domain modules
export * from "./patientCarePresets.js";
export * from "./patientFriendlyBilling.js";

// ============================================================================
// TYPES & CONTRACTS
// ============================================================================

export interface PatientCareMemo {
	readonly id: string;
	readonly memoDateIso: string;
	readonly interventionType: CareInterventionType;
	readonly interventionTypeNameRu: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly toothFdi: string; // Например, "16" или "26, 27"
	readonly procedureName: string; // Например, "Лечение кариеса и эстетическая реставрация"
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly clinicName: string;
	readonly clinicPhone: string;
	readonly clinicEmergencyPhone: string;
	readonly recommendations: readonly CareRecommendationItem[];
	readonly medications: readonly PrescribedMedicationItem[];
	readonly prescribedMedsSummary?: string;
	readonly warningSigns: readonly string[];
	readonly dietaryRules: readonly string[];
	readonly hygieneRules: readonly string[];
	readonly activityRestrictions: readonly string[];
	readonly nextVisitRecommendedText: string;
	readonly qrCodeSvg: string;
	readonly whatsAppMessageText: string;
	readonly whatsAppText: string;
	readonly whatsAppDeepLink: string;
	readonly smsText: string;
	readonly smsDeepLink: string;
	readonly printHtml: string;
}

// ============================================================================
// INTELLIGENT INTERVENTION TYPE DETECTOR
// ============================================================================

/**
 * Автоматически определяет тип клинического вмешательства по названию процедуры или коду 804н.
 */
export function detectInterventionTypeFromProcedure(procedureName: string = ""): CareInterventionType {
	const lower = procedureName.toLowerCase();

	if (
		lower.includes("синус-лифтинг") ||
		lower.includes("синуслифтинг") ||
		lower.includes("костная пластика") ||
		lower.includes("аугментация") ||
		lower.includes("bio-oss") ||
		lower.includes("субантральн")
	) {
		return "sinus_lift";
	}

	if (
		lower.includes("имплант") ||
		lower.includes("straumann") ||
		lower.includes("osstem") ||
		lower.includes("nobel") ||
		lower.includes("формировател") ||
		lower.includes("a16.07.054")
	) {
		return "implantation";
	}

	if (
		lower.includes("удален") ||
		lower.includes("экстракц") ||
		lower.includes("ретинированн") ||
		lower.includes("дистопированн") ||
		lower.includes("a16.07.001")
	) {
		return "extraction";
	}

	if (
		lower.includes("пульпит") ||
		lower.includes("периодонтит") ||
		lower.includes("эндодонт") ||
		lower.includes("канал") ||
		lower.includes("гуттаперч") ||
		lower.includes("распломбировк") ||
		lower.includes("девитализац") ||
		lower.includes("a16.07.008") ||
		lower.includes("a16.07.030")
	) {
		return "endodontics";
	}

	if (
		lower.includes("отбеливан") ||
		lower.includes("zoom") ||
		lower.includes("flash") ||
		lower.includes("whitespeed") ||
		lower.includes("a16.07.050")
	) {
		return "whitening";
	}

	if (
		lower.includes("брекет") ||
		lower.includes("элайнер") ||
		lower.includes("ортодонт") ||
		lower.includes("дуг") ||
		lower.includes("активац")
	) {
		return "orthodontics";
	}

	if (
		lower.includes("гигиен") ||
		lower.includes("чистк") ||
		lower.includes("air-flow") ||
		lower.includes("air flow") ||
		lower.includes("скейлинг") ||
		lower.includes("ультразвук") ||
		lower.includes("a16.07.051")
	) {
		return "hygiene";
	}

	return "caries";
}

// ============================================================================
// WHATSAPP, SMS & A4 MEMO GENERATION
// ============================================================================

export interface GenerateCareMemoInput {
	readonly memoId?: string | undefined;
	readonly memoDateIso?: string | undefined;
	readonly interventionType?: CareInterventionType | undefined;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly toothFdi?: string | undefined;
	readonly procedureName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicEmergencyPhone?: string | undefined;
	readonly customRecommendations?: readonly CareRecommendationItem[] | undefined;
	readonly customMedications?: readonly PrescribedMedicationItem[] | undefined;
	readonly warningSigns?: readonly string[] | undefined;
	readonly nextVisitRecommendedText?: string | undefined;
}

/**
 * Очищает и нормализует имя врача и его специализацию, предотвращая задвоение скобок.
 * Например: "Д-р Смирнов А. В. (Хирург-имплантолог, ортопед)" ->
 * cleanName: "Д-р Смирнов А. В.", cleanSpecialty: "Хирург-имплантолог, ортопед"
 */
export function sanitizeDoctorInfo(
	rawName?: string | undefined,
	rawSpecialty?: string | undefined,
): { cleanName: string; cleanSpecialty: string } {
	const raw = (rawName || "").trim();
	const specialtyInput = (rawSpecialty || "").trim();

	const match = raw.match(/^(.*?)\s*\((.*?)\)$/);
	if (match && typeof match[1] === "string" && typeof match[2] === "string") {
		const cleanName = match[1].trim();
		const extractedSpecialty = match[2].trim();
		const cleanSpecialty =
			extractedSpecialty || specialtyInput || "Врач-стоматолог";
		return {
			cleanName: cleanName || raw,
			cleanSpecialty,
		};
	}

	return {
		cleanName: raw || "Кузнецов П. С.",
		cleanSpecialty: specialtyInput || "Врач-стоматолог терапевт",
	};
}

export function generateCareMemo(input: GenerateCareMemoInput): PatientCareMemo {
	const memoId = input.memoId || `memo-${Date.now().toString(36)}`;
	const memoDateIso = input.memoDateIso || new Date().toISOString().slice(0, 10);
	const toothFdi = input.toothFdi || "16";

	// Определение типа вмешательства
	const detectedType = input.interventionType || detectInterventionTypeFromProcedure(input.procedureName || "");
	const preset = CARE_PRESETS_MAP[detectedType] || CARIES_CARE_PRESET;

	const procedureName = input.procedureName || preset.defaultProcedureName;
	const clinicName = input.clinicName || "Стоматологическая клиника ДЕНТЕ";
	const clinicPhone = input.clinicPhone || "+7 (495) 789-01-23";
	const clinicEmergencyPhone = input.clinicEmergencyPhone || "+7 (999) 123-45-67";
	const { cleanName: doctorName, cleanSpecialty: doctorSpecialty } =
		sanitizeDoctorInfo(input.doctorName, input.doctorSpecialty);
	const patientPhone = input.patientPhone || "+7 (999) 123-45-67";

	const recommendations =
		input.customRecommendations && input.customRecommendations.length > 0
			? input.customRecommendations
			: preset.recommendations;

	const medications =
		input.customMedications && input.customMedications.length > 0
			? input.customMedications
			: preset.medications;

	const warningSigns =
		input.warningSigns && input.warningSigns.length > 0
			? input.warningSigns
			: preset.warningSigns;

	const nextVisitRecommendedText =
		input.nextVisitRecommendedText || preset.nextVisitText;

	// Генерация текста для WhatsApp («Уважаемый(ая) {Имя}, рекомендации после лечения зуба {Зуб}: ...»)
	const whatsAppLines: string[] = [
		`Уважаемый(ая) ${input.patientName}, рекомендации после лечения зуба ${toothFdi}:`,
		"",
		`Врач: ${doctorName} • ${clinicName}`,
		`Процедура: ${procedureName}`,
		"",
	];

	for (const rec of recommendations) {
		whatsAppLines.push(`• *${rec.title}*`);
		whatsAppLines.push(`${rec.description}`);
		whatsAppLines.push("");
	}

	if (medications.length > 0) {
		whatsAppLines.push(`*Схема приема медикаментов:*`);
		for (const med of medications) {
			whatsAppLines.push(`• *${med.name}*: ${med.dosageRu} (${med.frequencyRu}, курс ${med.durationRu})`);
		}
		whatsAppLines.push("");
	}

	whatsAppLines.push(`*Тревожные признаки:*`);
	for (const w of warningSigns) {
		whatsAppLines.push(`• ${w}`);
	}
	whatsAppLines.push("");
	whatsAppLines.push(`Телефон клиники: ${clinicPhone}`);
	whatsAppLines.push(`Горячая линия дежурного врача 24/7: ${clinicEmergencyPhone}`);
	whatsAppLines.push("");
	whatsAppLines.push(`Электронная памятка в личном кабинете: https://dente.ru/memo/${memoId}`);
	whatsAppLines.push("Желаем вам скорейшего комфортного восстановления!");

	const whatsAppMessageText = whatsAppLines.join("\n");
	const whatsAppDeepLink = buildWhatsAppLink(patientPhone, whatsAppMessageText);

	// Генерация компактного текста для SMS
	const cleanPhone = patientPhone.replace(/\D/g, "");
	const memoUrl = `https://dente.ru/m/${memoId}`;
	const smsText = `ДЕНТЕ: Памятка после лечения зуба ${toothFdi} (${procedureName}): ${memoUrl} Дежурный врач: ${clinicEmergencyPhone}`;
	const smsDeepLink = buildSmsLink(patientPhone, smsText);

	// Генерация QR-кода со ссылкой на памятку
	const qrPayload = `https://dente.ru/memo/${memoId}?patient=${encodeURIComponent(input.patientName)}&tooth=${toothFdi}&phone=${cleanPhone}`;
	let qrCodeSvg = "";
	try {
		qrCodeSvg = generateQrCodeSvg(qrPayload, { size: 200 });
	} catch {
		// Fallback to compact memo URL if Cyrillic query params exceed QR capacity
		qrCodeSvg = generateQrCodeSvg(`https://dente.ru/m/${memoId}`, { size: 200 });
	}

	// Генерация печатного листа А4
	const memoObjPartial = {
		id: memoId,
		memoDateIso,
		interventionType: detectedType,
		interventionTypeNameRu: preset.typeNameRu,
		patientName: input.patientName,
		patientPhone,
		toothFdi,
		procedureName,
		doctorName,
		doctorSpecialty,
		clinicName,
		clinicPhone,
		clinicEmergencyPhone,
		recommendations,
		medications,
		warningSigns,
		dietaryRules: preset.dietaryRules,
		hygieneRules: preset.hygieneRules,
		activityRestrictions: preset.activityRestrictions,
		nextVisitRecommendedText,
		qrCodeSvg,
		whatsAppMessageText,
		whatsAppText: whatsAppMessageText,
		whatsAppDeepLink,
		smsText,
		smsDeepLink,
	};

	const printHtml = generateCareMemoPrintHtml(memoObjPartial as PatientCareMemo);

	return {
		...memoObjPartial,
		printHtml,
	};
}

/**
 * Создает прямую ссылку для отправки сообщения в WhatsApp с нормализацией номера телефона.
 */
export function buildWhatsAppLink(phone: string, text: string): string {
	let clean = phone.replace(/\D/g, "");
	if (clean.length === 11 && clean.startsWith("8")) {
		clean = "7" + clean.slice(1);
	} else if (clean.length === 10) {
		clean = "7" + clean;
	}
	return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

/**
 * Создает прямую ссылку для отправки SMS (протокол sms:).
 */
export function buildSmsLink(phone: string, text: string): string {
	let clean = phone.replace(/\D/g, "");
	if (clean.length === 11 && clean.startsWith("8")) {
		clean = "+7" + clean.slice(1);
	} else if (clean.length === 10) {
		clean = "+7" + clean;
	} else if (!clean.startsWith("+")) {
		clean = "+" + clean;
	}
	return `sms:${clean}?body=${encodeURIComponent(text)}`;
}

/**
 * Формирует компактный текст для SMS с ключевой ссылкой и SOS телефоном.
 */
export function generateCareMemoSmsText(memo: PatientCareMemo): string {
	return memo.smsText;
}

// ============================================================================
// A4 PRINT SHEET GENERATOR (PREMIUM MEDICAL DESIGN)
// ============================================================================

export function generateCareMemoPrintHtml(memo: PatientCareMemo): string {
	const recsHtml = memo.recommendations
		.map(
			(rec) => `
      <div style="margin-bottom: 10px; padding: 8px 12px; background: #f8fafc; border-left: 4px solid ${rec.isUrgent ? "#ef4444" : "#0d9488"}; border-radius: 4px;">
        <div style="font-weight: 700; color: #0f172a; font-size: 13px; display: flex; align-items: center; justify-content: space-between;">
          <span>${rec.title}</span>
          ${rec.badgeText ? `<span style="font-size: 10px; background: ${rec.isUrgent ? "#fee2e2" : "#ccfbf1"}; color: ${rec.isUrgent ? "#b91c1c" : "#0f766e"}; padding: 2px 6px; border-radius: 4px; font-weight: 800;">${rec.badgeText}</span>` : ""}
        </div>
        <div style="font-size: 11.5px; color: #334155; margin-top: 3px; line-height: 1.4;">${rec.description}</div>
      </div>
    `,
		)
		.join("");

	const medsHtml =
		memo.medications.length > 0
			? `
      <div style="margin-top: 14px; margin-bottom: 14px;">
        <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
          Режим и схема приёма медикаментов:
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 6px;">
          <thead>
            <tr style="background: #f1f5f9; text-align: left;">
              <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Препарат / Форма</th>
              <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Дозировка и способ</th>
              <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Кратность</th>
              <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Длительность</th>
            </tr>
          </thead>
          <tbody>
            ${memo.medications
							.map(
								(med) => `
              <tr>
                <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 700; color: #0f172a;">
                  ${med.name}<br><span style="font-weight: 400; color: #64748b; font-size: 10px;">${med.formRu}</span>
                </td>
                <td style="padding: 6px 8px; border: 1px solid #cbd5e1; color: #334155;">${med.dosageRu}</td>
                <td style="padding: 6px 8px; border: 1px solid #cbd5e1; color: #334155;">${med.frequencyRu}</td>
                <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600; color: #0f172a;">${med.durationRu}</td>
              </tr>
            `,
							)
							.join("")}
          </tbody>
        </table>
      </div>
    `
			: "";

	const warningsHtml = memo.warningSigns
		.map((w) => `<li style="margin-bottom: 2px;">${w}</li>`)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Памятка пациента — ${memo.patientName} — ${memo.clinicName}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11.5px; color: #0f172a; margin: 0; padding: 0; line-height: 1.35; }
    .memo-container { max-width: 720px; margin: 0 auto; background: #ffffff; padding: 10px; box-sizing: border-box; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 12px; }
    .clinic-title { font-size: 16px; font-weight: 900; color: #0d9488; text-transform: uppercase; margin: 0; }
    .clinic-sub { font-size: 10.5px; color: #64748b; margin-top: 2px; }
    .doc-meta { text-align: right; font-size: 10.5px; color: #475569; }
    .patient-banner { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
    .danger-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px 12px; margin-top: 10px; }
    .footer { margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b; }
    .qr-block { text-align: center; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="memo-container">
    <div class="header">
      <div>
        <h1 class="clinic-title">${memo.clinicName}</h1>
        <div class="clinic-sub">Лицензия ЛО-78-01-011842 • Телефон: ${memo.clinicPhone}</div>
        <div class="clinic-sub" style="font-weight: 800; color: #b91c1c;">Горячая линия дежурного врача (круглосуточно): ${memo.clinicEmergencyPhone}</div>
      </div>
      <div class="doc-meta">
        <div><strong>Дата:</strong> ${memo.memoDateIso}</div>
        <div><strong>Памятка №:</strong> ${memo.id}</div>
        <div><strong>Врач:</strong> ${memo.doctorName}</div>
        <div style="font-size: 9.5px; color: #64748b;">${memo.doctorSpecialty}</div>
      </div>
    </div>

    <div class="patient-banner">
      <div>
        <div style="font-size: 13px; font-weight: 800; color: #0f172a;">Пациент: ${memo.patientName}</div>
        <div style="font-size: 11px; color: #0f766e; margin-top: 2px;">
          Процедура: <strong>${memo.procedureName}</strong> (Зуб №<strong>${memo.toothFdi}</strong>)
        </div>
      </div>
      <div style="background: #0d9488; color: #ffffff; padding: 4px 10px; border-radius: 4px; font-weight: 800; font-size: 11px;">
        ${memo.interventionTypeNameRu}
      </div>
    </div>

    <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
      Персональные рекомендации и правила ухода:
    </div>

    ${recsHtml}
    ${medsHtml}

    <div class="danger-box">
      <div style="font-weight: 800; color: #b91c1c; font-size: 11.5px; display: flex; align-items: center; gap: 6px;">
        Когда необходимо срочно связаться с лечащим или дежурным врачом:
      </div>
      <ul style="margin: 4px 0 0 0; padding-left: 18px; font-size: 11px; color: #7f1d1d; line-height: 1.3;">
        ${warningsHtml}
      </ul>
    </div>

    <div style="margin-top: 10px; font-size: 11px; color: #334155; background: #f8fafc; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0;">
      <strong>Следующий плановый визит:</strong> ${memo.nextVisitRecommendedText}
    </div>

    <div class="footer">
      <div>
        <div>Памятка составлена в соответствии с клиническими рекомендациями Стоматологической Ассоциации России (СтАР).</div>
        <div style="margin-top: 4px;">Подпись лечащего врача: ____________________ / ${memo.doctorName} / М.П.</div>
      </div>
      <div class="qr-block">
        <div style="display: flex; justify-content: center;">${memo.qrCodeSvg}</div>
        <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Открыть в смартфоне</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export const generatePrintableCareMemoHtml = generateCareMemoPrintHtml;
