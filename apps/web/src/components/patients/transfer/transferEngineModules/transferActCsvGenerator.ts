/**
 * transferActCsvGenerator.ts — Генерация CSV реестра трансфера для бухгалтерии сети.
 * Лимит <= 120 строк по Мандату 8b.
 */

import type { PatientClinicalSnapshot } from "./types.js";

export function generateTransferActCsv(snapshot: PatientClinicalSnapshot): string {
	const rows: string[][] = [
		["Идентификатор трансфера", snapshot.snapshotId],
		["Дата и время трансфера", snapshot.exportedAtIso],
		["Филиал-отправитель", `${snapshot.sourceBranch.nameRu} (${snapshot.sourceBranch.code})`],
		["Филиал-получатель", `${snapshot.targetBranch.nameRu} (${snapshot.targetBranch.code})`],
		["Пациент (ID)", snapshot.patientId],
		["ФИО пациента", snapshot.patientFullName],
		["Документ личности", snapshot.demographics.identityDocument || ""],
		["СНИЛС", snapshot.demographics.snils || ""],
		["ИНН", snapshot.demographics.taxpayerInn || ""],
		["Согласие на обработку данных", snapshot.consent152Fz.consentId],
		["Тип подписи согласия", snapshot.consent152Fz.signatureType],
		["Хеш подписи", snapshot.consent152Fz.signatureHash],
		["Количество визитов в медкарте", snapshot.medicalHistory043u.totalVisitsCount.toString()],
		["Исследований рентген/КЛКТ", snapshot.imagingArchive.studies.length.toString()],
		["Суммарная доза (мкЗв)", snapshot.imagingArchive.totalAccumulatedDoseMicroSv.toString()],
		["Активных нарядов ЗТЛ", snapshot.activeLabOrders.length.toString()],
		["Баланс депозита (руб)", snapshot.financialDeposit.currentBalanceRub.toFixed(2)],
		["Код трансфер-ваучера", snapshot.financialDeposit.transferVoucher?.voucherCode || "НЕТ"],
		["Хеш ваучера", snapshot.financialDeposit.transferVoucher?.payloadHash || ""],
		["Контрольная сумма SHA-256", snapshot.checksumSha256],
		["Ответственный сотрудник", `${snapshot.initiatedByStaffName} (${snapshot.initiatedByStaffPosition})`],
		["Причина перевода", snapshot.transferReasonRu],
	];

	const csvBody = rows
		.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";"))
		.join("\r\n");

	// Prepend UTF-8 BOM for Excel compatibility
	return `\uFEFF${csvBody}`;
}
