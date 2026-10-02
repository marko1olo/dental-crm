import type {
	Appointment,
	InsuranceContract,
	Patient,
	PatientInsight,
	StaffMember,
	TreatmentPlanItem,
	TreatmentPlanScenario,
} from "@dental/shared";
import { normalizePhoneDigits } from "./telephonyHelpers";
import type {
	PatientActiveTreatmentPlanSummary,
	PatientFinancialSummary,
	PatientLastVisitSummary,
	PatientNextVisitSummary,
	PatientSomaticAlert,
	PatientUpcomingAppointmentSummary,
} from "./telephonyTypes";

/**
 * Computes structured financial metrics for a patient.
 */
export function calculatePatientFinancialStatus(
	patient: Patient | null | undefined,
	insight?: PatientInsight | null | undefined,
	insuranceContracts?: InsuranceContract[] | null | undefined,
): PatientFinancialSummary {
	if (!patient) {
		return {
			balanceRub: 0,
			formattedBalance: "0 ₽",
			hasDebt: false,
			debtRub: 0,
			formattedDebt: "0 ₽",
			hasInsurance: false,
			insuranceName: null,
			policyNumber: null,
		};
	}

	const balanceRub = Number(patient.balanceRub) || 0;
	const insightDue = Number(insight?.balanceDueRub) || 0;
	const debtRub =
		balanceRub < 0 ? Math.abs(balanceRub) : insightDue > 0 ? insightDue : 0;
	const hasDebt = balanceRub < 0 || insightDue > 0;

	const formatRub = (amount: number) =>
		new Intl.NumberFormat("ru-RU", {
			style: "currency",
			currency: "RUB",
			maximumFractionDigits: 0,
		}).format(amount);

	const formattedBalance =
		balanceRub > 0 ? `+${formatRub(balanceRub)}` : formatRub(balanceRub);
	const formattedDebt = formatRub(debtRub);

	const policyNumber =
		patient.administrativeProfile?.insurancePolicyNumber || null;

	let insuranceName: string | null = null;
	if (insuranceContracts && insuranceContracts.length > 0) {
		const activeContract = insuranceContracts.find((c) => c.isActive);
		if (activeContract) {
			insuranceName = activeContract.companyName;
		}
	}

	const hasInsurance = Boolean(policyNumber || insuranceName);

	return {
		balanceRub,
		formattedBalance,
		hasDebt,
		debtRub,
		formattedDebt,
		hasInsurance,
		insuranceName,
		policyNumber,
	};
}

/**
 * Resolves the last completed/past visit and attending doctor for a patient.
 */
export function resolvePatientLastVisit(
	patientId: string | null | undefined,
	appointments: Appointment[] | null | undefined,
	staff: StaffMember[] | null | undefined,
	nowIso = new Date().toISOString(),
): PatientLastVisitSummary {
	if (!patientId || !appointments || appointments.length === 0) {
		return {
			lastVisitDate: null,
			formattedLastVisit: "Первичный приём (визитов нет)",
			doctorName: null,
			doctorSpecialty: null,
			appointmentReason: null,
			isNewPatient: true,
		};
	}

	const patientAppointments = appointments
		.filter((a) => a.patientId === patientId)
		.filter((a) => {
			const dateStr = a.startsAt || (a as any).startIso || (a as any).date;
			return a.status === "completed" || (dateStr && dateStr <= nowIso);
		})
		.sort((a, b) => {
			const timeA =
				new Date(a.startsAt || (a as any).startIso || 0).getTime() || 0;
			const timeB =
				new Date(b.startsAt || (b as any).startIso || 0).getTime() || 0;
			return timeB - timeA;
		});

	const latest = patientAppointments[0];
	if (!latest) {
		return {
			lastVisitDate: null,
			formattedLastVisit: "Первичный приём (визитов нет)",
			doctorName: null,
			doctorSpecialty: null,
			appointmentReason: null,
			isNewPatient: true,
		};
	}

	let doctorName: string | null = null;
	let doctorSpecialty: string | null = null;

	const doctorId = latest.doctorUserId || (latest as any).doctorId;
	if (doctorId && staff) {
		const doctor = staff.find((s) => s.id === doctorId);
		if (doctor) {
			doctorName = doctor.fullName;
			if (doctor.specialties && doctor.specialties.length > 0) {
				doctorSpecialty = doctor.specialties[0] ?? null;
			}
		}
	}

	const rawDateStr = latest.startsAt || (latest as any).startIso;
	const dateObj = rawDateStr ? new Date(rawDateStr) : null;
	const isValidDate = dateObj && !isNaN(dateObj.getTime());

	const formattedLastVisit = isValidDate
		? new Intl.DateTimeFormat("ru-RU", {
				day: "numeric",
				month: "short",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			}).format(dateObj)
		: "Первичный приём (визитов нет)";

	return {
		lastVisitDate: rawDateStr || null,
		formattedLastVisit,
		doctorName,
		doctorSpecialty,
		appointmentReason: latest.reason || latest.comment || null,
		isNewPatient: false,
	};
}

