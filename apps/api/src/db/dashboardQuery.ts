import type { Dashboard } from "@dental/shared";
import { desc, eq } from "drizzle-orm";
import { db } from "./client.js";
import * as schema from "./schema.js";
import { protocolTemplates as sampleProtocolTemplates } from "../sampleData.js";

const validClinicModes = new Set([
	"solo_doctor",
	"one_chair",
	"small_clinic",
	"network_clinic",
]);
const validStaffRoles = new Set([
	"owner",
	"doctor",
	"administrator",
	"assistant",
	"manager",
]);
const validDentalSpecialties = new Set([
	"therapist",
	"orthopedist",
	"surgeon",
	"orthodontist",
	"periodontist",
	"hygienist",
	"pediatric",
	"implantologist",
	"radiologist",
	"universal",
]);
const validImportStatuses = new Set([
	"previewed",
	"completed",
	"completed_with_skips",
	"failed",
]);

function iso(value: Date | string | null | undefined): string {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === "string" && value.trim()) return value;
	return new Date().toISOString();
}

function nullableIso(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	return iso(value);
}

function safeEmail(value: string | null | undefined): string | null {
	const candidate = value?.trim();
	if (!candidate) return null;
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : null;
}

function normalizeClinicMode(
	value: string | null | undefined,
): Dashboard["clinicSettings"]["profile"]["mode"] {
	if (value && validClinicModes.has(value))
		return value as Dashboard["clinicSettings"]["profile"]["mode"];
	if (value === "network") return "network_clinic";
	if (value === "solo" || value === "single") return "one_chair";
	return "one_chair";
}

function normalizeRole(
	value: string | null | undefined,
): Dashboard["clinicSettings"]["staff"][number]["role"] {
	if (value && validStaffRoles.has(value))
		return value as Dashboard["clinicSettings"]["staff"][number]["role"];
	return "assistant";
}

function normalizeSpecialty(
	value: unknown,
): Dashboard["clinicSettings"]["staff"][number]["specialties"][number] {
	return typeof value === "string" && validDentalSpecialties.has(value)
		? (value as any)
		: "universal";
}

function safeArray(value: unknown): unknown[] {
	if (Array.isArray(value)) return value;
	if (typeof value === "string" && value.trim()) {
		try {
			const parsed = JSON.parse(value);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
	return [];
}

function safeStringArray(value: unknown): string[] {
	return safeArray(value).filter(
		(item): item is string =>
			typeof item === "string" && item.trim().length > 0,
	);
}

function safeObject(value: unknown): Record<string, unknown> | null {
	if (value && typeof value === "object" && !Array.isArray(value))
		return value as Record<string, unknown>;
	if (typeof value === "string" && value.trim()) {
		try {
			const parsed = JSON.parse(value);
			return parsed && typeof parsed === "object" && !Array.isArray(parsed)
				? (parsed as Record<string, unknown>)
				: null;
		} catch {
			return null;
		}
	}
	return null;
}

function money(value: unknown): number {
	const numeric = typeof value === "number" ? value : Number(value ?? 0);
	return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}

function chairEquipmentFlags(equipment: string | null | undefined) {
	const text = equipment?.toLowerCase() ?? "";
	return {
		hasXraySensor: /x-?ray|рентген|sensor|датчик/.test(text),
		hasMicroscope: /microscope|микроскоп/.test(text),
		hasSurgeryKit: /surgery|хирург/.test(text),
	};
}

function firstSpecialization(value: string | null | undefined) {
	const first = value
		?.split(/[;,]/)
		.map((item) => item.trim())
		.find(Boolean);
	return first ? normalizeSpecialty(first) : null;
}

function parseJsonArrayWithWarning(
	value: unknown,
	label: string,
	warnings: string[],
): unknown[] {
	if (!value) return [];
	if (Array.isArray(value)) return value;
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) return parsed;
		} catch {
			warnings.push(
				`Некорректный JSON в ${label}; использовано пустое значение.`,
			);
			return [];
		}
	}
	warnings.push(
		`Некорректное значение ${label}; использовано пустое значение.`,
	);
	return [];
}

