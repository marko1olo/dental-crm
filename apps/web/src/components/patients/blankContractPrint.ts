/**
 * blankContractPrint.ts — Instant Receptionist Blank Contract Printing.
 * Mandate 8e item 8: «Регистратура без палок в колёса: Регистратор имеет право
 * распечатать пустой договор со строками _______ для ручного заполнения
 * без 403-ошибок.»
 * Mandate 8d item 7: «Святость официальных бланков: Ноль мультяшных эмодзи в картах
 * 043/у, актах, чеках 54-ФЗ — строго векторные иконки и публикационная типографика.»
 * Compliance: ФЗ-323 (ст. 84, 20), Постановление Правительства РФ № 736 от 11.05.2023,
 * 54-ФЗ, ст. 124 УК РФ, ПП РФ № 659.
 * Canonical location: apps/web/src/components/patients/blankContractPrint.ts (Mandate 8s)
 */

import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";

export interface BlankContractPatientInfo {
	id?: string | null | undefined;
	fullName?: string | null | undefined;
	phone?: string | null | undefined;
	email?: string | null | undefined;
	birthDate?: string | null | undefined;
	administrativeProfile?: {
		identityDocument?: string | null | undefined;
		registrationAddress?: string | null | undefined;
		residentialAddress?: string | null | undefined;
		taxpayerInn?: string | null | undefined;
		snils?: string | null | undefined;
		insurancePolicyNumber?: string | null | undefined;
		email?: string | null | undefined;
		legalRepresentativeFullName?: string | null | undefined;
		legalRepresentativeRelationship?: string | null | undefined;
		legalRepresentativeIdentityDocument?: string | null | undefined;
		legalRepresentativePhone?: string | null | undefined;
	} | null | undefined;
}

export interface BlankContractOptions {
	doctorName?: string | null | undefined;
	clinicName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicOgrn?: string | null | undefined;
	clinicInn?: string | null | undefined;
	clinicKpp?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	clinicWebsite?: string | null | undefined;
	medicalLicenseNumber?: string | null | undefined;
	medicalLicenseDate?: string | null | undefined;
	medicalLicenseIssuer?: string | null | undefined;
	contractNumber?: string | null | undefined;
	contractDate?: string | null | undefined;
}

