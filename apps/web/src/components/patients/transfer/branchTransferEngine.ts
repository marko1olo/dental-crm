/**
 * ============================================================================
 * PATIENT BRANCH TRANSFER & CENTRALIZED LAB SYNC ENGINE (CLIENT-SIDE)
 *
 * Statutory Transfer Protocol, 152-FZ Compliance, Transfer Voucher Management,
 * ISO/IEC 18004 Verification QR Generator, and Printable Transfer Acts (043/у).
 * ============================================================================
 */

import {
	buildPatientClinicalSnapshot,
	createPatientBranchTransferConsent,
	generateTransferVerificationQrDataUri,
	generateTransferVerificationQrPayload,
	generateTransferVerificationQrSvg,
	getClinicBranch,
	issueDepositTransferVoucher,
	redeemDepositTransferVoucher,
	validatePatientBranchTransferConsent,
	validatePatientClinicalSnapshot,
	type CentralizedLabOrderSyncItem,
	type ClinicBranchInfo,
	type DepositTransferVoucher,
	type PatientBranchTransferConsent,
	type PatientClinicalSnapshot,
	type PatientDemographicsSnapshot,
	type PatientSignatureType,
	type SelectedTransferComponents,
	type SomaticAnamnesisSnapshot,
	type TreatmentPlanSnapshot,
	type VisitDiaryEntrySnapshot,
} from "@dental/shared";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Formatting & Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function formatRubCurrency(rub: number): string {
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(rub);
}

export function formatDateRu(isoString?: string | null): string {
	if (!isoString) return "—";
	try {
		const d = new Date(isoString);
		return d.toLocaleDateString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	} catch {
		return isoString;
	}
}