function parseStringArrayWithWarning(
	value: unknown,
	label: string,
	warnings: string[],
): string[] {
	return parseJsonArrayWithWarning(value, label, warnings).filter(
		(item): item is string => typeof item === "string",
	);
}

function buildAppointmentReadiness(
	appointments: any[],
	patients: any[],
	users: any[],
	chairs: any[],
	documents: any[],
	imagingStudies: any[],
	paidByPatient: Map<string, number>,
	plannedByPatient: Map<string, number>,
	clinicMode: string,
) {
	const patientsById = new Map(patients.map((p) => [p.id, p]));
	const activeStaffById = new Map(users.map((m) => [m.id, m]));
	const activeChairsById = new Map(chairs.map((c) => [c.id, c]));

	const documentsByPatientId = new Map<string, any[]>();
	for (const doc of documents) {
		if (doc.status !== "voided") {
			if (!documentsByPatientId.has(doc.patientId)) {
				documentsByPatientId.set(doc.patientId, []);
			}
			documentsByPatientId.get(doc.patientId)!.push(doc);
		}
	}

	const imagesByPatientId = new Map<string, any[]>();
	for (const study of imagingStudies) {
		if (!imagesByPatientId.has(study.patientId)) {
			imagesByPatientId.set(study.patientId, []);
		}
		imagesByPatientId.get(study.patientId)!.push(study);
	}

	return appointments.map((appointment) => {
		const patientId = appointment.patientId || "";
		const doctorUserId = appointment.doctorUserId || "";
		const chairId = appointment.chairId || "";

		const patient = patientsById.get(patientId);
		const doctor = activeStaffById.get(doctorUserId);
		const assistant = appointment.assistantUserId
			? (activeStaffById.get(appointment.assistantUserId) ?? null)
			: null;

		const chair = activeChairsById.get(chairId);
		const patientDocuments = documentsByPatientId.get(patientId) ?? [];
		const patientImages = imagesByPatientId.get(patientId) ?? [];

		const totalPlanned = plannedByPatient.get(patientId) ?? 0;
		const totalPaid = paidByPatient.get(patientId) ?? 0;
		const balanceDue = Math.max(0, totalPlanned - totalPaid);

		const hasContract = patientDocuments.some(
			(d) => d.kind === "paid_medical_services_contract",
		);
		const hasConsent = patientDocuments.some(
			(d) => d.kind === "informed_consent",
		);
		const hasImageForTreatment = patientImages.some(
			(study) => study.status !== "failed",
		);
		const hasImageReviewBlocker = patientImages.some(
			(study) => study.status === "needs_review",
		);
		const hasBalance = balanceDue > 0;

		const assistantRequired = clinicMode !== "solo_doctor";

		const checks = [
			{
				key: "patient",
				title: "Пациент",
				ready: Boolean(patient),
				detail: patient ? "карточка найдена" : "нет карточки пациента",
			},
			{
				key: "team",
				title: "Команда",
				ready: Boolean(doctor && chair && (!assistantRequired || assistant)),
				detail: `${doctor ? "врач назначен" : "нет врача"} · ${chair ? chair.name : "нет кресла"} · ${
					assistant
						? "ассистент назначен"
						: assistantRequired
							? "ассистент не назначен"
							: "ассистент не требуется"
				}`,
			},
			{
				key: "schedule",
				title: "Расписание",
				ready: true,
				detail: "согласовано",
			},
			{
				key: "contracts",
				title: "Договоры",
				ready: hasContract && hasConsent,
				detail:
					hasContract && hasConsent
						? "договор и ИДС подписаны"
						: !hasContract && !hasConsent
							? "нет договора и ИДС"
							: !hasContract
								? "нет договора"
								: "нет ИДС",
			},
			{
				key: "imaging",
				title: "Диагностика",
				ready: hasImageForTreatment && !hasImageReviewBlocker,
				detail:
					hasImageForTreatment && !hasImageReviewBlocker
						? "снимки загружены"
						: hasImageReviewBlocker
							? "снимки требуют описания"
							: "нет снимков/КТ",
			},
			{
				key: "finance",
				title: "Оплата",
				ready: !hasBalance,
				detail: hasBalance ? `долг ${balanceDue} ₽` : "оплачено полностью",
			},
		];

		const readyCount = checks.filter((c) => c.ready).length;
		const score = Math.round((readyCount / checks.length) * 100);

		// Determine the traffic light state
		let state: "ready" | "needs_attention" | "blocked" = "ready";
		if (hasBalance || !hasContract || !hasConsent || !hasImageForTreatment) {
			state = "needs_attention";
		}
		if (!patient || !doctor || !chair || (assistantRequired && !assistant)) {
			state = "blocked";
		}

		let nextAction = "Все готово к приему";
		if (state === "blocked") {
			nextAction = "Назначьте команду и время";
		} else if (!hasContract || !hasConsent) {
			nextAction = "Подпишите договор и ИДС";
		} else if (!hasImageForTreatment) {
			nextAction = "Сделайте прицельный снимок или КТ";
		} else if (hasBalance) {
			nextAction = "Оплатите остаток за лечение";
		}

		return {
			appointmentId: appointment.id,
			patientId: patientId || null,
			score,
			state,
			nextAction,
			ownerUserId: doctorUserId,
			ownerRole: "doctor" as const,
			blockers: checks.filter((c) => !c.ready).map((c) => c.title),
			checks,
		};
	});
}

