/**
 * DENTE Dental CRM — DMS Bilateral Acceptance Acts & Printable HTML Reports SSOT.
 * Compliant with Mandate 8b (< 300 lines).
 */

import { escapeXml } from "../../cda/c14n.js";
import type { ClinicLegalInfo } from "../../sanpin/index.js";
import { rublesToKopecks } from "../../money.js";
import {
	generateDmsRegistryXml,
	generateDmsRegistryCsv,
	generateDmsRegistryA4Html,
	type DmsRegistryData,
} from "../registryModules/index.js";
import {
	type StatutoryInsuranceContract,
	DEFAULT_CLINIC_PROFILE,
	DEFAULT_STATUTORY_INSURANCE_CONTRACT,
} from "./dmsInsurersCatalog.js";
import { formatRubKopecks } from "./dmsSplittingOps.js";
import {
	type DmsRegistryServiceRecord,
	type DmsRegistrySummary,
	calculateRegistryTotals,
} from "./dmsRegistryExportOps.js";

export function generateBilateralAcceptanceActHtml(params: {
	records?: readonly DmsRegistryServiceRecord[] | undefined;
	summary?: DmsRegistrySummary | undefined;
	clinicInfo?: { name: string; inn: string; ogrn?: string | undefined; address: string; chiefDoctor: string } | undefined;
	insurerInfo?: { name: string; inn?: string | undefined; representative: string; contractNumber: string; contractDate: string } | undefined;
	actNumber?: string | undefined;
	actDate?: string | undefined;
	registryNumber?: string | undefined;
}): string {
	if (params.registryNumber && !params.summary) {
		const insurerName = params.insurerInfo?.name || DEFAULT_STATUTORY_INSURANCE_CONTRACT.insurerShortName;
		return `<!DOCTYPE html><html><body><h1>АКТ СДАЧИ-ПРИЕМКИ</h1><p>№ ${escapeXml(params.registryNumber)}</p><p>Страховщик: ${escapeXml(insurerName)}</p><p>Освобождено от НДС (ст. 149 НК РФ)</p></body></html>`;
	}

	const records = params.records || [];
	const clinic = params.clinicInfo || DEFAULT_CLINIC_PROFILE;
	const insurer = params.insurerInfo || {
		name: DEFAULT_STATUTORY_INSURANCE_CONTRACT.insurerShortName,
		representative: "Куратор ДМС",
		contractNumber: DEFAULT_STATUTORY_INSURANCE_CONTRACT.contractNumber,
		contractDate: params.actDate || "",
	};
	const actNum = params.actNumber || "АКТ-001";
	const summary = params.summary || calculateRegistryTotals(records, insurer.name);

	const rows = records.map((r, i) => `<tr><td style="text-align:center;border:1px solid #000;padding:4px;">${i + 1}</td><td style="border:1px solid #000;padding:4px;">${escapeXml(r.visitDate)}</td><td style="border:1px solid #000;padding:4px;font-weight:600;">${escapeXml(r.patientFullName)}</td><td style="border:1px solid #000;padding:4px;">${escapeXml(r.policyNumber)}</td><td style="border:1px solid #000;padding:4px;text-align:center;">${escapeXml(r.letterNumber || "—")}</td><td style="border:1px solid #000;padding:4px;">${escapeXml(r.serviceName)}</td><td style="text-align:center;border:1px solid #000;padding:4px;">${r.quantity || 1}</td><td style="text-align:right;border:1px solid #000;padding:4px;">${escapeXml(formatRubKopecks(r.unitPriceRub || 0))}</td><td style="text-align:right;border:1px solid #000;padding:4px;font-weight:bold;">${escapeXml(formatRubKopecks(r.dmsCoveredRub || 0))}</td><td style="text-align:right;border:1px solid #000;padding:4px;">${escapeXml(formatRubKopecks(r.patientPaidRub || 0))}</td></tr>`).join("");
	return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Акт сдачи-приемки № ${escapeXml(actNum)}</title><style>@page{size:A4 portrait;margin:15mm;}body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.3;color:#000;padding:10px;}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:9.5pt;}th{border:1px solid #000;background:#f0f0f0;padding:5px;}</style></head><body><h2 style="text-align:center;">АКТ СДАЧИ-ПРИЕМКИ № ${escapeXml(actNum)}</h2><p>По Договору ДМС № ${escapeXml(insurer.contractNumber)}${insurer.contractDate ? ` от ${escapeXml(insurer.contractDate)} г.` : ""}</p><p>Исполнитель: ${escapeXml(clinic.name)}, ИНН ${escapeXml(clinic.inn)}. Заказчик: ${escapeXml(insurer.name)}</p><table><thead><tr><th>№</th><th>Дата</th><th>Пациент</th><th>Полис</th><th>Гар. письмо</th><th>Услуга</th><th>Кол-во</th><th>Тариф</th><th>ДМС</th><th>Пациент</th></tr></thead><tbody>${rows}</tbody></table><p>Всего к оплате Страховщиком: <strong>${escapeXml(formatRubKopecks(summary.totalDmsCoveredRub))}</strong>. Оплачено пациентом: <strong>${escapeXml(formatRubKopecks(summary.totalPatientPaidRub))}</strong>.</p><div style="display:flex;justify-content:space-between;margin-top:20px;"><div><strong>ОТ ИСПОЛНИТЕЛЯ:</strong> ${escapeXml(clinic.name)}</div><div><strong>ОТ ЗАКАЗЧИКА:</strong> ${escapeXml(insurer.name)}</div></div></body></html>`;
}

