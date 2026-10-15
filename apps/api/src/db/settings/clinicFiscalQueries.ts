/**
 * clinicFiscalQueries.ts — PostgreSQL 18 SSOT persistence for 54-FZ Fiscalization,
 * Taxation System (СНО: УСН 6%, УСН 15%, ПСН, ОСНО), OFD Operator, FFD 1.2,
 * and KKT Hardware Register binding (`organizations` + `cash_boxes`).
 */

import { and, asc, eq } from "drizzle-orm";
import { db } from "../client.js";
import * as schema from "../schema.js";
import { ensureOrganizationCashBoxes } from "../seeds/seed_cash_and_reasons.js";
import { useInMemory } from "./types.js";

export type CanonicalTaxationSystem =
	| "usn_income"
	| "usn_income_expense"
	| "psn"
	| "osn";

export type CanonicalOfdProvider =
	| "platforma_ofd"
	| "taxcom"
	| "sbis"
	| "first_ofd"
	| "kontur_ofd";

export interface CashBoxHardwareSummary {
	id: string;
	name: string;
	type: string;
	isMain: boolean;
	isCashless: boolean;
	kkmModel: string | null;
	kkmSerialNumber: string | null;
	kkmActive: boolean;
	branchId: string | null;
	balanceRub: number;
}

export interface ClinicFiscalSettingsDto {
	organizationId: string;
	taxationSystem: CanonicalTaxationSystem;
	ofdProvider: CanonicalOfdProvider;
	ffdVersion: "1.2" | "1.05";
	autoSendReceipt: boolean;
	allowAutonomousBuffer: boolean;
	cashBoxId: string | null;
	cashBoxName: string;
	kkmModel: string;
	kkmSerialNumber: string;
	branchId: string;
	kkmActive: boolean;
	cashBoxes: CashBoxHardwareSummary[];
	updatedAt: string;
}

export interface UpdateClinicFiscalSettingsInput {
	taxationSystem?: string | undefined;
	ofdProvider?: string | undefined;
	ffdVersion?: string | undefined;
	autoSendReceipt?: boolean | undefined;
	allowAutonomousBuffer?: boolean | undefined;
	cashBoxId?: string | null | undefined;
	cashBoxName?: string | undefined;
	kkmModel?: string | null | undefined;
	kkmSerialNumber?: string | null | undefined;
	branchId?: string | null | undefined;
	kkmActive?: boolean | undefined;
}

export function normalizeTaxationSystem(
	raw: unknown,
): CanonicalTaxationSystem {
	if (typeof raw !== "string") return "usn_income";
	const normalized = raw.trim().toLowerCase();
	if (normalized === "usn_income_expense" || normalized === "usn15") {
		return "usn_income_expense";
	}
	if (normalized === "psn" || normalized === "patent") {
		return "psn";
	}
	if (normalized === "osn" || normalized === "osno") {
		return "osn";
	}
	return "usn_income";
}

export function normalizeOfdProvider(raw: unknown): CanonicalOfdProvider {
	if (typeof raw !== "string") return "platforma_ofd";
	const normalized = raw.trim().toLowerCase();
	if (
		normalized === "platforma_ofd" ||
		normalized === "taxcom" ||
		normalized === "sbis" ||
		normalized === "first_ofd" ||
		normalized === "kontur_ofd"
	) {
		return normalized;
	}
	return "platforma_ofd";
}

const memoryFiscalSettings = new Map<string, ClinicFiscalSettingsDto>();