function normalizeImportStatus(
	value: string,
): Dashboard["importBatches"][number]["status"] {
	return validImportStatuses.has(value)
		? (value as Dashboard["importBatches"][number]["status"])
		: "failed";
}

export async function getDashboardFromDb(
	organizationId: string,
): Promise<Dashboard> {
	const [org] = await db
		.select()
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.limit(1);
	if (!org) throw new Error("Organization not found");

	const warnings: string[] = [];
	const users = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.organizationId, organizationId));
	const patients = await db
		.select()
		.from(schema.patients)
		.where(eq(schema.patients.organizationId, organizationId));
	const appointments = await db
		.select()
		.from(schema.appointments)
		.where(eq(schema.appointments.organizationId, organizationId));
	const visits = await db
		.select()
		.from(schema.visits)
		.where(eq(schema.visits.organizationId, organizationId))
		.orderBy(desc(schema.visits.updatedAt));
	const documents = await db
		.select()
		.from(schema.generatedDocuments)
		.where(eq(schema.generatedDocuments.organizationId, organizationId));
	const imagingStudies = await db
		.select()
		.from(schema.imagingStudies)
		.where(eq(schema.imagingStudies.organizationId, organizationId));
	const chairs = await db
		.select()
		.from(schema.clinicChairs)
		.where(eq(schema.clinicChairs.organizationId, organizationId));
	const serviceCatalog = await db
		.select()
		.from(schema.serviceCatalogItems)
		.where(eq(schema.serviceCatalogItems.organizationId, organizationId));
	const clinicalRules = await db
		.select()
		.from(schema.clinicalRules)
		.where(eq(schema.clinicalRules.organizationId, organizationId));
	const payments = await db
		.select()
		.from(schema.payments)
		.where(eq(schema.payments.organizationId, organizationId));
	const invoices = await db
		.select()
		.from(schema.patientInvoices)
		.where(eq(schema.patientInvoices.organizationId, organizationId));
	const commTasks = await db
		.select()
		.from(schema.communicationTasks)
		.where(eq(schema.communicationTasks.organizationId, organizationId));
	const treatmentItems = await db
		.select()
		.from(schema.treatmentItems)
		.where(eq(schema.treatmentItems.organizationId, organizationId));
	const treatmentScenarios = await db
		.select()
		.from(schema.treatmentScenarios)
		.where(eq(schema.treatmentScenarios.organizationId, organizationId));
	const importBatches = await db
		.select()
		.from(schema.importBatches)
		.where(eq(schema.importBatches.organizationId, organizationId));
	const auditEvents = await db
		.select()
		.from(schema.auditEvents)
		.where(eq(schema.auditEvents.organizationId, organizationId))
		.orderBy(desc(schema.auditEvents.createdAt));
	const activeInsuranceContracts = await db
		.select()
		.from(schema.insuranceContracts)
		.where(eq(schema.insuranceContracts.organizationId, organizationId));

	const activeVisit =
		visits.find((visit) => visit.status === "draft") ?? visits[0] ?? null;

	let activeVisitDiary: any = null;
	if (activeVisit) {
		const [diary] = await db
			.select()
			.from(schema.visitDiaries)
			.where(eq(schema.visitDiaries.visitId, activeVisit.id));
		activeVisitDiary = diary ?? null;
	}

	const paidPayments = payments.filter((payment) => payment.status === "paid");
	const totalPaidRub = paidPayments.reduce(
		(sum, payment) => sum + money(payment.amountRub),
		0,
	);
	const totalInvoiceRub = invoices.reduce(
		(sum, invoice) => sum + money(invoice.totalAmountRub),
		0,
	);
	const totalDocumentRub = documents.reduce(
		(sum, document) => sum + money(document.totalAmountRub),
		0,
	);
	const totalPlannedRub = Math.max(
		totalInvoiceRub,
		totalDocumentRub,
		treatmentItems.reduce((sum, item) => sum + money(item.priceRub), 0),
	);
	const draftDocumentAmountRub = documents
		.filter((document) => document.status === "draft")
		.reduce((sum, document) => sum + money(document.totalAmountRub), 0);
	const unpaidDocuments = documents.filter(
		(document) =>
			document.status === "draft" && money(document.totalAmountRub) > 0,
	).length;
	const openTreatmentItems = treatmentItems.filter(
		(item) => item.status !== "completed" && item.status !== "cancelled",
	).length;
	const totalDiscountRub = treatmentItems.reduce(
		(sum, item) => sum + money(item.discountRub),
		0,
	);
	const taxDeductionEligibleRub = paidPayments
		.filter(
			(payment) =>
				payment.taxDeductionCode === "1" || payment.taxDeductionCode === "2",
		)
		.reduce((sum, payment) => sum + money(payment.amountRub), 0);

	const paidByPatient = new Map<string, number>();
	for (const payment of paidPayments)
		paidByPatient.set(
			payment.patientId,
			(paidByPatient.get(payment.patientId) ?? 0) + money(payment.amountRub),
		);
	const plannedByPatient = new Map<string, number>();
	for (const invoice of invoices)
		plannedByPatient.set(
			invoice.patientId,
			(plannedByPatient.get(invoice.patientId) ?? 0) +
				money(invoice.totalAmountRub),
		);
	for (const document of documents)
		plannedByPatient.set(
			document.patientId,
			(plannedByPatient.get(document.patientId) ?? 0) +
				money(document.totalAmountRub),
		);

	const mode = normalizeClinicMode(org.clinicMode);
	const specializations = safeStringArray(org.specializations).map(
		normalizeSpecialty,
	);
	const workingHours = safeObject(org.workingHours);
	const clinicSchedule = safeObject(org.clinicSchedule);
	const scheduleDefaults = {
		workingDays: safeArray(clinicSchedule?.workingDays)
			.map(Number)
			.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7),
		workdayStart:
			typeof clinicSchedule?.workdayStart === "string"
				? clinicSchedule.workdayStart
				: "09:00",
		workdayEnd:
			typeof clinicSchedule?.workdayEnd === "string"
				? clinicSchedule.workdayEnd
				: "20:00",
		appointmentBufferMinutes: Number.isInteger(
			clinicSchedule?.appointmentBufferMinutes,
		)
			? Number(clinicSchedule?.appointmentBufferMinutes)
			: 15,
	};
	if (scheduleDefaults.workingDays.length === 0)
		scheduleDefaults.workingDays = [1, 2, 3, 4, 5];

	const rawProtocolTemplates = await db
		.select()
		.from(schema.protocolTemplates)
		.where(eq(schema.protocolTemplates.organizationId, organizationId));

	const finalProtocolTemplates =
		rawProtocolTemplates.length > 0
			? rawProtocolTemplates
			: sampleProtocolTemplates.filter((pt) => true);

	const dashboard = {
		clinicName: org.name,
		todayIso: new Date().toISOString().split("T")[0],
		clinicSettings: {
			profile: {
				organizationId: org.id,
				clinicName: org.name,
				legalName: org.name,
				inn: org.inn,
				kpp: org.kpp,
				ogrn: org.ogrn,
				address: org.legalAddress,
				phone: null,
				email: safeEmail(org.email),
				website: org.website,
				medicalLicenseNumber: org.medicalLicenseNumber,
				medicalLicenseIssuedAt: org.medicalLicenseIssuedAt,
				medicalLicenseIssuer: org.medicalLicenseIssuer,
				bankDetails: org.bankDetails,
				signatoryName: org.signatoryName,
				signatoryTitle: org.signatoryTitle,
				mode,
				timezone: "Europe/Samara",
				defaultVisitMinutes: 45,
				scheduleDefaults,
				networkEnabled: mode === "network_clinic",
				egiszEnabled: false,
				updatedAt: iso(org.updatedAt),
				specializations,
				workingHours: workingHours as any,
				currency: org.currency && org.currency !== "₽" ? org.currency : "₽",
				themeColor: org.themeColor ?? "teal",
				logoUrl: org.logoUrl,
				stampUrl: org.stampUrl,
				hasAssistants: org.hasAssistants ?? true,
				hasMultipleChairs: org.hasMultipleChairs ?? true,
				hasDentalLab: org.hasDentalLab ?? true,
				hasInsuranceCoPay: org.hasInsuranceCoPay ?? true,
				hasInstallments: org.hasInstallments ?? true,
				hasOrthodontics: org.hasOrthodontics ?? true,
				hasTasks: org.hasTasks ?? true,
				hasReclamations: org.hasReclamations ?? true,
				hasPayrollModule: org.hasPayrollModule ?? true,
				hasMarketingModule: org.hasMarketingModule ?? true,
				hasAnalyticsModule: org.hasAnalyticsModule ?? true,
				hasInventoryModule: org.hasInventoryModule ?? true,
				aiEnableTreatmentPlan: org.aiEnableTreatmentPlan ?? true,
				aiEnableRecommendations: org.aiEnableRecommendations ?? true,
				aiEnableDocuments: org.aiEnableDocuments ?? true,
				workspacePreset: org.workspacePreset ?? "enterprise",
				onboardingCompleted: org.onboardingCompleted ?? false,
				hasPediatricMode: org.hasPediatricMode ?? false,
				isOmniRole: org.isOmniRole ?? false,
			},
			staff: users.map((user) => ({
				id: user.id,
				organizationId: user.organizationId,
				fullName: user.fullName,
				role: normalizeRole(user.role),
				phone: user.phone,
				email: safeEmail(user.email),
				active: user.isActive,
				specialties: safeArray(user.specialties).map(normalizeSpecialty),
				canSignMedicalRecords: user.canSignMedicalRecords,
				canManageMoney: user.canManageMoney,
				canManageImports: user.canManageImports,
				color: user.color || "gray",
				workingHours: safeObject(user.workingHours) as any,
				createdAt: iso(user.createdAt),
				updatedAt: iso(user.updatedAt),
			})),
			chairs: chairs.map((chair) => {
				const flags = chairEquipmentFlags(chair.equipment);
				return {
					id: chair.id,
					organizationId: chair.organizationId,
					name: chair.name,
					room: null,
					specialization: firstSpecialization(chair.specializations),
					active: chair.isActive,
					...flags,
					notes: chair.equipment,
					workingHours: safeObject(chair.workingHours) as any,
				};
			}),
			integrationPresets: [],
			workspaceProfiles: [],
			roleAccessPolicies: [],
			modeHints: [],
			soloDoctorMode: mode === "solo_doctor",
		},
		patients: patients.map((patient) => ({
			id: patient.id,
			organizationId: patient.organizationId,
			status: patient.status,
			fullName: patient.fullName,
			birthDate: patient.birthDate,
			phone: patient.phone,
			email: safeEmail(patient.email),
			notes: patient.notes,
			administrativeProfile: patient.administrativeProfile,
			balanceRub: Math.max(
				0,
				(plannedByPatient.get(patient.id) ?? 0) -
					(paidByPatient.get(patient.id) ?? 0),
			),
			createdAt: iso(patient.createdAt),
			updatedAt: iso(patient.updatedAt),
		})),
		patientInsights: [],
		recommendedActions: [],
		appointments: appointments.map((appointment) => ({
			id: appointment.id,
			organizationId: appointment.organizationId,
			patientId: appointment.patientId,
			doctorUserId: appointment.doctorUserId,
			assistantUserId: appointment.assistantUserId,
			chairId: appointment.chairId,
			status: appointment.status,
			startsAt: iso(appointment.startsAt),
			endsAt: iso(appointment.endsAt),
			reason: appointment.reason,
			comment: appointment.comment,
		})),
		appointmentReadiness: buildAppointmentReadiness(
			appointments,
			patients,
			users,
			chairs,
			documents,
			imagingStudies,
			paidByPatient,
			plannedByPatient,
			mode,
		),
		scheduleSuggestions: [],
		activeVisit: activeVisit
			? {
					id: activeVisit.id,
					organizationId: activeVisit.organizationId,
					patientId: activeVisit.patientId,
					appointmentId: activeVisit.appointmentId,
					status: activeVisit.status,
					revision: activeVisit.revision,
					complaint: activeVisit.complaint,
					anamnesis: activeVisit.anamnesis,
					objectiveStatus: activeVisit.objectiveStatus,
					diagnosis: activeVisit.diagnosis,
					treatmentPlan: activeVisit.treatmentPlan,
					doctorSummary: activeVisit.doctorSummary,
					createdAt: iso(activeVisit.createdAt),
					updatedAt: iso(activeVisit.updatedAt),
					diary: activeVisitDiary ? {
						id: activeVisitDiary.id,
						complications: activeVisitDiary.complications,
						comorbidities: activeVisitDiary.comorbidities,
					} : null,
				}
			: null,
		visitCloseChecklist: activeVisit
			? {
					visitId: activeVisit.id,
					readyToSign: false,
					score: 0,
					nextAction: "review",
					blockingItems: 0,
					items: [],
				}
			: null,
		shiftIntelligence: {
			modeFit: {
				mode,
				title:
					mode === "network_clinic"
						? "Сеть клиник"
						: mode === "small_clinic"
							? "Малая клиника"
							: mode === "solo_doctor"
								? "Соло-врач"
								: "Один кабинет",
				fitScore: 100,
				blockers: [],
				upgrades: [],
				lowFrictionNextStep: "ready",
			},
			doctorLoads: [],
			assistantLoads: [],
			chairLoads: [],
			roleQueues: [],
			scheduleWarnings: [],
		},
		protocolTemplates: finalProtocolTemplates as any,
		treatmentPlanItems: treatmentItems.map((item) => ({
			id: item.id,
			organizationId: item.organizationId,
			patientId: item.patientId,
			visitId: item.visitId,
			serviceId: item.serviceId ?? item.id,
			snapshotServiceName: item.title,
			snapshotServiceCategory: null,
			toothCode: item.toothCode,
			quantity: Math.max(1, money(item.quantity)),
			unitPriceRub: money(item.unitPriceRub),
			discountRub: money(item.discountRub),
			status: item.status,
			plannedDoctorUserId: item.plannedDoctorUserId,
			plannedChairId: item.plannedChairId,
			notes: item.notes,
		})),
		treatmentPlanScenarios: treatmentScenarios.map((scenario) => ({
			id: scenario.id,
			organizationId: scenario.organizationId,
			patientId: scenario.patientId,
			title: scenario.title,
			strategy: scenario.strategy,
			priority: scenario.priority,
			totalRub: money(scenario.totalRub),
			durationMonths: Math.max(0, money(scenario.durationMonths)),
			visitCount: Math.max(1, money(scenario.visitCount)),
			includedServiceIds: parseStringArrayWithWarning(
				scenario.includedServiceIdsJson,
				`treatment_scenarios.${scenario.id}.includedServiceIdsJson`,
				warnings,
			),
			phases: parseJsonArrayWithWarning(
				scenario.phasesJson,
				`treatment_scenarios.${scenario.id}.phasesJson`,
				warnings,
			).filter((phase): phase is any =>
				Boolean(phase && typeof phase === "object"),
			),
			pros: parseStringArrayWithWarning(
				scenario.prosJson,
				`treatment_scenarios.${scenario.id}.prosJson`,
				warnings,
			),
			tradeoffs: parseStringArrayWithWarning(
				scenario.tradeoffsJson,
				`treatment_scenarios.${scenario.id}.tradeoffsJson`,
				warnings,
			),
			clinicalWarnings: parseStringArrayWithWarning(
				scenario.clinicalWarningsJson,
				`treatment_scenarios.${scenario.id}.clinicalWarningsJson`,
				warnings,
			),
			active: scenario.isActive,
		})),
		clinicalRuleEvaluations: [],
		clinicalRuleSummary: {
			activeRules: clinicalRules.filter((rule) => rule.isActive).length,
			evaluatedRules: 0,
			unresolved: 0,
			blockers: clinicalRules.filter(
				(rule) => rule.isActive && rule.severity === "blocker",
			).length,
			warnings: clinicalRules.filter(
				(rule) => rule.isActive && rule.severity === "warning",
			).length,
			requiredServices: clinicalRules.filter(
				(rule) => rule.isActive && rule.action === "add_required_service",
			).length,
			coveredRules: 0,
		},
		payments: payments.map((payment) => ({
			id: payment.id,
			organizationId: payment.organizationId,
			patientId: payment.patientId,
			visitId: payment.visitId,
			documentId: payment.documentId,
			amountRub: money(payment.amountRub),
			method: payment.method,
			status: payment.status,
			paidAt: nullableIso(payment.paidAt),
			createdAt: iso(payment.createdAt),
			fiscalReceiptNumber: payment.fiscalReceiptNumber,
			fiscalReceiptIssuedAt: payment.fiscalReceiptIssuedAt,
			fiscalReceiptUrl: payment.fiscalReceiptUrl,
			fiscalReceipt: payment.fiscalReceipt,
			clientMutationId: payment.clientMutationId,
			payerFullName: payment.payerFullName,
			payerInn: payment.payerInn,
			payerBirthDate: payment.payerBirthDate,
			payerIdentityDocument: payment.payerIdentityDocument,
			payerRelationship: payment.payerRelationship,
			taxDeductionCode: payment.taxDeductionCode as any,
			note: payment.note,
		})),
		billingSummary: {
			totalPlannedRub,
			totalDiscountRub,
			totalPaidRub,
			totalDueRub: Math.max(0, totalPlannedRub - totalPaidRub),
			taxDeductionEligibleRub,
			draftDocumentAmountRub,
			openTreatmentItems,
			unpaidDocuments,
			insuranceCoverageRub: 0,
		},
		communicationTemplates: [],
		communicationTasks: commTasks.map((t) => ({
			id: t.id,
			organizationId: t.organizationId,
			patientId: t.patientId,
			appointmentId: t.appointmentId,
			visitId: t.visitId,
			documentId: t.documentId,
			assignedRole: t.assignedRole,
			channel: t.channel,
			intent: t.intent,
			status: t.status,
			priority: t.priority,
			dueAt: nullableIso(t.dueAt),
			title: t.title,
			body: t.body,
			workflowCode: t.workflowCode,
			lastEventAt: nullableIso(t.lastEventAt),
			createdAt: iso(t.createdAt),
		})),
		communicationEvents: [],
		communicationSummary: {
			openTasks: 0,
			urgentTasks: 0,
			dueToday: 0,
			overdue: 0,
			completedToday: 0,
			appointmentConfirmations: 0,
			paymentReminders: 0,
			postVisitInstructions: 0,
		},
		importBatches: importBatches.map((batch) => ({
			id: batch.id,
			organizationId: batch.organizationId,
			sourceName: batch.sourceName,
			status: normalizeImportStatus(batch.status),
			totalRows: batch.totalRows,
			importedRows: batch.importedRows,
			skippedRows: batch.skippedRows,
			warningRows: batch.warningRows,
			blockedRows: batch.blockedRows,
			createdAt: iso(batch.createdAt),
		})),
		speechProviders: [],
		auditEvents: auditEvents.map((event) => ({
			id: event.id,
			organizationId: event.organizationId,
			actorUserId: event.actorUserId,
			entityType: event.entityType,
			entityId: event.entityId,
			action: event.action,
			reason: event.reason,
			createdAt: iso(event.createdAt),
		})),
		complianceWarnings: warnings,
		insuranceContracts: activeInsuranceContracts.map((c) => ({
			id: c.id,
			organizationId: c.organizationId,
			companyName: c.companyName,
			policyNumberMask: c.policyNumberMask,
			coverageTherapyPct: c.coverageTherapyPct,
			coverageSurgeryPct: c.coverageSurgeryPct,
			coverageOrthoPct: c.coverageOrthoPct,
			coverageHygienePct: c.coverageHygienePct,
			annualLimitRub: c.annualLimitRub,
			isActive: c.isActive,
			createdAt: iso(c.createdAt),
		})),
		documents: documents.map((document) => ({
			id: document.id,
			organizationId: document.organizationId,
			patientId: document.patientId,
			visitId: document.visitId,
			kind: document.kind,
			status: document.status,
			title: document.title,
			totalAmountRub: document.totalAmountRub,
			taxYear: document.taxYear,
			taxPayerInn: document.taxPayerInn,
			issuedAt: nullableIso(document.issuedAt),
			signatureAttestation: document.signatureAttestation,
			voidAttestation: document.voidAttestation,
			releaseJournalEntry: document.releaseJournalEntry,
			issuedSnapshotSha256: document.issuedSnapshotSha256,
			issuedSnapshotCreatedAt: nullableIso(document.issuedSnapshotCreatedAt),
			issuedByUserId: document.issuedByUserId,
			voidedAt: nullableIso(document.voidedAt),
			voidedByUserId: document.voidedByUserId,
			chainSummary: null,
		})),
		imagingStudies: imagingStudies.map((study) => ({
			id: study.id,
			organizationId: study.organizationId,
			patientId: study.patientId,
			visitId: study.visitId,
			kind: study.kind,
			title: study.title,
			toothCode: study.toothCode,
			region: study.region,
			capturedAt: iso(study.capturedAt),
			sourceKind: study.sourceKind,
			sourceName: study.sourceName,
			storagePath: study.storagePath,
			dicomStudyUid: study.dicomStudyUid,
			status: study.status,
			aiSummary: study.aiSummary,
			previewUrl: `/api/imaging/studies/${study.id}/preview`,
			viewerUrl: `/api/imaging/studies/${study.id}/viewer`,
		})),
		serviceCatalog: serviceCatalog.map((service) => ({
			id: service.id,
			organizationId: service.organizationId,
			code: service.code,
			title: service.title,
			aliases: [],
			category: service.category,
			specialty: service.specialty,
			basePriceRub: money(service.basePriceRub),
			durationMinutes: Math.max(1, service.durationMinutes),
			taxDeductible: service.taxDeductible,
			active: service.isActive,
		})),
		clinicalRules: clinicalRules.map((rule) => ({
			id: rule.id,
			organizationId: rule.organizationId,
			title: rule.title,
			category: rule.category,
			specialty: rule.specialty,
			action: rule.action,
			severity: rule.severity,
			ownerRole: normalizeRole(rule.ownerRole),
			triggerServiceIds: parseStringArrayWithWarning(
				rule.triggerServiceIdsJson,
				`clinical_rules.${rule.id}.triggerServiceIdsJson`,
				warnings,
			),
			requiredServiceIds: parseStringArrayWithWarning(
				rule.requiredServiceIdsJson,
				`clinical_rules.${rule.id}.requiredServiceIdsJson`,
				warnings,
			),
			requiresCompletedServiceIds: parseStringArrayWithWarning(
				rule.requiresCompletedServiceIdsJson,
				`clinical_rules.${rule.id}.requiresCompletedServiceIdsJson`,
				warnings,
			),
			blockedServiceIds: parseStringArrayWithWarning(
				rule.blockedServiceIdsJson,
				`clinical_rules.${rule.id}.blockedServiceIdsJson`,
				warnings,
			),
			condition: rule.condition,
			warningText: rule.warningText,
			patientText: rule.patientText,
			active: rule.isActive,
		})),
	} as unknown as Dashboard;

	return dashboard;
}
