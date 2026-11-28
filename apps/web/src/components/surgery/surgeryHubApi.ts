/**
 * surgeryHubApi.ts — Сетевые вызовы хирургического хаба (DENTE CRM).
 * Атомарная батч-имплантация (POST /api/clinical/implants/installations/batch),
 * живой список пациентов/врачей/склада с распаковкой конверта { success, data } (Мандаты 8bm, 8bo, 8z).
 */

import { generateUuidV7, kopecksToRubles, type ImplantBatchToothSpec } from "@dental/shared";
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
	readonly operationPriceRub?: number | undefined;
	readonly operationPriceKopecks?: bigint | number | undefined;
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

	const optGraft = selectedGraft.trim() || null;
	const optMembrane = selectedMembrane.trim() || null;
	const optSuture = selectedSuture.trim() || null;
	const hasOpPrice = typeof operationPriceRub === "number" && operationPriceKopecks !== undefined;

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
			...(hasOpPrice ? { operationPriceRub, operationPriceKopecks: operationPriceKopecks.toString() } : {}),
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
		boneGraftMaterial: optGraft,
		membraneUsed: optMembrane,
		sutureMaterial: optSuture,
		...(hasOpPrice ? { operationPriceRub, operationPriceKopecks: operationPriceKopecks.toString() } : {}),
		notes: diaryText,
		installations,
		idempotencyKey,
	};
}

