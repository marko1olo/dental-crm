import type { StaffRole } from "@dental/shared";
import { sql } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import {
	clinicalRuleAction,
	clinicalRuleSeverity,
	clinicalTaskStatus,
	dentalSpecialty,
	serviceCategory,
} from "../_common.js";
import { organizations, users } from "../auth.js";
import { patients } from "../patients.js";
import { treatmentPlans } from "./treatmentPlansSchema.js";
import { visits } from "./visitsSchema.js";

export const clinicalTasks = pgTable(
	"clinical_tasks",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		treatmentPlanId: uuid("treatment_plan_id").references(
			() => treatmentPlans.id,
		),
		assignedDoctorId: uuid("assigned_doctor_id").references(() => users.id),
		taskType: text("task_type").notNull(),
		status: clinicalTaskStatus("status").notNull().default("pending"),
		title: text("title").notNull(),
		description: text("description"),
		dueAt: timestamp("due_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("clinical_tasks_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("clinical_tasks_patientId_idx").on(t.patientId),
		assignedDoctorIdIdx: index("clinical_tasks_assigned_doctor_id_idx").on(
			t.assignedDoctorId,
		),
		treatmentPlanIdIdx: index("clinical_tasks_treatment_plan_id_idx").on(
			t.treatmentPlanId,
		),
	}),
);

export const clinicalRules = pgTable(
	"clinical_rules",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		title: text("title").notNull(),
		category: serviceCategory("category").notNull().default("other"),
		specialty: dentalSpecialty("specialty").notNull().default("universal"),
		action: clinicalRuleAction("action").notNull(),
		severity: clinicalRuleSeverity("severity").notNull().default("warning"),
		ownerRole: text("owner_role").$type<StaffRole>().notNull(),
		triggerServiceIdsJson: text("trigger_service_ids_json")
			.notNull()
			.default("[]"),
		requiredServiceIdsJson: text("required_service_ids_json")
			.notNull()
			.default("[]"),
		requiresCompletedServiceIdsJson: text("requires_completed_service_ids_json")
			.notNull()
			.default("[]"),
		blockedServiceIdsJson: text("blocked_service_ids_json")
			.notNull()
			.default("[]"),
		condition: text("condition"),
		warningText: text("warning_text").notNull(),
		patientText: text("patient_text").notNull(),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("clinical_rules_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// lab orders (dental laboratory work)
export const labOrders = pgTable(
	"lab_orders",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		doctorId: uuid("doctor_id"),
		doctorName: text("doctor_name"),
		secureToken: text("secure_token").notNull().unique(),
		toothFdi: text("tooth_fdi"),
		material: text("material"),
		colorVita: text("color_vita"),
		/**
		 * Статус заказа ЗТЛ. Значения ограничены миграцией 0042
		 * CHECK-ограничением; произвольные строки не пройдут.
		 *
		 * Переходы: draft → sent → in_progress → shipped → received →
		 *           refitting → completed. Из любого состояния → cancelled.
		 * Закрытые состояния (completed, cancelled) не могут быть открыты назад.
		 */
		status: text("status").notNull().default("draft"),
		dueDate: timestamp("due_date", { withTimezone: true }),
		clinicalNotes: text("clinical_notes"),
		labComments: text("lab_comments"),
		attachedImageUrl: text("attached_image_url"),
		priceRub: numeric("price_rub", { precision: 12, scale: 2, mode: "number" }),
		/** Статус сдачи и намертво блокировки installed (StomX Bible раздел 8) */
		isLockedInstalled: boolean("is_locked_installed").notNull().default(false),
		installedAt: timestamp("installed_at", { withTimezone: true }),
		paidFromCashOperationId: uuid("paid_from_cash_operation_id"),
		/** Временны́е метки жизненного цикла заказа для аудита. */
		sentAt: timestamp("sent_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("lab_orders_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("lab_orders_patientId_idx").on(t.patientId),
		doctorIdIdx: index("lab_orders_doctor_id_idx").on(t.doctorId),
		statusIdx: index("lab_orders_status_idx").on(t.organizationId, t.status),
	}),
);

// ─── CAD/CAM Restorations & Dental Laboratory Events ─────────────────────────

export const labItems = pgTable(
	"lab_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		labOrderId: uuid("lab_order_id")
			.notNull()
			.references(() => labOrders.id, { onDelete: "cascade" }),
		toothFdi: integer("tooth_fdi").notNull(),
		restorationType: text("restoration_type").notNull().default("crown_monolithic"),
		material: text("material").notNull().default("zirconia_multilayer_gradient"),
		shadeSystem: text("shade_system").notNull().default("VITA_CLASSICAL"),
		shadeFinal: text("shade_final").notNull().default("A2"),
		shadeStump: text("shade_stump"), // ND1..ND9
		shadeGingiva: text("shade_gingiva"),
		translucencyLevel: text("translucency_level").default("HT"),
		cementGapMicrons: integer("cement_gap_microns").default(30),
		extraMarginGapMicrons: integer("extra_margin_gap_microns").default(10),
		minimalThicknessMm: numeric("minimal_thickness_mm", {
			precision: 4,
			scale: 2,
		}).default("0.60"),
		implantSystem: text("implant_system"),
		implantPlatformDiameterMm: numeric("implant_platform_diameter_mm", {
			precision: 4,
			scale: 2,
		}),
		tiBaseHeightMm: numeric("ti_base_height_mm", { precision: 4, scale: 2 }),
		meshTriangleCount: integer("mesh_triangle_count"),
		meshSurfaceAreaMm2: numeric("mesh_surface_area_mm2", {
			precision: 10,
			scale: 2,
		}),
		meshVolumeMm3: numeric("mesh_volume_mm3", { precision: 10, scale: 2 }),
		meshBboxMm: jsonb("mesh_bbox_mm"),
		isManifold: boolean("is_manifold").default(true),
		priceRub: numeric("price_rub", { precision: 12, scale: 2 }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("lab_items_org_idx").on(t.organizationId),
		orderIdx: index("lab_items_order_idx").on(t.labOrderId),
		toothIdx: index("lab_items_tooth_idx").on(t.toothFdi),
	}),
);