/**
 * Resolves upcoming future appointment for a patient (for 1-click confirmation trigger).
 */
export function resolvePatientUpcomingAppointment(
	patientId: string | null | undefined,
	appointments: Appointment[] | null | undefined,
	staff: StaffMember[] | null | undefined,
	nowIso = new Date().toISOString(),
): PatientUpcomingAppointmentSummary | null {
	if (!patientId || !appointments || appointments.length === 0) return null;

	const upcoming = appointments
		.filter((a) => a.patientId === patientId)
		.filter((a) => a.status === "planned" || a.status === "confirmed")
		.filter((a) => {
			const dateStr = a.startsAt || (a as any).startIso || (a as any).date;
			return Boolean(dateStr && dateStr >= nowIso);
		})
		.sort((a, b) => {
			const timeA =
				new Date(a.startsAt || (a as any).startIso || 0).getTime() || 0;
			const timeB =
				new Date(b.startsAt || (b as any).startIso || 0).getTime() || 0;
			return timeA - timeB;
		});

	const nextAppt = upcoming[0];
	if (!nextAppt) return null;

	let doctorName: string | null = null;
	const doctorId = nextAppt.doctorUserId || (nextAppt as any).doctorId;
	if (doctorId && staff) {
		const doctor = staff.find((s) => s.id === doctorId);
		if (doctor) doctorName = doctor.fullName;
	}

	const rawStartsAt = nextAppt.startsAt || (nextAppt as any).startIso || nowIso;
	const rawEndsAt = nextAppt.endsAt || (nextAppt as any).endIso || rawStartsAt;
	const dateObj = new Date(rawStartsAt);
	const nowDate = new Date(nowIso);

	const isValidDate = !isNaN(dateObj.getTime());
	const isToday =
		isValidDate &&
		dateObj.getFullYear() === nowDate.getFullYear() &&
		dateObj.getMonth() === nowDate.getMonth() &&
		dateObj.getDate() === nowDate.getDate();

	const tomorrowDate = new Date(nowDate);
	tomorrowDate.setDate(tomorrowDate.getDate() + 1);
	const isTomorrow =
		isValidDate &&
		dateObj.getFullYear() === tomorrowDate.getFullYear() &&
		dateObj.getMonth() === tomorrowDate.getMonth() &&
		dateObj.getDate() === tomorrowDate.getDate();

	const formattedDate = isValidDate
		? new Intl.DateTimeFormat("ru-RU", {
				day: "numeric",
				month: "long",
				weekday: "short",
			}).format(dateObj)
		: "";

	const formattedTime = isValidDate
		? new Intl.DateTimeFormat("ru-RU", {
				hour: "2-digit",
				minute: "2-digit",
			}).format(dateObj)
		: "";

	return {
		appointmentId: nextAppt.id,
		startsAt: rawStartsAt,
		endsAt: rawEndsAt,
		formattedDate,
		formattedTime,
		doctorName,
		chairName: null,
		reason: nextAppt.reason || nextAppt.comment || null,
		status: nextAppt.status,
		isToday,
		isTomorrow,
	};
}

/**
 * Extracts and classifies structured somatic alerts, allergies, and contraindications for a patient.
 */
