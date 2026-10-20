import {
	type Appointment,
	appointmentSchema,
	type Chair,
	type ClinicalRule,
	chairSchema,
	clinicalRuleSchema,
	dentalSpecialtySchema,
	type ImagingStudy,
	imagingStudySchema,
	type ProtocolTemplate,
	protocolTemplateSchema,
	type StaffMember,
	staffMemberSchema,
	staffRoleSchema,
	type TreatmentPlanItem,
	treatmentPlanItemSchema,
	type Visit,
	visitSchema,
} from "@dental/shared";
import { browserRenderableImageMimeType } from "../../../imaging/previewFormats.js";
import { staffAuthorityFlags } from "../../../security/permissions.js";
import * as schema from "../../schema.js";
import { projectVisitRow } from "../../visitsProjection.js";
import type { DomainStateHydrationReport } from "../types.js";
import {
	collect,
	iso,
	isoOrSkipRow,
	parseJsonArray,
} from "./sliceExtractorsTypes.js";

export function extractStaff(
	userRows: Array<typeof schema.users.$inferSelect>,
	report: DomainStateHydrationReport,
): StaffMember[] {
	return collect<StaffMember>(
		userRows.map((user) => ({
			id: user.id,
			organizationId: user.organizationId,
			fullName: user.fullName,
			role: staffRoleSchema.catch("doctor").parse(user.role),
			specialties: parseJsonArray(user.specialties)
				.map((entry) => dentalSpecialtySchema.safeParse(entry))
				.filter((result) => result.success)
				.map((result) => result.data),
			phone: user.phone ?? null,
			email: user.email ?? null,
			active: user.isActive,
			...staffAuthorityFlags(user.role),
			color: "#1e293b",
			workingHours: user.workingHours ?? null,
			createdAt: isoOrSkipRow(
				user.createdAt,
				"users",
				user.id,
				"created_at",
				report,
			),
			updatedAt: isoOrSkipRow(
				user.createdAt,
				"users",
				user.id,
				"created_at",
				report,
			),
		})),
		staffMemberSchema,
		"staff",
		report,
	);
}

export function extractChairs(
	chairRows: Array<typeof schema.chairs.$inferSelect>,
	report: DomainStateHydrationReport,
): Chair[] {
	const equipmentOf = (value: string | null): string[] =>
		parseJsonArray(value).map((entry) => entry.toLowerCase());
	return collect<Chair>(
		chairRows.map((chair) => {
			const equipment = equipmentOf(chair.equipment);
			const specializations = parseJsonArray(chair.specializations);
			const specialization = specializations
				.map((entry) => dentalSpecialtySchema.safeParse(entry))
				.find((result) => result.success);
			return {
				id: chair.id,
				organizationId: chair.organizationId,
				name: chair.name,
				room: null,
				specialization: specialization ? specialization.data : null,
				active: chair.isActive,
				hasXraySensor: equipment.some(
					(entry) => entry.includes("rvg") || entry.includes("рентген"),
				),
				hasMicroscope: equipment.some(
					(entry) =>
						entry.includes("microscope") || entry.includes("микроскоп"),
				),
				hasSurgeryKit: equipment.some(
					(entry) => entry.includes("surgery") || entry.includes("хирург"),
				),
				notes: null,
				workingHours: chair.workingHours ?? null,
			};
		}),
		chairSchema,
		"chairs",
		report,
	);
}