export const labOrderEvents = pgTable(
	"lab_order_events",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		labOrderId: uuid("lab_order_id")
			.notNull()
			.references(() => labOrders.id, { onDelete: "cascade" }),
		milestone: text("milestone").notNull(),
		actorType: text("actor_type").notNull().default("clinic_doctor"),
		actorId: uuid("actor_id"),
		actorName: text("actor_name").notNull(),
		notes: text("notes"),
		barcodeScanned: text("barcode_scanned"),
		photoUrls: jsonb("photo_urls").notNull().default(sql`'[]'::jsonb`),
		cadPreviewGlbUrl: text("cad_preview_glb_url"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("lab_order_events_org_idx").on(t.organizationId),
		orderIdx: index("lab_order_events_order_idx").on(t.labOrderId),
		createdAtIdx: index("lab_order_events_created_at_idx").on(t.createdAt),
	}),
);

// ─── Dental Implantology, Osseointegration & RFA (ISQ) Biomechanics ─────────

export const implantCatalogItems = pgTable(
	"implant_catalog_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		brand: text("brand").notNull().default("osstem"),
		lineName: text("line_name").notNull(), // e.g. "TS III SA", "BLX", "Active"
		platformDiameterMm: numeric("platform_diameter_mm", {
			precision: 4,
			scale: 2,
		}).notNull(),
		bodyDiameterMm: numeric("body_diameter_mm", {
			precision: 4,
			scale: 2,
		}).notNull(),
		lengthMm: numeric("length_mm", { precision: 4, scale: 2 }).notNull(),
		connectionType: text("connection_type")
			.notNull()
			.default("conical_morse_taper"),
		recommendedMaxTorqueNcm: integer("recommended_max_torque_ncm")
			.notNull()
			.default(45),
		smartpegType: text("smartpeg_type").notNull().default("Type 04"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgBrandIdx: index("implant_catalog_items_org_brand_idx").on(
			t.organizationId,
			t.brand,
		),
	}),
);

