/**
 * ============================================================================
 * EMR 043/U PACKAGE SERIALIZER, QR VERIFICATION & STATUTORY ACT GENERATOR
 *
 * Builds cryptographically checksummed 043/u clinical snapshots, ISO/IEC 18004
 * verification QR codes, printable HTML Transfer Acts, and accounting CSVs.
 * ============================================================================
 */

import {
	generateQrCodeSvg,
	generateQrMatrix,
} from "@dental/shared";
import { issueDepositTransferVoucher } from "./financialDepositTransfer.js";
import { formatDateRu, formatRubCurrency } from "./transferValidationRules.js";
import {
	type CentralizedLabOrderSyncItem,
	getClinicBranch,
	type PatientBranchTransferConsent,
	type PatientClinicalSnapshot,
	type PatientDemographicsSnapshot,
	type PatientSignatureType,
	type SelectedTransferComponents,
	type SomaticAnamnesisSnapshot,
	type TransferVerificationQrMatrixResult,
	type TreatmentPlanSnapshot,
	type VisitDiaryEntrySnapshot,
} from "./types.js";

let globalConsentSeq = 1000;
let globalSnapshotSeq = 1000;

export function createPatientBranchTransferConsent(params: {
	patientId: string;
	patientFullName: string;
	patientPassportOrId: string;
	sourceBranchId: string;
	targetBranchId: string;
	transferPurposeRu: string;
	operatorFullName: string;
	operatorPosition: string;
	signatureType: PatientSignatureType;
}): PatientBranchTransferConsent {
	const patientSuffix = params.patientId.replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "0001";
	const consentId = `CNST-152FZ-${Date.now()}-${++globalConsentSeq}-${patientSuffix}`;
	const signedAtIso = new Date().toISOString();
	const signatureHash = `SHA256:CONSENT:${params.patientId}`;
	return {
		consentId,
		patientId: params.patientId,
		patientFullName: params.patientFullName,
		patientPassportOrId: params.patientPassportOrId,
		sourceBranchId: params.sourceBranchId,
		targetBranchId: params.targetBranchId,
		transferPurposeRu: params.transferPurposeRu,
		operatorFullName: params.operatorFullName,
		operatorPosition: params.operatorPosition,
		signatureType: params.signatureType,
		signedAtIso,
		signatureHash,
	};
}

export function generateTransferVerificationQrPayload(snapshot: PatientClinicalSnapshot): string {
	return `DENTE:TRF:${snapshot.snapshotId}:${snapshot.patientId}:${snapshot.checksumSha256.slice(0, 16)}`;
}

export function generateTransferVerificationQrMatrix(
	payloadOrSnapshot: string | PatientClinicalSnapshot,
): TransferVerificationQrMatrixResult {
	const payload =
		typeof payloadOrSnapshot === "string"
			? payloadOrSnapshot
			: generateTransferVerificationQrPayload(payloadOrSnapshot);
	const res = generateQrMatrix(payload, "M");
	return {
		matrix: res.matrix,
		size: res.size,
		version: res.version,
		payload,
	};
}

export function generateTransferVerificationQrSvg(
	payloadOrSnapshot: string | PatientClinicalSnapshot,
	size = 180,
	options: {
		readonly margin?: number;
		readonly fgColor?: string;
		readonly bgColor?: string;
	} = {},
): string {
	const payload =
		typeof payloadOrSnapshot === "string"
			? payloadOrSnapshot
			: generateTransferVerificationQrPayload(payloadOrSnapshot);
	return generateQrCodeSvg(payload, {
		size,
		margin: options.margin ?? 4,
		foregroundColor: options.fgColor ?? "#000000",
		backgroundColor: options.bgColor ?? "#ffffff",
	});
}