export function resolvePatientSomaticAlerts(
	patient: Patient | null | undefined,
	insight?: PatientInsight | null | undefined,
): PatientSomaticAlert[] {
	if (!patient && !insight) return [];

	const alerts: PatientSomaticAlert[] = [];
	const seenLabels = new Set<string>();

	const addAlert = (
		label: string,
		category: PatientSomaticAlert["category"],
		severity: PatientSomaticAlert["severity"],
		icon: string,
	) => {
		const norm = label.trim().toLowerCase();
		if (!norm || seenLabels.has(norm)) return;
		seenLabels.add(norm);
		alerts.push({
			id: `alert-${alerts.length + 1}`,
			label: label.trim(),
			category,
			severity,
			icon,
		});
	};

	// 1. Check direct allergies property if present
	if (patient && (patient as any).allergies) {
		const rawAllergies = (patient as any).allergies;
		if (Array.isArray(rawAllergies)) {
			for (const a of rawAllergies) {
				if (typeof a === "string" && a.trim()) {
					addAlert(a.trim(), "allergy", "high", "AlertTriangle");
				}
			}
		} else if (typeof rawAllergies === "string" && rawAllergies.trim()) {
			addAlert(rawAllergies.trim(), "allergy", "high", "AlertTriangle");
		}
	}

	// 2. Check notes for allergies, somatics, contraindications
	if (patient?.notes) {
		const rawNotes = patient.notes;
		const lower = rawNotes.toLowerCase();

		// Specific allergy detections
		if (
			lower.includes("лидокаин") ||
			lower.includes("анестети") ||
			lower.includes("ультракаин") ||
			lower.includes("новокаин") ||
			lower.includes("артикаин")
		) {
			addAlert(
				"Аллергия на анестетики (лидокаин / артикаин)",
				"allergy",
				"high",
				"AlertTriangle",
			);
		}
		if (
			lower.includes("пенициллин") ||
			lower.includes("антибиотик") ||
			lower.includes("амоксициллин")
		) {
			addAlert(
				"Аллергия на пенициллиновый ряд",
				"allergy",
				"high",
				"AlertTriangle",
			);
		}
		if (lower.includes("латекс")) {
			addAlert(
				"Непереносимость латекса (безлатексные перчатки)",
				"allergy",
				"medium",
				"AlertCircle",
			);
		}
		if (
			lower.includes("аллерги") &&
			!lower.includes("лидокаин") &&
			!lower.includes("пенициллин") &&
			!lower.includes("латекс")
		) {
			addAlert(rawNotes, "allergy", "high", "AlertTriangle");
		}

		// Specific somatic pathology detections
		if (lower.includes("беременн") || lower.includes("триместр")) {
			addAlert(
				"Беременность (ограничения по рентгену и адреналину)",
				"chronic",
				"high",
				"ShieldAlert",
			);
		}
		if (
			lower.includes("кардиостимулятор") ||
			lower.includes("пейсмейкер") ||
			lower.includes("электрокардиостимулятор")
		) {
			addAlert(
				"Кардиостимулятор (запрет ультразвуковых скейлеров)",
				"chronic",
				"high",
				"ShieldAlert",
			);
		}
		if (lower.includes("диабет") || lower.includes("сахарн")) {
			addAlert(
				"Сахарный диабет (риск замедленного заживления)",
				"chronic",
				"medium",
				"AlertCircle",
			);
		}
		if (
			lower.includes("гипертон") ||
			lower.includes("давлен") ||
			lower.includes("аг ")
		) {
			addAlert("Артериальная гипертензия", "chronic", "medium", "AlertCircle");
		}
		if (
			lower.includes("антикоагулянт") ||
			lower.includes("варфарин") ||
			lower.includes("ксарелто") ||
			lower.includes("кровотеч")
		) {
			addAlert(
				"Прием антикоагулянтов (риск кровотечения)",
				"chronic",
				"high",
				"AlertTriangle",
			);
		}
		if (
			lower.includes("гепатит") ||
			lower.includes("вич") ||
			lower.includes("вирусн")
		) {
			addAlert(
				"Особый санитарно-эпидемиологический режим",
				"alert",
				"high",
				"ShieldAlert",
			);
		}
		if (
			lower.includes("острая боль") ||
			lower.includes("зубная боль") ||
			lower.includes("пульпит") ||
			lower.includes("периодонтит") ||
			lower.includes("отек") ||
			lower.includes("флюс")
		) {
			addAlert(
				"Острая боль / Экстренное состояние",
				"pain",
				"high",
				"Zap",
			);
		}
	}

	// 3. Check clinical flags from PatientInsight
	if (insight?.clinicalFlags && Array.isArray(insight.clinicalFlags)) {
		for (const flag of insight.clinicalFlags) {
			const lower = flag.toLowerCase();
			const isPain =
				lower.includes("бол") ||
				lower.includes("пульпит") ||
				lower.includes("периодонтит") ||
				lower.includes("экстрен");
			const isAllergy = lower.includes("аллерг");
			const isHigh =
				isAllergy ||
				isPain ||
				lower.includes("кардио") ||
				lower.includes("беремен");
			const severity: PatientSomaticAlert["severity"] = isHigh
				? "high"
				: "medium";
			const cat: PatientSomaticAlert["category"] = isPain
				? "pain"
				: isAllergy
					? "allergy"
					: "alert";
			const icon = isPain ? "Zap" : isAllergy ? "AlertTriangle" : "ShieldAlert";
			addAlert(flag, cat, severity, icon);
		}
	}

	// 4. High risk level from PatientInsight
	if (insight?.riskLevel === "high") {
		if (insight.riskReasons && insight.riskReasons.length > 0) {
			for (const reason of insight.riskReasons) {
				addAlert(`Риск: ${reason}`, "risk", "high", "ShieldAlert");
			}
		} else {
			addAlert(
				"Высокий клинический / организационный риск",
				"risk",
				"high",
				"ShieldAlert",
			);
		}
	}

	return alerts;
}