export const patientImplantInstallations = pgTable(
	"patient_implant_installations",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		surgeonDoctorId: uuid("surgeon_doctor_id").references(() => users.id, {
			onDelete: "set null",
		}),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		catalogItemId: uuid("catalog_item_id").references(
			() => implantCatalogItems.id,
			{ onDelete: "set null" },
		),
		toothNumberFdi: integer("tooth_number_fdi").notNull(),
		installedAt: timestamp("installed_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		implantBrand: text("implant_brand").notNull().default("osstem"),
		implantDiameterMm: numeric("implant_diameter_mm", {
			precision: 4,
			scale: 2,
		}).notNull(),
		implantLengthMm: numeric("implant_length_mm", {
			precision: 4,
			scale: 2,
		}).notNull(),
		lotNumber: text("lot_number"),
		serialNumber: text("serial_number"),
		boneDensityClass: text("bone_density_class").notNull().default("D2"),
		averageHounsfieldUnits: numeric("average_hounsfield_units", {
			precision: 6,
			scale: 1,
		}),
		finalInsertionTorqueNcm: numeric("final_insertion_torque_ncm", {
			precision: 5,
			scale: 2,
		}).notNull(),
		baselineIsq: integer("baseline_isq").notNull().default(70),
		initialProtocol: text("initial_protocol")
			.notNull()
			.default("delayed_loading"),
		corticalTapUsed: boolean("cortical_tap_used").notNull().default(false),
		underdrillingUsed: boolean("underdrilling_used").notNull().default(false),
		boneGraftMaterial: text("bone_graft_material"),
		membraneUsed: text("membrane_used"),
		torqueCurveSamplesJson: text("torque_curve_samples_json")
			.notNull()
			.default("[]"),
		notes: text("notes"),
		isArchived: boolean("is_archived").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPatientIdx: index("patient_implant_installations_org_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
		patientToothIdx: index(
			"patient_implant_installations_patient_tooth_idx",
		).on(t.patientId, t.toothNumberFdi),
	}),
);

export const implantIsqMeasurements = pgTable(
	"implant_isq_measurements",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		installationId: uuid("installation_id")
			.notNull()
			.references(() => patientImplantInstallations.id, {
				onDelete: "cascade",
			}),
		measuredByDoctorId: uuid("measured_by_doctor_id").references(
			() => users.id,
			{ onDelete: "set null" },
		),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		measuredAt: timestamp("measured_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		daysPostOp: integer("days_post_op").notNull().default(0),
		isqMesiodistal: integer("isq_mesiodistal").notNull(),
		isqBuccolingual: integer("isq_buccolingual").notNull(),
		isqDistopalatal: integer("isq_distopalatal"),
		isqMean: numeric("isq_mean", { precision: 5, scale: 2 }).notNull(),
		isqAnisotropyDelta: integer("isq_anisotropy_delta").notNull().default(0),
		stabilityStatus: text("stability_status")
			.notNull()
			.default("primary_mechanical_adequate"),
		recommendedLoadingDecision: text("recommended_loading_decision").notNull(),
		isBiologicalDipDetected: boolean("is_biological_dip_detected")
			.notNull()
			.default(false),
		smartpegCode: text("smartpeg_code"),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgInstallationIdx: index("implant_isq_measurements_org_install_idx").on(
			t.organizationId,
			t.installationId,
		),
		measuredAtIdx: index("implant_isq_measurements_measured_at_idx").on(
			t.installationId,
			t.measuredAt,
		),
	}),
);

