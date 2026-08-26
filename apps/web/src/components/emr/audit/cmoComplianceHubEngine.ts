/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CMO EGISZ/REMD COMPLIANCE HUB & BATCH SIGNER ENGINE
 * Statutory compliance engine: PP RF No. 852, Orders 834n, 203n, 947n, 63-FZ
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { isValidIcd10Code } from "./cmoEmrAuditEngine";

export type ComplianceFilterType =
	| "all"
	| "no_icd_or_tooth"
	| "not_signed_doctor"
	| "pending_or_failed_egisz"
	| "registered_remd"
	| "overdue_24h";

export type CompliancePeriodType = "today" | "week" | "month" | "all";

export type EgiszTransmissionStatus =
	| "not_ready"
	| "pending"
	| "sent"
	| "accepted"
	| "error";

export interface ClinicVisitComplianceItem {
	id: string;
	visitId: string;
	medicalCardNumber: string;
	patientId: string;
	patientFullName: string;
	patientBirthDate: string;
	patientSnils: string;
	doctorStaffId: string;
	doctorFullName: string;
	doctorSpecialty: string;
	visitDate: string; // YYYY-MM-DD
	visitTime: string; // HH:mm
	encounterIso: string; // ISO 8601 timestamp
	serviceName: string;
	serviceCode?: string | undefined;
	toothNumber?: string | null | undefined;
	icd10Code?: string | null | undefined;
	diagnosisText?: string | null | undefined;
	isDoctorSignedUkep: boolean;
	doctorSignatureHash?: string | null | undefined;
	doctorSignatureDate?: string | null | undefined;
	isLocked: boolean;
	lockedAt?: string | null | undefined;
	egiszStatus: EgiszTransmissionStatus;
	remdSemdOid?: string | null | undefined;
	remdDocumentId?: string | null | undefined;
	egiszTransactionId?: string | null | undefined;
	egiszErrorMessage?: string | null | undefined;
	egiszSentAt?: string | null | undefined;
	overdueHours: number; // Hours since encounter completion
	isOverdue24h: boolean; // PP RF No. 852 (overdue > 24 hours)
	qualityScore: number; // 0..100
}

export type RoszdravnadzorRiskLevel = "zero" | "low" | "moderate" | "critical";

export interface RoszdravnadzorRiskAssessment {
	riskLevel: RoszdravnadzorRiskLevel;
	riskScore: number; // 0..100
	overdueCount: number;
	missingIcdCount: number;
	unsignedDoctorCount: number;
	failedTransmissionCount: number;
	summaryMessage: string;
	statutoryWarning: string;
	fineLiabilityRub: string;
}

export interface ComplianceSummaryMetrics {
	totalEncounters: number;
	noIcdOrToothCount: number;
	notSignedDoctorCount: number;
	pendingOrFailedEgiszCount: number;
	registeredRemdCount: number;
	overdue24hCount: number;
	complianceRatePercent: number; // 0..100 %
	riskAssessment: RoszdravnadzorRiskAssessment;
}

export interface BatchSignCardProgress {
	visitId: string;
	patientFullName: string;
	medicalCardNumber: string;
	status: "queued" | "signing" | "sending_remd" | "success" | "error";
	errorMessage?: string | undefined;
	remdSemdOid?: string | undefined;
	transactionId?: string | undefined;
}

export interface BatchSignSessionState {
	isActive: boolean;
	totalCount: number;
	completedCount: number;
	successCount: number;
	errorCount: number;
	selectedCertificateThumbprint: string;
	selectedCertificateSubject: string;
	cardProgressList: BatchSignCardProgress[];
}

/** Check if tooth number is a valid FDI two-digit notation (11-48, 51-85) or universal */
export function isValidToothNumber(tooth: string | null | undefined): boolean {
	if (!tooth || typeof tooth !== "string") return false;
	const trimmed = tooth.trim();
	if (trimmed === "" || trimmed === "0") return false;
	// FDI notation: 11..18, 21..28, 31..38, 41..48, 51..55, 61..65, 71..75, 81..85
	const fdiRegex = /^([1-4][1-8]|[5-8][1-5])$/;
	if (fdiRegex.test(trimmed)) return true;
	if (/^[1-4][1-8](-[1-4][1-8])?$/.test(trimmed)) return true;
	return false;
}