export function extractAppointments(
	appointmentRows: Array<typeof schema.appointments.$inferSelect>,
	report: DomainStateHydrationReport,
	labOrderRows: Array<typeof schema.labOrders.$inferSelect> = [],
): Appointment[] {
	const labOrdersByPatient = new Map<
		string,
		Array<typeof schema.labOrders.$inferSelect>
	>();
	for (const order of labOrderRows) {
		if (!order.patientId || order.status === "cancelled") continue;
		const existing = labOrdersByPatient.get(order.patientId) ?? [];
		existing.push(order);
		labOrdersByPatient.set(order.patientId, existing);
	}

	return collect<Appointment>(
		appointmentRows.map((appointment) => {
			const patientOrders = appointment.patientId
				? (labOrdersByPatient.get(appointment.patientId) ?? [])
				: [];
			const matchedOrder =
				patientOrders.find(
					(o) =>
						appointment.toothNumber &&
						String(o.toothFdi).includes(String(appointment.toothNumber)),
				) ??
				patientOrders.find(
					(o) => o.status === "received" || o.status === "shipped",
				) ??
				patientOrders.find(
					(o) => o.status === "in_progress" || o.status === "sent",
				) ??
				patientOrders[0] ??
				null;

			const mappedStatus = matchedOrder
				? matchedOrder.status === "received" ||
					matchedOrder.status === "shipped"
					? "ready_in_clinic"
					: matchedOrder.status === "sent"
						? "sent_to_lab"
						: matchedOrder.status === "draft"
							? "created"
							: matchedOrder.status
				: null;

			return {
				id: appointment.id,
				organizationId: appointment.organizationId,
				patientId: appointment.patientId,
				doctorUserId: appointment.doctorUserId,
				assistantUserId: appointment.assistantUserId ?? null,
				chairId: appointment.chairId,
				status: appointment.status,
				startsAt: isoOrSkipRow(
					appointment.startsAt,
					"appointments",
					appointment.id,
					"starts_at",
					report,
				),
				endsAt: isoOrSkipRow(
					appointment.endsAt,
					"appointments",
					appointment.id,
					"ends_at",
					report,
				),
				reason: appointment.reason ?? null,
				comment: appointment.comment ?? null,
				parentAppointmentId: appointment.parentAppointmentId ?? null,
				stageIndex: appointment.stageIndex ?? null,
				clinicalStage: appointment.clinicalStage ?? null,
				toothNumber: appointment.toothNumber ?? null,
				diagnosisMkb10: appointment.diagnosisMkb10 ?? null,
				labOrder: matchedOrder
					? {
							id: matchedOrder.id,
							orderNumber: `ЗТЛ-${matchedOrder.id.slice(0, 4).toUpperCase()}`,
							patientId: matchedOrder.patientId,
							toothFdi: matchedOrder.toothFdi,
							workType: matchedOrder.material,
							material: matchedOrder.material,
							colorVita: matchedOrder.colorVita,
							dueDate: matchedOrder.dueDate ? iso(matchedOrder.dueDate) : null,
							status: mappedStatus,
							stage: mappedStatus,
							priceRub: matchedOrder.priceRub ?? null,
						}
					: null,
			};
		}),
		appointmentSchema,
		"appointments",
		report,
	);
}

export function extractVisits(
	visitRows: Array<typeof schema.visits.$inferSelect>,
	report: DomainStateHydrationReport,
): Visit[] {
	return collect<Visit>(
		visitRows.map(projectVisitRow),
		visitSchema,
		"visits",
		report,
	);
}

export function extractTreatmentItems(
	treatmentItemRows: Array<typeof schema.treatmentItems.$inferSelect>,
	report: DomainStateHydrationReport,
): TreatmentPlanItem[] {
	return collect<TreatmentPlanItem>(
		treatmentItemRows.map((item) => ({
			id: item.id,
			organizationId: item.organizationId,
			patientId: item.patientId,
			visitId: item.visitId ?? null,
			serviceId: item.serviceId ?? "",
			snapshotServiceName: item.title,
			snapshotServiceCategory: null,
			toothCode: item.toothCode ?? null,
			quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
			unitPriceRub: Math.max(0, item.unitPriceRub),
			discountRub: Math.max(0, item.discountRub),
			status: item.status,
			plannedDoctorUserId: item.plannedDoctorUserId ?? null,
			plannedChairId: item.plannedChairId ?? null,
			notes: item.notes ?? null,
		})),
		treatmentPlanItemSchema,
		"treatmentPlanItems",
		report,
	);
}

