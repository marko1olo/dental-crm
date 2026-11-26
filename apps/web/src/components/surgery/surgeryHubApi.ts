/**
 * surgeryHubApi.ts — Сетевые вызовы хирургического хаба (DENTE CRM).
 * Атомарная батч-имплантация (POST /api/clinical/implants/installations/batch),
 * живой список пациентов/врачей/склада с распаковкой конверта { success, data } (Мандаты 8bm, 8bo, 8z).
 */

import { generateUuidV7, type ImplantBatchToothSpec } from "@dental/shared";
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from "../../lib/denteRequestHeaders";
import { clientLogger } from "../../services/logging/clientLogger";
import {
	SURGERY_IMPLANT_SYSTEMS,
	generateSystemSurgeryLot,
	type MischBoneDensity,
	type SurgeryScenarioConfig,
	type SurgeryScenarioType,
} from "./surgeryCatalogData";
import type { ToothImplantSpec } from "./SurgeryImplantParametersSection";

export interface SurgeryPatientOption {
	readonly id: string;
	readonly fullName: string;
	readonly phone?: string | undefined;
}

export interface SurgeryDoctorOption {
	readonly id: string;
	readonly fullName: string;
	readonly specialty?: string | undefined;
}

export interface StockImplantRecord {
	readonly id: string;
	readonly name: string;
	readonly category?: string | undefined;
	readonly sku?: string | null | undefined;
	readonly lotNumber?: string | null | undefined;
	readonly serialNumber?: string | null | undefined;
	readonly expirationDate?: string | null | undefined;
	readonly currentQty?: string | null | undefined;
	readonly stockQuantity?: string | null | undefined;
}

export interface BuildImplantBatchPayloadArgs {
	readonly patientId: string;
	readonly teethToProcess: readonly number[];
	readonly getToothSpec: (tooth: number) => ToothImplantSpec;
	readonly implantBrand: string;
	readonly inventoryItemId: string | undefined;
	readonly boneDensity: MischBoneDensity;
	readonly isGuidedSurgery: boolean;
	readonly guidedSleeveDiameterMm: number;
	readonly guidedSleeveOffsetMm: number;
	readonly surgicalGuideTemplateId: string;
	readonly selectedGraft: string;
	readonly selectedMembrane: string;
	readonly selectedSuture: string;
	readonly operationPriceRub: number;
	readonly operationPriceKopecks: bigint | number;
	readonly diaryText: string;
	readonly idempotencyKey: string;
	readonly dateIso: string;
}

export function buildImplantBatchPayload(args: BuildImplantBatchPayloadArgs) {
	const {
		patientId,
		teethToProcess,
		getToothSpec,
		implantBrand,
		inventoryItemId,
		boneDensity,
		isGuidedSurgery,
		guidedSleeveDiameterMm,
		guidedSleeveOffsetMm,
		surgicalGuideTemplateId,
		selectedGraft,
		selectedMembrane,
		selectedSuture,
		operationPriceRub,
		operationPriceKopecks,
		diaryText,
		idempotencyKey,
		dateIso,
	} = args;

	const installations: ImplantBatchToothSpec[] = teethToProcess.map((tooth) => {
		const spec = getToothSpec(tooth);
		return {
			toothNumberFdi: tooth,
			implantBrand,
			inventoryItemId: inventoryItemId ?? null,
			implantDiameterMm: spec.diameterMm,
			implantLengthMm: spec.lengthMm,
			catalogArticle: spec.catalogArticle || null,
			lotNumber: spec.lotNumber || generateSystemSurgeryLot(tooth, dateIso),
			serialNumber: spec.serialNumber || null,
			isGuidedSurgery,
			...(isGuidedSurgery ? { guidedSleeveDiameterMm, guidedSleeveOffsetMm } : {}),
			...(isGuidedSurgery && surgicalGuideTemplateId ? { surgicalGuideTemplateId } : {}),
			boneDensityClass: boneDensity,
			finalInsertionTorqueNcm: spec.torqueNcm,
			baselineIsqMesiodistal: spec.isqValue,
			baselineIsqBuccolingual: spec.isqValue,
			boneGraftMaterial: selectedGraft,
			membraneUsed: selectedMembrane,
			sutureMaterial: selectedSuture,
			operationPriceRub,
			operationPriceKopecks: operationPriceKopecks.toString(),
			notes: diaryText,
		};
	});

	return {
		patientId,
		implantBrand,
		inventoryItemId: inventoryItemId ?? null,
		boneDensityClass: boneDensity,
		isGuidedSurgery,
		...(isGuidedSurgery ? { guidedSleeveDiameterMm, guidedSleeveOffsetMm } : {}),
		...(isGuidedSurgery && surgicalGuideTemplateId ? { surgicalGuideTemplateId } : {}),
		boneGraftMaterial: selectedGraft,
		membraneUsed: selectedMembrane,
		sutureMaterial: selectedSuture,
		operationPriceRub,
		operationPriceKopecks: operationPriceKopecks.toString(),
		notes: diaryText,
		installations,
		idempotencyKey,
	};
}