/** Calculate overdue hours from encounter time to reference point (default: now) */
export function calculateOverdueHours(encounterIso: string, referenceTime: Date = new Date()): number {
	const encounterTime = new Date(encounterIso).getTime();
	if (Number.isNaN(encounterTime)) return 0;
	const diffMs = referenceTime.getTime() - encounterTime;
	if (diffMs <= 0) return 0;
	return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
}

/** Check if a visit has missing ICD-10 or missing tooth association */
export function isMissingIcdOrTooth(item: ClinicVisitComplianceItem): boolean {
	const hasValidIcd = isValidIcd10Code(item.icd10Code);
	const isToothRequiredService = Boolean(
		item.serviceName &&
		(item.serviceName.toLowerCase().includes("кариес") ||
			item.serviceName.toLowerCase().includes("пульпит") ||
			item.serviceName.toLowerCase().includes("удален") ||
			item.serviceName.toLowerCase().includes("пломб") ||
			item.serviceName.toLowerCase().includes("коронк") ||
			item.serviceName.toLowerCase().includes("имплант") ||
			item.serviceName.toLowerCase().includes("зуб"))
	);

	if (!hasValidIcd) return true;
	if (isToothRequiredService && !isValidToothNumber(item.toothNumber)) return true;
	return false;
}

/** Check if a visit is missing doctor electronic signature (УКЭП/ЭП) */
export function isMissingDoctorSignature(item: ClinicVisitComplianceItem): boolean {
	return !item.isDoctorSignedUkep && (!item.doctorSignatureHash || item.doctorSignatureHash.length < 16);
}

/** Check if a visit is pending dispatch or has encountered an error during REMD transmission */
export function isPendingOrFailedEgisz(item: ClinicVisitComplianceItem): boolean {
	return item.egiszStatus === "pending" || item.egiszStatus === "sent" || item.egiszStatus === "error" || item.egiszStatus === "not_ready";
}

/** Check if a visit is successfully registered in REMD */
export function isRegisteredRemd(item: ClinicVisitComplianceItem): boolean {
	return item.egiszStatus === "accepted" && Boolean(item.remdSemdOid);
}

/** Assess Roszdravnadzor statutory inspection risk per PP RF No. 852 & Order No. 203n */
export function assessRoszdravnadzorRisk(
	items: ClinicVisitComplianceItem[],
	referenceTime: Date = new Date()
): RoszdravnadzorRiskAssessment {
	let overdueCount = 0;
	let missingIcdCount = 0;
	let unsignedDoctorCount = 0;
	let failedTransmissionCount = 0;

	for (const item of items) {
		const hours = calculateOverdueHours(item.encounterIso, referenceTime);
		if (hours > 24 && item.egiszStatus !== "accepted") {
			overdueCount++;
		}
		if (isMissingIcdOrTooth(item)) {
			missingIcdCount++;
		}
		if (isMissingDoctorSignature(item)) {
			unsignedDoctorCount++;
		}
		if (item.egiszStatus === "error") {
			failedTransmissionCount++;
		}
	}

	let rawRiskScore = 0;
	rawRiskScore += overdueCount * 20;
	rawRiskScore += missingIcdCount * 15;
	rawRiskScore += unsignedDoctorCount * 15;
	rawRiskScore += failedTransmissionCount * 10;

	const riskScore = Math.min(100, Math.max(0, rawRiskScore));

	let riskLevel: RoszdravnadzorRiskLevel = "zero";
	let summaryMessage = "Все медицинские карты и протоколы 043/у выгружены в РЭМД в установленный 24-часовой срок.";
	let statutoryWarning = "Лицензионные требования постановления Правительства РФ № 852 соблюдены в полном объеме.";
	let fineLiabilityRub = "0 руб. (Нарушений не выявлено)";

	if (overdueCount >= 5 || riskScore >= 70) {
		riskLevel = "critical";
		summaryMessage = `КРИТИЧЕСКИЙ РИСК: ${overdueCount} карт просрочено >24 часов по ПП РФ № 852, ${missingIcdCount} карт без корректного МКБ-10.`;
		statutoryWarning = "Грубое нарушение лицензионных требований (ПП РФ № 852, ч. 4 ст. 14.1 КоАП РФ). Угроза предписания Росздравнадзора и приостановки лицензии до 90 суток.";
		fineLiabilityRub = "Штраф до 200 000 руб. или приостановление деятельности до 90 суток";
	} else if (overdueCount >= 2 || riskScore >= 40) {
		riskLevel = "moderate";
		summaryMessage = `СРЕДНИЙ РИСК: ${overdueCount} карт не передано в ЕГИСЗ в срок 24 ч., ${unsignedDoctorCount} карт без подписи УКЭП.`;
		statutoryWarning = "Нарушение порядка ведения меддокументации и сроков передачи сведений в РЭМД ЕГИСЗ (Приказ Минздрава № 947н).";
		fineLiabilityRub = "Штраф от 30 000 до 100 000 руб. (ст. 14.1 КоАП РФ)";
	} else if (overdueCount > 0 || missingIcdCount > 0 || unsignedDoctorCount > 0) {
		riskLevel = "low";
		summaryMessage = `НИЗКИЙ РИСК: Требуется подписать ${unsignedDoctorCount} карт и выгрузить ${overdueCount} просроченных протоколов.`;
		statutoryWarning = "Рекомендуется выполнить пакетную подпись УКЭП и отправку в ЕГИСЗ до конца рабочей смены.";
		fineLiabilityRub = "Предупреждение или штраф до 20 000 руб.";
	}

	return {
		riskLevel,
		riskScore,
		overdueCount,
		missingIcdCount,
		unsignedDoctorCount,
		failedTransmissionCount,
		summaryMessage,
		statutoryWarning,
		fineLiabilityRub,
	};
}

