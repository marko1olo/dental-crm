/**
 * fnsTaxPreflightEngine.ts — Preflight validation for FNS Tax Deduction (Order ED-7-11/755@)
 */

import { validateRussianInn, validateRussianOgrn, validateRussianSnils } from "../remdXml/egiszRemdPresets";
import { formatKopecksToRubles, type FnsTaxCertificatePayload } from "../cdaR2XmlBuilder";
import type { EgiszPreflightCheckResult, FnsTaxPreflightReport } from "./engineTypes";

export function runFnsTaxCertificatePreflight(payload: FnsTaxCertificatePayload): FnsTaxPreflightReport {
	const checks: EgiszPreflightCheckResult[] = [];

	// 1. Clinic Tax Identifiers (INN & OGRN)
	const innOk = validateRussianInn(payload.clinic.inn || "");
	checks.push(innOk ? {
		id: "fns_mo_inn_ok", category: "clinic", title: "ИНН медицинской организации",
		status: "passed", details: `ИНН проверен: ${payload.clinic.inn}`,
	} : {
		id: "fns_mo_inn_invalid", category: "clinic", title: "ИНН медицинской организации",
		status: "failed", details: `Некорректный ИНН клиники: "${payload.clinic.inn}"`,
	});

	const ogrnOk = validateRussianOgrn(payload.clinic.ogrn || "");
	checks.push(ogrnOk ? {
		id: "fns_mo_ogrn_ok", category: "clinic", title: "ОГРН организации / ИП",
		status: "passed", details: `ОГРН проверен: ${payload.clinic.ogrn}`,
	} : {
		id: "fns_mo_ogrn_invalid", category: "clinic", title: "ОГРН организации / ИП",
		status: "failed", details: `Некорректный ОГРН клиники: "${payload.clinic.ogrn}"`,
	});

	// 2. Taxpayer Identifiers (INN / SNILS)
	const tpHasInn = Boolean(payload.taxpayer.inn && validateRussianInn(payload.taxpayer.inn));
	const tpSnilsRes = payload.taxpayer.snils ? validateRussianSnils(payload.taxpayer.snils) : null;
	if (tpHasInn || (tpSnilsRes && tpSnilsRes.isValid)) {
		checks.push({
			id: "fns_tp_ident_ok", category: "taxpayer", title: "Идентификатор налогоплательщика (ИНН / СНИЛС)",
			status: "passed", details: tpHasInn ? `ИНН налогоплательщика проверен: ${payload.taxpayer.inn}` : `СНИЛС налогоплательщика проверен: ${tpSnilsRes?.formatted}`,
		});
	} else {
		checks.push({
			id: "fns_tp_ident_missing", category: "taxpayer", title: "Идентификатор налогоплательщика",
			status: "failed", details: "Для налогового вычета обязателен валидный ИНН или СНИЛС налогоплательщика",
		});
	}

	// 3. Patient and Relationship Code
	const validRelCodes = ["1", "2", "3", "4"];
	checks.push(validRelCodes.includes(payload.patient.relationshipCode) ? {
		id: "fns_rel_code_ok", category: "patient", title: "Степень родства пациента (Приказ ЕД-7-11/755@)",
		status: "passed", details: `Код родства: ${payload.patient.relationshipCode} (${payload.patient.relationshipName || (payload.patient.relationshipCode === "1" ? "Сам налогоплательщик" : "Родственник")})`,
	} : {
		id: "fns_rel_code_invalid", category: "patient", title: "Степень родства пациента",
		status: "failed", details: `Недопустимый код родства: "${payload.patient.relationshipCode}". Допустимы значения: 1, 2, 3, 4`,
	});

	// 4. Financial Calculations & Kopecks
	const payments = payload.payments || [];
	if (payments.length === 0) {
		checks.push({
			id: "fns_payments_empty", category: "finance", title: "Сведения о произведенных оплатах",
			status: "failed", details: "В справке отсутствуют записи об оплате медицинских услуг",
		});
	} else {
		const totalKopecks = payments.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);
		checks.push(totalKopecks <= 0 ? {
			id: "fns_total_zero", category: "finance", title: "Итоговая сумма оплаты услуг",
			status: "failed", details: "Сумма оплат должна быть строго больше нуля",
		} : {
			id: "fns_total_ok", category: "finance", title: "Итоговая сумма оплат (целочисленные копейки)",
			status: "passed", details: `Итого к вычету: ${formatKopecksToRubles(totalKopecks)} руб. (${payments.length} платеж(ей))`,
		});
	}

	// 5. Tax Year
	const currentYear = new Date().getFullYear();
	checks.push(payload.taxYear && payload.taxYear >= 2020 && payload.taxYear <= currentYear ? {
		id: "fns_year_ok", category: "finance", title: "Налоговый период (год)",
		status: "passed", details: `Налоговый период: ${payload.taxYear} год`,
	} : {
		id: "fns_year_warn", category: "finance", title: "Налоговый период (год)",
		status: "warning", details: `Проверьте налоговый период: ${payload.taxYear}. Вычет оформляется за предшествующие 3 года`,
	});

	// 6. Signer (Руководитель)
	checks.push(!payload.signer.fullName ? {
		id: "fns_signer_missing", category: "signature", title: "Подписант справки",
		status: "failed", details: "Не указано ФИО руководителя или уполномоченного лица",
	} : {
		id: "fns_signer_ok", category: "signature", title: "Подписант справки",
		status: "passed", details: `Подписант: ${payload.signer.fullName} (${payload.signer.position || "Руководитель"})`,
	});

	const failedCount = checks.filter((c) => c.status === "failed").length;
	const warningCount = checks.filter((c) => c.status === "warning").length;
	const passedCount = checks.filter((c) => c.status === "passed").length;
	const totalChecks = checks.length;
	const scorePercent = Math.round((passedCount / (totalChecks || 1)) * 100);

	return { isValid: failedCount === 0, totalChecks, passedCount, failedCount, warningCount, scorePercent, checks };
}
