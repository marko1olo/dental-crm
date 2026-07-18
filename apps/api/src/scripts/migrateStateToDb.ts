import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { client, db } from "../db/client.js";
import * as schema from "../db/schema.js";

// We will read the actual saved state, or fallback to the sample data
import { loadPersistentState } from "../persistentState.js";
import { hashCredential } from "../utils/cryptoHelper.js";

function destructiveResetAllowed(): boolean {
	return process.env.DENTAL_ALLOW_DESTRUCTIVE_DB_RESET === "YES";
}

async function clearDatabase() {
	if (!destructiveResetAllowed()) {
		throw new Error(
			"Refusing to truncate database. Set DENTAL_ALLOW_DESTRUCTIVE_DB_RESET=YES and use a local/dev DATABASE_URL.",
		);
	}
	console.log("🧹 Clearing existing data...");
	await db.execute(sql`TRUNCATE TABLE organizations CASCADE;`);
	console.log("✔ Database cleared.");
}

async function migrate() {
	console.log("🚀 Starting DB Migration from JSON State...");
	const state = loadPersistentState() as any;
	if (!state) {
		console.error("❌ Could not load JSON state.");
		process.exit(1);
	}

	await clearDatabase();

	const orgId = state.clinicProfile.organizationId;
	const clinicLogin = process.env.CLINIC_LOGIN ?? "clinic@example.com";
	const clinicPassword = process.env.CLINIC_PASSWORD ?? "dente2026";
	const adminPin = process.env.ADMIN_PIN ?? "0000";
	const staffPin = process.env.STAFF_PIN ?? "1234";

	console.log(`\n🏢 Migrating Organization: ${state.clinicProfile.clinicName}`);
	await db.insert(schema.organizations).values({
		id: orgId,
		name: state.clinicProfile.clinicName,
		loginId: clinicLogin,
		passwordHash: hashCredential(clinicPassword),
		inn: state.clinicProfile.inn,
		kpp: state.clinicProfile.kpp,
		ogrn: state.clinicProfile.ogrn,
		legalAddress: state.clinicProfile.address,
		email: state.clinicProfile.email,
		website: state.clinicProfile.website,
		bankDetails: state.clinicProfile.bankDetails,
		signatoryName: state.clinicProfile.signatoryName,
		signatoryTitle: state.clinicProfile.signatoryTitle,
		medicalLicenseNumber: state.clinicProfile.medicalLicenseNumber,
		medicalLicenseIssuedAt: state.clinicProfile.medicalLicenseIssuedAt,
		medicalLicenseIssuer: state.clinicProfile.medicalLicenseIssuer,
		onboardingCompleted: true,
		// Explicitly copy over feature flags to avoid database defaults overlay issues
		hasAssistants: state.clinicProfile.hasAssistants ?? true,
		hasMultipleChairs: state.clinicProfile.hasMultipleChairs ?? true,
		hasDentalLab: state.clinicProfile.hasDentalLab ?? true,
		hasInsuranceCoPay: state.clinicProfile.hasInsuranceCoPay ?? true,
		hasInstallments: state.clinicProfile.hasInstallments ?? true,
		hasOrthodontics: state.clinicProfile.hasOrthodontics ?? true,
		hasTasks: state.clinicProfile.hasTasks ?? true,
		hasReclamations: state.clinicProfile.hasReclamations ?? true,
		hasPediatricMode: state.clinicProfile.hasPediatricMode ?? false,
		isOmniRole: state.clinicProfile.isOmniRole ?? false,
		workspacePreset: state.clinicProfile.workspacePreset ?? "enterprise",
		hasPayrollModule: state.clinicProfile.hasPayrollModule ?? true,
		hasMarketingModule: state.clinicProfile.hasMarketingModule ?? true,
		hasAnalyticsModule: state.clinicProfile.hasAnalyticsModule ?? true,
		hasInventoryModule: state.clinicProfile.hasInventoryModule ?? true,
		aiEnableTreatmentPlan: state.clinicProfile.aiEnableTreatmentPlan ?? true,
		aiEnableRecommendations: state.clinicProfile.aiEnableRecommendations ?? true,
		aiEnableDocuments: state.clinicProfile.aiEnableDocuments ?? true,
	});

	console.log("🏥 Migrating Clinics (Default)");
	await db.insert(schema.clinics).values({
		id: "e50337ad-f762-4f3b-8255-a2267576be78", // static default clinic id
		organizationId: orgId,
		name: "Основная клиника",
		address: state.clinicProfile.address,
		phone: state.clinicProfile.phone,
		timezone: state.clinicProfile.timezone,
	});

	console.log(
		`👥 Migrating ${state.staffMembers.length} Staff Members (Users)...`,
	);
	for (const staff of state.staffMembers) {
		const isAdmin = staff.role === "owner" || staff.role === "administrator";
		const pin = isAdmin ? adminPin : staffPin;
		await db.insert(schema.users).values({
			id: staff.id,
			organizationId: orgId,
			fullName: staff.fullName,
			role: staff.role,
			phone: staff.phone,
			email: staff.email,
			pinCodeHash: hashCredential(pin),
			isActive: staff.active,
			createdAt: new Date(staff.createdAt),
		});
	}

	console.log(`🪑 Migrating ${state.chairs.length} Chairs...`);
	for (const chair of state.chairs) {
		await db.insert(schema.clinicChairs).values({
			id: chair.id,
			organizationId: orgId,
			clinicId: "e50337ad-f762-4f3b-8255-a2267576be78",
			name: chair.name,
			isActive: chair.active,
		});
	}

	console.log(`🧑‍⚕️ Migrating ${state.patients.length} Patients...`);
	for (const patient of state.patients) {
		await db.insert(schema.patients).values({
			id: patient.id,
			organizationId: orgId,
			status: patient.status as any,
			fullName: patient.fullName,
			birthDate: patient.birthDate,
			phone: patient.phone,
			email: patient.email,
			notes: patient.notes,
			administrativeProfile: patient.administrativeProfile,
			createdAt: new Date(patient.createdAt),
			updatedAt: new Date(patient.updatedAt),
		});
	}

	console.log(`📅 Migrating ${state.appointments.length} Appointments...`);
	for (const appt of state.appointments) {
		await db.insert(schema.appointments).values({
			id: appt.id,
			organizationId: orgId,
			patientId: appt.patientId,
			doctorUserId: appt.doctorUserId,
			assistantUserId: appt.assistantUserId,
			chairId: appt.chairId,
			status: appt.status as any,
			startsAt: new Date(appt.startsAt),
			endsAt: new Date(appt.endsAt),
			reason: appt.reason,
			comment: appt.comment,
		});
	}

	if (state.activeVisit) {
		console.log(`🩺 Migrating active visit...`);
		await db.insert(schema.visits).values({
			id: state.activeVisit.id,
			organizationId: orgId,
			patientId: state.activeVisit.patientId,
			appointmentId: state.activeVisit.appointmentId,
			status: state.activeVisit.status as any,
			revision: state.activeVisit.revision,
			complaint: state.activeVisit.complaint,
			anamnesis: state.activeVisit.anamnesis,
			objectiveStatus: state.activeVisit.objectiveStatus,
			diagnosis: state.activeVisit.diagnosis,
			treatmentPlan: state.activeVisit.treatmentPlan,
			doctorSummary: state.activeVisit.doctorSummary,
			signedAt: state.activeVisit.signedAt
				? new Date(state.activeVisit.signedAt)
				: null,
			createdAt: new Date(state.activeVisit.createdAt),
			updatedAt: new Date(state.activeVisit.updatedAt),
		});
	}

	console.log(`📄 Migrating ${state.documents.length} Documents...`);
	for (const doc of state.documents) {
		await db.insert(schema.generatedDocuments).values({
			id: doc.id,
			organizationId: orgId,
			patientId: doc.patientId,
			visitId: doc.visitId,
			kind: doc.kind as any,
			status: doc.status as any,
			title: doc.title || "Документ",
			totalAmountRub: doc.totalAmountRub || null,
			payloadJson: doc.payload ? JSON.stringify(doc.payload) : null,
			issuedAt: doc.issuedAt ? new Date(doc.issuedAt) : null,
			createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
		});
	}

	console.log(`⚖️ Migrating ${state.clinicalRules.length} Clinical Rules...`);
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	for (const rule of state.clinicalRules) {
		const isUuid = typeof rule.id === "string" && uuidRegex.test(rule.id);
		await db.insert(schema.clinicalRules).values({
			...(isUuid ? { id: rule.id } : {}),
			organizationId: orgId,
			title: rule.title,
			category: rule.category as any,
			specialty: rule.specialty as any,
			action: rule.action as any,
			severity: rule.severity as any,
			ownerRole: rule.ownerRole,
			triggerServiceIdsJson: JSON.stringify(rule.triggerServiceIds),
			requiredServiceIdsJson: JSON.stringify(rule.requiredServiceIds),
			requiresCompletedServiceIdsJson: JSON.stringify(
				rule.requiresCompletedServiceIds,
			),
			blockedServiceIdsJson: JSON.stringify(rule.blockedServiceIds),
			condition: rule.condition,
			warningText: rule.warningText,
			patientText: rule.patientText,
			isActive: rule.active,
			createdAt: rule.createdAt ? new Date(rule.createdAt) : new Date(),
			updatedAt: rule.updatedAt ? new Date(rule.updatedAt) : new Date(),
		});
	}

	console.log("📋 Seeding dummy treatment plans for analytics...");
	const treatmentPlanStatusOptions = ["Draft", "Active", "Completed"];
	for (let i = 0; i < state.patients.length; i++) {
		const patient = state.patients[i];
		await db.insert(schema.treatmentPlans).values({
			patientId: patient.id,
			name: `План лечения для ${patient.fullName}`,
			status: treatmentPlanStatusOptions[i % treatmentPlanStatusOptions.length] as any,
			totalPrice: "150000.00",
		});
	}

	console.log(`💳 Migrating ${state.payments.length} Payments...`);
	for (const p of state.payments) {
		await db.insert(schema.payments).values({
			id: p.id,
			organizationId: orgId,
			patientId: p.patientId,
			visitId: p.visitId,
			documentId: p.documentId,
			amountRub: p.amountRub,
			method: p.method as any,
			status: p.status as any,
			paidAt: new Date(p.paidAt),
			fiscalReceiptNumber: p.fiscalReceiptNumber,
			fiscalReceiptIssuedAt: p.fiscalReceiptIssuedAt,
			fiscalReceiptUrl: p.fiscalReceiptUrl,
			fiscalReceipt: p.fiscalReceipt,
			payerFullName: p.payerFullName,
			payerInn: p.payerInn,
			payerBirthDate: p.payerBirthDate,
			payerIdentityDocument: p.payerIdentityDocument,
			payerRelationship: p.payerRelationship,
			taxDeductionCode: p.taxDeductionCode,
			note: p.note,
		});
	}

	console.log("\n🎉 Migration completed successfully!");
	console.log(
		"   Make sure you have run 'npm run db:migrate' first to create the tables.\n",
	);
}

migrate()
	.then(async () => {
		await client.close();
		process.exit(0);
	})
	.catch(async (e) => {
		console.error("❌ Migration error:", e);
		try {
			await client.close();
		} catch {}
		process.exit(1);
	});
