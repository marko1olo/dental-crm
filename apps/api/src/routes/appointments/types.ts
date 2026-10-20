import type {
	createAppointmentSchema,
	updateAppointmentSchema,
} from "@dental/shared";
import type { z } from "zod";
import type { getAppointmentByIdInDb } from "../../db/appointmentsQuery.js";
import type { db } from "../../db/client.js";
import type {
	AppointmentMutationCode,
	AppointmentRejectionReason,
	AppointmentRejectionResponse,
} from "../appointmentErrors.js";

export type {
	AppointmentMutationCode,
	AppointmentRejectionReason,
	AppointmentRejectionResponse,
};

export type DbClientOrTransaction =
	| typeof db
	| Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AppointmentIdParams = {
	appointmentId: string;
};

export type AppointmentOptionalIdParams = {
	appointmentId?: string;
};

export type AppointmentConflictContext = {
	orgId: string;
	doctorUserId?: string | null;
	chairId?: string | null;
	startsAt: Date | string;
	endsAt?: Date | string | null;
};

export type ExistingAppointmentRecord = NonNullable<
	Awaited<ReturnType<typeof getAppointmentByIdInDb>>
>;

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