/** Calculate summary compliance metrics for the selected visits */
export function calculateComplianceMetrics(
	items: ClinicVisitComplianceItem[],
	referenceTime: Date = new Date()
): ComplianceSummaryMetrics {
	const total = items.length;
	if (total === 0) {
		return {
			totalEncounters: 0,
			noIcdOrToothCount: 0,
			notSignedDoctorCount: 0,
			pendingOrFailedEgiszCount: 0,
			registeredRemdCount: 0,
			overdue24hCount: 0,
			complianceRatePercent: 100,
			riskAssessment: assessRoszdravnadzorRisk([], referenceTime),
		};
	}

	let noIcdOrTooth = 0;
	let notSignedDoctor = 0;
	let pendingOrFailedEgisz = 0;
	let registeredRemd = 0;
	let overdue24h = 0;

	for (const item of items) {
		if (isMissingIcdOrTooth(item)) noIcdOrTooth++;
		if (isMissingDoctorSignature(item)) notSignedDoctor++;
		if (isPendingOrFailedEgisz(item)) pendingOrFailedEgisz++;
		if (isRegisteredRemd(item)) registeredRemd++;
		const hours = calculateOverdueHours(item.encounterIso, referenceTime);
		if (hours > 24 && item.egiszStatus !== "accepted") overdue24h++;
	}

	const compliantCount = items.filter(
		(i) => !isMissingIcdOrTooth(i) && !isMissingDoctorSignature(i) && isRegisteredRemd(i)
	).length;

	const complianceRatePercent = Math.round((compliantCount / total) * 1000) / 10;
	const riskAssessment = assessRoszdravnadzorRisk(items, referenceTime);

	return {
		totalEncounters: total,
		noIcdOrToothCount: noIcdOrTooth,
		notSignedDoctorCount: notSignedDoctor,
		pendingOrFailedEgiszCount: pendingOrFailedEgisz,
		registeredRemdCount: registeredRemd,
		overdue24hCount: overdue24h,
		complianceRatePercent,
		riskAssessment,
	};
}