export async function fetchSurgeryPatients(searchQuery: string): Promise<SurgeryPatientOption[]> {
	const q = searchQuery.trim();
	const url = q ? `/api/patients?search=${encodeURIComponent(q)}&limit=20` : "/api/patients?limit=20";
	const res = await fetch(url, { headers: denteClinicalReadHeaders() });
	if (!res.ok) return [];
	const raw: unknown = await res.json();
	const envelopeData = raw && typeof raw === "object" && "data" in raw ? (raw as { data?: unknown }).data : undefined;
	const listCandidate = Array.isArray(envelopeData)
		? envelopeData
		: Array.isArray(raw)
			? raw
			: raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).patients)
				? (raw as Record<string, unknown>).patients
				: [];
	const parsed: SurgeryPatientOption[] = [];
	if (!Array.isArray(listCandidate)) return parsed;
	for (const item of listCandidate) {
		if (item && typeof item === "object") {
			const rec = item as Record<string, unknown>;
			if (typeof rec.id === "string" && typeof rec.fullName === "string" && rec.fullName.trim()) {
				parsed.push({
					id: rec.id,
					fullName: rec.fullName.trim(),
					phone: typeof rec.phone === "string" ? rec.phone : undefined,
				});
			}
		}
	}
	return parsed;
}

export async function fetchSurgeryDoctors(): Promise<SurgeryDoctorOption[]> {
	const res = await fetch("/api/v1/doctors", { headers: denteClinicalReadHeaders() });
	if (!res.ok) return [];
	const raw = (await res.json()) as { data?: { doctors?: unknown }; doctors?: unknown } | unknown[];
	const envelope = !Array.isArray(raw) && raw && typeof raw === "object" ? (raw.data ?? raw) : null;
	const docsRaw = envelope && typeof envelope === "object" && Array.isArray(envelope.doctors)
		? envelope.doctors
		: Array.isArray(raw)
			? raw
			: [];
	const parsed: SurgeryDoctorOption[] = [];
	for (const item of docsRaw) {
		if (item && typeof item === "object") {
			const rec = item as Record<string, unknown>;
			const nameCandidate = typeof rec.fullName === "string"
				? rec.fullName
				: typeof rec.name === "string"
					? rec.name
					: "";
			if (typeof rec.id === "string" && nameCandidate.trim()) {
				parsed.push({
					id: rec.id,
					fullName: nameCandidate.trim(),
					specialty: typeof rec.specialty === "string" ? rec.specialty : undefined,
				});
			}
		}
	}
	return parsed;
}

export async function fetchSurgeryImplantStock(): Promise<readonly StockImplantRecord[]> {
	const res = await fetch("/api/clinical/implants/stock", { headers: denteClinicalReadHeaders() });
	if (!res.ok) return [];
	const raw = (await res.json()) as { data?: { implants?: unknown }; implants?: unknown };
	const payload = raw?.data ?? raw;
	return Array.isArray(payload?.implants) ? (payload.implants as readonly StockImplantRecord[]) : [];
}

export interface HydratedPatientImplantData {
	readonly matched: Record<string, unknown>;
	readonly passport: Record<string, unknown> | null;
	readonly resolvedBrandName?: string | undefined;
}