// insurance contracts (DMS / voluntary health insurance)
export const insuranceContracts = pgTable(
	"insurance_contracts",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		companyName: text("company_name").notNull(),
		policyNumberMask: text("policy_number_mask"),
		coverageTherapyPct: numeric("coverage_therapy_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		coverageSurgeryPct: numeric("coverage_surgery_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		coverageOrthoPct: numeric("coverage_ortho_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		coverageHygienePct: numeric("coverage_hygiene_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		annualLimitRub: numeric("annual_limit_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("insurance_contracts_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// DMS guarantee letters (Гарантийные письма ДМС)
export const dmsGuaranteeLetters = pgTable(
	"dms_guarantee_letters",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		contractId: uuid("contract_id").references(() => insuranceContracts.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		patientFullName: text("patient_full_name").notNull(),
		patientBirthDate: text("patient_birth_date"),
		policyNumber: text("policy_number").notNull(),
		insurerKey: text("insurer_key").notNull().default("custom"),
		insurerName: text("insurer_name").notNull(),
		letterNumber: text("letter_number").notNull(),
		issueDate: text("issue_date").notNull(),
		validFrom: text("valid_from").notNull(),
		validUntil: text("valid_until").notNull(),
		maxCoverageRub: numeric("max_coverage_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
		usedAmountRub: numeric("used_amount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		franchisePct: numeric("franchise_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		franchiseType: text("franchise_type").notNull().default("percent"),
		franchiseFixedRub: numeric("franchise_fixed_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		programExclusions: jsonb("program_exclusions")
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		approvedServiceCodes: jsonb("approved_service_codes")
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		approvedTeethFdi: jsonb("approved_teeth_fdi")
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		approvedDiagnosisCodes: jsonb("approved_diagnosis_codes")
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		curatorFullName: text("curator_full_name"),
		curatorPhone: text("curator_phone"),
		notes: text("notes").notNull().default(""),
		status: text("status").notNull().default("active"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("dms_guarantee_letters_organization_id_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("dms_guarantee_letters_patient_id_idx").on(
			t.patientId,
		),
		statusIdx: index("dms_guarantee_letters_status_idx").on(t.status),
		letterNumberIdx: index("dms_guarantee_letters_letter_number_idx").on(
			t.organizationId,
			t.letterNumber,
		),
	}),
);

// ─── Anesthesia & Vital Signs Monitoring Logs ────────────────────────────────

export const anesthesiaLogs = pgTable(
	"anesthesia_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		doctorId: uuid("doctor_id").references(() => users.id, {
			onDelete: "set null",
		}),
		technique: text("technique").notNull().default("infiltration"),
		drug: text("drug").notNull().default("articaine"),
		drugBrandName: text("drug_brand_name").notNull().default("Ультракаин Д-С"),
		concentrationPct: numeric("concentration_pct", { precision: 4, scale: 2 })
			.notNull()
			.default("4.00"),
		vasoconstrictor: text("vasoconstrictor").notNull().default("1:200000"),
		carpuleVolumeMl: numeric("carpule_volume_ml", { precision: 4, scale: 2 })
			.notNull()
			.default("1.70"),
		carpulesAdministered: numeric("carpules_administered", {
			precision: 4,
			scale: 2,
		})
			.notNull()
			.default("1.00"),
		totalDoseMg: numeric("total_dose_mg", { precision: 6, scale: 2 }).notNull(),
		maxAllowedDoseMg: numeric("max_allowed_dose_mg", {
			precision: 6,
			scale: 2,
		}).notNull(),
		epinephrineMg: numeric("epinephrine_mg", { precision: 6, scale: 4 })
			.notNull()
			.default("0.0000"),
		maxEpinephrineMg: numeric("max_epinephrine_mg", {
			precision: 6,
			scale: 4,
		})
			.notNull()
			.default("0.2000"),
		aspirationTestPositive: boolean("aspiration_test_positive")
			.notNull()
			.default(false),
		toothNumbers: jsonb("tooth_numbers").notNull().default(sql`'[]'::jsonb`),
		injectionSite: text("injection_site"),
		lotNumber: text("lot_number"),
		expirationDate: date("expiration_date"),
		vitalsPre: jsonb("vitals_pre"),
		vitalsIntra: jsonb("vitals_intra"),
		vitalsPost: jsonb("vitals_post"),
		notes: text("notes"),
		complications: text("complications"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPatientIdx: index("anesthesia_logs_org_patient_idx").on(
			t.organizationId,
			t.patientId,
			t.createdAt,
		),
		visitIdx: index("anesthesia_logs_visit_idx").on(t.visitId),
	}),
);

// MKB-10 auto directories (ICD-10 diagnosis quick-select)
export const mkb10AutoDirectories = pgTable(
	"mkb10_auto_directories",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		specialty: text("specialty").notNull().default("universal"),
		code: text("code").notNull(),
		title: text("title").notNull(),
		sortOrder: integer("sort_order").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("mkb10_auto_directories_organizationId_idx").on(
			t.organizationId,
		),
	}),
);
