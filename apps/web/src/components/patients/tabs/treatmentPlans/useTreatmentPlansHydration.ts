/**
 * useTreatmentPlansHydration.ts — Хук гидратации планов лечения из PostgreSQL 18 и расчёта 3-уровневых тарифов.
 * Мандаты 8b, 8zi: Декомпозиция монолита TreatmentPlansTab.tsx по протоколу /decomposer.
 */

import { useState, useMemo, useEffect, useRef } from "react";
import {
	splitLaborAndMaterials,
	PLAN_TIER_CONFIGS,
	rublesToKopecks,
	kopecksToRubles,
	sumKopecks,
	percentageOfKopecks,
} from "@dental/shared";
import { basisPointsFromPercent } from "../../../treatment-plans/planInsuranceCoverage";
import { buildCanonical3TierPlans } from "../../../treatment-plans/treatmentPlanCatalogData";
import { generateCompletedWorksActAndWriteOff } from "../../../treatment-plans/treatmentPlanMaterialEngine";
import type {
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanItem,
} from "../../../treatment-plans/types";
import type { AnyTreatmentPlanItem } from "../../plansList/treatmentPlansListTypes";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import { getDenteAuthHeaders } from "../../../../lib/denteRequestHeaders";
import {
	type TierCategory,
	type TreatmentTierOption,
	type PatientTreatmentPlanDto,
	DEMO_CANONICAL_TREATMENT_PLAN,
	EMPTY_PLANS,
	EMPTY_ITEMS,
} from "./treatmentPlansTabConstants";
import type { PatientGeneralInfo } from "../PatientGeneralInfoTab";

export interface UseTreatmentPlansHydrationParams {
	patient?: PatientGeneralInfo | null | undefined;
	patientId?: string | undefined;
	items?: readonly (TreatmentPlanItem | AnyTreatmentPlanItem)[] | undefined;
	plans?: readonly PatientTreatmentPlanDto[] | PatientTreatmentPlanDto[] | undefined;
	tiers?: readonly TreatmentTierOption[] | TreatmentTierOption[] | undefined;
}

