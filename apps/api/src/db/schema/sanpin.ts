import { sql } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth.js";
import { patients } from "./patients.js";

// ─── 1. ПСО (Форма № 366/у) ──────────────────────────────────────────────────
// preSterilizationCleaningLogs объявлен в inventory.ts и реэкспортируется

// ─── 2. Автоклавы и сухожары (Форма № 257/у) ─────────────────────────────────
// sterilizationLogs и autoclaveDailyTests объявлены в inventory.ts и реэкспортируются

export const sterilizerEquipments = pgTable(
	"sterilizer_equipments",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		name: text("name").notNull(),
		brandModel: text("brand_model").notNull(),
		serialNumber: text("serial_number").notNull(),
		inventoryNumber: text("inventory_number"),
		deviceType: text("device_type").notNull().default("autoclave_steam"), // autoclave_steam | dry_heat | plasma | gas_eo
		deviceClass: text("device_class").notNull().default("autoclave_class_b"), // autoclave_class_b | autoclave_class_s | autoclave_class_n | dry_heat_air | plasma
		chamberVolumeLiters: numeric("chamber_volume_liters", { precision: 8, scale: 2 })
			.notNull()
			.default("22.00"),
		locationRoom: text("location_room").notNull().default("ЦСО (Стерилизационная)"),
		verificationExpiryDate: date("verification_expiry_date", { mode: "string" }),
		lastMaintenanceDate: date("last_maintenance_date", { mode: "string" }),
		nextMaintenanceDate: date("next_maintenance_date", { mode: "string" }),
		commissioningDate: date("commissioning_date", { mode: "string" }),
		decommissioningDate: date("decommissioning_date", { mode: "string" }),
		status: text("status").notNull().default("active"), // active | in_maintenance | decommissioned
		isCommissioned: boolean("is_commissioned").notNull().default(true),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("sterilizer_equipments_org_idx").on(t.organizationId),
		statusIdx: index("sterilizer_equipments_status_idx").on(t.status),
	}),
);

// ─── 3. Бактерицидные облучатели и рециркуляторы (Р 3.5.1904-04) ──────────────

export const bactericidalEquipments = pgTable(
	"bactericidal_equipments",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		roomName: text("room_name").notNull(),
		roomVolumeM3: numeric("room_volume_m3", { precision: 8, scale: 2 }).notNull(),
		roomAreaM2: numeric("room_area_m2", { precision: 8, scale: 2 }),
		deviceBrand: text("device_brand").notNull(),
		serialNumber: text("serial_number").notNull(),
		deviceType: text("device_type").notNull().default("recirculator_closed"), // recirculator_closed | irradiator_open | combined
		lampType: text("lamp_type").notNull().default("TUV 15W / 30W"),
		lampCount: integer("lamp_count").notNull().default(2),
		maxLampHours: integer("max_lamp_hours").notNull().default(8000),
		totalOperatingHours: numeric("total_operating_hours", {
			precision: 8,
			scale: 2,
		})
			.notNull()
			.default("0.00"),
		lampStatus: text("lamp_status").notNull().default("normal"), // normal | warning_replace_soon | expired_replace_now
		lastLampReplacementDate: date("last_lamp_replacement_date", { mode: "string" }),
		isCommissioned: boolean("is_commissioned").notNull().default(true),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("bactericidal_equipments_org_idx").on(t.organizationId),
	}),
);

export const bactericidalIrradiatorLogs = pgTable(
	"bactericidal_irradiator_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		equipmentId: uuid("equipment_id")
			.notNull()
			.references(() => bactericidalEquipments.id, { onDelete: "cascade" }),
		date: date("date", { mode: "string" }).notNull(),
		sessionStartTime: timestamp("session_start_time", { withTimezone: true }).notNull(),
		sessionEndTime: timestamp("session_end_time", { withTimezone: true }).notNull(),
		durationMinutes: integer("duration_minutes").notNull(),
		operatingMode: text("operating_mode").notNull().default("continuous_presence"),
		cumulativeHoursAfterSession: numeric("cumulative_hours_after_session", {
			precision: 8,
			scale: 2,
		}).notNull(),
		operatorId: uuid("operator_id").references(() => users.id, {
			onDelete: "set null",
		}),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("bactericidal_irradiator_logs_org_idx").on(t.organizationId),
		equipIdx: index("bactericidal_irradiator_logs_equip_idx").on(t.equipmentId),
		dateIdx: index("bactericidal_irradiator_logs_date_idx").on(t.date),
	}),
);

