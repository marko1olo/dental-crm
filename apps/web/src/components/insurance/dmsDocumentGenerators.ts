/**
 * dmsDocumentGenerators.ts — Генерация запросов на предварительное согласование ДМС и реестров оказанных услуг.
 */

import {
	DEFAULT_CLINIC_LEGAL_INFO,
	formatKopecks,
	kopecksToRub,
	type ClinicLegalInfo,
} from "./dmsInsuranceEngine";
import {
	getStatutoryInsurerById,
	type DmsInsurerId,
	type DmsProgramKey,
	type DmsInsurerMetadata,
} from "./dmsInsurancePresets";


/** Полезная нагрузка запроса на предварительное согласование */
export interface DmsPreAuthRequestPayload {
	readonly clinicInfo?: ClinicLegalInfo | undefined;
	readonly insurerId: DmsInsurerId;
	readonly patient: {
		readonly id: string;
		readonly fullName: string;
		readonly policyNumber: string;
		readonly birthDate?: string | undefined;
		readonly phone?: string | undefined;
	};
	readonly programKey: DmsProgramKey;
	readonly diagnosisMkb10: {
		readonly code: string;
		readonly title: string;
	};
	readonly toothNumber?: string | undefined;
	readonly requestedServices: readonly {
		readonly code804n: string;
		readonly name: string;
		readonly quantity: number;
		readonly priceKopecks: number;
	}[];
	readonly clinicalJustification: string;
	readonly attachedXrayStudies: readonly {
		readonly id: string;
		readonly type: "periapical" | "optg" | "ct_3d";
		readonly title: string;
		readonly date: string;
		readonly uri?: string | undefined;
	}[];
	readonly attendingDoctor: {
		readonly fullName: string;
		readonly specialty: string;
		readonly signatureDate: string;
	};
}

/** Сгенерированный документ запроса на согласование */
export interface DmsPreAuthDocument {
	readonly documentId: string;
	readonly requestNumber: string;
	readonly requestDate: string;
	readonly slaDeadlineTimestamp: string;
	readonly insurer: DmsInsurerMetadata;
	readonly totalRequestedKopecks: number;
	readonly payload: DmsPreAuthRequestPayload;
	readonly printableHtml: string;
}

/** Запись оказанной услуги в реестре */
export interface DmsRegistryVisitServiceItem {
	readonly visitId: string;
	readonly visitDate: string;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly diagnosisMkb10: string;
	readonly toothNumber?: string | undefined;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly doctorFullName: string;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly totalBillKopecks: number;
	readonly dmsAcceptedKopecks: number;
	readonly patientPaidKopecks: number;
}

/** Полезная нагрузка генератора реестра */
export interface DmsRegistryGenerationPayload {
	readonly registryNumber: string;
	readonly periodStart: string; // YYYY-MM-DD
	readonly periodEnd: string; // YYYY-MM-DD
	readonly insurerId: DmsInsurerId;
	readonly clinicInfo?: ClinicLegalInfo | undefined;
	readonly visitServices: readonly DmsRegistryVisitServiceItem[];
}

/** Сформированный реестр ДМС */
export interface DmsStatutoryRegistry {
	readonly registryNumber: string;
	readonly creationDate: string;
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly insurer: DmsInsurerMetadata;
	readonly clinicInfo: ClinicLegalInfo;
	readonly items: readonly DmsRegistryVisitServiceItem[];
	readonly totalVisitsCount: number;
	readonly uniquePatientsCount: number;
	readonly grandTotalBillKopecks: number;
	readonly grandTotalDmsKopecks: number;
	readonly grandTotalPatientKopecks: number;
}

/**
 * Генератор запроса на предварительное согласование гарантийного письма ДМС (Pre-Auth)
 */