export function useTreatmentPlansHydration(params: UseTreatmentPlansHydrationParams) {
	const {
		patient,
		patientId: propPatientId,
		items: propItems = EMPTY_ITEMS,
		plans: propPlans = EMPTY_PLANS,
		tiers: propTiers,
	} = params;

	const effectivePatientId = propPatientId || patient?.id;
	const [loadedPlans, setLoadedPlans] = useState<PatientTreatmentPlanDto[]>(
		Array.isArray(propPlans) ? [...propPlans] : []
	);
	const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [reloadTrigger, setReloadTrigger] = useState<number>(0);

	const [selectedTier, setSelectedTier] = useState<TierCategory>("optimum");
	const [doctorDiscountPercent, setDoctorDiscountPercent] = useState<number>(0);
	const [bonusPointsToUseRub] = useState<number>(0);
	const fetchedPatientIdRef = useRef<string | null>(null);

	// Асинхронная гидратация планов лечения пациента из PostgreSQL 18
	useEffect(() => {
		if (propPlans && propPlans.length > 0) {
			setLoadedPlans([...propPlans]);
			setSelectedPlanId((prev) => prev ?? propPlans[0]?.id ?? null);
			return;
		}
		if (!effectivePatientId) {
			setIsLoading(false);
			return;
		}

		if (fetchedPatientIdRef.current === effectivePatientId && loadedPlans.length > 0 && reloadTrigger === 0) {
			return;
		}
		fetchedPatientIdRef.current = effectivePatientId;

		let isMounted = true;
		setIsLoading(true);
		setFetchError(null);

		const authHeaders = getDenteAuthHeaders({ "Content-Type": "application/json" });

		fetch(`/api/patients/${effectivePatientId}/treatment-plans`, { headers: authHeaders })
			.then(async (res) => {
				if (!res.ok) {
					const altRes = await fetch(`/api/treatment-plans/patient/${effectivePatientId}`, { headers: authHeaders });
					if (!altRes.ok) {
						throw new Error(`Ошибка загрузки планов лечения: HTTP ${res.status}`);
					}
					return altRes.json();
				}
				return res.json();
			})
			.then((data: { success?: boolean; plans?: PatientTreatmentPlanDto[] } | PatientTreatmentPlanDto[]) => {
				if (!isMounted) return;
				const fetchedPlans: PatientTreatmentPlanDto[] = Array.isArray((data as { plans?: PatientTreatmentPlanDto[] })?.plans)
					? (data as { plans: PatientTreatmentPlanDto[] }).plans
					: (Array.isArray(data) ? data : []);
				if (fetchedPlans.length > 0) {
					setLoadedPlans(fetchedPlans);
					setSelectedPlanId((prev) => {
						if (prev && fetchedPlans.some((p) => p.id === prev)) return prev;
						return fetchedPlans[0]?.id ?? null;
					});
				} else if (isDemoShowcaseMode()) {
					setLoadedPlans([DEMO_CANONICAL_TREATMENT_PLAN]);
					setSelectedPlanId(DEMO_CANONICAL_TREATMENT_PLAN.id);
				} else {
					setLoadedPlans([]);
				}
			})
			.catch((err: unknown) => {
				if (!isMounted) return;
				if (isDemoShowcaseMode()) {
					setLoadedPlans([DEMO_CANONICAL_TREATMENT_PLAN]);
					setSelectedPlanId(DEMO_CANONICAL_TREATMENT_PLAN.id);
				} else {
					setFetchError(err instanceof Error ? err.message : "Не удалось загрузить планы лечения");
				}
			})
			.finally(() => {
				if (isMounted) setIsLoading(false);
			});

		return () => {
			isMounted = false;
		};
	}, [effectivePatientId, propPlans, reloadTrigger]);

	const activePlan = useMemo(() => {
		if (loadedPlans.length === 0) return null;
		return loadedPlans.find((p) => p.id === selectedPlanId) || loadedPlans[0] || null;
	}, [loadedPlans, selectedPlanId]);

	// Динамические позиции плана лечения
	const effectiveItems: TreatmentPlanItem[] = useMemo(() => {
		if (propItems && propItems.length > 0) {
			return propItems.map((it, idx) => {
				const raw = it as Record<string, unknown>;
				const unitPrice = typeof raw.unitPriceRub === "number"
					? raw.unitPriceRub
					: (typeof raw.priceRub === "number"
						? raw.priceRub
						: (typeof raw.snapshotUnitPriceRub === "number" ? raw.snapshotUnitPriceRub : 0));
				const discount = typeof raw.discountRub === "number" ? raw.discountRub : 0;
				const quantity = typeof raw.quantity === "number" && raw.quantity > 0 ? raw.quantity : 1;
				const name = (typeof raw.name === "string" && raw.name)
					|| (typeof raw.snapshotServiceName === "string" && raw.snapshotServiceName)
					|| "Услуга плана лечения";
				const category = (typeof raw.category === "string" && raw.category)
					|| (typeof raw.snapshotServiceCategory === "string" && raw.snapshotServiceCategory)
					|| "Терапия";
				const code804n = (typeof raw.code804n === "string" ? raw.code804n : undefined)
					|| (typeof raw.snapshotCode804n === "string" ? raw.snapshotCode804n : undefined);
				const serviceCode = (typeof raw.serviceCode === "string" && raw.serviceCode)
					|| (typeof raw.serviceId === "string" ? raw.serviceId : raw.id)
					|| "SRV-ITEM";

				const itemRecord: TreatmentPlanItem = {
					id: typeof raw.id === "string" ? raw.id : `item-${idx}`,
					toothNumber: typeof raw.toothNumber === "number" && !Number.isNaN(raw.toothNumber) ? raw.toothNumber : undefined,
					code804n,
					serviceCode: String(serviceCode),
					name,
					category,
					stageKind: (raw.stageKind as TreatmentPlanItem["stageKind"]) || "stage_1_therapy",
					stageNumber: typeof raw.stageNumber === "number" ? raw.stageNumber : 1,
					priceRub: unitPrice,
					unitPriceRub: unitPrice,
					discountRub: discount,
					quantity,
					isCompleted: raw.isCompleted === true || raw.status === "completed",
					status: (raw.status as TreatmentPlanItem["status"]) || "proposed",
					doctorName: typeof raw.doctorName === "string" ? raw.doctorName : null,
					doctorSpecialty: typeof raw.doctorSpecialty === "string" ? raw.doctorSpecialty : null,
				};
				return itemRecord;
			});
		}
		const planItems = activePlan?.items && activePlan.items.length > 0
			? activePlan.items
			: (isDemoShowcaseMode() ? DEMO_CANONICAL_TREATMENT_PLAN.items : []);
		if (!planItems || planItems.length === 0) return [];

		return planItems.map((it) => {
			const unitPrice = it.price !== undefined ? Number(it.price) : 0;
			const discount = it.discount !== undefined ? Number(it.discount) : 0;
			const quantity = it.quantity || 1;
			const toothNum = it.toothNumber ? parseInt(String(it.toothNumber), 10) : undefined;

			const itemRecord: TreatmentPlanItem = {
				id: it.id,
				toothNumber: toothNum && !Number.isNaN(toothNum) ? toothNum : undefined,
				code804n: it.priceId || undefined,
				serviceCode: it.priceId || it.id || "SRV-ITEM",
				name: it.name || "Услуга плана лечения",
				category: it.phase === 2 ? "Хирургия" : it.phase === 3 ? "Ортопедия" : "Терапия",
				stageKind: it.phase === 2 ? "stage_2_surgery" : it.phase === 3 ? "stage_3_orthopedics" : "stage_1_therapy",
				stageNumber: (it.phase as 1 | 2 | 3) || 1,
				priceRub: unitPrice,
				unitPriceRub: unitPrice,
				discountRub: discount,
				quantity,
				isCompleted: Boolean(it.isCompleted),
				status: it.status || (it.isCompleted ? "completed" : "proposed"),
				doctorName: it.doctorName || null,
				doctorSpecialty: it.doctorSpecialty || null,
				tierPrices: it.tierPrices,
			};
			return itemRecord;
		});
	}, [propItems, activePlan]);

	// Базовые клинические этапы плана лечения для канонического 3-уровневого калькулятора и печати
	const planStages: TreatmentPlanStage[] = useMemo(() => {
		if (!effectiveItems || effectiveItems.length === 0) return [];

		const STAGE_DEFAULTS: Record<number, {
			stageKind: "stage_1_therapy" | "stage_2_surgery" | "stage_3_orthopedics" | "stage_custom";
			title: string;
			subtitle: string;
			clinicalGoal: string;
		}> = {
			1: {
				stageKind: "stage_1_therapy",
				title: "Этап 1: Неотложная помощь и терапевтическая санация",
				subtitle: "Терапевтический протокол",
				clinicalGoal: "Ликвидация болевого синдрома, купирование воспаления, лечение кариеса и корневых каналов",
			},
			2: {
				stageKind: "stage_2_surgery",
				title: "Этап 2: Хирургия и дентальная имплантация",
				subtitle: "Хирургический протокол",
				clinicalGoal: "Атравматичное удаление, костная пластика и установка имплантатов",
			},
			3: {
				stageKind: "stage_3_orthopedics",
				title: "Этап 3: Ортопедия и функциональная реабилитация",
				subtitle: "Ортопедический протокол",
				clinicalGoal: "Восстановление окклюзии, анатомической эстетики и артикуляции",
			},
		};

		// 1. Если в плане лечения из БД явно заданы этапы (stages) — отображаем их
		if (activePlan?.stages && activePlan.stages.length > 0) {
			const sortedStages = [...activePlan.stages].sort((a, b) => a.stageOrder - b.stageOrder);
			const stageOrderSet = new Set(sortedStages.map((s) => s.stageOrder));

			return sortedStages.map((stageDto) => {
				const order = stageDto.stageOrder;
				// Элементы, принадлежащие данному этапу (или неразмеченные элементы попадают в 1-й этап)
				const stageItems = effectiveItems.filter((it) => {
					if (it.stageNumber === order) return true;
					if (order === 1 && (!it.stageNumber || !stageOrderSet.has(it.stageNumber))) return true;
					return false;
				});

				const stageKopecks = sumKopecks(
					stageItems.map((it) =>
						rublesToKopecks(Math.max(0, (it.unitPriceRub || it.priceRub || 0) * (it.quantity || 1) - (it.discountRub || 0)))
					)
				);
				const stageRub = kopecksToRubles(stageKopecks);
				const def = STAGE_DEFAULTS[order] ?? {
					stageKind: "stage_custom" as const,
					title: stageDto.stageName || `Этап ${order}`,
					subtitle: "Клинический протокол",
					clinicalGoal: "Стоматологическая санация и реабилитация",
				};

				return {
					id: stageDto.id || `stage-${order}`,
					stageNumber: order,
					stageKind: def.stageKind,
					title: stageDto.stageName || def.title,
					subtitle: def.subtitle,
					clinicalGoal: def.clinicalGoal,
					totalRub: stageRub,
					totalKopecks: stageKopecks,
					estimatedVisits: Math.max(1, stageItems.length),
					estimatedWeeks: order,
					status: stageDto.completionPercentage === 100 ? ("completed" as const) : ("draft" as const),
					items: stageItems.map((it, idx) => ({
						id: it.id || `item-${order}-${idx}`,
						toothNumber: typeof it.toothNumber === "number" && !Number.isNaN(it.toothNumber) ? it.toothNumber : undefined,
						code804n: it.code804n || it.serviceCode || undefined,
						name: it.name || "Стоматологическая процедура",
						priceRub: typeof it.unitPriceRub === "number" && it.unitPriceRub > 0 ? it.unitPriceRub : (it.priceRub || 0),
						unitPriceRub: typeof it.unitPriceRub === "number" && it.unitPriceRub > 0 ? it.unitPriceRub : (it.priceRub || 0),
						discountRub: it.discountRub || 0,
						quantity: it.quantity || 1,
						stageKind: def.stageKind,
						isCompleted: it.isCompleted === true || it.status === "completed",
						tierPrices: it.tierPrices,
					})),
				};
			});
		}

		// 2. Если этапов в плане нет — группируем элементы по клиническим фазам (phase 1: терапия, 2: хирургия, 3: ортопедия)
		const uniquePhases = Array.from(new Set(effectiveItems.map((it) => it.stageNumber || 1))).sort((a, b) => a - b);
		const targetPhases = uniquePhases.length > 0 ? uniquePhases : [1];

		return targetPhases.map((phaseNum) => {
			const stageItems = effectiveItems.filter((it) => (it.stageNumber || 1) === phaseNum);
			const stageKopecks = sumKopecks(
				stageItems.map((it) =>
					rublesToKopecks(Math.max(0, (it.unitPriceRub || it.priceRub || 0) * (it.quantity || 1) - (it.discountRub || 0)))
				)
			);
			const stageRub = kopecksToRubles(stageKopecks);
			const def = STAGE_DEFAULTS[phaseNum] ?? {
				stageKind: "stage_custom" as const,
				title: `Этап ${phaseNum}: Клинический этап`,
				subtitle: "Клинический протокол",
				clinicalGoal: "Стоматологическая санация и реабилитация",
			};

			return {
				id: activePlan?.id ? `${activePlan.id}-phase-${phaseNum}` : `phase-${phaseNum}`,
				stageNumber: phaseNum,
				stageKind: def.stageKind,
				title: def.title,
				subtitle: def.subtitle,
				clinicalGoal: def.clinicalGoal,
				totalRub: stageRub,
				totalKopecks: stageKopecks,
				estimatedVisits: Math.max(1, stageItems.length),
				estimatedWeeks: phaseNum,
				status: "draft" as const,
				items: stageItems.map((it, idx) => ({
					id: it.id || `item-${phaseNum}-${idx}`,
					toothNumber: typeof it.toothNumber === "number" && !Number.isNaN(it.toothNumber) ? it.toothNumber : undefined,
					code804n: it.code804n || it.serviceCode || undefined,
					name: it.name || "Стоматологическая процедура",
					priceRub: typeof it.unitPriceRub === "number" && it.unitPriceRub > 0 ? it.unitPriceRub : (it.priceRub || 0),
					unitPriceRub: typeof it.unitPriceRub === "number" && it.unitPriceRub > 0 ? it.unitPriceRub : (it.priceRub || 0),
					discountRub: it.discountRub || 0,
					quantity: it.quantity || 1,
					stageKind: def.stageKind,
					isCompleted: it.isCompleted === true || it.status === "completed",
					tierPrices: it.tierPrices,
				})),
			};
		});
	}, [effectiveItems, activePlan]);

	// Канонический расчет 3 альтернативных тарифов без синтетических множителей (Мандат 8e)
	const canonicalTiers: readonly TreatmentPlanTier[] = useMemo(() => {
		if (planStages.length > 0) {
			return buildCanonical3TierPlans(planStages);
		}
		if (propTiers && propTiers.length > 0) {
			return propTiers.map((t) => ({
				tierId: (t.id === "economy" || t.id === "premium" ? t.id : "optimum") as TreatmentPlanTierId,
				title: t.title,
				subtitle: t.tagline,
				badge: t.badgeText || "",
				isRecommended: Boolean(t.isRecommended),
				totalRub: t.totalRub,
				totalKopecks: rublesToKopecks(t.totalRub),
				amountKopecks: BigInt(rublesToKopecks(t.totalRub)),
				warrantyYears: typeof t.warrantyYears === "number" ? t.warrantyYears : 1,
				keyAdvantages: [],
				stages: [],
			}));
		}
		return [];
	}, [planStages, propTiers]);

	// Динамический расчет тарифов на основе реальных позиций или переданных тарифов
	const effectiveTiers: TreatmentTierOption[] = useMemo(() => {
		if (propTiers && propTiers.length > 0) {
			return propTiers.map((t) => ({
				...t,
				tagline: t.tagline.replace(/E\.max/gi, "Премиальная безметалловая керамика"),
			}));
		}
		if (canonicalTiers && canonicalTiers.length > 0) {
			const planTitle = activePlan?.name || "Утверждённый план";
			const economyTier = canonicalTiers.find((t) => t.tierId === "economy");
			const optimumTier = canonicalTiers.find((t) => t.tierId === "optimum");
			const premiumTier = canonicalTiers.find((t) => t.tierId === "premium");

			return [
				{
					id: "economy",
					title: "Базовый вариант",
					tagline: PLAN_TIER_CONFIGS.economy.descriptionRu,
					totalRub: economyTier?.totalRub || 0,
					warrantyYears: typeof PLAN_TIER_CONFIGS.economy.warrantyYears === "number" ? PLAN_TIER_CONFIGS.economy.warrantyYears : 1,
					isRecommended: false,
					accentClass: "border-[var(--line)] bg-[var(--paper-soft)]",
					badgeText: PLAN_TIER_CONFIGS.economy.badgeRu,
				},
				{
					id: "optimum",
					title: planTitle,
					tagline: PLAN_TIER_CONFIGS.optimum.descriptionRu,
					totalRub: optimumTier?.totalRub || 0,
					warrantyYears: typeof PLAN_TIER_CONFIGS.optimum.warrantyYears === "number" ? PLAN_TIER_CONFIGS.optimum.warrantyYears : 3,
					isRecommended: true,
					accentClass: "border-[var(--teal,var(--brand-primary))] bg-[var(--teal)]/5 ring-1 ring-[var(--teal)]/30",
					badgeText: "Рекомендация клиники",
				},
				{
					id: "premium",
					title: "Премиум VIP",
					tagline: PLAN_TIER_CONFIGS.premium.descriptionRu,
					totalRub: premiumTier?.totalRub || 0,
					warrantyYears: 10,
					isRecommended: false,
					accentClass: "border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal)]/40",
					badgeText: PLAN_TIER_CONFIGS.premium.badgeRu,
				},
			];
		}
		return [];
	}, [propTiers, canonicalTiers, activePlan]);

	const hasActivePlans = effectiveTiers.length > 0 || loadedPlans.length > 0;

	const activeTierData = useMemo(() => {
		if (effectiveTiers.length === 0) return null;
		return effectiveTiers.find((t) => t.id === selectedTier) ?? effectiveTiers[0] ?? null;
	}, [effectiveTiers, selectedTier]);

	const activeCanonicalTier: TreatmentPlanTier = useMemo(() => {
		const found =
			canonicalTiers.find((t) => t.tierId === selectedTier) ||
			canonicalTiers.find((t) => t.tierId === "optimum") ||
			canonicalTiers[0];
		if (found) return found;
		return {
			tierId: selectedTier,
			title: activeTierData?.title || "План лечения",
			subtitle: activeTierData?.tagline || "",
			badge: activeTierData?.badgeText || "",
			isRecommended: activeTierData?.isRecommended ?? true,
			totalRub: activeTierData?.totalRub || 0,
			totalKopecks: rublesToKopecks(activeTierData?.totalRub || 0),
			amountKopecks: BigInt(rublesToKopecks(activeTierData?.totalRub || 0)),
			warrantyYears: activeTierData?.warrantyYears || 1,
			keyAdvantages: [],
			stages: planStages,
		};
	}, [canonicalTiers, selectedTier, activeTierData, planStages]);

	// Данные для печатного Акта выполненных работ и списания ТМЦ (Мандат 8aq)
	const completedActData = useMemo(() => {
		const targetStage = planStages[0] || {
			id: activePlan?.id || "stage-1",
			stageNumber: 1,
			stageKind: "stage_1_therapy" as const,
			title: activePlan?.name || "План лечения",
			subtitle: "Терапевтический протокол",
			clinicalGoal: "Санация полости рта",
			totalRub: activeTierData?.totalRub || 0,
			totalKopecks: rublesToKopecks(activeTierData?.totalRub || 0),
			estimatedVisits: 1,
			estimatedWeeks: 1,
			status: "completed" as const,
			items: [],
		};

		return generateCompletedWorksActAndWriteOff({
			stage: targetStage,
			contractNumber: `D-${new Date().getFullYear()}-${(effectivePatientId || "000000").slice(0, 6).toUpperCase()}`,
			patientId: effectivePatientId || "",
			patientName: patient?.fullName || "Пациент",
			doctorFullName: "Лечащий врач",
			clinicName: "Клиника DENTE",
		});
	}, [planStages, activePlan, activeTierData, effectivePatientId, patient]);

	const discountedTotalKopecks = useMemo(() => {
		if (!activeTierData) return 0;
		const baseKopecks = rublesToKopecks(activeTierData.totalRub);
		const clampedPercent = Math.min(100, Math.max(0, doctorDiscountPercent));
		const bp = clampedPercent > 0 ? basisPointsFromPercent(clampedPercent) : null;
		const doctorDiscountKopecks = bp !== null ? percentageOfKopecks(baseKopecks, bp) : 0;
		const bonusPointsKopecks = rublesToKopecks(bonusPointsToUseRub);
		return Math.max(0, baseKopecks - doctorDiscountKopecks - bonusPointsKopecks);
	}, [activeTierData, doctorDiscountPercent, bonusPointsToUseRub]);

	const discountedTotalRub = useMemo(() => {
		return kopecksToRubles(discountedTotalKopecks);
	}, [discountedTotalKopecks]);

	return {
		effectivePatientId,
		loadedPlans,
		selectedPlanId,
		setSelectedPlanId,
		isLoading,
		fetchError,
		setReloadTrigger,
		activePlan,
		effectiveItems,
		planStages,
		canonicalTiers,
		effectiveTiers,
		hasActivePlans,
		activeTierData,
		activeCanonicalTier,
		completedActData,
		selectedTier,
		setSelectedTier,
		doctorDiscountPercent,
		setDoctorDiscountPercent,
		discountedTotalKopecks,
		discountedTotalRub,
	};
}
