/**
 * blankContractPrint.ts — Instant Receptionist Blank Contract Printing.
 * Mandate 8e: «Регистратура без палок в колёса: Регистратор имеет право
 * распечатать пустой договор со строками _______ для ручного заполнения
 * без 403-ошибок.»
 */

import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";

export interface BlankContractPatientInfo {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	phone?: string | null | undefined;
	birthDate?: string | null | undefined;
	administrativeProfile?: {
		identityDocument?: string | null | undefined;
		registrationAddress?: string | null | undefined;
		taxpayerInn?: string | null | undefined;
		snils?: string | null | undefined;
	} | null | undefined;
}

export interface BlankContractOptions {
	doctorName?: string | null | undefined;
	clinicName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicOgrn?: string | null | undefined;
	clinicInn?: string | null | undefined;
}

/**
 * Generate fallback HTML for printing a physical blank contract with lines of underscores.
 * Guarantees zero 403 errors even when offline or without active backend session.
 */
export function generateBlankContractFallbackHtml(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): string {
	const clinicName = options?.clinicName || "ООО «Стоматологическая Клиника ДЕНТЕ»";
	const clinicAddress = options?.clinicAddress || "г. Москва, ул. Клиническая, д. 10";
	const clinicInn = options?.clinicInn || "7701234567";
	const clinicOgrn = options?.clinicOgrn || "1027700123456";

	const customerName = patient?.fullName?.trim() || "________________________________________________";
	const customerPhone = patient?.phone?.trim() || "________________________";
	const customerPassport =
		patient?.administrativeProfile?.identityDocument?.trim() ||
		"серия _______ № ______________, выдан ________________________________________________";
	const customerAddress =
		patient?.administrativeProfile?.registrationAddress?.trim() ||
		"____________________________________________________________________";
	const doctorName = options?.doctorName?.trim() || "________________________";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>Договор на оказание платных медицинских услуг (Бланк)</title>
	<style>
		@page { size: A4; margin: 15mm 15mm 15mm 15mm; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			font-size: 11pt;
			line-height: 1.4;
			color: #000;
			background: #fff;
			margin: 0;
			padding: 10px;
		}
		h1 {
			text-align: center;
			font-size: 14pt;
			margin-bottom: 4px;
			text-transform: uppercase;
		}
		.subtitle {
			text-align: center;
			font-size: 10pt;
			color: #333;
			margin-bottom: 16px;
		}
		.doc-header {
			display: flex;
			justify-content: space-between;
			margin-bottom: 14px;
			font-size: 10.5pt;
		}
		.section-title {
			font-weight: bold;
			margin-top: 12px;
			margin-bottom: 4px;
			font-size: 11pt;
			border-bottom: 1px solid #ccc;
			padding-bottom: 2px;
		}
		p {
			margin: 4px 0;
			text-align: justify;
		}
		.blank-line {
			display: inline-block;
			border-bottom: 1px solid #000;
			min-width: 180px;
			padding: 0 4px;
		}
		.parties-table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 20px;
			font-size: 10pt;
		}
		.parties-table td {
			width: 50%;
			vertical-align: top;
			padding: 8px;
			border: 1px solid #999;
		}
		.signature-area {
			margin-top: 30px;
		}
		@media print {
			body { padding: 0; }
			.no-print { display: none; }
		}
	</style>
</head>
<body>
	<div class="no-print" style="background:#f0fdfa; border:1px solid #0d9488; padding:10px; border-radius:8px; margin-bottom:15px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
		<span><strong>Бланк договора со строками _______ для ручного заполнения</strong> (ст. 124 УК РФ, ПП РФ №659).</span>
		<button onclick="window.print()" style="padding:6px 14px; background:#0d9488; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">Печать (Ctrl+P)</button>
	</div>

	<h1>ДОГОВОР № БЛАНК-${Date.now().toString().slice(-6)}</h1>
	<div class="subtitle">на оказание платных медицинских (стоматологических) услуг</div>

	<div class="doc-header">
		<div>г. Москва</div>
		<div>«_____» _________________ 202___ г.</div>
	</div>

	<p>
		<strong>Исполнитель:</strong> ${clinicName} (ОГРН ${clinicOgrn}, ИНН ${clinicInn}), в лице представителя регистратуры, с одной стороны, и
	</p>
	<p>
		<strong>Пациент (Потребитель / Заказчик):</strong> <span class="blank-line">${customerName}</span>,
		паспорт: <span class="blank-line">${customerPassport}</span>,
		адрес регистрации: <span class="blank-line">${customerAddress}</span>,
		телефон: <span class="blank-line">${customerPhone}</span>, с другой стороны,
		заключили настоящий Договор о нижеследующем:
	</p>

	<div class="section-title">1. ПРЕДМЕТ ДОГОВОРА</div>
	<p>
		1.1. Исполнитель обязуется оказать Пациенту платные медицинские (стоматологические) услуги в соответствии с медицинскими показаниями,
		а Пациент обязуется принять и оплатить оказанные услуги в порядке и на условиях, установленных настоящим Договором.
	</p>
	<p>
		1.2. Лечащий врач: <span class="blank-line">${doctorName}</span> (назначается до начала приема).
	</p>

	<div class="section-title">2. СТОИМОСТЬ УСЛУГ И ПОРЯДОК РАСЧЕТОВ</div>
	<p>
		2.1. Предварительная стоимость услуг до осмотра врача: <strong>_______ руб. ___ коп.</strong>
	</p>
	<p>
		2.2. Сумма прописью: __________________________________________________________________________________ руб.
	</p>
	<p>
		2.3. Окончательная стоимость согласовывается сторонами в Плане лечения / Акте выполненных работ после первичного осмотра и диагностики.
	</p>

	<div class="section-title">3. АДРЕСА, РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</div>
	<table class="parties-table">
		<tr>
			<td>
				<strong>ИСПОЛНИТЕЛЬ:</strong><br />
				${clinicName}<br />
				Адрес: ${clinicAddress}<br />
				ИНН: ${clinicInn} / ОГРН: ${clinicOgrn}<br />
				Тел.: +7 (495) 000-00-00<br /><br />
				<div class="signature-area">
					М.П. ________________________ / Регистратор
				</div>
			</td>
			<td>
				<strong>ПАЦИЕНТ / ЗАКАЗЧИК:</strong><br />
				ФИО: ${customerName}<br />
				Паспорт: ${customerPassport}<br />
				Адрес: ${customerAddress}<br />
				Телефон: ${customerPhone}<br /><br />
				<div class="signature-area">
					Подпись: ________________________ (расшифровка)
				</div>
			</td>
		</tr>
	</table>

	<script>
		// Auto-trigger print when opened in a dedicated popup window
		if (window.opener) {
			setTimeout(() => { window.print(); }, 250);
		}
	</script>
