import { relations } from "drizzle-orm";
import { clinics, organizations, users } from "../auth.js";
import { generatedDocuments, visits } from "../clinical.js";
import { patients } from "../patients.js";
import { appointments } from "../schedule.js";
import {
	communicationOutbox,
	communicationTasks,
	communicationTemplates,
	patientCommunicationConsents,
} from "./campaignsSchema.js";
import { denteTelegramBotConfigs } from "./channelsSchema.js";
import {
	communicationEvents,
	crmLeadStageHistory,
	crmLeads,
	denteTelegramOutboxDeliveryReceipts,
} from "./messagesSchema.js";

export const communicationTemplatesRelations = relations(
	communicationTemplates,
	({ one, many }) => ({
		organization: one(organizations, {
			fields: [communicationTemplates.organizationId],
			references: [organizations.id],
		}),
		clinic: one(clinics, {
			fields: [communicationTemplates.clinicId],
			references: [clinics.id],
		}),
		outboxMessages: many(communicationOutbox),
	}),
);

export const communicationTasksRelations = relations(
	communicationTasks,
	({ one, many }) => ({
		organization: one(organizations, {
			fields: [communicationTasks.organizationId],
			references: [organizations.id],
		}),
		clinic: one(clinics, {
			fields: [communicationTasks.clinicId],
			references: [clinics.id],
		}),
		patient: one(patients, {
			fields: [communicationTasks.patientId],
			references: [patients.id],
		}),
		appointment: one(appointments, {
			fields: [communicationTasks.appointmentId],
			references: [appointments.id],
		}),
		visit: one(visits, {
			fields: [communicationTasks.visitId],
			references: [visits.id],
		}),
		document: one(generatedDocuments, {
			fields: [communicationTasks.documentId],
			references: [generatedDocuments.id],
		}),
		events: many(communicationEvents),
		outboxMessages: many(communicationOutbox),
	}),
);

export const communicationEventsRelations = relations(
	communicationEvents,
	({ one, many }) => ({
		organization: one(organizations, {
			fields: [communicationEvents.organizationId],
			references: [organizations.id],
		}),
		clinic: one(clinics, {
			fields: [communicationEvents.clinicId],
			references: [clinics.id],
		}),
		task: one(communicationTasks, {
			fields: [communicationEvents.taskId],
			references: [communicationTasks.id],
		}),
		patient: one(patients, {
			fields: [communicationEvents.patientId],
			references: [patients.id],
		}),
		actorUser: one(users, {
			fields: [communicationEvents.actorUserId],
			references: [users.id],
		}),
		deliveryReceipts: many(denteTelegramOutboxDeliveryReceipts),
	}),
);

export const communicationOutboxRelations = relations(
	communicationOutbox,
	({ one }) => ({
		organization: one(organizations, {
			fields: [communicationOutbox.organizationId],
			references: [organizations.id],
		}),
		clinic: one(clinics, {
			fields: [communicationOutbox.clinicId],
			references: [clinics.id],
		}),
		patient: one(patients, {
			fields: [communicationOutbox.patientId],
			references: [patients.id],
		}),
		task: one(communicationTasks, {
			fields: [communicationOutbox.taskId],
			references: [communicationTasks.id],
		}),
		template: one(communicationTemplates, {
			fields: [communicationOutbox.templateId],
			references: [communicationTemplates.id],
		}),
	}),
);

export const crmLeadsRelations = relations(crmLeads, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [crmLeads.organizationId],
		references: [organizations.id],
	}),
	assignedDoctor: one(users, {
		fields: [crmLeads.assignedDoctorId],
		references: [users.id],
	}),
	stageHistory: many(crmLeadStageHistory),
}));

export const crmLeadStageHistoryRelations = relations(
	crmLeadStageHistory,
	({ one }) => ({
		organization: one(organizations, {
			fields: [crmLeadStageHistory.organizationId],
			references: [organizations.id],
		}),
		lead: one(crmLeads, {
			fields: [crmLeadStageHistory.leadId],
			references: [crmLeads.id],
		}),
		changedByUser: one(users, {
			fields: [crmLeadStageHistory.changedByUserId],
			references: [users.id],
		}),
	}),
);

export const patientCommunicationConsentsRelations = relations(
	patientCommunicationConsents,
	({ one }) => ({
		organization: one(organizations, {
			fields: [patientCommunicationConsents.organizationId],
			references: [organizations.id],
		}),
		patient: one(patients, {
			fields: [patientCommunicationConsents.patientId],
			references: [patients.id],
		}),
		decidedByUser: one(users, {
			fields: [patientCommunicationConsents.decidedByUserId],
			references: [users.id],
		}),
	}),
);

export const denteTelegramBotConfigsRelations = relations(
	denteTelegramBotConfigs,
	({ one }) => ({
		organization: one(organizations, {
			fields: [denteTelegramBotConfigs.organizationId],
			references: [organizations.id],
		}),
		clinic: one(clinics, {
			fields: [denteTelegramBotConfigs.clinicId],
			references: [clinics.id],
		}),
	}),
);

export const denteTelegramOutboxDeliveryReceiptsRelations = relations(
	denteTelegramOutboxDeliveryReceipts,
	({ one }) => ({
		organization: one(organizations, {
			fields: [denteTelegramOutboxDeliveryReceipts.organizationId],
			references: [organizations.id],
		}),
		clinic: one(clinics, {
			fields: [denteTelegramOutboxDeliveryReceipts.clinicId],
			references: [clinics.id],
		}),
		task: one(communicationTasks, {
			fields: [denteTelegramOutboxDeliveryReceipts.taskId],
			references: [communicationTasks.id],
		}),
		event: one(communicationEvents, {
			fields: [denteTelegramOutboxDeliveryReceipts.eventId],
			references: [communicationEvents.id],
		}),
	}),
);
