/**
 * preventiveInspectionEngine.ts — Сервисный контроль осмотров по гарантии и профгигиены.
 * Mandate 8x & Human Clinical UX Invariant.
 *
 * БЕЗ ПТИЧЬЕГО ЯЗЫКА: советские бюрократические термины («диспансеризация», «диспансерный учёт»,
 * «диспансеризуемый контингент») строго исключены.
 * Только уважительный человеческий язык частной медицины:
 * - «Плановый профосмотр каждые 6 месяцев»
 * - «Осмотр по гарантии (имплантация)»
 * - «Осмотр по гарантии (коронки и протезирование)»
 * - «Контрольный осмотр ортодонта»
 */

export type PreventiveInspectionCategory =
	| "hygiene_6m"
	| "implant_warranty"
	| "orthopedic_warranty"
	| "ortho_retention";

export interface PreventiveInspectionCandidate {
	patientId: string;
	patientFullName: string;
	patientPhone?: string | null | undefined;
	category: PreventiveInspectionCategory;
	categoryTitle: string;
	lastVisitDate: string; // YYYY-MM-DD
	daysSinceLastVisit: number;
	monthsSinceLastVisit: number;
	lastDoctorId?: string | null | undefined;
	lastDoctorName?: string | null | undefined;
	recommendedProcedureName: string;
	warrantyNotice?: string | null | undefined;
	suggestedChannelMessage: string;
}

export interface FindPreventiveInspectionCandidatesParams {
	patients: readonly any[];
	appointments: readonly any[];
	doctors?: readonly { id: string; fullName: string }[] | undefined;
	referenceDate?: Date | string | undefined;
	minDaysSinceVisit?: number | undefined; // default 150 (approx 5 months)
	maxDaysSinceVisit?: number | undefined; // default 365 (1 year)
	clinicName?: string | undefined;
}

function extractPoliteFirstName(fullName?: string | null): string {
	const raw = (fullName || "").trim();
	if (!raw) return "Уважаемый пациент";
	const parts = raw.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		// Return name + patronymic if 3 parts, or first name
		return parts.length === 3 ? `${parts[1]} ${parts[2]}` : (parts[1] ?? parts[0] ?? "Пациент");
	}
	return parts[0] || "Пациент";
}

/**
 * Finds patients due for 6-month preventive checkup or warranty inspection.
 */