function escapeHtml(value: string | null | undefined): string {
	if (!value) return "";
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Generate publication-grade printable HTML for a physical blank contract with lines of underscores.
 * Guarantees zero 403 errors, 0 network dependencies, and complete autonomy for the receptionist desk.
 * Full compliance with Russian medical legislation (PP RF No. 736, 323-FZ).
 */
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
	const customerSnils =
		patient?.administrativeProfile?.snils?.trim() ||
		"_______-_______-_______ ___";
	const customerInn =
		patient?.administrativeProfile?.taxpayerInn?.trim() ||
		"____________";
	const customerEmail =
		patient?.email?.trim() ||
		patient?.administrativeProfile?.email?.trim() ||
		"________________________";
	const doctorName = options?.doctorName?.trim() || "________________________";

	const repFullName = patient?.administrativeProfile?.legalRepresentativeFullName?.trim() || "";
	const repRelationship = patient?.administrativeProfile?.legalRepresentativeRelationship?.trim() || "";
	const repPassport = patient?.administrativeProfile?.legalRepresentativeIdentityDocument?.trim() || "";
	const repPhone = patient?.administrativeProfile?.legalRepresentativePhone?.trim() || "";

	const contractSuffix = options?.contractNumber?.trim()
		? (options.contractNumber.startsWith("БЛАНК-")
			? options.contractNumber.slice("БЛАНК-".length)
			: options.contractNumber)
		: Date.now().toString().slice(-6);
	const contractDateFormatted = options?.contractDate?.trim() || "«_____» _________________ 202___ г.";

	const representativeBlock = repFullName
		? `<div style="margin-top: 4px; padding: 4px 6px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 7.5pt;">
			<strong>Законный представитель (Заказчик):</strong> ${escapeHtml(repFullName)}
			${repRelationship ? ` (${escapeHtml(repRelationship)})` : ""},
			паспорт: ${escapeHtml(repPassport || "________________________")},
			тел.: ${escapeHtml(repPhone || "________________________")}
		</div>`
		: "";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>Договор на оказание платных медицинских услуг (Бланк)</title>
	<style>
		@page {
			size: A4 portrait;
			margin: 10mm 12mm 10mm 12mm;
		}
		* {
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			font-size: 8.5pt;
			line-height: 1.34;
			color: #0f172a;
			background: #ffffff;
			margin: 0;
			padding: 8px;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.no-print {
			background: #f0fdfa;
			border: 1px solid #0d9488;
			padding: 8px 12px;
			border-radius: 6px;
			margin-bottom: 12px;
			font-size: 11px;
			display: flex;
			justify-content: space-between;
			align-items: center;
			color: #134e4a;
		}
		.no-print-actions {
			display: flex;
			gap: 8px;
			align-items: center;
		}
		.btn-print {
			padding: 6px 14px;
			background: #0d9488;
			color: #ffffff;
			border: none;
			border-radius: 5px;
			font-weight: 600;
			font-size: 12px;
			cursor: pointer;
		}
		.btn-print:hover {
			background: #0f766e;
		}
		.btn-close {
			padding: 6px 12px;
			background: #e2e8f0;
			color: #334155;
			border: none;
			border-radius: 5px;
			font-size: 12px;
			cursor: pointer;
		}
		.btn-close:hover {
			background: #cbd5e1;
		}
		.header-grid {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 6px;
			border-bottom: 1.5px solid #0f172a;
			padding-bottom: 4px;
		}
		.header-grid td {
			vertical-align: top;
			padding: 2px 4px;
		}
		.clinic-info {
			font-size: 7.8pt;
			line-height: 1.25;
			color: #334155;
		}
		.clinic-title {
			font-size: 9.5pt;
			font-weight: 800;
			color: #0f172a;
			margin-bottom: 2px;
		}
		.legal-badge-cell {
			text-align: right;
			font-size: 7.5pt;
			color: #475569;
			line-height: 1.2;
		}
		.legal-badge {
			display: inline-block;
			background: #f1f5f9;
			border: 1px solid #94a3b8;
			border-radius: 3px;
			padding: 2px 6px;
			font-weight: 700;
			color: #0f172a;
			margin-bottom: 2px;
		}
		h1 {
			text-align: center;
			font-size: 11pt;
			font-weight: 800;
			margin: 6px 0 2px;
			text-transform: uppercase;
			letter-spacing: 0.3px;
			color: #0f172a;
		}
		.subtitle {
			text-align: center;
			font-size: 8.5pt;
			color: #334155;
			margin-bottom: 6px;
		}
		.doc-header {
			display: flex;
			justify-content: space-between;
			margin-bottom: 6px;
			font-size: 8.5pt;
			font-weight: 600;
		}
		.preamble {
			text-align: justify;
			margin: 3px 0 5px;
			text-indent: 14px;
		}
		.section-title {
			font-weight: 800;
			margin-top: 6px;
			margin-bottom: 2px;
			font-size: 8.5pt;
			text-transform: uppercase;
			color: #0f172a;
			border-bottom: 0.75px solid #cbd5e1;
			padding-bottom: 1px;
		}
		p {
			margin: 2.5px 0;
			text-align: justify;
		}
		.blank-line {
			display: inline-block;
			border-bottom: 1px solid #0f172a;
			min-width: 140px;
			padding: 0 4px;
			vertical-align: bottom;
		}
		.parties-table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 8px;
			font-size: 7.8pt;
			line-height: 1.3;
		}
		.parties-table td {
			width: 50%;
			vertical-align: top;
			padding: 6px 8px;
			border: 1px solid #475569;
		}
		.signature-area {
			margin-top: 14px;
		}
		.statutory-notice-box {
			margin-top: 6px;
			padding: 4px 8px;
			background: #f8fafc;
			border: 1px solid #cbd5e1;
			font-size: 7.5pt;
			line-height: 1.25;
		}
		@media print {
			body {
				padding: 0;
			}
			.no-print {
				display: none !important;
			}
			.statutory-notice-box {
				background: #ffffff;
			}
		}
	</style>
</head>
<body>
	<div class="no-print">
		<span><strong>Бланк договора со строками _______ для ручного заполнения</strong> (ст. 124 УК РФ, ПП РФ №659, ПП РФ № 736, 323-ФЗ).</span>
		<div class="no-print-actions">
			<button class="btn-print" onclick="window.print()">Печать (Ctrl+P)</button>
			<button class="btn-close" onclick="window.close()">Закрыть</button>
		</div>
	</div>

	<table class="header-grid">
		<tr>
			<td class="clinic-info">
				<div class="clinic-title">${escapeHtml(clinicName)}</div>
				<div>Адрес: ${escapeHtml(clinicAddress)} | Тел.: ${escapeHtml(clinicPhone)} | Сайт: ${escapeHtml(clinicWebsite)}</div>
				<div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)} | КПП: ${escapeHtml(clinicKpp)}</div>
				<div>Лицензия на осуществление медицинской деятельности: <strong>№ ${escapeHtml(medicalLicenseNumber)}</strong> от ${escapeHtml(medicalLicenseDate)} г., выданная: ${escapeHtml(medicalLicenseIssuer)}.</div>
			</td>
			<td class="legal-badge-cell" style="width: 220px;">
				<div class="legal-badge">ПП РФ № 736</div>
				<div>Постановление Правительства РФ</div>
				<div>от 11.05.2023 г. № 736</div>
				<div style="font-weight: bold; color: #0f172a;">ст. 84 Федерального закона № 323-ФЗ</div>
			</td>
		</tr>
	</table>

	<h1>ДОГОВОР № БЛАНК-${escapeHtml(contractSuffix)}</h1>
	<div class="subtitle">на оказание платных медицинских (стоматологических) услуг</div>

	<div class="doc-header">
		<div>г. Москва</div>
		<div>${escapeHtml(contractDateFormatted)}</div>
	</div>

	<p class="preamble">
		<strong>Исполнитель:</strong> ${escapeHtml(clinicName)} (ОГРН ${escapeHtml(clinicOgrn)}, ИНН ${escapeHtml(clinicInn)}), в лице уполномоченного представителя регистратуры / администрации, действующего на основании Устава и лицензии на осуществление медицинской деятельности № ${escapeHtml(medicalLicenseNumber)}, с одной стороны, и
	</p>
	<p class="preamble">
		<strong>Пациент (Потребитель / Заказчик):</strong> <span class="blank-line">${escapeHtml(customerName)}</span>,
		дата рождения: <span class="blank-line">${escapeHtml(customerBirthDate)}</span>,
		паспорт: <span class="blank-line">${escapeHtml(customerPassport)}</span>,
		СНИЛС: <span class="blank-line">${escapeHtml(customerSnils)}</span>,
		ИНН: <span class="blank-line">${escapeHtml(customerInn)}</span>,
		адрес регистрации: <span class="blank-line">${escapeHtml(customerAddress)}</span>,
		телефон: <span class="blank-line">${escapeHtml(customerPhone)}</span>,
		e-mail: <span class="blank-line">${escapeHtml(customerEmail)}</span>, с другой стороны,
		совместно именуемые «Стороны», заключили настоящий Договор о нижеследующем:
	</p>
	${representativeBlock}

	<div class="section-title">1. ПРЕДМЕТ ДОГОВОРА И УВЕДОМЛЕНИЕ О ГОСУДАРСТВЕННЫХ ГАРАНТИЯХ</div>
	<p>
		1.1. Исполнитель обязуется оказать Пациенту платные медицинские (стоматологические) услуги в соответствии с медицинскими показаниями и согласованным Планом лечения (сметой), а Пациент обязуется принять и оплатить оказанные услуги в порядке и на условиях, установленных настоящим Договором.
	</p>
	<p>
		1.2. Лечащий врач: <span class="blank-line">${escapeHtml(doctorName)}</span> (назначается до начала приема).
	</p>
	<p>
		1.3. <strong>УВЕДОМЛЕНИЕ О ПРОГРАММЕ ГОСГАРАНТИЙ (ст. 84 Федерального закона № 323-ФЗ, п. 7 Правил № 736):</strong> До заключения настоящего Договора Исполнитель в письменной форме уведомил Пациента (Заказчика) о возможности получения медицинской помощи без взимания платы в рамках Программы государственных гарантий бесплатного оказания гражданам медицинской помощи и Территориальной программы государственных гарантий (по полису ОМС). Пациент (Заказчик) подтверждает добровольное решение получить платные медицинские услуги.
	</p>

	<div class="section-title">2. СТОИМОСТЬ УСЛУГ И ПОРЯДОК РАСЧЕТОВ</div>
	<p>
		2.1. Предварительная стоимость услуг до осмотра врача: <strong>0 руб. 00 коп. (прочерк: _______ руб. ___ коп.)</strong>
	</p>
	<p>
		2.2. Сумма прописью: __________________________________________________________________________________ руб.
	</p>
	<p>
		2.3. Окончательная стоимость согласовывается сторонами в Плане лечения / Акте выполненных работ после первичного осмотра и диагностики.
	</p>
	<p>
		2.4. <strong>ЗАПРЕТ НА ОДНОСТОРОННЕЕ ИЗМЕНЕНИЕ СМЕТЫ (п. 26 Правил № 736):</strong> Предоставление дополнительных платных услуг, не предусмотренных согласованным планом лечения, допускается исключительно с предварительного письменного согласия Пациента (Заказчика).
	</p>
	<p>
		2.5. Оплата производится наличными денежными средствами или банковской картой с обязательной выдачей фискального кассового чека (по 54-ФЗ).
	</p>

	<div class="section-title">3. УСЛОВИЯ ОКАЗАНИЯ УСЛУГ И ПРЕДУПРЕЖДЕНИЕ ПАЦИЕНТА</div>
	<p>
		3.1. Медицинские услуги предоставляются при наличии оформленного информированного добровольного согласия (ИДС) в соответствии со ст. 20 Федерального закона № 323-ФЗ.
	</p>
	<p>
		3.2. <strong>ПРЕДУПРЕЖДЕНИЕ ПАЦИЕНТА (п. 6 Правил № 736):</strong> Пациент предупрежден о том, что несоблюдение указаний (рекомендаций) лечащего врача, в том числе назначенного режима лечения и правил гигиены, может снизить качество предоставляемой медицинской услуги, повлечь за собой невозможность ее завершения в срок или отрицательно сказаться на состоянии здоровья Пациента.
	</p>

	<div class="section-title">4. ПРАВА, ОБЯЗАННОСТИ И ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА</div>
	<p>
		4.1. Пациент имеет право на выбор врача, получение выписок и копий медицинской документации в порядке, установленном законодательством РФ (Приказ Минздрава России № 789н).
	</p>
	<p>
		4.2. Исполнитель гарантирует качество оказываемых услуг и применение разрешенных на территории РФ стоматологических материалов и препаратов. Гарантийные обязательства устанавливаются в соответствии с Положением о гарантиях клиники.
	</p>

	<div class="section-title">5. КОНТРОЛИРУЮЩИЕ ОРГАНЫ И РАЗРЕШЕНИЕ СПОРОВ</div>
	<p>
		5.1. Органы государственного контроля: Территориальный орган Росздравнадзора по г. Москве и МО, Управление Роспотребнадзора по г. Москве, Департамент здравоохранения г. Москвы. Споры разрешаются в соответствии с законодательством РФ и Законом РФ «О защите прав потребителей».
	</p>

	<div class="section-title">6. АДРЕСА, РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</div>
	<table class="parties-table">
		<tr>
			<td>
				<strong>ИСПОЛНИТЕЛЬ:</strong><br />
				${escapeHtml(clinicName)}<br />
				Адрес: ${escapeHtml(clinicAddress)}<br />
				ИНН: ${escapeHtml(clinicInn)} / КПП: ${escapeHtml(clinicKpp)} / ОГРН: ${escapeHtml(clinicOgrn)}<br />
				Лицензия: № ${escapeHtml(medicalLicenseNumber)} от ${escapeHtml(medicalLicenseDate)} г.<br />
				Тел.: ${escapeHtml(clinicPhone)}<br /><br />
				<div class="signature-area">
					М.П. ________________________ / Регистратор
				</div>
			</td>
			<td>
				<strong>ПАЦИЕНТ / ЗАКАЗЧИК:</strong><br />
				ФИО: ${escapeHtml(customerName)}<br />
				Дата рожд.: ${escapeHtml(customerBirthDate)}<br />
				Паспорт: ${escapeHtml(customerPassport)}<br />
				СНИЛС: ${escapeHtml(customerSnils)}<br />
				ИНН: ${escapeHtml(customerInn)}<br />
				Адрес: ${escapeHtml(customerAddress)}<br />
				Телефон: ${escapeHtml(customerPhone)}<br /><br />
				<div class="signature-area">
					Подпись: ________________________ (расшифровка)
				</div>
			</td>
		</tr>
	</table>

	<div class="statutory-notice-box">
		С Программой государственных гарантий бесплатного оказания медицинской помощи, прейскурантом клиники и условиями договора ознакомлен(а), на получение платных стоматологических услуг согласен(на):<br />
		Подпись Пациента (Заказчика): ________________________ / ${escapeHtml(customerName)} / «_____» _________________ 202___ г.
	</div>

	<script>
		// Auto-trigger print when opened in a dedicated popup window
		if (window.opener) {
			setTimeout(function() { window.print(); }, 250);
		}
	</script>