export async function getClinicFiscalSettingsFromDb(
	organizationId: string,
): Promise<ClinicFiscalSettingsDto> {
	if (useInMemory()) {
		const cached = memoryFiscalSettings.get(organizationId);
		if (cached) return cached;
		const fallback: ClinicFiscalSettingsDto = {
			organizationId,
			taxationSystem: "usn_income",
			ofdProvider: "platforma_ofd",
			ffdVersion: "1.2",
			autoSendReceipt: true,
			allowAutonomousBuffer: true,
			cashBoxId: null,
			cashBoxName: "Основная",
			kkmModel: "АТОЛ-55Ф",
			kkmSerialNumber: "00108204958112",
			branchId: "main",
			kkmActive: true,
			cashBoxes: [],
			updatedAt: new Date().toISOString(),
		};
		memoryFiscalSettings.set(organizationId, fallback);
		return fallback;
	}

	const [org] = await db
		.select()
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.limit(1);
	if (!org) {
		throw new Error("Организация не найдена в базе данных.");
	}

	await ensureOrganizationCashBoxes(db, organizationId);

	const boxes = await db
		.select()
		.from(schema.cashBoxes)
		.where(eq(schema.cashBoxes.organizationId, organizationId))
		.orderBy(asc(schema.cashBoxes.displayOrder), asc(schema.cashBoxes.createdAt));

	const mainBox =
		boxes.find((b) => b.isMain || b.type === "main") ?? boxes[0] ?? null;

	const flags =
		(org.workspaceFeatureFlags as Record<string, unknown> | null) ?? {};

	const taxationSystem = normalizeTaxationSystem(flags.taxationSystem);
	const ofdProvider = normalizeOfdProvider(flags.ofdProvider);
	const ffdVersion = flags.ffdVersion === "1.05" ? "1.05" : "1.2";
	const autoSendReceipt =
		typeof flags.autoSendReceipt === "boolean" ? flags.autoSendReceipt : true;
	const allowAutonomousBuffer =
		typeof flags.allowAutonomousBuffer === "boolean"
			? flags.allowAutonomousBuffer
			: true;

	const kkmModel =
		mainBox?.kkmModel ||
		(typeof flags.kkmModel === "string" && flags.kkmModel.trim().length > 0
			? flags.kkmModel.trim()
			: "АТОЛ-55Ф");
	const kkmSerialNumber =
		mainBox?.kkmSerialNumber ||
		(typeof flags.kkmSerialNumber === "string" &&
		flags.kkmSerialNumber.trim().length > 0
			? flags.kkmSerialNumber.trim()
			: "00108204958112");
	const branchId =
		mainBox?.branchId ||
		(typeof flags.branchId === "string" && flags.branchId.trim().length > 0
			? flags.branchId.trim()
			: "main");
	const kkmActive =
		mainBox?.kkmActive !== undefined ? Boolean(mainBox.kkmActive) : true;

	return {
		organizationId: org.id,
		taxationSystem,
		ofdProvider,
		ffdVersion,
		autoSendReceipt,
		allowAutonomousBuffer,
		cashBoxId: mainBox?.id ?? null,
		cashBoxName: mainBox?.name || "Основная",
		kkmModel,
		kkmSerialNumber,
		branchId,
		kkmActive,
		cashBoxes: boxes.map((b) => ({
			id: b.id,
			name: b.name,
			type: b.type,
			isMain: Boolean(b.isMain),
			isCashless: Boolean(b.isCashless),
			kkmModel: b.kkmModel ?? null,
			kkmSerialNumber: b.kkmSerialNumber ?? null,
			kkmActive: Boolean(b.kkmActive),
			branchId: b.branchId ?? null,
			balanceRub: Number(b.balanceRub ?? 0),
		})),
		updatedAt: org.updatedAt.toISOString(),
	};
}

