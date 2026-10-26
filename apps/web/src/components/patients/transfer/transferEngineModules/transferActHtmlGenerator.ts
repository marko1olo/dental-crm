/**
 * transferActHtmlGenerator.ts — Генерация HTML печатной формы передаточного акта.
 * Лимит <= 120 строк по Мандату 8b.
 */

import {
	generateTransferVerificationQrDataUri,
	generateTransferVerificationQrPayload,
} from "./transferQrVerification.js";
import { TRANSFER_ACT_CSS } from "./transferActStyles.js";
import { formatDateRu, formatRubCurrency } from "./transferValidationRules.js";
import type { PatientClinicalSnapshot } from "./types.js";

export function generateTransferActHtml(
	snapshot: PatientClinicalSnapshot,
	qrDataUri?: string,
): string {
	const source = snapshot.sourceBranch;
	const target = snapshot.targetBranch;
	const demo = snapshot.demographics;
	const voucher = snapshot.financialDeposit.transferVoucher;
	const qrCodeImg = qrDataUri || generateTransferVerificationQrDataUri(snapshot, 160);
	const qrPayload = generateTransferVerificationQrPayload(snapshot);

	const teethList = Object.values(snapshot.odontogramAndPerio.teeth);
	const teethCount = teethList.length;
	const visitsCount = snapshot.medicalHistory043u.totalVisitsCount;
	const studiesCount = snapshot.imagingArchive.studies.length;
	const labCount = snapshot.activeLabOrders.length;
	const plansCount = snapshot.treatmentPlansAndEstimates.plans.length;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Передаточный акт медицинской карты — ${snapshot.patientFullName}</title>
	<style>${TRANSFER_ACT_CSS}</style>
</head>
<body>
	<div class="act-header">
		<div class="act-title">АКТ ПРИЕМА-ПЕРЕДАЧИ МЕДИЦИНСКОЙ КАРТЫ</div>
		<div class="act-subtitle">между структурными подразделениями и филиалами сети стоматологических клиник DENTE</div>
		<div style="font-size: 9pt; color: #64748b; margin-top: 4px;">№ АКТ-TRF-${snapshot.snapshotId.slice(5, 15).toUpperCase()} от ${formatDateRu(snapshot.exportedAtIso)} г.</div>
	</div>
	<div class="meta-grid">
		<div><strong>Филиал-отправитель:</strong> ${source.nameRu} (${source.code})<br><strong>Адрес:</strong> ${source.addressRu}<br><strong>Главный врач:</strong> ${source.chiefDoctorRu}</div>
		<div><strong>Филиал-получатель:</strong> ${target.nameRu} (${target.code})<br><strong>Адрес:</strong> ${target.addressRu}<br><strong>Главный врач:</strong> ${target.chiefDoctorRu}</div>
	</div>
	<div class="section-title">1. Сведения о пациенте и основание трансфера</div>
	<table>
		<tr><td style="width: 30%;"><strong>ФИО пациента:</strong></td><td><strong>${snapshot.patientFullName}</strong></td><td style="width: 25%;"><strong>Дата рождения:</strong></td><td>${formatDateRu(demo.birthDate)}</td></tr>
		<tr><td><strong>Документ личности:</strong></td><td>${demo.identityDocument || "Не указан"}</td><td><strong>СНИЛС / ИНН:</strong></td><td>${demo.snils || "—"} / ${demo.taxpayerInn || "—"}</td></tr>
		<tr><td><strong>Основание перевода:</strong></td><td colspan="3">${snapshot.transferReasonRu}</td></tr>
		<tr><td><strong>Согласие на обработку данных:</strong></td><td colspan="3"><span class="badge badge-success">ПОДПИСАНО И ВЕРИФИЦИРОВАНО</span> (Идентификатор: ${snapshot.consent152Fz.consentId}, Тип подписи: ${snapshot.consent152Fz.signatureType})</td></tr>
	</table>
	<div class="section-title">2. Реестр передаваемой медицинской и финансовой документации</div>
	<table>
		<thead><tr><th>№</th><th>Раздел медицинской документации</th><th>Объем / Количество записей</th><th>Статус передачи</th></tr></thead>
		<tbody>
			<tr><td>1</td><td>Медицинская карта пациента (Дневники приёма)</td><td>${visitsCount} протоколов визитов</td><td><span class="badge badge-blue">Передано в полном объеме</span></td></tr>
			<tr><td>2</td><td>Зубная формула и пародонтограмма (FDI 11..48/51..85)</td><td>${teethCount} описанных зубов (Кариес: ${snapshot.odontogramAndPerio.cariesTeethCount}, Пломбы: ${snapshot.odontogramAndPerio.filledTeethCount}, Импланты: ${snapshot.odontogramAndPerio.implantsCount})</td><td><span class="badge badge-blue">Передано</span></td></tr>
			<tr><td>3</td><td>Рентгенологический архив и учет дозовых нагрузок</td><td>${studiesCount} исследований (Суммарная доза: ${snapshot.imagingArchive.totalAccumulatedDoseMicroSv} мкЗв)</td><td><span class="badge badge-blue">Передано</span></td></tr>
			<tr><td>4</td><td>Планы комплексного лечения и финансовые сметы</td><td>${plansCount} планов на сумму ${formatRubCurrency(snapshot.treatmentPlansAndEstimates.totalPlannedCostRub)}</td><td><span class="badge badge-blue">Передано</span></td></tr>
			<tr><td>5</td><td>Наряды зуботехнической лаборатории (ЗТЛ)</td><td>${labCount} активных нарядов (перенаправлены курьеру в ${target.shortNameRu})</td><td><span class="badge badge-blue">${labCount > 0 ? "Перенаправлено" : "Нет нарядов"}</span></td></tr>
			<tr><td>6</td><td>Остаток депозита / авансового баланса</td><td><strong>${formatRubCurrency(snapshot.financialDeposit.currentBalanceRub)}</strong>${voucher ? `<br><small>Трансфер-ваучер: ${voucher.voucherCode} (Атомарная блокировка двойного списания)</small>` : ""}</td><td><span class="badge ${snapshot.financialDeposit.currentBalanceRub > 0 ? "badge-success" : "badge-warn"}">${snapshot.financialDeposit.currentBalanceRub > 0 ? "Ваучер сформирован" : "Баланс 0.00 ₽"}</span></td></tr>
		</tbody>
	</table>
	<div class="qr-box">
		<div class="qr-text"><strong>ЭЛЕКТРОННАЯ ВЕРИФИКАЦИЯ ТРАНСФЕРА (ISO/IEC 18004):</strong><br>Верификационная строка: <code>${qrPayload}</code><br>Снимок защищен криптографической контрольной суммой SHA-256:<br><code>${snapshot.checksumSha256}</code><br><small>Отсканируйте QR-код 2D-сканером на ресепшн принимающего филиала для мгновенной верификации и автоматического импорта.</small></div>
		<div><img src="${qrCodeImg}" alt="QR код верификации" width="120" height="120" style="border: 1px solid #cbd5e1; border-radius: 4px;" /></div>
	</div>
	<div class="signatures-grid">
		<div class="sign-col"><strong>Передал (Филиал-отправитель):</strong><br>${snapshot.initiatedByStaffPosition}: <strong>${snapshot.initiatedByStaffName}</strong><br><div class="sign-line"></div><small>(подпись, дата, личная печать врача / штамп филиала)</small></div>
		<div class="sign-col"><strong>Принял (Филиал-получатель):</strong><br>Главный врач / Ответственный администратор филиала:<br><div class="sign-line"></div><small>(подпись, дата, штамп приема документов)</small></div>
	</div>
</body>
</html>`;
}
