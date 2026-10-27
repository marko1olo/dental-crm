import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";
import { UUID_SHAPE } from "../../dicomwebHelpers.js";
import { matchPatientForDicom } from "../../imaging/patientFioBindingEngine.js";

export interface ResolvedStowBinding {
	resolvedPatientId: string | null;
	matchMethod: string;
	bindingStatus: "auto_bound" | "manual_bound" | "pending_review" | "unassigned";
	bindingConfidence: number;
	matchDetailsText: string;
}

export async function resolveStowBinding(
	organizationId: string,
	explicitPatientId: string | null,
	parsed: { dicomPatientName?: string | null; dicomPatientId?: string | null; dicomBirthDate?: string | null },
): Promise<ResolvedStowBinding> {
	if (explicitPatientId && UUID_SHAPE.test(explicitPatientId.trim())) {
		const [found] = await db
			.select({ id: schema.patients.id, mergedIntoPatientId: schema.patients.mergedIntoPatientId, fullName: schema.patients.fullName })
			.from(schema.patients)
			.where(and(eq(schema.patients.organizationId, organizationId), eq(schema.patients.id, explicitPatientId.trim())))
			.limit(1);

		if (found) {
			return {
				resolvedPatientId: found.mergedIntoPatientId ?? found.id,
				matchMethod: "explicit",
				bindingStatus: "manual_bound",
				bindingConfidence: 100,
				matchDetailsText: `Явная привязка по параметру patientId к ${found.fullName}`,
			};
		}
	}

	const autoBindRes = await matchPatientForDicom(organizationId, {
		dicomPatientName: parsed.dicomPatientName,
		dicomPatientId: parsed.dicomPatientId,
		dicomBirthDate: parsed.dicomBirthDate,
	});

	return {
		resolvedPatientId: autoBindRes.patientId,
		matchMethod: autoBindRes.matchMethod,
		bindingStatus: autoBindRes.status,
		bindingConfidence: autoBindRes.confidence,
		matchDetailsText: autoBindRes.matchDetails,
	};
}