export function formatDateTimeRu(isoString?: string | null): string {
	if (!isoString) return "—";
	try {
		const d = new Date(isoString);
		return d.toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return isoString;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Client Transfer Draft & Validation
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientTransferDraft {
	readonly patientId: string;
	readonly patientFullName: string;
	readonly sourceBranchId: string;
	readonly targetBranchId: string;
	readonly transferReasonRu: string;
	readonly operatorStaffName: string;
	readonly operatorStaffPosition: string;
	readonly signatureType: PatientSignatureType;
	readonly is152FzConsentGiven: boolean;
	readonly selectedComponents: SelectedTransferComponents;
	readonly customNotes?: string | undefined;
}

export interface TransferValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
}

export function validateTransferDraft(
	draft: PatientTransferDraft,
	patientData?: {
		readonly demographics?: PatientDemographicsSnapshot | undefined;
		readonly balanceRub?: number | undefined;
	},
): TransferValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!draft.patientId) {
		errors.push("Не выбран пациент для межфилиального трансфера.");
	}
	if (!draft.sourceBranchId || !draft.targetBranchId) {
		errors.push("Необходимо указать филиал-отправитель и филиал-получатель.");
	}
	if (draft.sourceBranchId === draft.targetBranchId) {
		errors.push("Филиал-отправитель и филиал-получатель не могут совпадать.");
	}
	if (!draft.is152FzConsentGiven) {
		errors.push("Отсутствует обязательное согласие пациента на передачу ПДн между филиалами (152-ФЗ).");
	}
	if (!draft.operatorStaffName.trim()) {
		errors.push("Укажите ФИО ответственного сотрудника/администратора, проводящего трансфер.");
	}

	// Check that at least one component is selected
	const comp = draft.selectedComponents;
	const anySelected = Object.values(comp).some(Boolean);
	if (!anySelected) {
		errors.push("Выберите хотя бы один клинический раздел для передачи в целевой филиал.");
	}

	if (patientData?.balanceRub && patientData.balanceRub < 0) {
		warnings.push(`У пациента имеется дебиторская задолженность в размере ${formatRubCurrency(Math.abs(patientData.balanceRub))}. Перевод возможен, долг переносится в новый филиал.`);
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Execution of Patient Branch Transfer
// ─────────────────────────────────────────────────────────────────────────────

export interface ExecuteTransferInput {
	readonly draft: PatientTransferDraft;
	readonly demographics: PatientDemographicsSnapshot;
	readonly somaticAnamnesis?: Partial<SomaticAnamnesisSnapshot> | undefined;
	readonly odontogramTeeth?: Record<number, any> | undefined;
	readonly visitDiaries?: readonly VisitDiaryEntrySnapshot[] | undefined;
	readonly treatmentPlans?: readonly TreatmentPlanSnapshot[] | undefined;
	readonly imagingStudies?: readonly any[] | undefined;
	readonly balanceRub?: number | undefined;
	readonly balanceKopecks?: number | undefined;
	readonly familyGroupId?: string | null | undefined;
	readonly labOrders?: readonly CentralizedLabOrderSyncItem[] | undefined;
}

export interface ExecuteTransferResult {
	readonly success: boolean;
	readonly snapshot: PatientClinicalSnapshot;
	readonly voucher?: DepositTransferVoucher | undefined;
	readonly qrDataUri: string;
	readonly transferActHtml: string;
	readonly csvSummary: string;
	readonly errorReason?: string | undefined;
}

export function executePatientBranchTransfer(input: ExecuteTransferInput): ExecuteTransferResult {
	const validation = validateTransferDraft(input.draft, {
		demographics: input.demographics,
		balanceRub: input.balanceRub,
	});

	if (!validation.isValid) {
		throw new Error(`Ошибка валидации трансфера: ${validation.errors.join("; ")}`);
	}

	// 1. Create 152-FZ Consent
	const consent = createPatientBranchTransferConsent({
		patientId: input.draft.patientId,
		patientFullName: input.draft.patientFullName,
		patientPassportOrId: input.demographics.identityDocument || "Паспорт РФ не указан",
		sourceBranchId: input.draft.sourceBranchId,
		targetBranchId: input.draft.targetBranchId,
		transferPurposeRu: input.draft.transferReasonRu || "Продолжение стоматологического лечения в филиале сети клиник",
		operatorFullName: input.draft.operatorStaffName,
		operatorPosition: input.draft.operatorStaffPosition,
		signatureType: input.draft.signatureType,
	});

	// 2. Build full clinical snapshot
	const snapshot = buildPatientClinicalSnapshot({
		sourceBranchId: input.draft.sourceBranchId,
		targetBranchId: input.draft.targetBranchId,
		demographics: input.demographics,
		somaticAnamnesis: input.somaticAnamnesis,
		odontogramTeeth: input.odontogramTeeth,
		visitDiaries: input.visitDiaries,
		treatmentPlans: input.treatmentPlans,
		imagingStudies: input.imagingStudies,
		balanceRub: input.balanceRub,
		balanceKopecks: input.balanceKopecks,
		familyGroupId: input.familyGroupId,
		labOrders: input.labOrders,
		consent152Fz: consent,
		selectedComponents: input.draft.selectedComponents,
		transferReasonRu: input.draft.transferReasonRu,
		staffName: input.draft.operatorStaffName,
		staffPosition: input.draft.operatorStaffPosition,
	});

	// 3. Generate QR code
	const qrDataUri = generateTransferVerificationQrDataUri(snapshot, 180);

	// 4. Generate statutory Transfer Act HTML
	const transferActHtml = generateTransferActHtml(snapshot, qrDataUri);

	// 5. Generate CSV summary
	const csvSummary = generateTransferActCsv(snapshot);

	return {
		success: true,
		snapshot,
		voucher: snapshot.financialDeposit.transferVoucher,
		qrDataUri,
		transferActHtml,
		csvSummary,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Statutory Transfer Act Generator (HTML Print Layout)
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
			<strong>ЭЛЕКТРОННАЯ ВЕРИФИКАЦИЯ ТРАНСФЕРА:</strong><br>
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
// 5. CSV Export Generator for Multi-Branch Accounting
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
