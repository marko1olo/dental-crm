/**
 * CLINICAL DENTAL WARRANTY ENGINE — PATIENT MEMO FOR MESSENGERS
 * Официальная памятка пациента для WhatsApp и Telegram (Мандат 8d: ноль эмодзи).
 * Mandate 8b: strict file length budget <= 120 lines.
 */

import type { WarrantyCertificateData } from "./warrantyRemediationTypes.js";
import { addMonthsToDate, formatRussianDate, formatShortDate } from "./warrantyDateUtils.js";

export function generateWarrantyPatientMemo(data: WarrantyCertificateData): string {
	const { patient, clinic, doctor, items, calculation, certificateId, issueDate, verificationUrl } = data;

	const itemsSummary = items
		.map((it) => {
			const months = it.customWarrantyMonths ?? calculation.adjustedWarrantyMonths;
			const expDate = addMonthsToDate(issueDate, months);
			return `• Зуб ${it.toothNumber}: ${it.clinicalWorkTitle} (${it.materialName}) — гарантия ${months} мес. (до ${formatShortDate(expDate)})`;
		})
		.join("\n");

	const serviceLifeYears = (calculation.adjustedServiceLifeMonths / 12).toFixed(1);

	return [
		`ГАРАНТИЙНЫЙ ПАСПОРТ СТОМАТОЛОГИЧЕСКОГО ЛЕЧЕНИЯ`,
		`Клиника: ${clinic.name}`,
		`Телефон: ${clinic.phone}`,
		`Пациент: ${patient.fullName} (карта № ${patient.cardNumber})`,
		`Лечащий врач: ${doctor.fullName}`,
		`Сертификат: № ${certificateId} от ${formatRussianDate(issueDate)}`,
		``,
		`ВЫПОЛНЕННЫЕ РАБОТЫ И ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА:`,
		itemsSummary,
		``,
		`Срок службы конструкций: ${calculation.adjustedServiceLifeMonths} мес. (${serviceLifeYears} г.)`,
		`Следующий обязательный контрольный осмотр (0 ₽): ${formatRussianDate(calculation.nextCheckupDueDate)}`,
		``,
		`ОСНОВНЫЕ УСЛОВИЯ СОХРАНЕНИЯ ГАРАНТИИ (СтАР & Закон РФ № 2300-1):`,
		`1. Плановый контрольный осмотр и профгигиена не реже 1 раза в ${calculation.checkupIntervalMonths} мес.`,
		`2. Соблюдение индивидуальной гигиены полости рта (индекс OHI-S <= 1.2).`,
		`3. Запрет на самостоятельную коррекцию и несогласованное лечение у сторонних врачей.`,
		`4. Обращение в клинику при любом дискомфорте или сколе в течение 3–5 рабочих дней.`,
		``,
		`Проверить статус гарантии онлайн:`,
		verificationUrl,
		``,
		`Контрольный хеш ЭЦП: ${data.integrityHash.slice(0, 16)}...`,
	].join("\n");
}