/**
 * Resolves active treatment plan, progress, and financial totals for a patient.
 */
export function resolvePatientActiveTreatmentPlan(
	patientId: string | null | undefined,
	treatmentPlanItems?: TreatmentPlanItem[] | null | undefined,
	treatmentPlanScenarios?: TreatmentPlanScenario[] | null | undefined,
): PatientActiveTreatmentPlanSummary {
	if (!patientId || (!treatmentPlanItems && !treatmentPlanScenarios)) {
		return {
			hasActivePlan: false,
			planTitle: null,
			totalCostRub: 0,
			formattedTotalCost: "0 ₽",
			itemsCount: 0,
			completedCount: 0,
			pendingCount: 0,
			progressPercent: 0,
			nextService: null,
		};
	}

	const patientItems = (treatmentPlanItems || []).filter(
		(i) => i.patientId === patientId,
	);
	const patientScenarios = (treatmentPlanScenarios || []).filter(
		(s) => s.patientId === patientId,
	);

	if (patientItems.length === 0 && patientScenarios.length === 0) {
		return {
			hasActivePlan: false,
			planTitle: null,
			totalCostRub: 0,
			formattedTotalCost: "0 ₽",
			itemsCount: 0,
			completedCount: 0,
			pendingCount: 0,
			progressPercent: 0,
			nextService: null,
		};
	}

	const activeScenario = patientScenarios[0] || null;
	const totalCostRub =
		activeScenario && typeof activeScenario.totalRub === "number" && activeScenario.totalRub > 0
			? activeScenario.totalRub
			: patientItems.reduce((acc, it) => {
					const unit = Number(it.unitPriceRub) || 0;
					const discount = Number(it.discountRub) || 0;
					const qty = Number(it.quantity) || 1;
					const cost = Math.max(0, (unit - discount) * qty);
					return acc + cost;
				}, 0);

	const completedCount = patientItems.filter((i) => i.status === "completed").length;
	const pendingCount = patientItems.filter(
		(i) => (i.status as string) === "planned" || i.status === "proposed" || i.status === "in_progress" || i.status === "approved",
	).length;
	const totalCount = patientItems.length;
	const progressPercent =
		totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

	const firstPending = patientItems.find(
		(i) => (i.status as string) === "planned" || i.status === "proposed" || i.status === "in_progress" || i.status === "approved",
	);
	const nextService = firstPending ? firstPending.snapshotServiceName : null;

	const formattedTotalCost = new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 0,
	}).format(totalCostRub);

	return {
		hasActivePlan: true,
		planTitle: activeScenario?.title || "Комплексный план лечения",
		totalCostRub,
		formattedTotalCost,
		itemsCount: totalCount,
		completedCount,
		pendingCount,
		progressPercent,
		nextService,
	};
}

/**
 * Resolves upcoming next visit date with full descriptive summary.
 */