// ─── 4. Генеральные уборки и дезинфекция (СанПиН 3.3686-21) ─────────────────

export const generalCleaningLogs = pgTable(
	"general_cleaning_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		cleaningType: text("cleaning_type").notNull().default("general"), // general | current_routine
		scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
		actualDateTime: timestamp("actual_date_time", { withTimezone: true })
			.notNull()
			.defaultNow(),
		roomName: text("room_name").notNull(),
		treatedAreaM2: numeric("treated_area_m2", { precision: 8, scale: 2 }).notNull(),
		disinfectantName: text("disinfectant_name").notNull(),
		activeIngredient: text("active_ingredient"),
		solutionConcentrationPercent: numeric("solution_concentration_percent", {
			precision: 5,
			scale: 2,
		}).notNull(),
		applicationMethod: text("application_method").notNull().default("wiping"), // wiping | spraying | immersion | combined
		exposureTimeMinutes: integer("exposure_time_minutes").notNull(),
		uvIrradiationMinutes: integer("uv_irradiation_minutes").notNull().default(30),
		ventilationMinutes: integer("ventilation_minutes").notNull().default(15),
		operatorId: uuid("operator_id").references(() => users.id, {
			onDelete: "set null",
		}),
		inspectorId: uuid("inspector_id").references(() => users.id, {
			onDelete: "set null",
		}),
		status: text("status").notNull().default("completed"), // completed | verified_by_inspector | rescheduled
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("general_cleaning_logs_org_idx").on(t.organizationId),
		schedDateIdx: index("general_cleaning_logs_sched_date_idx").on(t.scheduledDate),
	}),
);

// ─── 5. Медицинские отходы классов А, Б, В, Г (СанПиН 2.1.3684-21) ───────────

export const medicalWasteLogs = pgTable(
	"medical_waste_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		operationType: text("operation_type").notNull().default("accumulation"), // accumulation | disinfection_on_site | transfer_to_disposal_company
		logDate: timestamp("log_date", { withTimezone: true }).notNull().defaultNow(),
		wasteClass: text("waste_class").notNull().default("class_B"), // class_A | class_B | class_V | class_G
		wasteDescription: text("waste_description").notNull(),
		packageType: text("package_type").notNull().default("yellow_bag"), // white_bag | yellow_bag | yellow_sharps_container | red_bag | hazard_g_container
		packageCount: integer("package_count").notNull().default(1),
		weightKg: numeric("weight_kg", { precision: 8, scale: 3 }).notNull(),
		volumeLiters: numeric("volume_liters", { precision: 8, scale: 2 }),
		disinfectionMethod: text("disinfection_method").notNull().default("chemical_soaking"), // chemical_soaking | steam_autoclave | microwave | none_centralized
		disinfectantUsed: text("disinfectant_used"),
		disposalCompany: text("disposal_company"),
		contractNumber: text("contract_number"),
		transferActNumber: text("transfer_act_number"),
		responsibleStaffId: uuid("responsible_staff_id").references(() => users.id, {
			onDelete: "set null",
		}),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("medical_waste_logs_org_idx").on(t.organizationId),
		dateIdx: index("medical_waste_logs_date_idx").on(t.logDate),
		wasteClassIdx: index("medical_waste_logs_class_idx").on(t.wasteClass),
	}),
);

// ─── 6. Аварийные ситуации («Анти-ВИЧ» / Постконтактная профилактика) ────────