</body>
</html>`;
}

/**
 * Executes 1-click printing of a blank medical contract.
 * Tries server PDF generation first; immediately falls back to direct printable HTML
 * if the server returns 403, network error, or patient is not yet persisted.
 */
export async function printBlankMedicalContract(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): Promise<void> {
	showToast("Подготовка бланка договора со строками _______...", "info", 2000);

	try {
		// Attempt backend generation with estimatedTotalRub: 0
		const headers = denteAdminSecretRequestHeaders({
			"Content-Type": "application/json",
		});

		const customerName = patient?.fullName?.trim() || "________________________";
		const customerPassport =
			patient?.administrativeProfile?.identityDocument?.trim() ||
			"_______ __________, выдан ________________________________________________";
		const customerAddress =
			patient?.administrativeProfile?.registrationAddress?.trim() ||
			"________________________________________________";
		const customerPhone = patient?.phone?.trim() || "________________________";
		const todayIso = new Date().toISOString().slice(0, 10);

		const res = await fetch("/api/documents", {
			method: "POST",
			headers,
			body: JSON.stringify({
				patientId: patient?.id || null,
				kind: "paid_medical_services_contract",
				title: "Договор платных медицинских услуг (Бланк)",
				status: "draft",
				payload: {
					paidMedicalServicesContract: {
						contractNumber: `БЛАНК-${Date.now().toString().slice(-6)}`,
						signedAt: todayIso,
						serviceStart: todayIso,
						serviceEndOrCondition: "до завершения курса лечения",
						customerFullName: customerName,
						customerPassport,
						customerAddress,
						customerPhone,
						doctorFullName: options?.doctorName || "",
						estimatedTotalRub: 0,
						plannedCareReason: "по медицинским показаниям",
						serviceScopeSummary: "согласно плану лечения",
						paymentTerms: "По факту оказания услуг в кассу",
						priceChangeRules: "По согласованию сторон",
						freeCareAvailabilityNotice: "Пациент проинформирован о возможности получения бесплатной медицинской помощи",
						medicalRecommendationWarning: "Пациент предупрежден о необходимости соблюдения рекомендаций",
						refusalAndRefundTerms: "Согласно действующему законодательству",
						warrantyAndClaimsTerms: "12 месяцев",
						patientReceivedClinicInfo: true,
						patientReceivedPriceAndServiceList: true,
						patientUnderstandsPaidBasis: true,
						changesRequireWrittenAgreement: true,
					},
				},
			}),
		});

		if (res.ok) {
			const doc = await res.json();
			if (doc?.id) {
				const printUrl = `/api/documents/${encodeURIComponent(doc.id)}/html`;
				const win = window.open(printUrl, "_blank");
				if (win) {
					win.focus();
					showToast("Бланк договора отправлен в печать", "success", 3000);
					return;
				}
			}
		}
	} catch (err) {
		// Log and gracefully fall back to zero-403 client rendering
		console.warn("Backend blank contract generation skipped, using instant fallback:", err);
	}

	// Instant fallback guaranteeing zero 403 block:
	const fallbackHtml = generateBlankContractFallbackHtml(patient, options);
	const printWindow = window.open("", "_blank");
	if (printWindow) {
		printWindow.document.write(fallbackHtml);
		printWindow.document.close();
		printWindow.focus();
		showToast("Бланк договора (со строками _______) готов к печати", "success", 4000);
	} else {
		// If popups are blocked, print via invisible iframe
		const iframe = document.createElement("iframe");
		iframe.style.position = "fixed";
		iframe.style.right = "0";
		iframe.style.bottom = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "0";
		document.body.appendChild(iframe);
		iframe.contentDocument?.write(fallbackHtml);
		iframe.contentDocument?.close();
		iframe.contentWindow?.focus();
		iframe.contentWindow?.print();
		setTimeout(() => {
			document.body.removeChild(iframe);
		}, 1000);
		showToast("Бланк договора отправлен на печать", "success", 4000);
	}
}