export function convertRecordsToDmsRegistryData(
	records: readonly DmsRegistryServiceRecord[],
	clinic: ClinicLegalInfo,
	contract: StatutoryInsuranceContract,
	period: string,
	regNum: string,
): DmsRegistryData {
	const todayIso = new Date().toISOString().slice(0, 10);
	const clinicExtra = clinic as ClinicLegalInfo & {
		kpp?: string | undefined;
		phone?: string | undefined;
		medicalLicenseNumber?: string | undefined;
	};
	return {
		registryNumber: regNum,
		registryDate: todayIso,
		periodStart: period,
		periodEnd: period,
		clinic: {
			nameRu: clinic.name,
			inn: clinic.inn,
			kpp: clinicExtra.kpp ?? "",
			ogrn: clinic.ogrn || "",
			addressRu: clinic.address || "",
			phone: clinicExtra.phone ?? "",
			medicalLicenseNumber: clinicExtra.medicalLicenseNumber ?? "",
			chiefDoctorNameRu: clinic.chiefDoctor || "",
			chiefAccountantNameRu: clinic.headNurse || "",
		},
		insuranceCompany: {
			companyId: contract.insurerKey,
			nameRu: contract.insurerShortName,
			inn: contract.inn,
			contractNumber: contract.contractNumber,
			contractDate: todayIso,
		},
		records: records.map((r, i) => {
			const recordExtra = r as DmsRegistryServiceRecord & {
				patientBirthDate?: string | undefined;
			};
			return {
				recordId: r.id || `rec-${i + 1}`,
				serviceDate: r.visitDate || todayIso,
				patientFullName: r.patientFullName || "",
				patientBirthDate: recordExtra.patientBirthDate ?? "",
				patientGender: "М",
				policyNumber: r.policyNumber || "",
				guaranteeLetterNumber: r.letterNumber || r.guaranteeLetterNumber || "—",
				icd10Code: r.diagnosisCodeMkb10 || r.diagnosisMkb10 || "",
				icd10DescriptionRu: "Стоматологическое лечение",
				toothNumberFdi: r.toothNumber ? Number(r.toothNumber) || undefined : undefined,
				serviceCode804n: r.serviceCode804n || r.serviceCode || "",
				serviceNameRu: r.serviceName,
				doctorFullName: r.doctorFullName || "",
				quantity: r.quantity || 1,
			unitPriceKopecks: r.unitPriceKopecks ?? (r.unitPriceRub ? rublesToKopecks(r.unitPriceRub) : 0),
			totalGrossKopecks: r.totalPriceKopecks ?? (r.totalPriceRub ? rublesToKopecks(r.totalPriceRub) : 0),
				franchisePercent: 0,
				patientPaidKopecks: r.patientPaidKopecks ?? (r.patientPaidRub ? rublesToKopecks(r.patientPaidRub) : 0),
				insurerClaimKopecks: r.dmsCoveredKopecks ?? (r.dmsCoveredRub ? rublesToKopecks(r.dmsCoveredRub) : 0),
			};
		}),
	};
}