export function generateDmsPreAuthRequest(
	payload: DmsPreAuthRequestPayload,
): DmsPreAuthDocument {
	const clinic = payload.clinicInfo ?? DEFAULT_CLINIC_LEGAL_INFO;
	const insurer =
		getStatutoryInsurerById(payload.insurerId) ??
		getStatutoryInsurerById("sogaz")!;

	const now = new Date();
	const requestDateStr = now.toISOString().slice(0, 10);
	const requestNumber = `ПРЕ-АВТ-${payload.insurerId.toUpperCase().slice(0, 4)}-${now.getFullYear()}-${(payload.patient.id || "REQ").slice(-4).toUpperCase()}-${payload.requestedServices.length}`;

	const slaHours = insurer.defaultSlaHours;
	const slaDeadlineDate = new Date(now.getTime() + slaHours * 3600 * 1000);
	const slaDeadlineTimestamp = slaDeadlineDate.toLocaleString("ru-RU", {
		dateStyle: "medium",
		timeStyle: "short",
	});

	let totalRequestedKopecks = 0;
	const servicesTableRows = payload.requestedServices
		.map((srv, idx) => {
			const itemTotalKop = srv.priceKopecks * srv.quantity;
			totalRequestedKopecks += itemTotalKop;
			return `<tr>
				<td style="text-align: center;">${idx + 1}</td>
				<td style="font-weight: 600;">${srv.code804n}</td>
				<td>${srv.name}</td>
				<td style="text-align: center;">${srv.quantity}</td>
				<td style="text-align: right;">${formatKopecks(srv.priceKopecks)}</td>
				<td style="text-align: right; font-weight: 600;">${formatKopecks(itemTotalKop)}</td>
			</tr>`;
		})
		.join("");

	const xraysList =
		payload.attachedXrayStudies.length > 0
			? payload.attachedXrayStudies
					.map(
						(x) =>
							`<li><strong>[${x.type.toUpperCase()}]</strong> ${x.title} от ${x.date}</li>`,
					)
					.join("")
			: "<em>Рентгенологические снимки не прикреплены (не требуются по протоколу).</em>";

	const printableHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Запрос на согласование гарантийного письма ДМС № ${requestNumber}</title>
	<style>
		body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.45; margin: 0; padding: 24px; }
		.header-block { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
		.clinic-title { font-size: 16px; font-weight: 700; color: #0f172a; }
		.doc-title { font-size: 18px; font-weight: 800; text-align: center; margin: 16px 0 6px; text-transform: uppercase; letter-spacing: 0.5px; }
		.doc-subtitle { text-align: center; font-size: 12px; color: #64748b; margin-bottom: 20px; }
		.grid-box { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
		.grid-col { flex: 1; }
		table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
		th, td { border: 1px solid #cbd5e1; padding: 8px 10px; }
		th { background: #f1f5f9; font-weight: 700; text-align: left; }
		.total-row { background: #f8fafc; font-size: 13px; font-weight: 700; }
		.section-head { font-weight: 700; font-size: 13px; margin: 14px 0 6px; text-transform: uppercase; color: #0f172a; }
		.signatures { margin-top: 36px; display: flex; justify-content: space-between; page-break-inside: avoid; }
		.sig-box { width: 45%; border-top: 1px solid #0f172a; padding-top: 6px; text-align: center; font-size: 11px; }
		@media print { body { padding: 0; } }
	</style>
</head>
<body>
	<div class="header-block">
		<div class="clinic-title">${clinic.legalName} (${clinic.brandName})</div>
		<div style="font-size: 11px; color: #64748b;">
			ИНН: ${clinic.inn} | ОГРН: ${clinic.ogrn} | Лицензия: ${clinic.licenseNumber} от ${clinic.licenseDate}<br>
			Адрес: ${clinic.address}${clinic.phone ? ` | Тел: ${clinic.phone}` : ""}
		</div>
	</div>

	<div class="doc-title">Запрос на согласование гарантийного письма ДМС</div>
	<div class="doc-subtitle">Регистрационный номер: <strong>${requestNumber}</strong> от ${requestDateStr} | Регламент ДМС-2026</div>

	<div class="grid-box">
		<div class="grid-col">
			<strong>Страховая компания (Страховщик):</strong><br>
			${insurer.fullName}<br>
			ИНН: ${insurer.inn} | Email: ${insurer.email}<br>
			Куратор: ${insurer.curatorDepartment}<br>
			<strong>Срок рассмотрения (SLA):</strong> ${slaHours} ч. (до ${slaDeadlineTimestamp})
		</div>
		<div class="grid-col">
			<strong>Застрахованный пациент:</strong><br>
			ФИО: <strong>${payload.patient.fullName}</strong><br>
			Полис ДМС: <strong>${payload.patient.policyNumber}</strong><br>
			${payload.patient.birthDate ? `Дата рождения: ${payload.patient.birthDate}<br>` : ""}
			${payload.patient.phone ? `Телефон: ${payload.patient.phone}` : ""}
		</div>
	</div>

	<div class="section-head">1. Клиническое обоснование и диагноз</div>
	<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px;">
		<strong>Основной диагноз по МКБ-10:</strong> ${payload.diagnosisMkb10.code} — ${payload.diagnosisMkb10.title}<br>
		${payload.toothNumber ? `<strong>Локализация (номер зуба по FDI):</strong> ${payload.toothNumber}<br>` : ""}
		<strong>Клинический анамнез и показания:</strong> ${payload.clinicalJustification}
	</div>

	<div class="section-head">2. Приложенные рентгенологические исследования</div>
	<ul style="margin: 6px 0 16px 20px; padding: 0;">
		${xraysList}
	</ul>

	<div class="section-head">3. Перечень запрашиваемых медицинских услуг (Приказ Минздрава РФ № 804н)</div>
	<table>
		<thead>
			<tr>
				<th style="width: 40px; text-align: center;">№</th>
				<th style="width: 110px;">Код 804н</th>
				<th>Наименование медицинской услуги</th>
				<th style="width: 60px; text-align: center;">Кол-во</th>
				<th style="width: 110px; text-align: right;">Тариф (руб)</th>
				<th style="width: 120px; text-align: right;">Сумма (руб)</th>
			</tr>
		</thead>
		<tbody>
			${servicesTableRows}
			<tr class="total-row">
				<td colspan="5" style="text-align: right;">ИТОГО К СОГЛАСОВАНИЮ:</td>
				<td style="text-align: right; color: #0284c7;">${formatKopecks(totalRequestedKopecks)}</td>
			</tr>
		</tbody>
	</table>

	<div class="signatures">
		<div class="sig-box">
			Лечащий врач: ${payload.attendingDoctor.fullName} (${payload.attendingDoctor.specialty})<br>
			Дата: ${payload.attendingDoctor.signatureDate} г. (Подпись / Личная печать)
		</div>
		<div class="sig-box">
			Врач-эксперт / Куратор ${insurer.shortName}<br>
			Отметка о согласовании: [  ] Согласовано  [  ] Отказ  Дата: ______________
		</div>
	</div>
</body>
</html>`;

	return {
		documentId: `doc-preauth-${Date.now()}`,
		requestNumber,
		requestDate: requestDateStr,
		slaDeadlineTimestamp,
		insurer,
		totalRequestedKopecks,
		payload,
		printableHtml,
	};
}

/**
 * Генератор реестра оказанных услуг по ДМС (Приказ Минздрава РФ № 804н)
 */
export function generateDmsStatutoryRegistry(
	payload: DmsRegistryGenerationPayload,
): DmsStatutoryRegistry {
	const clinic = payload.clinicInfo ?? DEFAULT_CLINIC_LEGAL_INFO;
	const insurer =
		getStatutoryInsurerById(payload.insurerId) ??
		getStatutoryInsurerById("sogaz")!;

	const uniquePatients = new Set(payload.visitServices.map((v) => v.patientFullName));

	let grandTotalBillKopecks = 0;
	let grandTotalDmsKopecks = 0;
	let grandTotalPatientKopecks = 0;

	for (const item of payload.visitServices) {
		grandTotalBillKopecks += item.totalBillKopecks;
		grandTotalDmsKopecks += item.dmsAcceptedKopecks;
		grandTotalPatientKopecks += item.patientPaidKopecks;
	}

	return {
		registryNumber: payload.registryNumber,
		creationDate: new Date().toISOString().slice(0, 10),
		periodStart: payload.periodStart,
		periodEnd: payload.periodEnd,
		insurer,
		clinicInfo: clinic,
		items: payload.visitServices,
		totalVisitsCount: payload.visitServices.length,
		uniquePatientsCount: uniquePatients.size,
		grandTotalBillKopecks,
		grandTotalDmsKopecks,
		grandTotalPatientKopecks,
	};
}

/**
 * Экспорт реестра в формат CSV (RFC 4180 с UTF-8 BOM для 1C/Excel)
 */
export function exportRegistryToCsv(registry: DmsStatutoryRegistry): string {
	const headers = [
		"№ п/п",
		"Дата оказания",
		"ФИО Застрахованного",
		"Номер полиса ДМС",
		"Номер гарантийного письма",
		"Код услуги (804н)",
		"Наименование медицинской услуги",
		"Номер зуба (FDI)",
		"Диагноз (МКБ-10)",
		"Врач",
		"Кол-во",
		"Тариф (руб)",
		"Сумма по прайсу (руб)",
		"Принято ДМС (руб)",
		"Сооплата пациента (руб)",
		"Ставка НДС",
	];

	const rows: string[] = [headers.join(";")];

	registry.items.forEach((item, index) => {
		const row = [
			(index + 1).toString(),
			item.visitDate,
			`"${item.patientFullName.replace(/"/g, '""')}"`,
			`"${item.policyNumber.replace(/"/g, '""')}"`,
			`"${(item.guaranteeLetterNumber ?? "").replace(/"/g, '""')}"`,
			item.serviceCode804n,
			`"${item.serviceName.replace(/"/g, '""')}"`,
			item.toothNumber ?? "",
			item.diagnosisMkb10,
			`"${item.doctorFullName.replace(/"/g, '""')}"`,
			item.quantity.toString(),
			kopecksToRub(item.unitPriceKopecks).toFixed(2),
			kopecksToRub(item.totalBillKopecks).toFixed(2),
			kopecksToRub(item.dmsAcceptedKopecks).toFixed(2),
			kopecksToRub(item.patientPaidKopecks).toFixed(2),
			"Без НДС (пп. 2 п. 2 ст. 149 НК РФ)",
		];
		rows.push(row.join(";"));
	});

	// Итоговая строка
	rows.push(
		[
			"ИТОГО ПО РЕЕСТРУ",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			registry.items.length.toString(),
			"",
			kopecksToRub(registry.grandTotalBillKopecks).toFixed(2),
			kopecksToRub(registry.grandTotalDmsKopecks).toFixed(2),
			kopecksToRub(registry.grandTotalPatientKopecks).toFixed(2),
			"",
		].join(";"),
	);

	return `\uFEFF${rows.join("\r\n")}`;
}

/**
 * Генерация двустороннего Акта сдачи-приемки оказанных услуг по ДМС (A4 Printable HTML)
 */
export function generateBilateralAcceptanceActHtml(
	registry: DmsStatutoryRegistry,
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
): string {
	const actNumber = `АКТ-ДМС-${registry.registryNumber}`;
	const actDateStr = new Date().toLocaleDateString("ru-RU");

	const totalDmsRub = kopecksToRub(registry.grandTotalDmsKopecks);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт сдачи-приемки оказанных медицинских услуг № ${actNumber}</title>
	<style>
		body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #0f172a; line-height: 1.5; margin: 0; padding: 28px; }
		.header { text-align: center; margin-bottom: 24px; }
		.act-title { font-size: 16px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; }
		.act-subtitle { font-size: 12px; color: #475569; }
		.preamble { text-align: justify; margin-bottom: 18px; text-indent: 24px; }
		.summary-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
		.summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
		.signatures { display: flex; justify-content: space-between; margin-top: 48px; page-break-inside: avoid; }
		.sig-col { width: 46%; }
		.sig-line { border-top: 1px solid #0f172a; margin-top: 40px; padding-top: 4px; font-size: 11px; text-align: center; }
		@media print { body { padding: 0; } }
	</style>
</head>
<body>
	<div class="header">
		<div class="act-title">АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ МЕДИЦИНСКИХ УСЛУГ ПО ДМС № ${actNumber}</div>
		<div class="act-subtitle">к Договору на оказание медицинских услуг по ДМС от «___» ________ 202_ г.</div>
		<div style="margin-top: 8px; font-weight: 600;">г. Москва &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; «${actDateStr}» г.</div>
	</div>

	<div class="preamble">
		<strong>${clinicInfo.legalName}</strong> (Лицензия № ${clinicInfo.licenseNumber} от ${clinicInfo.licenseDate}), именуемое в дальнейшем «Исполнитель», в лице Главного врача ${clinicInfo.chiefDoctorFullName}, действующего на основании Устава, с одной стороны, и <strong>${registry.insurer.fullName} (${registry.insurer.shortName})</strong>, именуемое в дальнейшем «Заказчик/Страховщик», в лице уполномоченного представителя, с другой стороны, составили настоящий Акт о нижеследующем:
	</div>

	<div class="preamble">
		1. В период с <strong>${registry.periodStart}</strong> по <strong>${registry.periodEnd}</strong> Исполнитель оказал Застрахованным лицам Страховщика медицинские стоматологические услуги в строгом соответствии с Регламентом ДМС-2026, стандартами Минздрава РФ и условиями Договора согласно Реестру № <strong>${registry.registryNumber}</strong>.
	</div>

	<div class="summary-box">
		<div class="summary-row">
			<span>Всего оказано медицинских услуг:</span>
			<strong>${registry.totalVisitsCount} ед.</strong>
		</div>
		<div class="summary-row">
			<span>Количество обслуженных застрахованных пациентов:</span>
			<strong>${registry.uniquePatientsCount} чел.</strong>
		</div>
		<div class="summary-row">
			<span>Общая стоимость оказанных услуг по прейскуранту:</span>
			<strong>${formatKopecks(registry.grandTotalBillKopecks)}</strong>
		</div>
		<div class="summary-row">
			<span>Сумма сооплаты пациентов (франшизы / исключения):</span>
			<strong>${formatKopecks(registry.grandTotalPatientKopecks)}</strong>
		</div>
		<div class="summary-row" style="font-size: 14px; border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 8px;">
			<span><strong>СУММА, ПОДЛЕЖАЩАЯ ОПЛАТЕ СТРАХОВЩИКОМ:</strong></span>
			<span style="color: #0284c7;"><strong>${formatKopecks(registry.grandTotalDmsKopecks)}</strong></span>
		</div>
	</div>

	<div class="preamble">
		2. Сумма к оплате Страховщиком составляет <strong>${formatKopecks(registry.grandTotalDmsKopecks)}</strong> (${totalDmsRub.toFixed(2)} руб.). НДС не облагается на основании пп. 2 п. 2 ст. 149 Налогового кодекса Российской Федерации.
	</div>
	<div class="preamble">
		3. Услуги оказаны в полном объеме, качественно и в установленный срок. Стороны взаимных претензий по объему, качеству и срокам оказания услуг не имеют.
	</div>

	<div class="signatures">
		<div class="sig-col">
			<strong>ОТ ИСПОЛНИТЕЛЯ:</strong><br>
			${clinicInfo.legalName}<br>
			ИНН: ${clinicInfo.inn} / КПП: ${clinicInfo.kpp}<br>
			Главный врач<br><br>
			_________________ / ${clinicInfo.chiefDoctorFullName} /<br>
			<div class="sig-line">М.П.</div>
		</div>
		<div class="sig-col">
			<strong>ОТ ЗАКАЗЧИКА (СТРАХОВЩИКА):</strong><br>
			${registry.insurer.fullName} (${registry.insurer.shortName})<br>
			ИНН: ${registry.insurer.inn} / КПП: ${registry.insurer.kpp}<br>
			Уполномоченный куратор ДМС<br><br>
			_________________ / _____________________ /<br>
			<div class="sig-line">М.П.</div>
		</div>
	</div>
</body>
</html>`;
}