export async function fetchPatientImplantContext(
	patientId: string,
	toothFdi: number,
): Promise<HydratedPatientImplantData | null> {
	const res = await fetch(`/api/clinical/implants/patient/${patientId}`, {
		headers: denteClinicalReadHeaders(),
	});
	if (!res.ok) return null;
	const rawBody = (await res.json()) as { data?: { installations?: unknown }; installations?: unknown };
	const body = rawBody?.data ?? rawBody;
	if (!Array.isArray(body?.installations) || body.installations.length === 0) return null;

	const installations = body.installations as readonly Record<string, unknown>[];
	const matched = installations.find((inst) => inst.toothNumberFdi === toothFdi) ?? installations[0];
	if (!matched) return null;

	let passport: Record<string, unknown> | null = null;
	if (typeof matched.id === "string" && matched.id) {
		try {
			const passRes = await fetch(`/api/clinical/implants/${matched.id}/passport`, {
				headers: denteClinicalReadHeaders(),
			});
			if (passRes.ok) {
				const rawPass = (await passRes.json()) as { data?: { passport?: unknown }; passport?: unknown };
				const passPayload = rawPass?.data ?? rawPass;
				if (passPayload?.passport && typeof passPayload.passport === "object") {
					passport = passPayload.passport as Record<string, unknown>;
				}
			}
		} catch (err) {
			clientLogger.warn("[surgeryHubApi] Ошибка запроса паспорта имплантата из API", err, {
				module: "surgeryHubApi",
			});
		}
	}

	let resolvedBrandName: string | undefined;
	if (typeof matched.implantBrand === "string" && matched.implantBrand.trim()) {
		const brandStr = matched.implantBrand.trim().toLowerCase();
		const sys = SURGERY_IMPLANT_SYSTEMS.find(
			(s) => s.id.toLowerCase() === brandStr || s.brandName.toLowerCase() === brandStr,
		);
		resolvedBrandName = sys?.brandName;
	}

	return { matched, passport, resolvedBrandName };
}

export interface SubmitSurgeryApiResult {
	readonly ok: boolean;
	readonly errorMessage?: string | undefined;
	readonly deductDeferred?: boolean | undefined;
}

async function parseSurgeryJsonLogged<T>(res: Response, context: string): Promise<T | null> {
	try {
		return (await res.json()) as T;
	} catch (err) {
		clientLogger.warn(`[surgeryHubApi] Не удалось разобрать JSON (${context})`, err, { module: "surgeryHubApi" });
		return null;
	}
}

async function readErrorFromResponse(res: Response, fallback: string): Promise<string> {
	const errRaw = await parseSurgeryJsonLogged<{
		data?: { message?: string; error?: string };
		message?: string;
		error?: string;
	}>(res, "readErrorFromResponse");
	const errBody = errRaw?.data ?? errRaw;
	return errBody?.message || errBody?.error || fallback;
}