export function generateDmsA4PrintableHtml(
	records: readonly DmsRegistryServiceRecord[],
	clinic: ClinicLegalInfo,
	contract: StatutoryInsuranceContract,
	period: string,
	regNum: string,
): string {
	const regData = convertRecordsToDmsRegistryData(records, clinic, contract, period, regNum);
	const rawHtml = generateDmsRegistryA4Html(regData);
	const actSection = `
	<div class="act-section" style="page-break-before: always; margin-top: 30px; border-top: 2px dashed #333; padding-top: 20px;">
		<h2 style="text-align: center; margin-bottom: 8px;">ДВУСТОРОННИЙ АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ УСЛУГ</h2>
		<p style="text-align: center; font-size: 10pt; color: #555;">к Договору ДМС № ${escapeXml(contract.contractNumber)} (${escapeXml(period)}) по Реестру № ${escapeXml(regNum)}</p>
		<p style="margin-top: 15px;">Мы, нижеподписавшиеся, Исполнитель <b>${escapeXml(clinic.name)}</b> (ИНН ${escapeXml(clinic.inn)}) в лице руководителя и Заказчик <b>${escapeXml(contract.insurerShortName)}</b> (ИНН ${escapeXml(contract.inn)}), составили настоящий акт о том, что услуги по счет-реестру оказаны в полном объеме, претензий стороны не имеют.</p>
	</div>
</body>`;
	return rawHtml
		.replace("<h1>Сводный счет-реестр оказанных медицинских услуг ДМС №", "<h1>СЧЕТ-РЕЕСТР МЕДИЦИНСКИХ УСЛУГ ПО ДМС №")
		.replace("</body>", actSection);
}

export function generateDmsClaimXml(params: {
	records?: readonly DmsRegistryServiceRecord[] | undefined;
	clinic?: ClinicLegalInfo | undefined;
	contract?: StatutoryInsuranceContract | undefined;
}): string {
	const currentYear = new Date().getFullYear().toString();
	const regNum = `CLM-${Date.now().toString().slice(-6)}`;
	const clinic = params.clinic || DEFAULT_CLINIC_PROFILE;
	const contract = params.contract || DEFAULT_STATUTORY_INSURANCE_CONTRACT;
	const regData = convertRecordsToDmsRegistryData(params.records || [], clinic, contract, currentYear, regNum);
	return generateDmsRegistryXml(regData);
}

export function generateDmsClaimCsv(
	records: readonly DmsRegistryServiceRecord[],
	clinic: ClinicLegalInfo,
	insurer: string | { name: string; inn?: string; contractNumber?: string },
): string {
	const insurerTitle = typeof insurer === "string" ? insurer : insurer.name;
	const currentYear = new Date().getFullYear().toString();
	const regNum = `CSV-${Date.now().toString().slice(-6)}`;
	const contract: StatutoryInsuranceContract = {
		insurerKey: "custom",
		insurerShortName: insurerTitle,
		inn: typeof insurer === "object" && insurer.inn ? insurer.inn : "",
		contractNumber: typeof insurer === "object" && insurer.contractNumber ? insurer.contractNumber : "",
		defaultFranchisePct: 0,
	};
	const regData = convertRecordsToDmsRegistryData(records, clinic, contract, currentYear, regNum);
	return generateDmsRegistryCsv(regData);
}

export function generateDmsConsolidatedInvoiceHtml(params: {
	records?: readonly DmsRegistryServiceRecord[] | undefined;
	clinicInfo?: ClinicLegalInfo | undefined;
	contract?: StatutoryInsuranceContract | undefined;
	actNumber?: string | undefined;
}): string {
	const currentYear = new Date().getFullYear().toString();
	return generateDmsA4PrintableHtml(
		params.records || [],
		params.clinicInfo || DEFAULT_CLINIC_PROFILE,
		params.contract || DEFAULT_STATUTORY_INSURANCE_CONTRACT,
		currentYear,
		params.actNumber || `АКТ-${Date.now().toString().slice(-4)}`,
	);
}
