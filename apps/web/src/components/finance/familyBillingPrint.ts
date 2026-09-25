/**
 * familyBillingPrint.ts — Печатные формы семейного биллинга:
 * 1. Памятка с QR-кодом СБП для оплаты со смартфона.
 * 2. Справки об оплате медицинских услуг для ИФНС по форме КНД 1151156 (Приказ ФНС от 08.11.2023 № ЕД-7-11/824@).
 */

import type { CombinedFamilyBillingResult } from "@dental/shared";
import { generateQrCodeSvg } from "@dental/shared/fiscal/qrGenerator";

export interface PrintSbpQrOptions {
	readonly sbp: NonNullable<CombinedFamilyBillingResult["defaultSplit"]["sbpQr"]>;
	readonly clinicName: string;
	readonly payerFullName: string;
	readonly familyGroupName: string;
}

export function printSbpQrReceipt(options: PrintSbpQrOptions): void {
	const { sbp, clinicName, payerFullName, familyGroupName } = options;

	const qrSvg = generateQrCodeSvg(sbp.nspkUrl, {
		size: 180,
		margin: 1,
		title: "QR-код СБП",
	});

	const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>QR-код СБП — ${clinicName}</title>
	<style>
		body { font-family: monospace; padding: 20px; text-align: center; max-width: 300px; margin: 0 auto; }
		.qr { margin: 15px auto; display: flex; justify-content: center; }
		.qr svg { display: block; margin: 0 auto; }
		.sum { font-size: 20px; font-weight: bold; margin: 10px 0; }
		.meta { font-size: 11px; color: #555; margin: 5px 0; }
	</style>
</head>
<body>
	<h3>${clinicName}</h3>
	<p class="meta">Оплата по СБП (Система Быстрых Платежей)</p>
	<hr style="border: 0.5px dashed #999;">
	<div class="sum">${sbp.sumFormattedRu}</div>
	<p class="meta">Плательщик: ${payerFullName}</p>
	<p class="meta">Семья: ${familyGroupName}</p>
	<div class="qr">
		${qrSvg}
	</div>
	<p class="meta" style="word-break: break-all; font-size: 9px;">${sbp.nspkUrl}</p>
	<p class="meta">Наведите камеру смартфона или отсканируйте в приложении любого банка</p>
	<script>window.print();</script>
</body>
</html>
	`;

	const w = window.open("", "_blank");
	if (w) {
		w.document.write(html);
		w.document.close();
	}
}

export interface PrintTaxCertificatesOptions {
	readonly certs: CombinedFamilyBillingResult["taxDeductionCertificates"];
	readonly clinicName: string;
	readonly clinicInn: string;
}

export function printTaxCertificates(options: PrintTaxCertificatesOptions): void {
	const { certs, clinicName, clinicInn } = options;
	if (!certs.length) return;

	const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Справки об оплате медицинских услуг для ИФНС (КНД 1151156)</title>
	<style>
		@page { size: A4; margin: 15mm; }
		body { font-family: "Times New Roman", Times, serif; font-size: 13px; line-height: 1.3; color: #000; }
		.cert { page-break-after: always; padding-bottom: 20px; }
		.cert:last-child { page-break-after: avoid; }
		.header { text-align: right; font-size: 11px; margin-bottom: 15px; }
		.title { text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; }
		.section { margin-bottom: 12px; }
		.field-label { font-size: 11px; color: #444; }
		.field-val { font-weight: bold; border-bottom: 1px solid #000; min-height: 18px; display: inline-block; width: 100%; }
		.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
		table { width: 100%; border-collapse: collapse; margin-top: 10px; }
		th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 12px; }
		th { background: #f2f2f2; text-align: center; }
		.signatures { margin-top: 30px; display: flex; justify-content: space-between; }
		.stamp-box { border: 1px dashed #777; width: 120px; height: 70px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #777; }
	</style>
</head>
<body>
${certs
	.map(
		(cert) => `
	<div class="cert">
		<div class="header">
			Форма по КНД 1151156<br>
			Приложение № 1 к приказу ФНС России от 08.11.2023 № ЕД-7-11/824@
		</div>
		<div class="title">
			СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ<br>
			ДЛЯ ПРЕДСТАВЛЕНИЯ В НАЛОГОВЫЙ ОРГАН № ${cert.certificateNumber}
		</div>
		<div class="section">
			<div class="field-label">1. Медицинская организация:</div>
			<div class="field-val">${clinicName}, ИНН: ${clinicInn}</div>
		</div>
		<div class="section grid">
			<div>
				<div class="field-label">2. Налогоплательщик (плательщик):</div>
				<div class="field-val">${cert.payerFullName}</div>
			</div>
			<div>
				<div class="field-label">ИНН налогоплательщика:</div>
				<div class="field-val">${cert.payerInn || "—"}</div>
			</div>
		</div>
		<div class="section grid">
			<div>
				<div class="field-label">3. Пациент:</div>
				<div class="field-val">${cert.patientFullName}</div>
			</div>
			<div>
				<div class="field-label">Код родства с налогоплательщиком:</div>
				<div class="field-val">${cert.patientFnsCode} (${cert.patientRelationshipRu})</div>
			</div>
		</div>
		<div class="section">
			<div class="field-label">4. Стоимость оказанных медицинских услуг за ${cert.taxYear} год:</div>
			<table>
				<thead>
					<tr>
						<th>Код услуги</th>
						<th>Наименование категории</th>
						<th>Сумма (руб.)</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td style="text-align: center; font-weight: bold;">01</td>
						<td>Услуги по лечению (за исключением дорогостоящего лечения)</td>
						<td style="text-align: right; font-weight: bold;">${cert.code01TotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td>
					</tr>
					<tr>
						<td style="text-align: center; font-weight: bold;">02</td>
						<td>Дорогостоящие виды лечения (хирургия, дентальная имплантация, костная пластика)</td>
						<td style="text-align: right; font-weight: bold;">${cert.code02TotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td>
					</tr>
					<tr style="background: #f9f9f9;">
						<td colspan="2" style="font-weight: bold; text-align: right;">ИТОГО:</td>
						<td style="text-align: right; font-weight: bold;">${cert.grandTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td>
					</tr>
				</tbody>
			</table>
		</div>
		<div class="section" style="margin-top: 15px; font-size: 11px; color: #555;">
			Дата выдачи справки: ${new Date().toLocaleDateString("ru-RU")}. Справка выдана для получения социального налогового вычета по НДФЛ (ст. 219 НК РФ).
		</div>
		<div class="signatures">
			<div>
				Руководитель клиники: __________________ / _______________ /
				<br><br>
				Ответственное лицо (кассир): ___________ / _______________ /
			</div>
			<div class="stamp-box">М.П.</div>
		</div>
	</div>
`,
	)
	.join("")}
	<script>window.print();</script>
</body>
</html>
	`;

	const w = window.open("", "_blank");
	if (w) {
		w.document.write(html);
		w.document.close();
	}
}