export async function submitSurgeryToApi(params: {
	readonly targetId: string;
	readonly activeScenario: SurgeryScenarioType;
	readonly scenarioConfig: SurgeryScenarioConfig;
	readonly toothFdi: number;
	readonly teethToProcess: readonly number[];
	readonly getToothSpec: (tooth: number) => ToothImplantSpec;
	readonly implantBrandId: string;
	readonly effectiveInventoryItemId: string | undefined;
	readonly boneDensity: MischBoneDensity;
	readonly isGuidedSurgery: boolean;
	readonly guidedSleeveDiameterMm: number;
	readonly guidedSleeveOffsetMm: number;
	readonly surgicalGuideTemplateId: string;
	readonly selectedGraft: string;
	readonly selectedMembrane: string;
	readonly selectedSuture: string;
	readonly operationPriceRub: number;
	readonly operationPriceKopecks: bigint | number;
	readonly diaryText: string;
	readonly baseLot: string;
	readonly dateIso: string;
	readonly inventoryOverdraftActive: boolean;
}): Promise<SubmitSurgeryApiResult> {
	const idempKey = generateUuidV7();
	const headers = denteClinicalMutationHeaders({
		"Content-Type": "application/json",
		"Idempotency-Key": idempKey,
	});

	if (params.activeScenario === "implant") {
		if (params.teethToProcess.length > 1) {
			const batchBody = JSON.stringify(buildImplantBatchPayload({
				patientId: params.targetId,
				teethToProcess: params.teethToProcess,
				getToothSpec: params.getToothSpec,
				implantBrand: params.implantBrandId,
				inventoryItemId: params.effectiveInventoryItemId,
				boneDensity: params.boneDensity,
				isGuidedSurgery: params.isGuidedSurgery,
				guidedSleeveDiameterMm: params.guidedSleeveDiameterMm,
				guidedSleeveOffsetMm: params.guidedSleeveOffsetMm,
				surgicalGuideTemplateId: params.surgicalGuideTemplateId,
				selectedGraft: params.selectedGraft,
				selectedMembrane: params.selectedMembrane,
				selectedSuture: params.selectedSuture,
				operationPriceRub: params.operationPriceRub,
				operationPriceKopecks: params.operationPriceKopecks,
				diaryText: params.diaryText,
				idempotencyKey: idempKey,
				dateIso: params.dateIso,
			}));
			const apiRes = await fetch("/api/clinical/implants/installations/batch", {
				method: "POST",
				headers,
				body: batchBody,
			});
			if (!apiRes.ok) {
				return {
					ok: false,
					errorMessage: await readErrorFromResponse(apiRes, `Ошибка сохранения имплантатов (${apiRes.status})`),
				};
			}
			const okRaw = await parseSurgeryJsonLogged<{ data?: unknown }>(apiRes, "installations:batch");
			void okRaw?.data;
			return { ok: true };
		}

		const currentTooth = params.teethToProcess[0] ?? params.toothFdi;
		const spec = params.getToothSpec(currentTooth);
		const apiRes = await fetch("/api/clinical/implants/installations", {
			method: "POST",
			headers,
			body: JSON.stringify({
				patientId: params.targetId,
				toothNumberFdi: currentTooth,
				implantBrand: params.implantBrandId,
				inventoryItemId: params.effectiveInventoryItemId ?? null,
				implantDiameterMm: spec.diameterMm,
				implantLengthMm: spec.lengthMm,
				catalogArticle: spec.catalogArticle || null,
				lotNumber: spec.lotNumber || params.baseLot,
				serialNumber: spec.serialNumber || null,
				isGuidedSurgery: params.isGuidedSurgery,
				...(params.isGuidedSurgery
					? {
						guidedSleeveDiameterMm: params.guidedSleeveDiameterMm,
						guidedSleeveOffsetMm: params.guidedSleeveOffsetMm,
					}
					: {}),
				...(params.isGuidedSurgery && params.surgicalGuideTemplateId
					? { surgicalGuideTemplateId: params.surgicalGuideTemplateId }
					: {}),
				boneDensityClass: params.boneDensity,
				finalInsertionTorqueNcm: spec.torqueNcm,
				baselineIsqMesiodistal: spec.isqValue,
				baselineIsqBuccolingual: spec.isqValue,
				boneGraftMaterial: params.selectedGraft,
				membraneUsed: params.selectedMembrane,
				sutureMaterial: params.selectedSuture,
				operationPriceRub: params.operationPriceRub,
				operationPriceKopecks: params.operationPriceKopecks.toString(),
				notes: params.diaryText,
				idempotencyKey: idempKey,
			}),
		});
		if (!apiRes.ok) {
			return {
				ok: false,
				errorMessage: await readErrorFromResponse(apiRes, `Ошибка сохранения имплантата (${apiRes.status})`),
			};
		}
		const okRaw = await parseSurgeryJsonLogged<{ data?: unknown }>(apiRes, "installations:single");
		void okRaw?.data;
		return { ok: true };
	}

	const protoRes = await fetch("/api/surgery/protocols", {
		method: "POST",
		headers,
		body: JSON.stringify({
			patientId: params.targetId,
			normId: params.scenarioConfig.id,
			toothNumberFdi: params.toothFdi,
			teeth: params.teethToProcess,
			protocolText: params.diaryText,
			services: params.teethToProcess.map((currentTooth) => ({
				code: params.scenarioConfig.serviceCode,
				nameRu: `${params.scenarioConfig.serviceNameRu} (#${currentTooth})`,
				name: params.scenarioConfig.serviceNameRu,
				priceRub: params.scenarioConfig.defaultPriceRub,
				quantity: 1,
				toothNumber: currentTooth,
			})),
			materialsUsed: params.scenarioConfig.standardMaterials.map((m) => ({
				name: m.name,
				unit: m.unit,
				quantity: m.quantity,
				isWarehouseCritical: Boolean(m.isWarehouseCritical),
			})),
			isOverdraftActive: Boolean(params.inventoryOverdraftActive),
			notes: params.scenarioConfig.defaultRecommendationsRu,
		}),
	});
	if (!protoRes.ok) {
		return {
			ok: false,
			errorMessage: await readErrorFromResponse(protoRes, `Ошибка сохранения протокола (${protoRes.status})`),
		};
	}
	const protoRaw = await parseSurgeryJsonLogged<{ data?: unknown }>(protoRes, "surgery:protocols");
	void protoRaw?.data;

	const deductRes = await fetch("/api/surgery/materials/quick-deduct", {
		method: "POST",
		headers: denteClinicalMutationHeaders({
			"Content-Type": "application/json",
			"Idempotency-Key": generateUuidV7(),
		}),
		body: JSON.stringify({
			bundleType: params.activeScenario === "sinus_gbr" ? "sinus_gbr" : "surgery",
			toothNumberFdi: params.toothFdi,
			notes: `Списание по техкарте: ${params.scenarioConfig.titleRu} #${params.teethToProcess.join(", #")}`,
		}),
	});
	return { ok: true, deductDeferred: !deductRes.ok };
}