export function resolvePatientNextVisit(
	patientId: string | null | undefined,
	appointments: Appointment[] | null | undefined,
	staff: StaffMember[] | null | undefined,
	nowIso = new Date().toISOString(),
): PatientNextVisitSummary {
	if (!patientId || !appointments || appointments.length === 0) {
		return {
			hasNextVisit: false,
			appointmentId: null,
			formattedDate: "—",
			formattedTime: "—",
			doctorName: null,
			doctorSpecialty: null,
			reason: null,
			isToday: false,
			isTomorrow: false,
			startsAt: null,
			fullTextRu: "Следующий визит не запланирован",
		};
	}

	const upcoming = appointments
		.filter((a) => a.patientId === patientId)
		.filter((a) => a.status === "planned" || a.status === "confirmed")
		.filter((a) => a.startsAt >= nowIso)
		.sort(
			(a, b) =>
				new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
		);

	const nextAppt = upcoming[0];
	if (!nextAppt) {
		return {
			hasNextVisit: false,
			appointmentId: null,
			formattedDate: "—",
			formattedTime: "—",
			doctorName: null,
			doctorSpecialty: null,
			reason: null,
			isToday: false,
			isTomorrow: false,
			startsAt: null,
			fullTextRu: "Следующий визит не запланирован",
		};
	}

	let doctorName: string | null = null;
	let doctorSpecialty: string | null = null;
	if (nextAppt.doctorUserId && staff) {
		const doctor = staff.find((s) => s.id === nextAppt.doctorUserId);
		if (doctor) {
			doctorName = doctor.fullName;
			if (doctor.specialties && doctor.specialties.length > 0) {
				doctorSpecialty = doctor.specialties[0] ?? null;
			}
		}
	}

	const dateObj = new Date(nextAppt.startsAt);
	const nowDate = new Date(nowIso);

	const isToday =
		dateObj.getFullYear() === nowDate.getFullYear() &&
		dateObj.getMonth() === nowDate.getMonth() &&
		dateObj.getDate() === nowDate.getDate();

	const tomorrowDate = new Date(nowDate);
	tomorrowDate.setDate(tomorrowDate.getDate() + 1);
	const isTomorrow =
		dateObj.getFullYear() === tomorrowDate.getFullYear() &&
		dateObj.getMonth() === tomorrowDate.getMonth() &&
		dateObj.getDate() === tomorrowDate.getDate();

	const formattedDate = new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "long",
		weekday: "short",
	}).format(dateObj);

	const formattedTime = new Intl.DateTimeFormat("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	}).format(dateObj);

	const prefix = isToday ? "Сегодня" : isTomorrow ? "Завтра" : formattedDate;
	const docStr = doctorName ? ` (${doctorName})` : "";
	const reasonStr = nextAppt.reason ? ` — ${nextAppt.reason}` : "";
	const fullTextRu = `Следующий визит: ${prefix} в ${formattedTime}${docStr}${reasonStr}`;

	return {
		hasNextVisit: true,
		appointmentId: nextAppt.id,
		formattedDate,
		formattedTime,
		doctorName,
		doctorSpecialty,
		reason: nextAppt.reason || nextAppt.comment || null,
		isToday,
		isTomorrow,
		startsAt: nextAppt.startsAt,
		fullTextRu,
	};
}

/**
 * Generates an appointment confirmation message for WhatsApp / SMS.
 */
export function generateAppointmentConfirmationMessage(params: {
	patientName: string;
	doctorName?: string | null;
	appointmentStartsAt: string;
	clinicName?: string;
	clinicAddress?: string | null;
	templateType?: "confirmation" | "reminder" | "urgent";
}): string {
	const dateObj = new Date(params.appointmentStartsAt);
	const formattedDate = dateObj.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		weekday: "short",
	});
	const formattedTime = dateObj.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});
	const doctor = params.doctorName ? ` к врачу ${params.doctorName}` : "";
	const clinic = params.clinicName || "клинике DENTE";
	const address = params.clinicAddress ? ` (${params.clinicAddress})` : "";

	if (params.templateType === "urgent") {
		return `Здравствуйте, ${params.patientName}! Ждём вас на срочный приём в ${clinic}${address}: ${formattedDate} в ${formattedTime}${doctor}. При себе необходимо иметь паспорт. Подтвердите визит ответным сообщением ДА.`;
	}

	if (params.templateType === "reminder") {
		return `Здравствуйте, ${params.patientName}! Напоминаем о сегодняшнем визите в ${clinic}: ${formattedDate} в ${formattedTime}${doctor}. Пожалуйста, приходите за 5-10 минут до начала приёма.`;
	}

	return `Здравствуйте, ${params.patientName}! Напоминаем о вашей записи в ${clinic}: ${formattedDate} в ${formattedTime}${doctor}. Подтверждаете визит? Ответьте ДА или позвоните нам.`;
}

/**
 * Generates an orthopedic ready message for SMS / WhatsApp (Mandates 8b, 8d, 8e).
 * Strict zero emojis, polite natural clinical Russian tone with tooth FDI, material, and doctor.
 */