export function extractImagingStudies(
	imagingRows: Array<typeof schema.imagingStudies.$inferSelect>,
	report: DomainStateHydrationReport,
): ImagingStudy[] {
	return collect<ImagingStudy>(
		imagingRows.map((study) => ({
			id: study.id,
			organizationId: study.organizationId,
			patientId: study.patientId,
			visitId: study.visitId ?? null,
			kind: study.kind,
			title: study.title,
			toothCode: study.toothCode ?? null,
			region: study.region ?? null,
			capturedAt: isoOrSkipRow(
				study.capturedAt,
				"imaging_studies",
				study.id,
				"captured_at",
				report,
			),
			sourceKind: study.sourceKind,
			sourceName: study.sourceName,
			storagePath: study.storagePath ?? null,
			dicomStudyUid: study.dicomStudyUid ?? null,
			status: study.status,
			aiSummary: study.aiSummary ?? null,
			previewUrl: browserRenderableImageMimeType(study.storagePath)
				? `/api/imaging/studies/${study.id}/file`
				: `/api/imaging/studies/${study.id}/preview.svg`,
			viewerUrl: browserRenderableImageMimeType(study.storagePath)
				? `/api/imaging/studies/${study.id}/file`
				: `/api/imaging/studies/${study.id}/preview.svg`,
		})),
		imagingStudySchema,
		"imagingStudies",
		report,
	);
}

export function extractClinicalRules(
	ruleRows: Array<typeof schema.clinicalRules.$inferSelect>,
	report: DomainStateHydrationReport,
): ClinicalRule[] {
	return collect<ClinicalRule>(
		ruleRows.map((rule) => ({
			id: rule.id,
			organizationId: rule.organizationId,
			title: rule.title,
			category: rule.category,
			specialty: rule.specialty,
			action: rule.action,
			severity: rule.severity,
			ownerRole: staffRoleSchema.catch("doctor").parse(rule.ownerRole),
			triggerServiceIds: parseJsonArray(rule.triggerServiceIdsJson),
			requiredServiceIds: parseJsonArray(rule.requiredServiceIdsJson),
			requiresCompletedServiceIds: parseJsonArray(
				rule.requiresCompletedServiceIdsJson,
			),
			blockedServiceIds: parseJsonArray(rule.blockedServiceIdsJson),
			condition: rule.condition ?? null,
			warningText: rule.warningText,
			patientText: rule.patientText,
			active: rule.isActive,
		})),
		clinicalRuleSchema,
		"clinicalRules",
		report,
	);
}

export function extractProtocolTemplates(
	protocolRows: Array<typeof schema.protocolTemplates.$inferSelect>,
	report: DomainStateHydrationReport,
): ProtocolTemplate[] {
	return collect<ProtocolTemplate>(
		protocolRows.map((template) => ({
			id: template.id,
			organizationId: template.organizationId,
			specialty: template.specialty,
			title: template.title,
			visitReason: template.visitReason,
			defaultDurationMinutes: Math.max(1, template.defaultDurationMinutes),
			complaintPrompt: template.complaintPrompt,
			objectiveTemplate: template.objectiveTemplate,
			diagnosisHints: parseJsonArray(template.diagnosisHints),
			treatmentPlanTemplate: template.treatmentPlanTemplate,
			requiredDocuments: parseJsonArray(template.requiredDocuments),
			suggestedImaging: parseJsonArray(template.suggestedImaging),
			safetyWarnings: parseJsonArray(template.safetyWarnings),
			updatedAt: isoOrSkipRow(
				template.updatedAt,
				"protocol_templates",
				template.id,
				"updated_at",
				report,
			),
		})),
		protocolTemplateSchema,
		"protocolTemplates",
		report,
	);
}