export async function updateClinicFiscalSettingsInDb(
	organizationId: string,
	input: UpdateClinicFiscalSettingsInput,
): Promise<ClinicFiscalSettingsDto> {
	if (useInMemory()) {
		const current = await getClinicFiscalSettingsFromDb(organizationId);
		const updated: ClinicFiscalSettingsDto = {
			...current,
			taxationSystem:
				input.taxationSystem !== undefined
					? normalizeTaxationSystem(input.taxationSystem)
					: current.taxationSystem,
			ofdProvider:
				input.ofdProvider !== undefined
					? normalizeOfdProvider(input.ofdProvider)
					: current.ofdProvider,
			ffdVersion:
				input.ffdVersion === "1.05"
					? "1.05"
					: input.ffdVersion === "1.2"
						? "1.2"
						: current.ffdVersion,
			autoSendReceipt:
				input.autoSendReceipt !== undefined
					? Boolean(input.autoSendReceipt)
					: current.autoSendReceipt,
			allowAutonomousBuffer:
				input.allowAutonomousBuffer !== undefined
					? Boolean(input.allowAutonomousBuffer)
					: current.allowAutonomousBuffer,
			cashBoxName: input.cashBoxName?.trim() || current.cashBoxName,
			kkmModel: input.kkmModel?.trim() || current.kkmModel,
			kkmSerialNumber: input.kkmSerialNumber?.trim() || current.kkmSerialNumber,
			branchId: input.branchId?.trim() || current.branchId,
			kkmActive:
				input.kkmActive !== undefined ? Boolean(input.kkmActive) : current.kkmActive,
			updatedAt: new Date().toISOString(),
		};
		memoryFiscalSettings.set(organizationId, updated);
		return updated;
	}

	const [org] = await db
		.select()
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.limit(1);
	if (!org) {
		throw new Error("Организация не найдена в базе данных.");
	}

	await ensureOrganizationCashBoxes(db, organizationId);

	const existingFlags =
		(org.workspaceFeatureFlags as Record<string, unknown> | null) ?? {};
	const nextFlags: Record<string, unknown> = { ...existingFlags };

	if (input.taxationSystem !== undefined) {
		nextFlags.taxationSystem = normalizeTaxationSystem(input.taxationSystem);
	}
	if (input.ofdProvider !== undefined) {
		nextFlags.ofdProvider = normalizeOfdProvider(input.ofdProvider);
	}
	if (input.ffdVersion !== undefined) {
		nextFlags.ffdVersion = input.ffdVersion === "1.05" ? "1.05" : "1.2";
	}
	if (input.autoSendReceipt !== undefined) {
		nextFlags.autoSendReceipt = Boolean(input.autoSendReceipt);
	}
	if (input.allowAutonomousBuffer !== undefined) {
		nextFlags.allowAutonomousBuffer = Boolean(input.allowAutonomousBuffer);
	}
	if (input.kkmModel !== undefined && input.kkmModel !== null) {
		nextFlags.kkmModel = input.kkmModel.trim();
	}
	if (input.kkmSerialNumber !== undefined && input.kkmSerialNumber !== null) {
		nextFlags.kkmSerialNumber = input.kkmSerialNumber.trim();
	}
	if (input.branchId !== undefined && input.branchId !== null) {
		nextFlags.branchId = input.branchId.trim();
	}

	await db
		.update(schema.organizations)
		.set({
			workspaceFeatureFlags: nextFlags,
			updatedAt: new Date(),
		})
		.where(eq(schema.organizations.id, organizationId));

	const boxes = await db
		.select()
		.from(schema.cashBoxes)
		.where(eq(schema.cashBoxes.organizationId, organizationId))
		.orderBy(asc(schema.cashBoxes.displayOrder), asc(schema.cashBoxes.createdAt));

	const targetBox =
		(input.cashBoxId
			? boxes.find((b) => b.id === input.cashBoxId)
			: undefined) ??
		boxes.find((b) => b.isMain || b.type === "main") ??
		boxes[0];

	if (targetBox) {
		// biome-ignore lint/suspicious/noExplicitAny: dynamic columns update
		const boxUpdate: Record<string, any> = {
			updatedAt: new Date(),
		};
		if (input.cashBoxName !== undefined && input.cashBoxName.trim().length > 0) {
			boxUpdate.name = input.cashBoxName.trim();
		}
		if (input.kkmModel !== undefined) {
			boxUpdate.kkmModel = input.kkmModel ? input.kkmModel.trim() : null;
		}
		if (input.kkmSerialNumber !== undefined) {
			boxUpdate.kkmSerialNumber = input.kkmSerialNumber
				? input.kkmSerialNumber.trim()
				: null;
		}
		if (input.branchId !== undefined) {
			boxUpdate.branchId = input.branchId ? input.branchId.trim() : null;
		}
		if (input.kkmActive !== undefined) {
			boxUpdate.kkmActive = Boolean(input.kkmActive);
		}

		await db
			.update(schema.cashBoxes)
			.set(boxUpdate)
			.where(
				and(
					eq(schema.cashBoxes.id, targetBox.id),
					eq(schema.cashBoxes.organizationId, organizationId),
				),
			);
	}

	return getClinicFiscalSettingsFromDb(organizationId);
}
