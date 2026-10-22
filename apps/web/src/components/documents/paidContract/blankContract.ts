/**
 * blankContract.ts — Канонический SSOT генерации и печати бланков договоров и ИДС со строками «_______»
 * (Постановление Правительства РФ № 736, ст. 20 и 84 323-ФЗ, Мандаты 8e, 8n).
 *
 * Инварианты:
 * 1. 1-клик печать бланка договора и согласия регистратором без блокировок (disabled = false).
 * 2. Автозаполнение частичных реквизитов пациента (ФИО, телефон, дата рождения, паспорт, СНИЛС),
 *    незаполненные поля честно выводятся строками «_______».
 * 3. Стоимость по умолчанию 0 ₽ с прочерком для первичного приёма.
 * 4. 0 мультяшных эмодзи, чистый профессиональный язык.
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";

export interface BlankContractPatientInfo {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	phone?: string | null | undefined;
	birthDate?: string | null | undefined;
	email?: string | null | undefined;
	administrativeProfile?: {
		identityDocument?: string | null | undefined;
		registrationAddress?: string | null | undefined;
		residentialAddress?: string | null | undefined;
		snils?: string | null | undefined;
		taxpayerInn?: string | null | undefined;
		email?: string | null | undefined;
		legalRepresentativeFullName?: string | null | undefined;
		legalRepresentativeRelationship?: string | null | undefined;
		legalRepresentativeIdentityDocument?: string | null | undefined;
		legalRepresentativePhone?: string | null | undefined;
	} | null | undefined;
}

export interface BlankContractOptions {
	clinicName?: string | undefined;
	clinicAddress?: string | undefined;
	clinicInn?: string | undefined;
	clinicOgrn?: string | undefined;
	clinicKpp?: string | undefined;
	clinicPhone?: string | undefined;
	clinicWebsite?: string | undefined;
	medicalLicenseNumber?: string | undefined;
	medicalLicenseDate?: string | undefined;
	medicalLicenseIssuer?: string | undefined;
	contractNumber?: string | undefined;
	contractDate?: string | undefined;
	doctorName?: string | undefined;
}

export const LEGAL_CLAUSES = {
	plannedCareReason: "Первичный осмотр, комплексная диагностика и санация полости рта",
	serviceScopeSummary: "Стоматологические медицинские услуги по согласованному плану лечения",
	paymentTerms: "Оплата производится в день оказания услуги наличными денежными средствами или банковской картой",
	priceChangeRules: "Изменение согласованного объема и стоимости услуг оформляется дополнительным соглашением",
	freeCareAvailabilityNotice: "Пациент уведомлен о программе государственных гарантий бесплатной медицинской помощи по полису ОМС",
	medicalRecommendationWarning: "Несоблюдение назначений врача может снизить качество предоставляемой медицинской услуги",
	refusalAndRefundTerms: "При досрочном отказе от лечения заказчик оплачивает фактически понесенные клиникой расходы",
	warrantyAndClaimsTerms: "Гарантийные обязательства исполняются в соответствии с Положением о гарантиях клиники",
} as const;

function escapeHtml(str: string): string {
	return String(str ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function getBlankPrintStyles(): string {
	return `@page { size: A4 portrait; margin: 10mm 12mm; }
* { box-sizing: border-box; }
body {
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
	font-size: 8.5pt; line-height: 1.34; color: #0f172a; background: #ffffff; margin: 0; padding: 8px;
	-webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.no-print {
	background: #f0fdfa; border: 1px solid #0d9488; padding: 8px 12px; border-radius: 6px;
	margin-bottom: 12px; font-size: 11px; display: flex; justify-content: space-between; align-items: center; color: #134e4a;
}
.header-grid { width: 100%; border-collapse: collapse; margin-bottom: 6px; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; }
.header-grid td { vertical-align: top; padding: 2px 4px; }
.clinic-info { font-size: 7.8pt; line-height: 1.25; color: #334155; }
.clinic-title { font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
.legal-badge-cell { text-align: right; font-size: 7.5pt; color: #475569; line-height: 1.2; }
.legal-badge { display: inline-block; background: #f1f5f9; border: 1px solid #94a3b8; border-radius: 3px; padding: 2px 6px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
h1 { text-align: center; font-size: 11pt; font-weight: 800; margin: 6px 0 2px; text-transform: uppercase; letter-spacing: 0.3px; color: #0f172a; }
.subtitle { text-align: center; font-size: 8.5pt; color: #334155; margin-bottom: 6px; }
.doc-header { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 8.5pt; font-weight: 600; }
.preamble { text-align: justify; margin: 3px 0 5px; text-indent: 14px; }
.section-title { font-weight: 800; margin-top: 6px; margin-bottom: 2px; font-size: 8.5pt; text-transform: uppercase; color: #0f172a; border-bottom: 0.75px solid #cbd5e1; padding-bottom: 1px; }
p { margin: 2.5px 0; text-align: justify; }
.blank-line { display: inline-block; border-bottom: 1px solid #0f172a; min-width: 140px; padding: 0 4px; vertical-align: bottom; }
.parties-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 7.8pt; line-height: 1.3; }
.parties-table td { width: 50%; vertical-align: top; padding: 6px 8px; border: 1px solid #475569; }
.signature-area { margin-top: 14px; }
@media print {
	body { padding: 0; }
	.no-print { display: none !important; }
	.parties-table, .signature-area { page-break-inside: avoid !important; break-inside: avoid !important; }
	.section-title { page-break-after: avoid !important; break-after: avoid !important; }
}`;
}

export function generateBlankContractFallbackHtml(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): string {
	const clinicName = options?.clinicName?.trim() || "ООО «Стоматологическая клиника»";
	const clinicAddress = options?.clinicAddress?.trim() || "________________________________________________";
	const clinicInn = options?.clinicInn?.trim() || "____________";
	const clinicOgrn = options?.clinicOgrn?.trim() || "_____________";
	const clinicKpp = options?.clinicKpp?.trim() || "_________";
	const clinicPhone = options?.clinicPhone?.trim() || "________________________";
	const clinicWebsite = options?.clinicWebsite?.trim() || "www.стоматология.рф";
	const medicalLicenseNumber = options?.medicalLicenseNumber?.trim() || "ЛО41-01137-77/00368421";
	const medicalLicenseDate = options?.medicalLicenseDate?.trim() || "12.10.2021";
	const medicalLicenseIssuer = options?.medicalLicenseIssuer?.trim() || "Департамент здравоохранения города Москвы";

	const customerName = patient?.fullName?.trim() || "________________________________________________";
	const customerBirthDate = patient?.birthDate?.trim() || "«_____» _________________ _______ г.";
	const customerPhone = patient?.phone?.trim() || "________________________";
	const customerPassport =
		patient?.administrativeProfile?.identityDocument?.trim() ||
		"серия _______ № ______________, выдан ________________________________________________";
	const customerAddress =
		patient?.administrativeProfile?.registrationAddress?.trim() ||
		patient?.administrativeProfile?.residentialAddress?.trim() ||
		"____________________________________________________________________";
	const customerSnils = patient?.administrativeProfile?.snils?.trim() || "_______-_______-_______ ___";
	const customerInn = patient?.administrativeProfile?.taxpayerInn?.trim() || "____________";
	const customerEmail = patient?.email?.trim() || patient?.administrativeProfile?.email?.trim() || "________________________";
	const doctorName = options?.doctorName?.trim() || "________________________";

	const contractSuffix = options?.contractNumber?.trim()
		? (options.contractNumber.startsWith("БЛАНК-")
			? options.contractNumber.slice("БЛАНК-".length)
			: options.contractNumber)
		: Date.now().toString().slice(-6);
	const contractDateFormatted = options?.contractDate?.trim() || "«_____» _________________ 202___ г.";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>Договор на лечение (Бланк)</title>
	<style>${getBlankPrintStyles()}</style>
</head>
<body>
	<table class="header-grid">
		<tr>
			<td style="width: 65%;">
				<div class="clinic-title">${escapeHtml(clinicName)}</div>
				<div class="clinic-info">
					Адрес: ${escapeHtml(clinicAddress)}<br />
					ИНН: ${escapeHtml(clinicInn)} · КПП: ${escapeHtml(clinicKpp)} · ОГРН: ${escapeHtml(clinicOgrn)}<br />
					Лицензия: № ${escapeHtml(medicalLicenseNumber)} от ${escapeHtml(medicalLicenseDate)} г. (${escapeHtml(medicalLicenseIssuer)})<br />
					Тел.: ${escapeHtml(clinicPhone)} · Сайт: ${escapeHtml(clinicWebsite)}
				</div>
			</td>
			<td class="legal-badge-cell" style="width: 35%;">
				<div class="legal-badge">Постановление Правительства РФ № 736</div>
				<div>ст. 84 Федерального закона № 323-ФЗ</div>
			</td>
		</tr>
	</table>

	<h1>ДОГОВОР № БЛАНК-${escapeHtml(contractSuffix)}</h1>
	<div class="subtitle">на оказание платных медицинских стоматологических услуг</div>

	<div class="doc-header">
		<div>г. Москва</div>
		<div>${escapeHtml(contractDateFormatted)}</div>
	</div>

	<div class="preamble">
		<strong>${escapeHtml(clinicName)}</strong>, осуществляющее медицинскую деятельность на основании Лицензии № ${escapeHtml(medicalLicenseNumber)}, именуемое в дальнейшем «Исполнитель», с одной стороны, и гражданин(ка) <strong>${escapeHtml(customerName)}</strong>, именуемый(ая) в дальнейшем «Пациент» (Заказчик), заключили настоящий Договор о нижеследующем:
	</div>

	<div class="section-title">1. ПРЕДМЕТ ДОГОВОРА И УВЕДОМЛЕНИЕ О ГОСУДАРСТВЕННЫХ ГАРАНТИЯХ</div>
	<p>1.1. Исполнитель обязуется оказать Пациенту платные медицинские (стоматологические) услуги, а Пациент обязуется принять и оплатить оказанные услуги в соответствии с согласованным планом лечения.</p>
	<p>1.2. Лечащий врач: <span class="blank-line">${escapeHtml(doctorName)}</span></p>
	<p>1.3. <strong>УВЕДОМЛЕНИЕ О ПРОГРАММЕ ГОСГАРАНТИЙ:</strong> До заключения настоящего Договора Исполнитель в письменной форме уведомил Пациента о возможности получения медицинской помощи по полису ОМС. Пациент добровольно выбирает платные услуги.</p>

	<div class="section-title">2. СТОИМОСТЬ УСЛУГ И ПОРЯДОК РАСЧЕТОВ</div>
	<p>2.1. Предварительная стоимость услуг до осмотра врача: <strong>0 руб. 00 коп. (прочерк: _______ руб. ___ коп.)</strong></p>
	<p>2.2. Окончательная стоимость согласовывается сторонами в плане лечения и актах оказанных услуг. Предоставление дополнительных платных услуг без согласования с Пациентом не допускается.</p>

	<div class="section-title">3. УСЛОВИЯ ОКАЗАНИЯ УСЛУГ И ПРЕДУПРЕЖДЕНИЕ ПАЦИЕНТА</div>
	<p>3.1. Услуги предоставляются при наличии оформленного информированного добровольного согласия (ИДС).</p>
	<p>3.2. Несоблюдение указаний лечащего врача может снизить качество предоставляемой услуги.</p>

	<table class="parties-table">
		<tr>
			<td>
				<strong>ИСПОЛНИТЕЛЬ:</strong><br />
				<strong>${escapeHtml(clinicName)}</strong><br />
				Адрес: ${escapeHtml(clinicAddress)}<br />
				ИНН: ${escapeHtml(clinicInn)} · КПП: ${escapeHtml(clinicKpp)} · ОГРН: ${escapeHtml(clinicOgrn)}<br />
				Лицензия: № ${escapeHtml(medicalLicenseNumber)} от ${escapeHtml(medicalLicenseDate)} г.<br />
				Тел.: ${escapeHtml(clinicPhone)}<br /><br />
				Подпись Исполнителя: _____________________ / М.П.
			</td>
			<td>
				<strong>ПАЦИЕНТ / ЗАКАЗЧИК:</strong><br />
				ФИО: <strong>${escapeHtml(customerName)}</strong><br />
				Дата рождения: ${escapeHtml(customerBirthDate)}<br />
				Паспорт: ${escapeHtml(customerPassport)}<br />
				СНИЛС: ${escapeHtml(customerSnils)} · ИНН: ${escapeHtml(customerInn)}<br />
				Адрес: ${escapeHtml(customerAddress)}<br />
				Тел.: ${escapeHtml(customerPhone)} · Email: ${escapeHtml(customerEmail)}<br /><br />
				Подпись Пациента: _____________________ / ${escapeHtml(customerName)} /
			</td>
		</tr>
	</table>
	<script>
		if (window.opener) {
			setTimeout(function() { window.print(); }, 250);
		}
	</script>
</body>
</html>`;
}

export function generateBlankConsentFallbackHtml(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): string {
	const clinicName = options?.clinicName?.trim() || "ООО «Стоматологическая клиника»";
	const clinicAddress = options?.clinicAddress?.trim() || "________________________________________________";
	const clinicInn = options?.clinicInn?.trim() || "____________";
	const clinicOgrn = options?.clinicOgrn?.trim() || "_____________";
	const clinicPhone = options?.clinicPhone?.trim() || "________________________";
	const medicalLicenseNumber = options?.medicalLicenseNumber?.trim() || "ЛО41-01137-77/00368421";
	const medicalLicenseDate = options?.medicalLicenseDate?.trim() || "12.10.2021";
	const medicalLicenseIssuer = options?.medicalLicenseIssuer?.trim() || "Департамент здравоохранения города Москвы";

	const customerName = patient?.fullName?.trim() || "________________________________________________";
	const customerBirthDate = patient?.birthDate?.trim() || "«_____» _________________ _______ г.";
	const customerPhone = patient?.phone?.trim() || "________________________";
	const customerPassport =
		patient?.administrativeProfile?.identityDocument?.trim() ||
		"серия _______ № ______________, выдан ________________________________________________";
	const customerAddress =
		patient?.administrativeProfile?.registrationAddress?.trim() ||
		patient?.administrativeProfile?.residentialAddress?.trim() ||
		"____________________________________________________________________";
	const customerSnils = patient?.administrativeProfile?.snils?.trim() || "_______-_______-_______ ___";
	const doctorName = options?.doctorName?.trim() || "________________________";

	const consentSuffix = options?.contractNumber?.trim()
		? (options.contractNumber.startsWith("БЛАНК-")
			? options.contractNumber.slice("БЛАНК-".length)
			: options.contractNumber)
		: Date.now().toString().slice(-6);
	const consentDateFormatted = options?.contractDate?.trim() || "«_____» _________________ 202___ г.";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>Информированное добровольное согласие (Бланк)</title>
	<style>${getBlankPrintStyles()}</style>
</head>
<body>
	<table class="header-grid">
		<tr>
			<td style="width: 65%;">
				<div class="clinic-title">${escapeHtml(clinicName)}</div>
				<div class="clinic-info">
					Адрес: ${escapeHtml(clinicAddress)}<br />
					ИНН: ${escapeHtml(clinicInn)} · ОГРН: ${escapeHtml(clinicOgrn)}<br />
					Лицензия: № ${escapeHtml(medicalLicenseNumber)} от ${escapeHtml(medicalLicenseDate)} г. (${escapeHtml(medicalLicenseIssuer)})<br />
					Тел.: ${escapeHtml(clinicPhone)}
				</div>
			</td>
			<td class="legal-badge-cell" style="width: 35%;">
				<div class="legal-badge">ст. 20 Федерального закона № 323-ФЗ</div>
				<div>Приказ Минздрава России № 1051н</div>
			</td>
		</tr>
	</table>

	<h1>ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ № БЛАНК-${escapeHtml(consentSuffix)}</h1>
	<div class="subtitle">на виды медицинских вмешательств при первичном приёме</div>

	<div class="doc-header">
		<div>г. Москва</div>
		<div>${escapeHtml(consentDateFormatted)}</div>
	</div>

	<p>Я, гражданин(ка) <strong>${escapeHtml(customerName)}</strong>, дата рождения: ${escapeHtml(customerBirthDate)}, паспорт: ${escapeHtml(customerPassport)}, СНИЛС: ${escapeHtml(customerSnils)}, зарегистрированный(ая) по адресу: ${escapeHtml(customerAddress)}, телефон: ${escapeHtml(customerPhone)}, даю добровольное согласие на медицинское обследование и согласованный объем вмешательств.</p>
	<p>Лечащий врач: <span class="blank-line">${escapeHtml(doctorName)}</span></p>
	<p>Мне разъяснены цели, методы оказания медицинской помощи, связанные с ними риски, возможные варианты вмешательств и их последствия.</p>

	<div style="margin-top: 24px; display: flex; justify-content: space-between; font-size: 8pt;">
		<div>Подпись врача: _____________________ / ${escapeHtml(doctorName)} /</div>
		<div>Подпись Пациента: _____________________ / ${escapeHtml(customerName)} /</div>
	</div>
	<script>
		if (window.opener) {
			setTimeout(function() { window.print(); }, 250);
		}
	</script>
</body>
</html>`;
}

export async function printBlankMedicalContract(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): Promise<void> {
	if (typeof window === "undefined") return;

	showToast("Подготовка бланка договора со строками _______...", "info", 2000);

	const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const hasValidPatientUuid = typeof patient?.id === "string" && UUID_REGEX.test(patient.id.trim());

	if (hasValidPatientUuid) {
		try {
			const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
			const customerName = patient?.fullName?.trim() || "________________________";
			const customerPassport =
				patient?.administrativeProfile?.identityDocument?.trim() ||
				"_______ __________, выдан ________________________________________________";
			const customerAddress =
				patient?.administrativeProfile?.registrationAddress?.trim() ||
				patient?.administrativeProfile?.residentialAddress?.trim() ||
				"________________________________________________";
			const customerPhone = patient?.phone?.trim() || "________________________";
			const todayIso = new Date().toISOString().slice(0, 10);
			const contractNum = options?.contractNumber?.trim() || `БЛАНК-${Date.now().toString().slice(-6)}`;

			const res = await fetch("/api/documents", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId: patient!.id!.trim(),
					kind: "paid_medical_services_contract",
					title: "Договор платных медицинских услуг (Бланк)",
					status: "draft",
					payload: {
						paidMedicalServicesContract: {
							contractNumber: contractNum,
							signedAt: todayIso,
							serviceStart: todayIso,
							serviceEndOrCondition: "до завершения курса лечения",
							customerFullName: customerName,
							customerPassport,
							customerAddress,
							customerPhone,
							doctorFullName: options?.doctorName || "",
							estimatedTotalRub: 0,
							plannedCareReason: LEGAL_CLAUSES.plannedCareReason,
							serviceScopeSummary: LEGAL_CLAUSES.serviceScopeSummary,
							paymentTerms: LEGAL_CLAUSES.paymentTerms,
							priceChangeRules: LEGAL_CLAUSES.priceChangeRules,
							freeCareAvailabilityNotice: LEGAL_CLAUSES.freeCareAvailabilityNotice,
							medicalRecommendationWarning: LEGAL_CLAUSES.medicalRecommendationWarning,
							refusalAndRefundTerms: LEGAL_CLAUSES.refusalAndRefundTerms,
							warrantyAndClaimsTerms: LEGAL_CLAUSES.warrantyAndClaimsTerms,
							patientReceivedClinicInfo: true,
							patientReceivedPriceAndServiceList: true,
							patientUnderstandsPaidBasis: true,
							changesRequireWrittenAgreement: true,
						},
					},
				}),
			});

			if (res.ok) {
				const doc = (await res.json()) as { id?: string };
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
			console.warn("Backend blank contract creation unavailable, using instant fallback:", err);
		}
	}

	try {
		const fallbackHtml = generateBlankContractFallbackHtml(patient, options);
		let printedViaWindow = false;
		const printWindow = window.open("", "_blank");
		if (printWindow && !printWindow.closed) {
			try {
				printWindow.document.write(fallbackHtml);
				printWindow.document.close();
				printWindow.focus();
				printedViaWindow = true;
				showToast("Бланк договора (со строками _______) готов к печати", "success", 4000);
			} catch {
				printedViaWindow = false;
			}
		}

		if (!printedViaWindow) {
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
				if (document.body.contains(iframe)) {
					document.body.removeChild(iframe);
				}
			}, 1500);
			showToast("Бланк договора отправлен на печать", "success", 4000);
		}
	} catch (fallbackErr) {
		console.error("Critical error during blank contract printing:", fallbackErr);
		showToast("Не удалось открыть окно печати договора", "error", 4000);
	}
}

export async function printBlankMedicalConsent(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): Promise<void> {
	if (typeof window === "undefined") return;

	showToast("Подготовка бланка ИДС со строками _______...", "info", 2000);

	try {
		const fallbackHtml = generateBlankConsentFallbackHtml(patient, options);
		let printedViaWindow = false;
		const printWindow = window.open("", "_blank");
		if (printWindow && !printWindow.closed) {
			try {
				printWindow.document.write(fallbackHtml);
				printWindow.document.close();
				printWindow.focus();
				printedViaWindow = true;
				showToast("Бланк ИДС (со строками _______) готов к печати", "success", 4000);
			} catch {
				printedViaWindow = false;
			}
		}

		if (!printedViaWindow) {
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
				if (document.body.contains(iframe)) {
					document.body.removeChild(iframe);
				}
			}, 1500);
			showToast("Бланк ИДС отправлен на печать", "success", 4000);
		}
	} catch (fallbackErr) {
		console.error("Critical error during blank consent printing:", fallbackErr);
		showToast("Не удалось открыть окно печати бланка ИДС", "error", 4000);
	}
}