export interface SurgeryPricelistEntry {
	readonly code: string;
	readonly priceRub: number;
	readonly priceKopecks: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStockImplantRecord(item: unknown): item is StockImplantRecord {
	return isRecord(item) && typeof item.id === "string" && typeof item.name === "string";
}

export async function fetchSurgeryPricelist(): Promise<Map<string, SurgeryPricelistEntry>> {
	const map = new Map<string, SurgeryPricelistEntry>();
	const res = await fetch("/api/pricelist", { headers: denteClinicalReadHeaders() });
	if (!res.ok) {
		clientLogger.warn("[surgeryHubApi] Ошибка загрузки прайскуранта", { status: res.status }, { module: "surgeryHubApi" });
		throw new Error(`Не удалось загрузить прейскурант (HTTP ${res.status})`);
	}
	const raw: unknown = await res.json();
	const envelope = isRecord(raw) && "data" in raw ? raw.data : raw;
	const list = Array.isArray(envelope)
		? envelope
		: isRecord(envelope) && Array.isArray(envelope.items)
			? envelope.items
			: isRecord(raw) && Array.isArray(raw.items)
				? raw.items
				: [];
	for (const row of list) {
		if (!isRecord(row)) continue;
		if (row.isActive === false) continue;
		const code = typeof row.code === "string" ? row.code.trim() : "";
		if (!code) continue;
		const kopRaw = row.priceKopecks ?? row.price_kopecks;
		const rubRaw = row.priceRub ?? row.price_rub ?? row.price;
		const kopecks =
			typeof kopRaw === "number" && Number.isFinite(kopRaw)
				? Math.round(kopRaw)
				: typeof kopRaw === "string" && /^\d+$/.test(kopRaw.trim())
					? Number(kopRaw.trim())
					: Math.round(Number(rubRaw ?? 0) * 100);
		const priceRub =
			typeof rubRaw === "number" && Number.isFinite(rubRaw) && rubRaw > 0
				? rubRaw
				: kopecksToRubles(kopecks);
		if (kopecks > 0 || priceRub > 0) {
			map.set(code, { code, priceRub, priceKopecks: kopecks });
		}
	}
	return map;
}

export async function fetchSurgeryPatients(searchQuery: string): Promise<SurgeryPatientOption[]> {
	const q = searchQuery.trim();
	const url = q ? `/api/patients?search=${encodeURIComponent(q)}&limit=20` : "/api/patients?limit=20";
	const res = await fetch(url, { headers: denteClinicalReadHeaders() });
	if (!res.ok) {
		clientLogger.warn("[surgeryHubApi] Ошибка загрузки пациентов", { status: res.status }, { module: "surgeryHubApi" });
		throw new Error(`Не удалось загрузить список пациентов (HTTP ${res.status})`);
	}
	const raw: unknown = await res.json();
	const envelopeData = isRecord(raw) && "data" in raw ? raw.data : raw;
	const listCandidate = Array.isArray(envelopeData)
		? envelopeData
		: Array.isArray(raw)
			? raw
			: isRecord(raw) && Array.isArray(raw.patients)
				? raw.patients
				: [];
	const parsed: SurgeryPatientOption[] = [];
	if (!Array.isArray(listCandidate)) return parsed;
	for (const item of listCandidate) {
		if (isRecord(item) && typeof item.id === "string" && typeof item.fullName === "string" && item.fullName.trim()) {
			parsed.push({
				id: item.id,
				fullName: item.fullName.trim(),
				phone: typeof item.phone === "string" ? item.phone : undefined,
			});
		}
	}
	return parsed;
}

export async function fetchSurgeryDoctors(): Promise<SurgeryDoctorOption[]> {
	const res = await fetch("/api/v1/doctors", { headers: denteClinicalReadHeaders() });
	if (!res.ok) {
		clientLogger.warn("[surgeryHubApi] Ошибка загрузки врачей", { status: res.status }, { module: "surgeryHubApi" });
		throw new Error(`Не удалось загрузить список врачей (HTTP ${res.status})`);
	}
	const raw: unknown = await res.json();
	const envelope = isRecord(raw) && "data" in raw ? raw.data : raw;
	const docsRaw = isRecord(envelope) && Array.isArray(envelope.doctors)
		? envelope.doctors
		: Array.isArray(envelope)
			? envelope
			: Array.isArray(raw)
				? raw
				: [];
	const parsed: SurgeryDoctorOption[] = [];
	for (const item of docsRaw) {
		if (!isRecord(item)) continue;
		const nameCandidate = typeof item.fullName === "string"
			? item.fullName
			: typeof item.name === "string"
				? item.name
				: "";
		if (typeof item.id === "string" && nameCandidate.trim()) {
			parsed.push({
				id: item.id,
				fullName: nameCandidate.trim(),
				specialty: typeof item.specialty === "string" ? item.specialty : undefined,
			});
		}
	}
	return parsed;
}

export async function fetchSurgeryImplantStock(): Promise<readonly StockImplantRecord[]> {
	const res = await fetch("/api/clinical/implants/stock", { headers: denteClinicalReadHeaders() });
	if (!res.ok) {
		clientLogger.warn("[surgeryHubApi] Ошибка загрузки склада имплантатов", { status: res.status }, { module: "surgeryHubApi" });
		throw new Error(`Не удалось загрузить остатки имплантатов (HTTP ${res.status})`);
	}
	const raw: unknown = await res.json();
	const payload = isRecord(raw) && "data" in raw ? raw.data : raw;
	if (isRecord(payload) && Array.isArray(payload.implants)) {
		return payload.implants.filter(isStockImplantRecord);
	}
	return [];
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
	if (res.status === 404) return null;
	if (!res.ok) {
		clientLogger.warn("[surgeryHubApi] Ошибка загрузки данных имплантации пациента", { status: res.status, patientId }, { module: "surgeryHubApi" });
		throw new Error(`Не удалось загрузить данные имплантатов пациента (HTTP ${res.status})`);
	}
	const rawBody: unknown = await res.json();
	const body = isRecord(rawBody) && "data" in rawBody ? rawBody.data : rawBody;
	if (!isRecord(body) || !Array.isArray(body.installations) || body.installations.length === 0) return null;

	const installations = body.installations.filter(isRecord);
	const matched = installations.find((inst) => inst.toothNumberFdi === toothFdi) ?? installations[0];
	if (!matched) return null;

	let passport: Record<string, unknown> | null = null;
	if (typeof matched.id === "string" && matched.id) {
		const passRes = await fetch(`/api/clinical/implants/${matched.id}/passport`, {
			headers: denteClinicalReadHeaders(),
		});
		if (passRes.ok) {
			const rawPass: unknown = await passRes.json();
			const passPayload = isRecord(rawPass) && "data" in rawPass ? rawPass.data : rawPass;
			if (isRecord(passPayload) && isRecord(passPayload.passport)) {
				passport = passPayload.passport;
			}
		} else if (passRes.status !== 404) {
			clientLogger.warn("[surgeryHubApi] Ошибка запроса паспорта имплантата из API", { status: passRes.status, implantId: matched.id }, {
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

function unwrapEnvelopeData(raw: unknown): unknown {
	if (isRecord(raw) && "data" in raw) {
		return raw.data;
	}
	return raw;
}

async function parseSurgeryJsonLogged(res: Response, context: string): Promise<unknown> {
	try {
		return await res.json();
	} catch (err) {
		clientLogger.warn(`[surgeryHubApi] Не удалось разобрать JSON (${context})`, err, { module: "surgeryHubApi" });
		return null;
	}
}

async function readErrorFromResponse(res: Response, fallback: string): Promise<string> {
	const errRaw = await parseSurgeryJsonLogged(res, "readErrorFromResponse");
	const errBody = unwrapEnvelopeData(errRaw);
	if (isRecord(errBody)) {
		if (typeof errBody.message === "string" && errBody.message) return errBody.message;
		if (typeof errBody.error === "string" && errBody.error) return errBody.error;
	}
	return fallback;
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
	readonly operationPriceRub?: number | undefined;
	readonly operationPriceKopecks?: bigint | number | undefined;
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
	const optGraft = params.selectedGraft.trim() || null;
	const optMembrane = params.selectedMembrane.trim() || null;
	const optSuture = params.selectedSuture.trim() || null;
	const hasLiveOpPrice =
		typeof params.operationPriceRub === "number" && params.operationPriceKopecks !== undefined;

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
			const okRaw = await parseSurgeryJsonLogged(apiRes, "installations:batch");
			void unwrapEnvelopeData(okRaw);
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
				boneGraftMaterial: optGraft,
				membraneUsed: optMembrane,
				sutureMaterial: optSuture,
				...(hasLiveOpPrice
					? {
						operationPriceRub: params.operationPriceRub,
						operationPriceKopecks: params.operationPriceKopecks?.toString(),
					}
					: {}),
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
		const okRaw = await parseSurgeryJsonLogged(apiRes, "installations:single");
		void unwrapEnvelopeData(okRaw);
		return { ok: true };
	}

	const servicePriceRub =
		typeof params.operationPriceRub === "number" && Number.isFinite(params.operationPriceRub)
			? params.operationPriceRub
			: params.scenarioConfig.defaultPriceRub;

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
				priceRub: servicePriceRub,
				quantity: 1,
				toothNumber: currentTooth,
			})),
			materialsUsed: params.scenarioConfig.standardMaterials.map((m) => ({
				name: m.name,
				unit: m.unit,
				quantity: m.quantity,
				isWarehouseCritical: Boolean(m.isWarehouseCritical),
			})),
			bundleType: params.activeScenario === "sinus_gbr" ? "sinus_gbr" : "surgery",
			deductMaterials: true,
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
	const protoRaw = await parseSurgeryJsonLogged(protoRes, "surgery:protocols");
	const protoPayload = unwrapEnvelopeData(protoRaw);
	const deductionObj = isRecord(protoPayload) && isRecord(protoPayload.deduction)
		? protoPayload.deduction
		: isRecord(protoRaw) && isRecord(protoRaw.deduction)
			? protoRaw.deduction
			: null;
	const deductOk = typeof deductionObj?.success === "boolean" ? deductionObj.success : true;
	return { ok: true, deductDeferred: !deductOk };
}