export function findPreventiveInspectionCandidates(
	params: FindPreventiveInspectionCandidatesParams,
): PreventiveInspectionCandidate[] {
	const {
		patients = [],
		appointments = [],
		doctors = [],
		referenceDate = new Date(),
		minDaysSinceVisit = 150,
		maxDaysSinceVisit = 365,
		clinicName = "клинике DENTE",
	} = params;

	const now = typeof referenceDate === "string" ? new Date(referenceDate) : new Date(referenceDate.getTime());
	const nowMs = now.getTime();
	const nowIso = now.toISOString().slice(0, 10);

	const doctorsMap = new Map<string, string>();
	for (const doc of doctors) {
		if (doc.id) doctorsMap.set(doc.id, doc.fullName);
	}

	// 1. Identify patients with active future appointments
	const patientsWithFutureAppointments = new Set<string>();
	for (const a of appointments) {
		if (a.status === "cancelled" || a.status === "no_show") continue;
		const startRaw = a.startsAt || a.startTime || "";
		if (typeof startRaw === "string" && startRaw.slice(0, 10) >= nowIso && a.patientId) {
			patientsWithFutureAppointments.add(a.patientId);
		}
	}

	// 2. Group completed appointments by patient
	const lastCompletedByPatient = new Map<string, any>();
	for (const a of appointments) {
		if (a.status !== "completed") continue;
		if (!a.patientId) continue;
		const startRaw = a.startsAt || a.startTime || "";
		const startMs = new Date(startRaw).getTime();
		if (Number.isNaN(startMs) || startMs > nowMs) continue;

		const existing = lastCompletedByPatient.get(a.patientId);
		if (!existing || new Date(existing.startsAt || existing.startTime).getTime() < startMs) {
			lastCompletedByPatient.set(a.patientId, a);
		}
	}

	const candidates: PreventiveInspectionCandidate[] = [];

	for (const patient of patients) {
		if (!patient?.id) continue;
		// Skip if patient already has a future booking
		if (patientsWithFutureAppointments.has(patient.id)) continue;

		const lastAppt = lastCompletedByPatient.get(patient.id);
		if (!lastAppt) continue;

		const lastDateStr = (lastAppt.startsAt || lastAppt.startTime || "").slice(0, 10);
		const lastDateObj = new Date(`${lastDateStr}T12:00:00Z`);
		if (Number.isNaN(lastDateObj.getTime())) continue;

		const diffDays = Math.round((nowMs - lastDateObj.getTime()) / 86400000);
		if (diffDays < minDaysSinceVisit || diffDays > maxDaysSinceVisit) {
			continue;
		}

		const months = Math.round(diffDays / 30);
		const reason = (lastAppt.reason || lastAppt.notes || lastAppt.comment || "").toLowerCase();

		let category: PreventiveInspectionCategory = "hygiene_6m";
		let categoryTitle = "Плановый профосмотр каждые 6 месяцев";
		let recommendedProcedureName = "Профгигиена полости рта и осмотр";
		let warrantyNotice: string | null = null;

		if (
			reason.includes("имплант") ||
			reason.includes("синус") ||
			reason.includes("остео") ||
			reason.includes("straumann") ||
			reason.includes("osstem") ||
			reason.includes("dentium")
		) {
			category = "implant_warranty";
			categoryTitle = "Осмотр по гарантии (имплантация)";
			recommendedProcedureName = "Контроль остеоинтеграции и гигиены имплантатов";
			warrantyNotice = "Обязателен для сохранения гарантии на установленный имплантат";
		} else if (
			reason.includes("коронк") ||
			reason.includes("винир") ||
			reason.includes("мост") ||
			reason.includes("протез") ||
			reason.includes("вкладк")
		) {
			category = "orthopedic_warranty";
			categoryTitle = "Осмотр по гарантии (коронки и протезирование)";
			recommendedProcedureName = "Контрольный осмотр ортопедических конструкций";
			warrantyNotice = "Необходим для сохранения заводской гарантии на конструкции";
		} else if (
			reason.includes("брекет") ||
			reason.includes("элайнер") ||
			reason.includes("ретейнер") ||
			reason.includes("активац")
		) {
			category = "ortho_retention";
			categoryTitle = "Контрольный осмотр ортодонта";
			recommendedProcedureName = "Контроль стабильности прикуса и ретенции";
		}

		const patientName = patient.fullName || patient.name || "Пациент";
		const patientPhone = patient.phone || null;
		const politeName = extractPoliteFirstName(patientName);

		const doctorId = lastAppt.doctorUserId || lastAppt.doctorId || null;
		const doctorName = doctorId ? doctorsMap.get(doctorId) || null : null;

		const suggestedMessage =
			category === "implant_warranty"
				? `Здравствуйте, ${politeName}! В ${clinicName} подошёл срок контрольного осмотра по гарантии на имплантацию (прошло ${months} мес.). Осмотр необходим для подтверждения стабильности имплантата. Сможем подобрать удобное время?`
				: category === "orthopedic_warranty"
					? `Здравствуйте, ${politeName}! В ${clinicName} подошёл срок контрольного осмотра по гарантии на коронки и конструкции (прошло ${months} мес.). Сможем подобрать удобное время?`
					: `Здравствуйте, ${politeName}! Прошло ${months} мес. с вашего последнего визита в ${clinicName}. Напоминаем о плановом профосмотре каждые 6 месяцев и профгигиене для здоровья зубов и дёсен. Сможем подобрать время?`;

		candidates.push({
			patientId: patient.id,
			patientFullName: patientName,
			patientPhone,
			category,
			categoryTitle,
			lastVisitDate: lastDateStr,
			daysSinceLastVisit: diffDays,
			monthsSinceLastVisit: months,
			lastDoctorId: doctorId,
			lastDoctorName: doctorName,
			recommendedProcedureName,
			warrantyNotice,
			suggestedChannelMessage: suggestedMessage,
		});
	}

	// Sort: warranty candidates first, then descending by days since last visit
	return candidates.sort((a, b) => {
		const aIsWarranty = a.category === "implant_warranty" || a.category === "orthopedic_warranty" ? 1 : 0;
		const bIsWarranty = b.category === "implant_warranty" || b.category === "orthopedic_warranty" ? 1 : 0;
		if (aIsWarranty !== bIsWarranty) {
			return bIsWarranty - aIsWarranty;
		}
		return b.daysSinceLastVisit - a.daysSinceLastVisit;
	});
}