export function generateOrthopedicReadyMessage(params: {
	patientName: string;
	orderNumber?: string | undefined;
	toothFdi?: string | number | readonly (string | number)[] | undefined;
	material?: string | undefined;
	doctorName?: string | null | undefined;
	clinicName?: string | undefined;
	clinicPhone?: string | undefined;
	bookingUrl?: string | undefined;
	channel?: "sms" | "whatsapp" | undefined;
}): string {
	const firstName = params.patientName
		? params.patientName.split(" ")[1] || params.patientName.split(" ")[0] || "пациент"
		: "пациент";
	const teeth = Array.isArray(params.toothFdi)
		? params.toothFdi.join(", ")
		: params.toothFdi
			? String(params.toothFdi)
			: "16";
	const mat = params.material || "ортопедическая конструкция";
	const doc = params.doctorName || "лечащего врача";
	const clinic = params.clinicName || "DENTE";
	const phone = params.clinicPhone || "+7 (495) 000-00-00";
	const bookingUrl = params.bookingUrl || "https://dente.ru/book";

	if (params.channel === "sms") {
		return `${firstName}, ваша работа (${mat}, зуб ${teeth}) поступила в клинику ${clinic}. Ждем вас на примерку/фиксацию к д-ру ${doc}. Запись: ${phone}`;
	}

	const orderStr = params.orderNumber ? ` по наряду № ${params.orderNumber}` : "";
	return `Добрый день, ${firstName}! Рады сообщить, что ваша ортопедическая работа${orderStr} (${mat}, зуб ${teeth}) готова и доставлена в клинику ${clinic}. Доктор ${doc} готов провести примерку и постоянную фиксацию. Пожалуйста, сообщите удобное время для визита по тел. ${phone} или запишитесь онлайн: ${bookingUrl}. С заботой, стоматология ${clinic}!`;
}


/**
 * Creates a WhatsApp web/app link to trigger 1-click confirmation message.
 */
export function generateWhatsAppConfirmationUrl(
	phone: string,
	text: string,
): string {
	const clean = normalizePhoneDigits(phone);
	let e164 = clean;
	if (clean.length === 10) {
		e164 = `7${clean}`;
	} else if (clean.length === 11 && clean.startsWith("8")) {
		e164 = `7${clean.slice(1)}`;
	}
	return `https://wa.me/${e164}?text=${encodeURIComponent(text)}`;
}

/**
 * Creates an SMS URI to trigger 1-click SMS client.
 */
export function generateSmsConfirmationUrl(phone: string, text: string): string {
	const clean = normalizePhoneDigits(phone);
	let e164 = `+${clean}`;
	if (clean.length === 10) {
		e164 = `+7${clean}`;
	} else if (clean.length === 11 && clean.startsWith("8")) {
		e164 = `+7${clean.slice(1)}`;
	}
	return `sms:${e164}?body=${encodeURIComponent(text)}`;
}

/**
 * Creates a Telegram link for appointment confirmation.
 */
export function generateTelegramConfirmationUrl(
	phone: string,
	text: string,
): string {
	const clean = normalizePhoneDigits(phone);
	let e164 = `+${clean}`;
	if (clean.length === 10) {
		e164 = `+7${clean}`;
	} else if (clean.length === 11 && clean.startsWith("8")) {
		e164 = `+7${clean.slice(1)}`;
	}
	return `https://t.me/share/url?url=${encodeURIComponent(e164)}&text=${encodeURIComponent(text)}`;
}

/**
 * Opens WhatsApp chat via wa.me link.
 */
export function openWhatsAppChat(phone: string, text: string): void {
	if (typeof window === "undefined") return;
	const url = generateWhatsAppConfirmationUrl(phone, text);
	window.open(url, "_blank");
}

/**
 * Formats duration in seconds to MM:SS string (or HH:MM:SS if >= 1 hour).
 */
export function formatDurationTimer(totalSeconds: number): string {
	if (
		!Number.isFinite(totalSeconds) ||
		Number.isNaN(totalSeconds) ||
		totalSeconds < 0
	) {
		return "00:00";
	}
	const sec = Math.floor(totalSeconds);
	const hours = Math.floor(sec / 3600);
	const minutes = Math.floor((sec % 3600) / 60);
	const remainingSeconds = sec % 60;

	if (hours > 0) {
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
	}
	return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Honest flat recording track indicator (normalized level 0.5)
 * Eliminates fake procedural Math.sin waveform diorama per Core Route item 11 / Mandate 8p.
 */
export function generateWaveformBars(
	_seed: string | null | undefined,
	count = 48,
): number[] {
	const barCount = Math.max(1, count);
	return new Array(barCount).fill(0.5);
}

export { resolvePatientCategory } from "@dental/shared";