export const emergencyBiohazardLogs = pgTable(
	"emergency_biohazard_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		incidentDateTime: timestamp("incident_date_time", { withTimezone: true })
			.notNull()
			.defaultNow(),
		victimStaffId: uuid("victim_staff_id").references(() => users.id, {
			onDelete: "set null",
		}),
		victimFullName: text("victim_full_name").notNull(),
		victimRole: text("victim_role").notNull(),
		patientId: uuid("patient_id").references(() => patients.id, {
			onDelete: "set null",
		}),
		patientFullName: text("patient_full_name"),
		patientCardNumber: text("patient_card_number"),
		patientInfectiousStatus: text("patient_infectious_status"),
		injuryType: text("injury_type").notNull().default("needle_stick"), // needle_stick | bur_cut | scalpel_cut | splash_skin_intact | splash_skin_damaged | splash_mucosa_eye | splash_mucosa_mouth | other
		circumstances: text("circumstances").notNull(),
		firstAidMeasures: text("first_aid_measures").notNull(),
		antiHivKitUsed: boolean("anti_hiv_kit_used").notNull().default(true),
		bloodSampledForTesting: boolean("blood_sampled_for_testing").notNull().default(true),
		arvProphylaxisRecommended: boolean("arv_prophylaxis_recommended").notNull().default(false),
		arvProphylaxisStartedWithin72h: boolean("arv_prophylaxis_started_within_72h")
			.notNull()
			.default(false),
		arvDrugsPrescribed: text("arv_drugs_prescribed"),
		chiefPhysicianNotified: boolean("chief_physician_notified").notNull().default(true),
		actSanPiNNumber: text("act_sanpin_number"),
		responsibleDoctorId: uuid("responsible_doctor_id").references(() => users.id, {
			onDelete: "set null",
		}),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("emergency_biohazard_logs_org_idx").on(t.organizationId),
		incidentDateIdx: index("emergency_biohazard_logs_incident_idx").on(
			t.incidentDateTime,
		),
	}),
);

// ─── 7. Температурный режим и влажность (Приказ Минздрава № 706н / 646н) ──────

export const temperatureHumidityEquipments = pgTable(
	"temperature_humidity_equipments",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		equipmentType: text("equipment_type").notNull().default("refrigerator_cold"), // storage_room | medicine_cabinet | refrigerator_cold | refrigerator_cool | freezer
		name: text("name").notNull(),
		location: text("location").notNull(),
		meterDeviceName: text("meter_device_name").notNull(),
		meterSerialNumber: text("meter_serial_number"),
		verificationExpiryDate: date("verification_expiry_date", { mode: "string" }),
		targetTempMinCelsius: numeric("target_temp_min_celsius", {
			precision: 5,
			scale: 2,
		})
			.notNull()
			.default("2.00"),
		targetTempMaxCelsius: numeric("target_temp_max_celsius", {
			precision: 5,
			scale: 2,
		})
			.notNull()
			.default("8.00"),
		targetHumidityMinPercent: numeric("target_humidity_min_percent", {
			precision: 5,
			scale: 2,
		}),
		targetHumidityMaxPercent: numeric("target_humidity_max_percent", {
			precision: 5,
			scale: 2,
		}),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("temp_humidity_equip_org_idx").on(t.organizationId),
	}),
);

export const temperatureHumidityLogs = pgTable(
	"temperature_humidity_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		equipmentId: uuid("equipment_id")
			.notNull()
			.references(() => temperatureHumidityEquipments.id, { onDelete: "cascade" }),
		measurementDate: date("measurement_date", { mode: "string" }).notNull(),
		measurementPeriod: text("measurement_period").notNull().default("morning"), // morning | evening
		temperatureCelsius: numeric("temperature_celsius", {
			precision: 5,
			scale: 2,
		}).notNull(),
		relativeHumidityPercent: numeric("relative_humidity_percent", {
			precision: 5,
			scale: 2,
		}),
		isWithinNorm: boolean("is_within_norm").notNull().default(true),
		deviationReason: text("deviation_reason"),
		correctiveAction: text("corrective_action"),
		operatorId: uuid("operator_id").references(() => users.id, {
			onDelete: "set null",
		}),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("temp_humidity_logs_org_idx").on(t.organizationId),
		equipIdx: index("temp_humidity_logs_equip_idx").on(t.equipmentId),
		dateIdx: index("temp_humidity_logs_date_idx").on(t.measurementDate),
	}),
);