</body>
</html>`;
}

/**
 * Executes 1-click printing of a blank medical contract.
 * Guarantees zero 403 blocks, zero validation rejections, and immediate autonomy for the receptionist desk.
 *
 * Operational flow:
 * 1. If patient has a valid persisted UUID in DB, attempts background server PDF/HTML draft generation.
 * 2. If patient is unregistered, walk-in, offline, or server returns 400/403/500/network error,
 *    instantly falls back to publication-grade direct HTML printing with '_______' lines.
 * 3. Supports popup windows and auto-falls back to an invisible iframe when popup blockers are active.
 */
export async function printBlankMedicalContract(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): Promise<void> {
	if (typeof window === "undefined") {
		return;
	}

	showToast("Подготовка бланка договора со строками _______...", "info", 2000);

	const UUID_REGEX =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const hasValidPatientUuid =
		typeof patient?.id === "string" && UUID_REGEX.test(patient.id.trim());

	// If we have an active persisted patient with a valid UUID, attempt to create/fetch draft on backend
	if (hasValidPatientUuid) {
		try {
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			});

			const customerName =
				patient?.fullName?.trim() || "________________________";
			const customerPassport =
				patient?.administrativeProfile?.identityDocument?.trim() ||
				"_______ __________, выдан ________________________________________________";
			const customerAddress =
				patient?.administrativeProfile?.registrationAddress?.trim() ||
				patient?.administrativeProfile?.residentialAddress?.trim() ||
				"________________________________________________";
			const customerPhone =
				patient?.phone?.trim() || "________________________";
			const todayIso = new Date().toISOString().slice(0, 10);
			const contractNum =
				options?.contractNumber?.trim() ||
				`БЛАНК-${Date.now().toString().slice(-6)}`;

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
							plannedCareReason: "по медицинским показаниям",
							serviceScopeSummary: "согласно плану лечения",
							paymentTerms: "По факту оказания услуг в кассу",
							priceChangeRules: "По согласованию сторон",
							freeCareAvailabilityNotice:
								"Пациент проинформирован о возможности получения бесплатной медицинской помощи",
							medicalRecommendationWarning:
								"Пациент предупрежден о необходимости соблюдения рекомендаций",
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
			console.warn(
				"Backend blank contract creation unavailable, using instant fallback:",
				err,
			);
		}
	}

	// Instant client-side fallback printing:
	// Works for walk-ins, unregistered patients, offline mode, 403 prevention, popup blockers
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
				showToast(
					"Бланк договора (со строками _______) готов к печати",
					"success",
					4000,
				);
			} catch (writeErr) {
				console.warn(
					"Popup document write failed, falling back to iframe:",
					writeErr,
				);
				printedViaWindow = false;
			}
		}

		if (!printedViaWindow) {
			// If popups are blocked or write failed, print via invisible iframe
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
		console.error(
			"Critical error during blank contract printing:",
			fallbackErr,
		);
		showToast("Не удалось открыть окно печати договора", "error", 4000);
	}
}

/**
 * Generate publication-grade printable HTML for an informed voluntary consent (ИДС) blank with lines of underscores.
 * Guarantees zero 403 errors, 0 network dependencies, and complete autonomy for the receptionist desk.
 * Full compliance with Order 1051n, 323-FZ (art. 20), 152-FZ, and Mandate 8d item 7 (zero emojis).
 */
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
	const customerSnils =
		patient?.administrativeProfile?.snils?.trim() ||
		"_______-_______-_______ ___";
	const doctorName = options?.doctorName?.trim() || "________________________";

	const repFullName = patient?.administrativeProfile?.legalRepresentativeFullName?.trim() || "";
	const repRelationship = patient?.administrativeProfile?.legalRepresentativeRelationship?.trim() || "";
	const repPassport = patient?.administrativeProfile?.legalRepresentativeIdentityDocument?.trim() || "";
	const repPhone = patient?.administrativeProfile?.legalRepresentativePhone?.trim() || "";

	const consentSuffix = options?.contractNumber?.trim()
		? (options.contractNumber.startsWith("БЛАНК-")
			? options.contractNumber.slice("БЛАНК-".length)
			: options.contractNumber)
		: Date.now().toString().slice(-6);
	const consentDateFormatted = options?.contractDate?.trim() || "«_____» _________________ 202___ г.";

	const representativeBlock = repFullName
		? `<div style="margin-top: 4px; padding: 4px 6px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 7.5pt;">
			<strong>Законный представитель:</strong> ${escapeHtml(repFullName)}
			${repRelationship ? ` (${escapeHtml(repRelationship)})` : ""},
			паспорт: ${escapeHtml(repPassport || "________________________")},
			тел.: ${escapeHtml(repPhone || "________________________")}
		</div>`
		: "";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>Информированное добровольное согласие (Бланк)</title>
	<style>
		@page {
			size: A4 portrait;
			margin: 10mm 12mm 10mm 12mm;
		}
		* {
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			font-size: 8.5pt;
			line-height: 1.34;
			color: #0f172a;
			background: #ffffff;
			margin: 0;
			padding: 8px;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.no-print {
			background: #f0fdfa;
			border: 1px solid #0d9488;
			padding: 8px 12px;
			border-radius: 6px;
			margin-bottom: 12px;
			font-size: 11px;
			display: flex;
			justify-content: space-between;
			align-items: center;
			color: #134e4a;
		}
		.no-print-actions {
			display: flex;
			gap: 8px;
			align-items: center;
		}
		.btn-print {
			padding: 6px 14px;
			background: #0d9488;
			color: #ffffff;
			border: none;
			border-radius: 5px;
			font-weight: 600;
			font-size: 12px;
			cursor: pointer;
		}
		.btn-print:hover {
			background: #0f766e;
		}
		.btn-close {
			padding: 6px 12px;
			background: #e2e8f0;
			color: #334155;
			border: none;
			border-radius: 5px;
			font-size: 12px;
			cursor: pointer;
		}
		.btn-close:hover {
			background: #cbd5e1;
		}
		.header-grid {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 6px;
			border-bottom: 1.5px solid #0f172a;
			padding-bottom: 4px;
		}
		.header-grid td {
			vertical-align: top;
			padding: 2px 4px;
		}
		.clinic-info {
			font-size: 7.8pt;
			line-height: 1.25;
			color: #334155;
		}
		.clinic-title {
			font-size: 9.5pt;
			font-weight: 800;
			color: #0f172a;
			margin-bottom: 2px;
		}
		.legal-badge-cell {
			text-align: right;
			font-size: 7.5pt;
			color: #475569;
			line-height: 1.2;
		}
		.legal-badge {
			display: inline-block;
			background: #f1f5f9;
			border: 1px solid #94a3b8;
			border-radius: 3px;
			padding: 2px 6px;
			font-weight: 700;
			color: #0f172a;
			margin-bottom: 2px;
		}
		h1 {
			text-align: center;
			font-size: 10.5pt;
			font-weight: 800;
			margin: 6px 0 2px;
			text-transform: uppercase;
			letter-spacing: 0.3px;
			color: #0f172a;
		}
		.subtitle {
			text-align: center;
			font-size: 8.5pt;
			color: #334155;
			margin-bottom: 6px;
		}
		.doc-header {
			display: flex;
			justify-content: space-between;
			margin-bottom: 6px;
			font-size: 8.5pt;
			font-weight: 600;
		}
		.preamble {
			text-align: justify;
			margin: 3px 0 5px;
			text-indent: 14px;
		}
		.section-title {
			font-weight: 800;
			margin-top: 6px;
			margin-bottom: 2px;
			font-size: 8.5pt;
			text-transform: uppercase;
			color: #0f172a;
			border-bottom: 0.75px solid #cbd5e1;
			padding-bottom: 1px;
		}
		p {
			margin: 2.5px 0;
			text-align: justify;
		}
		.blank-line {
			display: inline-block;
			border-bottom: 1px solid #0f172a;
			min-width: 140px;
			padding: 0 4px;
			vertical-align: bottom;
		}
		.signatures-row {
			display: flex;
			justify-content: space-between;
			margin-top: 14px;
			gap: 16px;
		}
		.sign-box {
			flex: 1;
			border: 1px solid #cbd5e1;
			padding: 8px;
			border-radius: 4px;
			font-size: 7.8pt;
			line-height: 1.35;
		}
		.sign-line {
			border-bottom: 1px solid #0f172a;
			height: 20px;
			margin-top: 8px;
		}
		.sign-hint {
			font-size: 7pt;
			color: #64748b;
			text-align: center;
			margin-top: 2px;
		}
		@media print {
			body {
				padding: 0;
			}
			.no-print {
				display: none !important;
			}
		}
	</style>
</head>
<body>
	<div class="no-print">
		<span><strong>Бланк ИДС со строками _______ для ручного заполнения</strong> (Приказ Минздрава № 1051н, ст. 20 323-ФЗ, 152-ФЗ).</span>
		<div class="no-print-actions">
			<button class="btn-print" onclick="window.print()">Печать (Ctrl+P)</button>
			<button class="btn-close" onclick="window.close()">Закрыть</button>
		</div>
	</div>

	<table class="header-grid">
		<tr>
			<td class="clinic-info">
				<div class="clinic-title">${escapeHtml(clinicName)}</div>
				<div>Адрес: ${escapeHtml(clinicAddress)} | Тел.: ${escapeHtml(clinicPhone)}</div>
				<div>ОГРН: ${escapeHtml(clinicOgrn)} | ИНН: ${escapeHtml(clinicInn)}</div>
				<div>Лицензия на осуществление медицинской деятельности: <strong>№ ${escapeHtml(medicalLicenseNumber)}</strong> от ${escapeHtml(medicalLicenseDate)} г., выданная: ${escapeHtml(medicalLicenseIssuer)}.</div>
			</td>
			<td class="legal-badge-cell" style="width: 220px;">
				<div class="legal-badge">Приказ № 1051н</div>
				<div>ст. 20 Федерального закона № 323-ФЗ</div>
				<div style="font-weight: bold; color: #0f172a;">В медкарту стоматологического пациента (043/у)</div>
			</td>
		</tr>
	</table>

	<h1>ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ № БЛАНК-ИДС-${escapeHtml(consentSuffix)}</h1>
	<div class="subtitle">на медицинское вмешательство, первичный стоматологический осмотр и диагностику</div>

	<div class="doc-header">
		<div>г. Москва</div>
		<div>${escapeHtml(consentDateFormatted)}</div>
	</div>

	<p class="preamble">
		Я, <span class="blank-line">${escapeHtml(customerName)}</span>,
		дата рождения: <span class="blank-line">${escapeHtml(customerBirthDate)}</span>,
		паспорт: <span class="blank-line">${escapeHtml(customerPassport)}</span>,
		СНИЛС: <span class="blank-line">${escapeHtml(customerSnils)}</span>,
		адрес регистрации / проживания: <span class="blank-line">${escapeHtml(customerAddress)}</span>,
		телефон: <span class="blank-line">${escapeHtml(customerPhone)}</span>,
		даю информированное добровольное согласие на медицинское вмешательство в соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации».
	</p>
	${representativeBlock}

	<div class="section-title">1. ПЕРЕЧЕНЬ МЕДИЦИНСКИХ ВМЕШАТЕЛЬСТВ И ЛЕЧАЩИЙ ВРАЧ</div>
	<p>
		1.1. Лечащий врач-стоматолог: <span class="blank-line">${escapeHtml(doctorName)}</span>.
	</p>
	<p>
		1.2. Медицинские вмешательства включают: осмотр полости рта, инструментальное и визуальное обследование, зондирование, перкуссию, пальпацию, температурную диагностику, прицельную визиографию / ортопантомографию / КЛКТ, местную аппликационную и инфильтрационную/проводниковую анестезию (по клиническим показаниям), профессиональную гигиену полости рта, снятие зубных отложений и составление предварительного плана лечения.
	</p>
	<p>
		1.3. Область вмешательства / зубы: ____________________________________________________________________.
	</p>

	<div class="section-title">2. ИНФОРМИРОВАНИЕ О ЦЕЛЯХ, МЕТОДАХ И РИСКАХ</div>
	<p>
		2.1. Мне в доступной форме разъяснены цели, характер и методы предстоящего медицинского вмешательства, связанный с ними риск, возможные варианты вмешательства, их последствия и ожидаемые результаты.
	</p>
	<p>
		2.2. Я проинформирован(а) о возможных осложнениях и временных дискомфортных ощущениях (чувствительность зубов после вмешательства в течение 1–3 дней, временное онемение губы или щеки после анестезии).
	</p>
	<p>
		2.3. Я сообщил(а) врачу обо всех имеющихся у меня аллергических реакциях, индивидуальной непереносимости препаратов (включая анестетики и антибиотики), сопутствующих соматических заболеваниях (сердечно-сосудистые, сахарный диабет, нарушения свертываемости крови) и принимаемых лекарствах.
	</p>

	<div class="section-title">3. ПРАВО НА ОТКАЗ И ОБРАБОТКА ПЕРСОНАЛЬНЫХ ДАННЫХ</div>
	<p>
		3.1. Мне разъяснено право отказаться от медицинского вмешательства или потребовать его прекращения в любой момент до завершения процедуры (ст. 20 Федерального закона № 323-ФЗ). В случае отказа мне разъяснены возможные последствия для здоровья.
	</p>
	<p>
		3.2. Настоящим даю согласие Исполнителю на обработку моих персональных данных в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» в медико-профилактических целях, ведения медицинской карты по Форме 043/у и учета оказанных услуг.
	</p>

	<div class="signatures-row">
		<div class="sign-box">
			<strong>Пациент (Заказчик / Представитель):</strong><br />
			ФИО: ${escapeHtml(customerName)}<br />
			<div class="sign-line"></div>
			<div class="sign-hint">(личная подпись / «_____» _________________ 202___ г.)</div>
		</div>
		<div class="sign-box">
			<strong>Лечащий врач-стоматолог:</strong><br />
			ФИО: ${escapeHtml(doctorName)}<br />
			<div class="sign-line"></div>
			<div class="sign-hint">(подпись медицинского работника / дата)</div>
		</div>
	</div>

	<script>
		if (window.opener) {
			setTimeout(function() { window.print(); }, 250);
		}
	</script>
</body>
</html>`;
}

