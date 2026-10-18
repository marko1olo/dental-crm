import { escapeHtml, formatDateRu } from "../documentPrintFormatters";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import type { SurgicalOperationProtocolPrintOptions, SurgicalOperationProtocolContext } from "./types";

export function buildSurgicalOperationProtocolContext(
	options: SurgicalOperationProtocolPrintOptions,
): SurgicalOperationProtocolContext {
	const {
		patient, clinic, doctorFullName, assistantFullName, operationDate,
		operationType, toothNumber, diagnosis, mkb10, anesthesia,
		protocolText, surgeryDetails, isSignedByDoctor = false,
	} = options;

	const formattedDate = operationDate
		? formatDateRu(operationDate)
		: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) + " г.";

	const isDemo = isDemoShowcaseMode();
	const clinicName = escapeHtml(clinic?.legalName || clinic?.fullName || clinic?.clinicName) || (isDemo ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»");
	const clinicAddress = escapeHtml(clinic?.actualAddress || clinic?.address) || (isDemo ? "г. Москва, ул. Стоматологическая, д. 10" : "«________________________________________»");
	const clinicLicense = escapeHtml(clinic?.licenseNumber) || (isDemo ? "ЛО41-01137-77/00584930" : "«________________________________________»");
	const clinicInn = escapeHtml(clinic?.inn) || (isDemo ? "7701987654" : "«______________»");

	const ptName = escapeHtml(patient?.fullName) || "________________________________________";
	const ptBirth = patient?.birthDate ? formatDateRu(patient.birthDate) : "«___» _________ _____ г.";
	const ptCard = escapeHtml(patient?.cardNumber) || "______";
	const doctor = escapeHtml(doctorFullName) || "____________________";
	const assistant = escapeHtml(assistantFullName) || "____________________";

	const opTitle = escapeHtml(operationType) || "Хирургическая операция в амбулаторных условиях";
	const toothStr = toothNumber ? `Зуб FDI #${escapeHtml(String(toothNumber))}` : "Область вмешательства";
	const diagStr = escapeHtml(diagnosis) || "Частичное отсутствие зубов (К08.1)";
	const mkbStr = escapeHtml(mkb10) || "K08.1";

	const anesthesiaText = anesthesia
		? `${escapeHtml(anesthesia.type || "Местная инфильтрационная / проводниковая")}: ${escapeHtml(anesthesia.drug || "Артикаин 4% с эпинефрином 1:100 000")} — ${escapeHtml(String(anesthesia.volumeMl || "1.7"))} мл. Аспирационная проба отрицательная.`
		: "Местная анестезия (Артикаин 4% с эпинефрином 1:100 000, 1.7 мл). Аспирационная проба отрицательная.";

	const protocolBody = escapeHtml(protocolText) || "Под местной анестезией проведен разрез слизистой оболочки альвеолярного отростка. Сформирован слизисто-надкостничный лоскут. Скелетирована костная ткань. Ложе имплантата сформировано ступенчатыми фрезами с обильной ирригацией охлажденным стерильным физраствором 0.9%. Установлен дентальный имплантат. Первичная механическая стабильность достигнута. Контроль гемостаза. Лоскуты адаптированы и ушиты узловыми швами. Даны рекомендации.";

	const stampHtml = isSignedByDoctor
		? `<div class="stamp-signed"><div class="stamp-title">ПОДПИСАНО ВРАЧОМ</div><div class="stamp-sub">${doctor}</div><div class="stamp-date">${formattedDate}</div></div>`
		: `<div class="stamp-draft"><div class="stamp-title">ЧЕРНОВИК</div><div class="stamp-sub">ПРЕДВАРИТЕЛЬНЫЙ ПРОТОКОЛ</div><div class="stamp-sub">ПЕЧАТЬ В ЛЮБОЙ МОМЕНТ</div></div>`;

	return {
		formattedDate, clinicName, clinicAddress, clinicLicense, clinicInn, clinicPhone: clinic?.phone,
		ptName, ptBirth, ptCard, doctor, assistant, opTitle, toothStr, diagStr, mkbStr,
		anesthesiaText, protocolBody, stampHtml, surgeryDetails,
	};
}
