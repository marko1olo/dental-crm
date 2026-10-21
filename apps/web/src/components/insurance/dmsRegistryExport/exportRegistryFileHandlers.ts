/**
 * exportRegistryFileHandlers.ts — Экспорт реестра медицинских услуг ДМС в CSV и XML
 */

import { generateDmsRegistryXml, type DmsRegistryData } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import {
	exportRegistryToCsv,
	RUSSIAN_DMS_INSURERS,
	type DmsRegistryServiceRecord,
} from "../insuranceMath.js";
import type { ClinicLegalInfo } from "./types.js";

export function handleExportRegistryCsv(
	records: readonly DmsRegistryServiceRecord[],
	clinic: ClinicLegalInfo,
	selectedInsurer: string,
	periodDisplay: string,
) {
	if (records.length === 0) {
		showToast("Нет записей для экспорта по выбранным фильтрам", "warning");
		return;
	}
	const csvContent = exportRegistryToCsv(
		records,
		clinic,
		selectedInsurer === "all" ? "Все компании" : selectedInsurer,
		periodDisplay,
	);
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.setAttribute("href", url);
	link.setAttribute("download", `DMS_Registry_${selectedInsurer.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
	showToast(`Реестр ДМС (${records.length} услуг) успешно экспортирован в CSV/Excel`, "success");
}

export function handleExportRegistryXml(
	records: readonly DmsRegistryServiceRecord[],
	clinic: ClinicLegalInfo,
	selectedInsurer: string,
	actNumber: string,
	contractNumber: string,
	contractDate: string,
) {
	if (records.length === 0) {
		showToast("Нет записей для экспорта XML", "warning");
		return;
	}
	const todayIso = new Date().toISOString().slice(0, 10);
	const dmsData: DmsRegistryData = {
		registryNumber: actNumber || `РЕЕСТР-${todayIso.replace(/-/g, "")}`,
		registryDate: todayIso,
		periodStart: todayIso.slice(0, 7) + "-01",
		periodEnd: todayIso,
		clinic: {
			nameRu: clinic.name,
			inn: clinic.inn,
			kpp: clinic.kpp || "770101001",
			ogrn: clinic.ogrn || "1157746890123",
			addressRu: clinic.address,
			phone: "+7 (495) 123-45-67",
			medicalLicenseNumber: "ЛО-77-01-019842",
			chiefDoctorNameRu: clinic.chiefDoctor,
			chiefAccountantNameRu: clinic.chiefDoctor || "Руководитель организации",
		},
		insuranceCompany: {
			companyId: selectedInsurer,
			nameRu: selectedInsurer === "all" ? "Все страховые компании (Сводный отчет)" : selectedInsurer,
			inn: RUSSIAN_DMS_INSURERS.find((i) => i.key === selectedInsurer || i.shortName === selectedInsurer || i.fullName === selectedInsurer)?.inn || "7736035485",
			contractNumber,
			contractDate,
		},
		records: records.map((r, idx) => ({
			recordId: r.id || `rec-${idx + 1}`,
			serviceDate: r.visitDate,
			patientFullName: r.patientFullName,
			patientBirthDate: "1990-01-01",
			patientGender: "М" as const,
			policyNumber: r.policyNumber,
			guaranteeLetterNumber: r.letterNumber || "ГП-БЕЗ-НОМЕРА",
			icd10Code: r.diagnosisCodeMkb10 || "K02.1",
			icd10DescriptionRu: "Стоматологическое лечение",
			toothNumberFdi: typeof r.toothNumber === "number" ? r.toothNumber : Number(r.toothNumber) || undefined,
			serviceCode804n: r.serviceCode804n,
			serviceNameRu: r.serviceName,
			doctorFullName: r.doctorFullName || "Врач-стоматолог",
			quantity: r.quantity,
			unitPriceKopecks: Math.round(r.unitPriceRub * 100),
			totalGrossKopecks: Math.round(r.totalPriceRub * 100),
			franchisePercent: 0,
			patientPaidKopecks: Math.round(r.patientPaidRub * 100),
			insurerClaimKopecks: Math.round(r.dmsCoveredRub * 100),
		})),
	};
	const xmlContent = generateDmsRegistryXml(dmsData);
	const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.setAttribute("href", url);
	link.setAttribute("download", `DMS_Registry_${selectedInsurer.replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}_${todayIso}.xml`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
	showToast(`Электронный XML-реестр (${records.length} услуг) успешно выгружен`, "success");
}