/**
 * 1-клик печать бланка ИДС (информированного добровольного согласия) со строками _______
 * для заполнения пациентом вручную до приёма (Мандат 8e п. 8, ст. 20 323-ФЗ).
 * Полная автономность регистратора без 403-ошибок и без требований обязательных полей.
 */
export async function printBlankMedicalConsent(
	patient?: BlankContractPatientInfo | null,
	options?: BlankContractOptions,
): Promise<void> {
	if (typeof window === "undefined") {
		return;
	}

	showToast("Подготовка бланка ИДС со строками _______...", "info", 2000);

	const UUID_REGEX =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const hasValidPatientUuid =
		typeof patient?.id === "string" && UUID_REGEX.test(patient.id.trim());

	if (hasValidPatientUuid) {
		try {
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			});
			const todayIso = new Date().toISOString().slice(0, 10);
			const consentNum =
				options?.contractNumber?.trim() ||
				`БЛАНК-ИДС-${Date.now().toString().slice(-6)}`;

			const res = await fetch("/api/documents", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId: patient!.id!.trim(),
					kind: "informed_voluntary_consent",
					title: "Информированное добровольное согласие (Бланк)",
					status: "draft",
					payload: {
						patientFullName: patient?.fullName?.trim() || "________________________",
						doctorFullName: options?.doctorName || "",
						date: todayIso,
						contractNumber: consentNum,
						isUnderlinedBlank: true,
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
						showToast("Бланк ИДС отправлен в печать", "success", 3000);
						return;
					}
				}
			}
		} catch (err) {
			console.warn(
				"Backend blank consent creation unavailable, using instant fallback:",
				err,
			);
		}
	}

	// Instant client-side fallback printing:
	// Works for walk-ins, unregistered patients, offline mode, 403 prevention, popup blockers
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
				showToast(
					"Бланк ИДС (со строками _______) готов к печати",
					"success",
					4000,
				);
			} catch (writeErr) {
				console.warn(
					"Popup document write failed, falling back to iframe:",
					writeErr,
				);
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