/** Filter clinic visits based on filter tab, period, doctor and text search */
export function filterComplianceVisits(
	items: ClinicVisitComplianceItem[],
	filter: ComplianceFilterType,
	period: CompliancePeriodType,
	doctorId?: string | undefined,
	searchQuery?: string | undefined,
	referenceTime: Date = new Date()
): ClinicVisitComplianceItem[] {
	return items.filter((item) => {
		// 1. Doctor filter
		if (doctorId && doctorId !== "all" && item.doctorStaffId !== doctorId) {
			return false;
		}

		// 2. Period filter
		if (period !== "all") {
			const itemDate = new Date(item.encounterIso);
			const refTime = referenceTime.getTime();
			const itemMs = itemDate.getTime();

			if (period === "today") {
				const itemDay = item.visitDate;
				const todayDay = referenceTime.toISOString().split("T")[0];
				if (itemDay !== todayDay) return false;
			} else if (period === "week") {
				const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
				if (refTime - itemMs > sevenDaysMs) return false;
			} else if (period === "month") {
				const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
				if (refTime - itemMs > thirtyDaysMs) return false;
			}
		}

		// 3. Category Filter
		if (filter === "no_icd_or_tooth") {
			if (!isMissingIcdOrTooth(item)) return false;
		} else if (filter === "not_signed_doctor") {
			if (!isMissingDoctorSignature(item)) return false;
		} else if (filter === "pending_or_failed_egisz") {
			if (!isPendingOrFailedEgisz(item)) return false;
		} else if (filter === "registered_remd") {
			if (!isRegisteredRemd(item)) return false;
		} else if (filter === "overdue_24h") {
			const hours = calculateOverdueHours(item.encounterIso, referenceTime);
			if (hours <= 24 || item.egiszStatus === "accepted") return false;
		}

		// 4. Text Search
		if (searchQuery && searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			const matchPatient = item.patientFullName.toLowerCase().includes(q);
			const matchCard = item.medicalCardNumber.toLowerCase().includes(q);
			const matchDoctor = item.doctorFullName.toLowerCase().includes(q);
			const digitsQ = q.replace(/[^0-9]/g, "");
			const matchSnils = digitsQ.length >= 3 && item.patientSnils.replace(/[^0-9]/g, "").includes(digitsQ);
			const matchIcd = Boolean(item.icd10Code && item.icd10Code.toLowerCase().includes(q));
			const matchDiag = Boolean(item.diagnosisText && item.diagnosisText.toLowerCase().includes(q));
			const matchTooth = Boolean(item.toothNumber && item.toothNumber.includes(q));
			const matchOid = Boolean(item.remdSemdOid && item.remdSemdOid.toLowerCase().includes(q));

			if (!matchPatient && !matchCard && !matchDoctor && !matchSnils && !matchIcd && !matchDiag && !matchTooth && !matchOid) {
				return false;
			}
		}

		return true;
	});
}

/** Validate if a single visit is ready for EGISZ CDA generation and REMD dispatch */
export function validateVisitForEgisz(item: ClinicVisitComplianceItem): {
	isValid: boolean;
	issues: string[];
} {
	const issues: string[] = [];

	if (!isValidIcd10Code(item.icd10Code)) {
		issues.push("Отсутствует корректный код диагноза по МКБ-10 (Приказ Минздрава № 834н).");
	}

	if (!item.patientFullName || item.patientFullName.trim().length < 3) {
		issues.push("Не заполнено ФИО пациента.");
	}

	const digits = item.patientSnils.replace(/[^0-9]/g, "");
	if (digits.length !== 11) {
		issues.push("Некорректный СНИЛС пациента (требуется 11 цифр).");
	}

	if (!item.patientBirthDate) {
		issues.push("Не указана дата рождения пациента.");
	}

	if (!item.isDoctorSignedUkep && (!item.doctorSignatureHash || item.doctorSignatureHash.length < 16)) {
		issues.push("Карта не подписана личным сертификатом УКЭП лечащего врача (Приказ Минздрава № 947н).");
	}

	return {
		isValid: issues.length === 0,
		issues,
	};
}

