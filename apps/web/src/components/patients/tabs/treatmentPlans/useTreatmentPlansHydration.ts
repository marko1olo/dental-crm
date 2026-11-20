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
} from "@dental/shared";
import { buildCanonical3TierPlans } from "../../../treatment-plans/treatmentPlanCatalogData";
import { generateCompletedWorksActAndWriteOff } from "../../../treatment-plans/treatmentPlanMaterialEngine";
import type {
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanItem,
} from "../../../treatment-plans/types";
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
import type { AnyTreatmentPlanItem } from "../../plansList/treatmentPlansListTypes";
import type { PatientGeneralInfo } from "../PatientGeneralInfoTab";

export interface UseTreatmentPlansHydrationParams {
	patient?: PatientGeneralInfo | null | undefined;
	patientId?: string | undefined;
	items?: readonly AnyTreatmentPlanItem[] | undefined;
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
				if ("stageKind" in it && typeof it.stageKind === "string" && "name" in it && typeof it.priceRub === "number") {
					return it as TreatmentPlanItem;
				}
				const toothNum = "toothCode" in it && it.toothCode
					? parseInt(String(it.toothCode), 10)
					: ("toothNumber" in it && typeof it.toothNumber === "number" ? it.toothNumber : undefined);
				const unitPrice = "unitPriceRub" in it && typeof it.unitPriceRub === "number"
					? it.unitPriceRub
					: ("price" in it && typeof it.price === "number" ? it.price : 0);
				const discount = "discountRub" in it && typeof it.discountRub === "number"
					? it.discountRub
					: ("discount" in it && typeof it.discount === "number" ? it.discount : 0);
				const quantity = ("quantity" in it && typeof it.quantity === "number" ? it.quantity : 1) || 1;
				const name = ("snapshotServiceName" in it && it.snapshotServiceName) || ("name" in it && it.name) || "Услуга плана лечения";

				const itemRecord: TreatmentPlanItem = {
					id: it.id || `item-${idx}`,
					toothNumber: toothNum && !Number.isNaN(toothNum) ? toothNum : undefined,
					code804n: ("serviceCode" in it && it.serviceCode) || ("code804n" in it && it.code804n) || ("serviceId" in it && it.serviceId) || undefined,
					serviceCode: ("serviceCode" in it && it.serviceCode) || it.id || "SRV-ITEM",
					name,
					category: ("category" in it && it.category) || ("snapshotServiceCategory" in it && it.snapshotServiceCategory) || "Терапия",
					stageKind: "stage_1_therapy",
					stageNumber: 1,
					priceRub: unitPrice,
					unitPriceRub: unitPrice,
					discountRub: discount,
					quantity,
					isCompleted: it.status === "completed",
					status: it.status || "proposed",
					doctorName: "doctorName" in it ? it.doctorName ?? null : null,
					doctorSpecialty: "doctorSpecialty" in it ? it.doctorSpecialty ?? null : null,
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
				category: "Терапия",
				stageKind: "stage_1_therapy",
				stageNumber: (it.phase as 1 | 2 | 3) || 1,
				priceRub: unitPrice,
				unitPriceRub: unitPrice,
				discountRub: discount,
				quantity,
				isCompleted: Boolean(it.isCompleted),
				status: it.status || (it.isCompleted ? "completed" : "proposed"),
				doctorName: it.doctorName || null,
				doctorSpecialty: it.doctorSpecialty || null,
				tierPrices: (it as unknown as { tierPrices?: Record<string, number> }).tierPrices,
			};
			return itemRecord;
		});
	}, [propItems, activePlan]);

	// Базовые клинические этапы плана лечения для канонического 3-уровневого калькулятора и печати
	const planStages: TreatmentPlanStage[] = useMemo(() => {
		if (!effectiveItems || effectiveItems.length === 0) return [];
		const totalKopecks = sumKopecks(
			effectiveItems.map((it) =>
				rublesToKopecks(Math.max(0, (it.unitPriceRub || it.priceRub || 0) * (it.quantity || 1) - (it.discountRub || 0)))
			)
		);
		const totalRub = kopecksToRubles(totalKopecks);

		return [
			{
				id: activePlan?.id || "stage-current",
				stageNumber: 1,
				stageKind: "stage_1_therapy" as const,
				title: activePlan?.name || "Комплексный план лечения",
				subtitle: "Терапевтический и клинический протокол",
				clinicalGoal: "Комплексная стоматологическая санация и реабилитация",
				totalRub,
				totalKopecks,
				estimatedVisits: 1,
				estimatedWeeks: 1,
				status: "draft" as const,
				items: effectiveItems.map((it, idx) => {
					const toothNum = typeof it.toothNumber === "number" && !Number.isNaN(it.toothNumber)
						? it.toothNumber
						: undefined;
					const price = typeof it.unitPriceRub === "number" && it.unitPriceRub > 0
						? it.unitPriceRub
						: (it.priceRub || 0);
					return {
						id: it.id || `item-${idx}`,
						toothNumber: toothNum,
						code804n: it.code804n || it.serviceCode || undefined,
						name: it.name || "Стоматологическая процедура",
						priceRub: price,
						unitPriceRub: price,
						discountRub: it.discountRub || 0,
						quantity: it.quantity || 1,
						stageKind: "stage_1_therapy" as const,
						isCompleted: it.isCompleted === true || it.status === "completed",
						tierPrices: it.tierPrices,
					};
				}),
			},
		];
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

	const discountedTotalRub = useMemo(() => {
		if (!activeTierData) return 0;
		const base = activeTierData.totalRub;
		const baseKopecks = rublesToKopecks(base);
		const discountFactor = Math.max(0, 1 - doctorDiscountPercent / 100);
		const withDiscountRub = kopecksToRubles(Math.round(baseKopecks * discountFactor));
		return Math.max(0, withDiscountRub - bonusPointsToUseRub);
	}, [activeTierData, doctorDiscountPercent, bonusPointsToUseRub]);

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
		discountedTotalRub,
	};
}
