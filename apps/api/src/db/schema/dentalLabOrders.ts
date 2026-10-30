import { relations } from "drizzle-orm";
import { organizations, users } from "./auth.js";
import { patients } from "./patients.js";
import {
	labItems,
	labOrders,
} from "./clinical/clinicalRulesModules/clinicalProtocolsTables.js";

export {
	labItems,
	labOrders,
} from "./clinical/clinicalRulesModules/clinicalProtocolsTables.js";

export const labOrdersRelations = relations(labOrders, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [labOrders.organizationId],
		references: [organizations.id],
	}),
	patient: one(patients, {
		fields: [labOrders.patientId],
		references: [patients.id],
	}),
	doctor: one(users, {
		fields: [labOrders.doctorId],
		references: [users.id],
	}),
	items: many(labItems),
}));

export const labItemsRelations = relations(labItems, ({ one }) => ({
	organization: one(organizations, {
		fields: [labItems.organizationId],
		references: [organizations.id],
	}),
	order: one(labOrders, {
		fields: [labItems.labOrderId],
		references: [labOrders.id],
	}),
}));