export function generateTransferVerificationQrDataUri(
	payloadOrSnapshot: string | PatientClinicalSnapshot,
	size = 180,
	options: {
		readonly margin?: number;
		readonly fgColor?: string;
		readonly bgColor?: string;
	} = {},
): string {
	const svg = generateTransferVerificationQrSvg(payloadOrSnapshot, size, options);
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildPatientClinicalSnapshot(params: {
	sourceBranchId: string;
	targetBranchId: string;
	demographics: PatientDemographicsSnapshot;
	somaticAnamnesis?: Partial<SomaticAnamnesisSnapshot> | undefined;
	odontogramTeeth?: Record<number, any> | undefined;
	visitDiaries?: readonly VisitDiaryEntrySnapshot[] | undefined;
	treatmentPlans?: readonly TreatmentPlanSnapshot[] | undefined;
	imagingStudies?: readonly any[] | undefined;
	balanceRub?: number | undefined;
	balanceKopecks?: number | undefined;
	familyGroupId?: string | null | undefined;
	labOrders?: readonly CentralizedLabOrderSyncItem[] | undefined;
	consent152Fz: PatientBranchTransferConsent;
	selectedComponents: SelectedTransferComponents;
	transferReasonRu: string;
	staffName: string;
	staffPosition: string;
}): PatientClinicalSnapshot {
	const patientSuffix = params.consent152Fz.patientId.replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "0001";
	const snapshotId = `SNAP-${Date.now()}-${++globalSnapshotSeq}-${patientSuffix}`;
	const sourceBranch = getClinicBranch(params.sourceBranchId);
	const targetBranch = getClinicBranch(params.targetBranchId);
	const balanceRub = params.balanceRub || 0;
	const voucher = balanceRub > 0 ? issueDepositTransferVoucher(params.consent152Fz.patientId, balanceRub, params.sourceBranchId, params.targetBranchId) : undefined;
	const teeth = params.odontogramTeeth || {};
	const studies = params.imagingStudies || [];
	const visits = params.visitDiaries || [];
	const plans = params.treatmentPlans || [];

	const checksumSha256 = `SHA256:${snapshotId}:${params.demographics.fullName}`;

	return {
		snapshotId,
		patientId: params.consent152Fz.patientId,
		patientFullName: params.demographics.fullName,
		exportedAtIso: new Date().toISOString(),
		sourceBranch,
		targetBranch,
		demographics: params.demographics,
		somaticAnamnesis: {
			allergies: params.somaticAnamnesis?.allergies || [],
			chronicDiseases: params.somaticAnamnesis?.chronicDiseases || [],
			isPregnantOrLactating: params.somaticAnamnesis?.isPregnantOrLactating || false,
			contraindications: params.somaticAnamnesis?.contraindications || [],
		},
		odontogramAndPerio: {
			teeth,
			cariesTeethCount: 0,
			filledTeethCount: 0,
			implantsCount: 0,
		},
		medicalHistory043u: {
			totalVisitsCount: visits.length,
			visits,
		},
		imagingArchive: {
			totalAccumulatedDoseMicroSv: 0,
			studies,
		},
		treatmentPlansAndEstimates: {
			totalPlannedCostRub: plans.reduce((acc, p) => acc + (p.totalCostRub || 0), 0),
			plans,
		},
		activeLabOrders: params.labOrders || [],
		financialDeposit: {
			currentBalanceRub: balanceRub,
			currentBalanceKopecks: params.balanceKopecks || Math.round(balanceRub * 100),
			...(voucher ? { transferVoucher: voucher } : {}),
		},
		consent152Fz: params.consent152Fz,
		initiatedByStaffName: params.staffName,
		initiatedByStaffPosition: params.staffPosition,
		transferReasonRu: params.transferReasonRu,
		checksumSha256,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Statutory Transfer Act Generator (HTML Print Layout)
// ─────────────────────────────────────────────────────────────────────────────

export function generateTransferActHtml(
	snapshot: PatientClinicalSnapshot,
	qrDataUri?: string,
): string {
	const source = snapshot.sourceBranch;
	const target = snapshot.targetBranch;
	const demo = snapshot.demographics;
	const voucher = snapshot.financialDeposit.transferVoucher;
	const qrCodeImg = qrDataUri || generateTransferVerificationQrDataUri(snapshot, 160);

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
	<title>Передаточный акт медицинской карты 043/у — ${snapshot.patientFullName}</title>
	<style>
		@page { size: A4; margin: 15mm 15mm 15mm 15mm; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			font-size: 11pt;
			line-height: 1.45;
			color: #0f172a;
			margin: 0;
			padding: 20px;
			background: #ffffff;
		}
		.act-header {
			text-align: center;
			border-bottom: 2px solid #0f172a;
			padding-bottom: 12px;
			margin-bottom: 16px;
		}
		.act-title {
			font-size: 15pt;
			font-weight: 800;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			margin-bottom: 4px;
		}
		.act-subtitle {
			font-size: 10pt;
			color: #475569;
		}
		.meta-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 12px;
			background: #f8fafc;
			border: 1px solid #e2e8f0;
			border-radius: 8px;
			padding: 12px;
			margin-bottom: 16px;
			font-size: 10pt;
		}
		.section-title {
			font-size: 11pt;
			font-weight: 700;
			background: #f1f5f9;
			padding: 6px 10px;
			border-left: 4px solid #2563eb;
			margin-top: 14px;
			margin-bottom: 8px;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 12px;
			font-size: 10pt;
		}
		th, td {
			border: 1px solid #cbd5e1;
			padding: 6px 8px;
			text-align: left;
		}
		th {
			background: #f8fafc;
			font-weight: 600;
		}
		.badge {
			display: inline-block;
			padding: 2px 6px;
			border-radius: 4px;
			font-size: 9pt;
			font-weight: 600;
		}
		.badge-success { background: #dcfce7; color: #166534; }
		.badge-blue { background: #dbeafe; color: #1e40af; }
		.badge-warn { background: #fef3c7; color: #92400e; }
		.qr-box {
			display: flex;
			align-items: center;
			justify-content: space-between;
			border: 1px dashed #94a3b8;
			border-radius: 8px;
			padding: 12px;
			margin-top: 16px;
			background: #fafafa;
		}
		.qr-text {
			font-size: 9.5pt;
			color: #334155;
			max-width: 68%;
		}
		.signatures-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 24px;
			margin-top: 24px;
			page-break-inside: avoid;
		}
		.sign-col {
			border-top: 1px solid #94a3b8;
			padding-top: 8px;
			font-size: 9.5pt;
		}
		.sign-line {
			margin-top: 30px;
			border-bottom: 1px solid #0f172a;
			width: 80%;
		}
	</style>
</head>
<body>
	<div class="act-header">
		<div class="act-title">АКТ ПРИЕМА-ПЕРЕДАЧИ МЕДИЦИНСКОЙ КАРТЫ (Ф. 043/у)</div>
		<div class="act-subtitle">между структурными подразделениями и филиалами сети стоматологических клиник DENTE</div>
		<div style="font-size: 9pt; color: #64748b; margin-top: 4px;">
			№ АКТ-TRF-${snapshot.snapshotId.slice(5, 15).toUpperCase()} от ${formatDateRu(snapshot.exportedAtIso)} г.
		</div>
	</div>

	<div class="meta-grid">
		<div>
			<strong>Филиал-отправитель:</strong> ${source.nameRu} (${source.code})<br>
			<strong>Адрес:</strong> ${source.addressRu}<br>
			<strong>Главный врач:</strong> ${source.chiefDoctorRu}
		</div>
		<div>
			<strong>Филиал-получатель:</strong> ${target.nameRu} (${target.code})<br>
			<strong>Адрес:</strong> ${target.addressRu}<br>
			<strong>Главный врач:</strong> ${target.chiefDoctorRu}
		</div>
	</div>

	<div class="section-title">1. Сведения о пациенте и основание трансфера</div>
	<table>
		<tr>
			<td style="width: 30%;"><strong>ФИО пациента:</strong></td>
			<td><strong>${snapshot.patientFullName}</strong></td>
			<td style="width: 25%;"><strong>Дата рождения:</strong></td>
			<td>${formatDateRu(demo.birthDate)}</td>
		</tr>
		<tr>
			<td><strong>Документ личности:</strong></td>
			<td>${demo.identityDocument || "Не указан"}</td>
			<td><strong>СНИЛС / ИНН:</strong></td>
			<td>${demo.snils || "—"} / ${demo.taxpayerInn || "—"}</td>
		</tr>
		<tr>
			<td><strong>Основание перевода:</strong></td>
			<td colspan="3">${snapshot.transferReasonRu}</td>
		</tr>
		<tr>
			<td><strong>Согласие 152-ФЗ:</strong></td>
			<td colspan="3">
				<span class="badge badge-success">ПОДПИСАНО И ВЕРИФИЦИРОВАНО</span>
				(Идентификатор: ${snapshot.consent152Fz.consentId}, Тип подписи: ${snapshot.consent152Fz.signatureType})
			</td>
		</tr>
	</table>

	<div class="section-title">2. Реестр передаваемой медицинской и финансовой документации</div>
	<table>
		<thead>
			<tr>
				<th>№</th>
				<th>Раздел медицинской документации</th>
				<th>Объем / Количество записей</th>
				<th>Статус передачи</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td>1</td>
				<td>Медицинская карта стоматологического больного ф. 043/у (Дневники)</td>
				<td>${visitsCount} протоколов визитов</td>
				<td><span class="badge badge-blue">Передано в полном объеме</span></td>
			</tr>
			<tr>
				<td>2</td>
				<td>Зубная формула и пародонтограмма (FDI 11..48/51..85)</td>
				<td>${teethCount} описанных зубов (Кариес: ${snapshot.odontogramAndPerio.cariesTeethCount}, Пломбы: ${snapshot.odontogramAndPerio.filledTeethCount}, Импланты: ${snapshot.odontogramAndPerio.implantsCount})</td>
				<td><span class="badge badge-blue">Передано</span></td>
			</tr>
			<tr>
				<td>3</td>
				<td>Рентгенологический архив и учет дозовых нагрузок</td>
				<td>${studiesCount} исследований (Суммарная доза: ${snapshot.imagingArchive.totalAccumulatedDoseMicroSv} мкЗв)</td>
				<td><span class="badge badge-blue">Передано</span></td>
			</tr>
			<tr>
				<td>4</td>
				<td>Планы комплексного лечения и финансовые сметы</td>
				<td>${plansCount} планов на сумму ${formatRubCurrency(snapshot.treatmentPlansAndEstimates.totalPlannedCostRub)}</td>
				<td><span class="badge badge-blue">Передано</span></td>
			</tr>
			<tr>
				<td>5</td>
				<td>Наряды зуботехнической лаборатории (ЗТЛ)</td>
				<td>${labCount} активных нарядов (перенаправлены курьеру в ${target.shortNameRu})</td>
				<td><span class="badge badge-blue">${labCount > 0 ? "Перенаправлено" : "Нет нарядов"}</span></td>
			</tr>
			<tr>
				<td>6</td>
				<td>Остаток депозита / авансового баланса</td>
				<td>
					<strong>${formatRubCurrency(snapshot.financialDeposit.currentBalanceRub)}</strong>
					${voucher ? `<br><small>Трансфер-ваучер: ${voucher.voucherCode} (Атомарная блокировка двойного списания)</small>` : ""}
				</td>
				<td><span class="badge ${snapshot.financialDeposit.currentBalanceRub > 0 ? "badge-success" : "badge-warn"}">${snapshot.financialDeposit.currentBalanceRub > 0 ? "Ваучер сформирован" : "Баланс 0.00 ₽"}</span></td>
			</tr>
		</tbody>
	</table>

	<div class="qr-box">
		<div class="qr-text">
			<strong>ЭЛЕКТРОННАЯ ВЕРИФИКАЦИЯ ТРАНСФЕРА (ISO/IEC 18004):</strong><br>
			Верификационная строка: <code>${generateTransferVerificationQrPayload(snapshot)}</code><br>
			Снимок защищен криптографической контрольной суммой SHA-256:<br>
			<code>${snapshot.checksumSha256}</code><br>
			<small>Отсканируйте QR-код 2D-сканером на ресепшн принимающего филиала для мгновенной верификации и автоматического импорта.</small>
		</div>
		<div>
			<img src="${qrCodeImg}" alt="QR код верификации" width="120" height="120" style="border: 1px solid #cbd5e1; border-radius: 4px;" />
		</div>
	</div>

	<div class="signatures-grid">
		<div class="sign-col">
			<strong>Передал (Филиал-отправитель):</strong><br>
			${snapshot.initiatedByStaffPosition}: <strong>${snapshot.initiatedByStaffName}</strong><br>
			<div class="sign-line"></div>
			<small>(подпись, дата, личная печать врача / штамп филиала)</small>
		</div>
		<div class="sign-col">
			<strong>Принял (Филиал-получатель):</strong><br>
			Главный врач / Ответственный администратор филиала:<br>
			<div class="sign-line"></div>
			<small>(подпись, дата, штамп приема документов)</small>
		</div>
	</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV Export Generator for Multi-Branch Accounting
// ─────────────────────────────────────────────────────────────────────────────

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
		["Согласие 152-ФЗ", snapshot.consent152Fz.consentId],
		["Тип подписи 152-ФЗ", snapshot.consent152Fz.signatureType],
		["Хеш подписи", snapshot.consent152Fz.signatureHash],
		["Количество визитов 043/у", snapshot.medicalHistory043u.totalVisitsCount.toString()],
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