/** Generate downloadable CSV format for CMO compliance registry */
export function generateComplianceRegistryCsv(items: ClinicVisitComplianceItem[]): string {
	const headers = [
		"Дата приема",
		"Время",
		"Номер карты",
		"ФИО Пациента",
		"СНИЛС",
		"Врач",
		"Специальность",
		"Услуга",
		"Зуб",
		"МКБ-10",
		"Диагноз",
		"Подпись врача (УКЭП)",
		"Статус ЕГИСЗ",
		"OID СЭМД",
		"Просрочка (ч)",
		"Балл качества",
	];

	const rows = items.map((item) => [
		item.visitDate,
		item.visitTime,
		`"${item.medicalCardNumber.replace(/"/g, '""')}"`,
		`"${item.patientFullName.replace(/"/g, '""')}"`,
		`"${item.patientSnils.replace(/"/g, '""')}"`,
		`"${item.doctorFullName.replace(/"/g, '""')}"`,
		`"${item.doctorSpecialty.replace(/"/g, '""')}"`,
		`"${item.serviceName.replace(/"/g, '""')}"`,
		item.toothNumber || "-",
		item.icd10Code || "НЕТ",
		`"${(item.diagnosisText || "").replace(/"/g, '""')}"`,
		item.isDoctorSignedUkep ? "ДА" : "НЕТ",
		item.egiszStatus,
		item.remdSemdOid || "-",
		item.overdueHours,
		item.qualityScore,
	]);

	return [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
}

/** Generate printable textual report for Chief Medical Officer quality commission */
export function generateComplianceRegistryPrintText(
	items: ClinicVisitComplianceItem[],
	metrics: ComplianceSummaryMetrics,
	periodLabel: string
): string {
	const lines: string[] = [];

	lines.push("═══════════════════════════════════════════════════════════════════════════");
	lines.push("СВОДНЫЙ РЕЕСТР КОНТРОЛЯ КАЧЕСТВА КАРТ 043/У И ВЫГРУЗКИ В ЕГИСЗ (РЭМД)");
	lines.push(`Отчетный период: ${periodLabel} | Дата формирования: ${new Date().toLocaleString("ru-RU")}`);
	lines.push("Нормативная база: Постановление Правительства РФ № 852, Приказы № 834н, 203н, 947н");
	lines.push("═══════════════════════════════════════════════════════════════════════════");
	lines.push("");
	lines.push("1. ИТОГОВЫЕ ПОКАЗАТЕЛИ КОМПЛАЕНСА КЛИНИКИ:");
	lines.push(`   • Всего приемов за период: ${metrics.totalEncounters}`);
	lines.push(`   • Зарегистрировано в РЭМД (успешно): ${metrics.registeredRemdCount} (${Math.round((metrics.registeredRemdCount / (metrics.totalEncounters || 1)) * 100)}%)`);
	lines.push(`   • Без диагноза МКБ-10 / без зуба: ${metrics.noIcdOrToothCount}`);
	lines.push(`   • Без подписи УКЭП лечащего врача: ${metrics.notSignedDoctorCount}`);
	lines.push(`   • Ошибки передачи / в очереди ЕГИСЗ: ${metrics.pendingOrFailedEgiszCount}`);
	lines.push(`   • Просрочено >24 часов (ПП РФ № 852): ${metrics.overdue24hCount}`);
	lines.push(`   • Общий уровень комплаенса: ${metrics.complianceRatePercent}%`);
	lines.push("");
	lines.push("2. ОЦЕНКА РИСКА ПРОВЕРКИ РОСЗДРАВНАДЗОРА:");
	lines.push(`   • Уровень риска: ${metrics.riskAssessment.riskLevel.toUpperCase()} (Индекс: ${metrics.riskAssessment.riskScore}/100)`);
	lines.push(`   • Резюме: ${metrics.riskAssessment.summaryMessage}`);
	lines.push(`   • Предупреждение: ${metrics.riskAssessment.statutoryWarning}`);
	lines.push(`   • Штрафная ответственность: ${metrics.riskAssessment.fineLiabilityRub}`);
	lines.push("");
	lines.push("3. РЕЕСТР ПРИЕМОВ С ДЕФЕКТАМИ И ПРОСРОЧКОЙ:");

	const defectiveItems = items.filter(
		(i) => isMissingIcdOrTooth(i) || isMissingDoctorSignature(i) || i.overdueHours > 24 || i.egiszStatus === "error"
	);

	if (defectiveItems.length === 0) {
		lines.push("   Дефектов и нарушений 24-часового регламента выгрузки не зафиксировано.");
	} else {
		for (const [idx, item] of defectiveItems.entries()) {
			const flags: string[] = [];
			if (isMissingIcdOrTooth(item)) flags.push("НЕТ МКБ/ЗУБА");
			if (isMissingDoctorSignature(item)) flags.push("НЕТ УКЭП ВРАЧА");
			if (item.egiszStatus === "error") flags.push("ОШИБКА РЭМД");
			if (item.overdueHours > 24 && item.egiszStatus !== "accepted") flags.push(`ПРОСРОЧКА ${item.overdueHours}ч`);

			lines.push(`   ${idx + 1}. [${flags.join(" | ")}] Карта: ${item.medicalCardNumber} | Пациент: ${item.patientFullName}`);
			lines.push(`      Врач: ${item.doctorFullName} | Дата: ${item.visitDate} ${item.visitTime} | Услуга: ${item.serviceName}`);
			lines.push(`      МКБ-10: ${item.icd10Code || "НЕТ"} | Зуб: ${item.toothNumber || "-"} | Статус РЭМД: ${item.egiszStatus}`);
			if (item.egiszErrorMessage) {
				lines.push(`      Ошибка: ${item.egiszErrorMessage}`);
			}
		}
	}

	lines.push("");
	lines.push("═══════════════════════════════════════════════════════════════════════════");
	lines.push("Главный врач / Председатель врачебной комиссии: _________________________");
	lines.push("═══════════════════════════════════════════════════════════════════════════");

	return lines.join("\n");
}

// ── Initial Sample Dataset for CMO Compliance Hub ──
export const SAMPLE_COMPLIANCE_VISITS: ClinicVisitComplianceItem[] = [
	{
		id: "comp-001",
		visitId: "vis-101",
		medicalCardNumber: "СТ-2026-0843",
		patientId: "pat-101",
		patientFullName: "Смирнов Алексей Владимирович",
		patientBirthDate: "1990-05-15",
		patientSnils: "154-890-123 45",
		doctorStaffId: "doc-01",
		doctorFullName: "Волкова Екатерина Сергеевна",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		visitDate: "2026-08-25",
		visitTime: "10:30",
		encounterIso: "2026-08-25T10:30:00.000Z",
		serviceName: "Лечение кариеса дентина",
		serviceCode: "A16.07.002.001",
		toothNumber: "16",
		icd10Code: "K02.1",
		diagnosisText: "Кариес дентина зуба 1.6",
		isDoctorSignedUkep: true,
		doctorSignatureHash: "a4f891b8d234e6c7901ef5b89a03b51e7845cd1209384756abcdef1234567890",
		doctorSignatureDate: "2026-08-25T11:15:00.000Z",
		isLocked: true,
		lockedAt: "2026-08-25T11:15:00.000Z",
		egiszStatus: "accepted",
		remdSemdOid: "1.2.643.5.1.13.13.12.2.77.8432.100.1.1.51",
		remdDocumentId: "semd-2026-0843-16",
		egiszTransactionId: "tx-remd-992144",
		overdueHours: 12.5,
		isOverdue24h: false,
		qualityScore: 100,
	},
	{
		id: "comp-002",
		visitId: "vis-102",
		medicalCardNumber: "СТ-2026-0848",
		patientId: "pat-102",
		patientFullName: "Иванова Марина Дмитриевна",
		patientBirthDate: "1985-11-03",
		patientSnils: "132-456-789 01",
		doctorStaffId: "doc-02",
		doctorFullName: "Кузнецов Денис Игоревич",
		doctorSpecialty: "Врач-стоматолог-хирург",
		visitDate: "2026-08-24",
		visitTime: "14:00",
		encounterIso: "2026-08-24T14:00:00.000Z",
		serviceName: "Удаление ретенированного зуба мудрости",
		serviceCode: "A16.07.024",
		toothNumber: "38",
		icd10Code: "K07.3",
		diagnosisText: "Ретенция и дистопия зуба 3.8",
		isDoctorSignedUkep: false,
		doctorSignatureHash: null,
		isLocked: false,
		egiszStatus: "pending",
		overdueHours: 33.5,
		isOverdue24h: true,
		qualityScore: 65,
	},
	{
		id: "comp-003",
		visitId: "vis-103",
		medicalCardNumber: "СТ-2026-0852",
		patientId: "pat-103",
		patientFullName: "Петров Сергей Николаевич",
		patientBirthDate: "1978-02-20",
		patientSnils: "112-233-445 99",
		doctorStaffId: "doc-03",
		doctorFullName: "Морозов Артем Павлович",
		doctorSpecialty: "Врач-стоматолог-ортопед",
		visitDate: "2026-08-24",
		visitTime: "16:30",
		encounterIso: "2026-08-24T16:30:00.000Z",
		serviceName: "Препарирование зуба под коронку",
		serviceCode: "A16.07.004",
		toothNumber: "",
		icd10Code: "",
		diagnosisText: "Дефект твердых тканей коронки",
		isDoctorSignedUkep: false,
		doctorSignatureHash: null,
		isLocked: false,
		egiszStatus: "not_ready",
		overdueHours: 31.0,
		isOverdue24h: true,
		qualityScore: 40,
	},
	{
		id: "comp-004",
		visitId: "vis-104",
		medicalCardNumber: "СТ-2026-0855",
		patientId: "pat-104",
		patientFullName: "Ковалева Ольга Сергеевна",
		patientBirthDate: "1994-09-12",
		patientSnils: "178-901-234 56",
		doctorStaffId: "doc-01",
		doctorFullName: "Волкова Екатерина Сергеевна",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		visitDate: "2026-08-25",
		visitTime: "12:00",
		encounterIso: "2026-08-25T12:00:00.000Z",
		serviceName: "Эндодонтическое лечение пульпита",
		serviceCode: "A16.07.030",
		toothNumber: "24",
		icd10Code: "K04.03",
		diagnosisText: "Хронический пульпит зуба 2.4",
		isDoctorSignedUkep: true,
		doctorSignatureHash: "f9e8d7c6b5a40123456789abcdef0123456789abcdef0123456789abcdef0123",
		doctorSignatureDate: "2026-08-25T13:10:00.000Z",
		isLocked: true,
		lockedAt: "2026-08-25T13:10:00.000Z",
		egiszStatus: "error",
		egiszErrorMessage: "РЭМД: Ошибка валидации схемы CDA R2 (Missing author SNILS in FRMR)",
		overdueHours: 11.0,
		isOverdue24h: false,
		qualityScore: 80,
	},
	{
		id: "comp-005",
		visitId: "vis-105",
		medicalCardNumber: "СТ-2026-0860",
		patientId: "pat-105",
		patientFullName: "Дмитриев Роман Андреевич",
		patientBirthDate: "2001-04-05",
		patientSnils: "199-888-777 66",
		doctorStaffId: "doc-02",
		doctorFullName: "Кузнецов Денис Игоревич",
		doctorSpecialty: "Врач-стоматолог-хирург",
		visitDate: "2026-08-25",
		visitTime: "15:00",
		encounterIso: "2026-08-25T15:00:00.000Z",
		serviceName: "Установка дентального имплантата",
		serviceCode: "A16.07.054",
		toothNumber: "46",
		icd10Code: "K08.1",
		diagnosisText: "Потеря зубов вследствие несчастного случая (зуб 4.6)",
		isDoctorSignedUkep: true,
		doctorSignatureHash: "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
		doctorSignatureDate: "2026-08-25T16:20:00.000Z",
		isLocked: true,
		lockedAt: "2026-08-25T16:20:00.000Z",
		egiszStatus: "pending",
		overdueHours: 8.0,
		isOverdue24h: false,
		qualityScore: 95,
	},
	{
		id: "comp-006",
		visitId: "vis-106",
		medicalCardNumber: "СТ-2026-0863",
		patientId: "pat-106",
		patientFullName: "Васильева Елена Игоревна",
		patientBirthDate: "1982-08-30",
		patientSnils: "165-432-198 77",
		doctorStaffId: "doc-01",
		doctorFullName: "Волкова Екатерина Сергеевна",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		visitDate: "2026-08-25",
		visitTime: "09:00",
		encounterIso: "2026-08-25T09:00:00.000Z",
		serviceName: "Профессиональная гигиена полости рта",
		serviceCode: "A16.07.051",
		toothNumber: "0",
		icd10Code: "K05.0",
		diagnosisText: "Острый гингивит",
		isDoctorSignedUkep: true,
		doctorSignatureHash: "778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566",
		doctorSignatureDate: "2026-08-25T09:45:00.000Z",
		isLocked: true,
		lockedAt: "2026-08-25T09:45:00.000Z",
		egiszStatus: "accepted",
		remdSemdOid: "1.2.643.5.1.13.13.12.2.77.8432.100.1.1.52",
		remdDocumentId: "semd-2026-0863-00",
		egiszTransactionId: "tx-remd-992150",
		overdueHours: 14.0,
		isOverdue24h: false,
		qualityScore: 100,
	},
];
