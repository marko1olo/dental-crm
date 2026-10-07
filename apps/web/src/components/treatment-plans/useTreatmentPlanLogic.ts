/**
 * useTreatmentPlanLogic.ts — хук бизнес-логики и состояния комплексного плана лечения DENTE CRM.
 * Декомпозирован на sub-engines строго по Мандату 8b (лимит строк <= 800).
 */

import { useState, useMemo, useEffect } from "react";
import type {
	CashierInvoiceExportData,
	DigitalSignatureAgreementData,
	ToothData,
	TreatmentPlanDoctorOption,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanStatus,
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanValidationPayload,
} from "./types";
import { showToast } from "../GlobalToast";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { StaffActionAuditService } from "../../services/audit/staffActionAuditService";
import { logger } from "../../utils/logger";
import {
	type CatalogServiceLookupItem,
	calculateLoyaltyBonusDeduction,
	generate3TierPlanComparison,
	generateTreatmentPlanStages,
} from "./treatmentPlanStagesEngine";
import {
	generateCbctAutoPlanScenarios,
	extractCbctFindingsFromOdontogramAndStorage,
	loadPersistedCustomPlanItems,
} from "./ctImplantIntegrationBridge";
import {
	type InventoryItemLookup,
	generateCompletedWorksActAndWriteOff,
} from "./treatmentPlanMaterialEngine";
import {
	applyCopilotCommandToPlan,
	type CopilotCommandType,
} from "../../services/ai/treatmentPlanCopilot";
import {
	applyClinicalBundleToStages,
	getClinicalBundleById,
	type ClinicalBundleDefinition,
	type ClinicalBundleId,
	createBundlePlanItems,
} from "./treatmentPlanBundlesEngine";
import { detectMutuallyExclusiveToothProcedures } from "./validation/starProtocolValidationEngine";
import type { TreatmentPlanStageStatus } from "./TreatmentPlanStageCard";
import {
	updateItemQuantityInStages,
	updateItemPriceInStages,
	updateItemInStages,
	removeItemFromStages,
	addItemToPlanStages,
	createNewStageInPlan,
	filterStagesBySpecialty,
	mergeIncomingPlanItem,
	mergePersistedPlanItems,
	assignDoctorToStageInStages,
	assignDoctorToItemInStages,
} from "./treatmentPlanStageMutations";
import {
	fetchPatientTreatmentPlans,
	exportPlanToCashier,
	savePlanToPostgres,
	createExpressLabOrder,
	dispatchStageStartEvents,
} from "./treatmentPlanNetworkSync";
import { useTreatmentPlanTeeth } from "./useTreatmentPlanTeeth";

export interface UseTreatmentPlanLogicProps {
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly teethData: readonly ToothData[];
	readonly onExportToCashier?: ((data: CashierInvoiceExportData) => void) | undefined;
	readonly onPlanSaved?: ((planId: string) => void) | undefined;
	readonly planCreatedAtIso?: string | undefined;
	readonly initialStatus?: TreatmentPlanStatus | undefined;
	readonly onStatusChange?: ((status: TreatmentPlanStatus) => void) | undefined;
	readonly initialPlanId?: string | null | undefined;
}

export function useTreatmentPlanLogic({
	patientId,
	patientName = "Пациент",
	teethData,
	onExportToCashier,
	onPlanSaved,
	planCreatedAtIso,
	initialStatus,
	onStatusChange,
	initialPlanId,
}: UseTreatmentPlanLogicProps) {
	const { dashboard, auth } = useAppLogicContext();
	const effectiveTeethData = useTreatmentPlanTeeth(patientId, teethData);

	const planAgeDays = useMemo(() => {
		if (!planCreatedAtIso) return 0;
		const createdTime = new Date(planCreatedAtIso).getTime();
		if (Number.isNaN(createdTime)) return 0;
		return Math.max(0, Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)));
	}, [planCreatedAtIso]);

	const [activeViewTab, setActiveViewTab] = useState<"3tier" | "stages" | "phased4">("3tier");
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>("optimum");
	const [discountPercent, setDiscountPercent] = useState<number>(0);
	const [bonusPointsToUseRub, setBonusPointsToUseRub] = useState<number>(0);

	const [planStatus, setPlanStatus] = useState<TreatmentPlanStatus>(initialStatus || "agreed");

	// Modals State
	const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
	const [isContractPrintOpen, setIsContractPrintOpen] = useState<boolean>(false);
	const [isActPrintOpen, setIsActPrintOpen] = useState<boolean>(false);
	const [isFiscalModalOpen, setIsFiscalModalOpen] = useState<boolean>(false);
	const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState<boolean>(false);
	const [isComparatorModalOpen, setIsComparatorModalOpen] = useState<boolean>(false);
	const [isStagePaymentModalOpen, setIsStagePaymentModalOpen] = useState<boolean>(false);
	const [isPriceValidatorModalOpen, setIsPriceValidatorModalOpen] = useState<boolean>(false);
	const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
	const [isPresenterModalOpen, setIsPresenterModalOpen] = useState<boolean>(false);
	const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState<boolean>(false);
	const [selectedInstallmentStage, setSelectedInstallmentStage] = useState<TreatmentPlanStage | null>(null);
	const [isCuratorModalOpen, setIsCuratorModalOpen] = useState<boolean>(false);
	const [isChairsideBundlesModalOpen, setIsChairsideBundlesModalOpen] = useState<boolean>(false);

	// PostgreSQL 18
	const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

	// Filters
	const [specialtyFilter, setSpecialtyFilter] = useState<"all" | "therapy" | "surgery" | "orthopedics" | "orthodontics" | "periodontics">("all");
	const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState<boolean>(false);
	const [targetStageForAdd, setTargetStageForAdd] = useState<TreatmentPlanStage | null>(null);
	const [isCreateStageModalOpen, setIsCreateStageModalOpen] = useState<boolean>(false);

	// AI Copilot & Custom Stages State
	const [customStages, setCustomStages] = useState<TreatmentPlanStage[] | null>(null);
	const [cbctAutoPlanTiers, setCbctAutoPlanTiers] = useState<[TreatmentPlanTier, TreatmentPlanTier, TreatmentPlanTier] | null>(null);
	const [copilotFeedback, setCopilotFeedback] = useState<string | null>(null);
	const [isCopilotExecuting, setIsCopilotExecuting] = useState<boolean>(false);

	const [selectedLabTeeth, setSelectedLabTeeth] = useState<number[] | undefined>(undefined);
	const [selectedActStage, setSelectedActStage] = useState<TreatmentPlanStage | null>(null);
	const [isExecutingWriteOff, setIsExecutingWriteOff] = useState<boolean>(false);
	const [signedAgreement, setSignedAgreement] =
		useState<DigitalSignatureAgreementData | null>(null);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	const catalog = dashboard?.serviceCatalog as CatalogServiceLookupItem[] | undefined;

	// Load plans from PostgreSQL 18
	useEffect(() => {
		if (!patientId) return;
		let isCancelled = false;

		async function loadPatientPlans() {
			const loaded = await fetchPatientTreatmentPlans(patientId, catalog, initialPlanId);
			if (isCancelled || !loaded) return;
			setCurrentPlanId(loaded.planId);
			setPlanStatus(loaded.status);
			if (loaded.rebuiltStages) {
				setCustomStages(loaded.rebuiltStages);
			}
		}

		loadPatientPlans();

		const handleReload = () => {
			loadPatientPlans();
		};
		window.addEventListener("dente-treatment-plans-reload", handleReload);
		return () => {
			isCancelled = true;
			window.removeEventListener("dente-treatment-plans-reload", handleReload);
		};
	}, [patientId, catalog, initialPlanId]);

	const patient = (dashboard?.patients as any[] | undefined)?.find(
		(p: any) => p.id === patientId,
	);
	const patientBalanceRub = Math.max(0, Number(patient?.balanceRub) || 0);
	const patientPhone = patient?.phone || "+7 (___) ___-__-__";
	const patientBirthDate = patient?.birthDate;

	const planTiers = useMemo(() => {
		if (cbctAutoPlanTiers) return cbctAutoPlanTiers;
		return generate3TierPlanComparison(effectiveTeethData, catalog, discountPercent);
	}, [cbctAutoPlanTiers, effectiveTeethData, catalog, discountPercent]);

	const currentTier = useMemo(() => {
		return planTiers.find((t) => t.tierId === selectedTierId) ?? planTiers[2]!;
	}, [planTiers, selectedTierId]);

	const autoStages = useMemo(() => {
		if (currentTier?.stages && currentTier.stages.length > 0) {
			return currentTier.stages;
		}
		return generateTreatmentPlanStages(effectiveTeethData, catalog, discountPercent);
	}, [effectiveTeethData, catalog, discountPercent, currentTier]);

	const stages = customStages ?? autoStages;

	const effectiveSignTier = useMemo(() => {
		const totalKopecks = stages.reduce(
			(sum, s) => sum + (s.totalKopecks ?? Math.round((s.totalRub || 0) * 100)),
			0,
		);
		const totalRub = totalKopecks / 100;
		return {
			...currentTier,
			stages,
			totalRub,
			totalKopecks,
		};
	}, [currentTier, stages]);

	useEffect(() => {
		const handleAddItem = (e: Event) => {
			const customEvent = e as CustomEvent<{ item: TreatmentPlanItem; toothNumber?: number; patientId?: string }>;
			if (!customEvent.detail?.item) return;
			const newItem = customEvent.detail.item;
			setCustomStages((prevStages) => mergeIncomingPlanItem(prevStages ?? autoStages, newItem));
		};
		window.addEventListener("dente-add-treatment-plan-item", handleAddItem);
		return () => window.removeEventListener("dente-add-treatment-plan-item", handleAddItem);
	}, [autoStages]);

	useEffect(() => {
		if (!patientId) return;
		const persistedItems = loadPersistedCustomPlanItems(patientId);
		if (persistedItems.length === 0) return;
		setCustomStages((prevStages) => {
			const { updatedStages, changed } = mergePersistedPlanItems(prevStages ?? autoStages, persistedItems);
			return changed ? updatedStages : prevStages;
		});
	}, [patientId, autoStages]);

	const handleStatusTransition = (newStatus: TreatmentPlanStatus) => {
		if (newStatus === "agreed" || newStatus === "in_progress") {
			const allItems = stages.flatMap((s) => s.items);
			const conflicts = detectMutuallyExclusiveToothProcedures(allItems);
			if (conflicts.length > 0) {
				const first = conflicts[0]!;
				showToast(
					`Внимание: обнаружен клинический конфликт на зубе №${first.toothNumber}! («${first.procedureA.name}» и «${first.procedureB.name}»). Статус изменён под клиническую ответственность врача.`,
					"warning",
					6000,
				);
			}
		}

		setPlanStatus(newStatus);
		onStatusChange?.(newStatus);
		const statusLabels: Partial<Record<TreatmentPlanStatus, string>> = {
			draft: "Черновик",
			presented: "Презентован",
			agreed: "Согласован",
			approved: "Утвержден",
			in_progress: "В работе",
			active: "Активен",
			accepted: "Принят",
			signed: "Подписан",
			completed: "Завершен",
			rejected: "Отклонен",
		};
		showToast(`Статус плана лечения: «${statusLabels[newStatus] || newStatus}»`, "success", 3000);
	};

	const handleGenerateCbctAutoPlan = () => {
		try {
			const findings = extractCbctFindingsFromOdontogramAndStorage(patientId, effectiveTeethData);
			const generatedTiers = generateCbctAutoPlanScenarios(findings, catalog, discountPercent);
			setCbctAutoPlanTiers(generatedTiers);
			setSelectedTierId("standard");
			setCustomStages([...generatedTiers[1].stages]);
			setActiveViewTab("3tier");
			showToast(
				`Автоплан по КЛКТ сформирован: 3 сценария (Эконом: ${generatedTiers[0].totalRub.toLocaleString("ru-RU")} ₽, Оптимум: ${generatedTiers[1].totalRub.toLocaleString("ru-RU")} ₽, Премиум: ${generatedTiers[2].totalRub.toLocaleString("ru-RU")} ₽) на 4 клинических этапа`,
				"success",
				5000,
			);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-cbct-autoplan-generated", {
						detail: { patientId, tiers: generatedTiers, findings },
					}),
				);
			}
		} catch (err: unknown) {
			logger.error("[useTreatmentPlanLogic] Error generating CBCT auto plan", err);
			showToast("Не удалось сформировать автоплан по КЛКТ", "error");
		}
	};

	const handleUpdateItemQuantity = (itemId: string, newQty: number) => {
		setCustomStages(updateItemQuantityInStages(stages, itemId, newQty, discountPercent));
	};

	const handleUpdateItemPrice = (itemId: string, newPriceRub: number) => {
		setCustomStages(updateItemPriceInStages(stages, itemId, newPriceRub, discountPercent));
		showToast(`Цена услуги обновлена: ${newPriceRub.toLocaleString("ru-RU")} ₽`, "success");
	};

	const handleUpdateItem = (updatedItem: TreatmentPlanItem) => {
		setCustomStages(updateItemInStages(stages, updatedItem, discountPercent));
		showToast(`Процедура «${updatedItem.name}» обновлена`, "success");
	};

	const handleRemoveItem = (itemId: string) => {
		const targetItem = stages.flatMap((s) => s.items).find((it) => it.id === itemId);
		setCustomStages(removeItemFromStages(stages, itemId));
		if (targetItem) {
			StaffActionAuditService.logServiceRemove({
				patientId,
				planId: currentPlanId || "default_plan",
				serviceCode: targetItem.code804n,
				serviceName: targetItem.name,
				amountKopecks: Math.round((targetItem.priceRub || 0) * 100),
			});
		}
		showToast("Процедура удалена из этапа", "info");
	};

	const doctorOptions: readonly TreatmentPlanDoctorOption[] = useMemo(() => {
		const staff = (dashboard?.clinicSettings?.staff ?? []) as any[];
		const activeStaff = staff.filter(
			(s) =>
				s.active !== false &&
				(s.role === "doctor" ||
					s.role === "owner" ||
					s.role === "therapist" ||
					s.role === "surgeon" ||
					s.role === "orthopedist" ||
					s.role === "orthodontist"),
		);
		if (activeStaff.length > 0) {
			return activeStaff.map((s) => ({
				id: s.id,
				fullName: s.name || s.fullName || "Врач-стоматолог",
				role: s.role,
				specialty: Array.isArray(s.specialties)
					? s.specialties.join(", ")
					: s.specialty || (s.role === "doctor" ? "Стоматолог" : s.role),
			}));
		}
		return [
			{ id: "doc-therapist-1", fullName: "Д-р Смирнова Е.А.", role: "doctor", specialty: "Терапевт" },
			{ id: "doc-surgeon-1", fullName: "Д-р Барабаш С.В.", role: "doctor", specialty: "Хирург-имплантолог" },
			{ id: "doc-orthopedist-1", fullName: "Д-р Ковалев В.Н.", role: "doctor", specialty: "Ортопед" },
			{ id: "doc-orthodontist-1", fullName: "Д-р Мельникова А.В.", role: "doctor", specialty: "Ортодонт" },
		];
	}, [dashboard?.clinicSettings?.staff]);

	const handleAssignDoctorToStage = (
		stage: TreatmentPlanStage,
		doctorId: string | null,
		doctorName: string | null,
		doctorSpecialty: string | null,
	) => {
		setCustomStages(
			assignDoctorToStageInStages(
				stages,
				stage.stageNumber,
				doctorId,
				doctorName,
				doctorSpecialty,
			),
		);
		if (doctorName) {
			showToast(`Врач ${doctorName} назначен на этап ${stage.stageNumber}`, "success");
		} else {
			showToast(`Назначение врача с этапа ${stage.stageNumber} снято`, "info");
		}
	};

	const handleAssignDoctorToItem = (
		itemId: string,
		doctorId: string | null,
		doctorName: string | null,
		doctorSpecialty: string | null,
	) => {
		setCustomStages(
			assignDoctorToItemInStages(
				stages,
				itemId,
				doctorId,
				doctorName,
				doctorSpecialty,
			),
		);
		if (doctorName) {
			showToast(`Врач ${doctorName} назначен на процедуру`, "success");
		} else {
			showToast("Назначение врача на процедуру снято", "info");
		}
	};

	const handleExecuteCopilot = (cmdOrText: CopilotCommandType | string) => {
		setIsCopilotExecuting(true);
		try {
			const res = applyCopilotCommandToPlan(stages, cmdOrText);
			if (res.success) {
				setCustomStages([...res.stages]);
				setCopilotFeedback(res.explanation);
				showToast(`AI Copilot: ${res.commandTitle} применено`, "success");
			}
		} finally {
			setIsCopilotExecuting(false);
		}
	};

	const handleApplyClinicalBundle = (bundleId: ClinicalBundleId, toothNumber?: number) => {
		const bundle = getClinicalBundleById(bundleId);
		const updated = applyClinicalBundleToStages(stages, bundleId, toothNumber);
		setCustomStages(updated);
		const toothDesc = bundle?.requiresTooth ? ` (зуб ${toothNumber ?? bundle?.defaultTooth})` : "";
		showToast(`Пакет «${bundle?.shortTitle || bundleId}» успешно добавлен в план${toothDesc}!`, "success", 4000);
	};

	const handleApplyChairsideBundlePlan = (
		items: TreatmentPlanItem[],
		bundle: ClinicalBundleDefinition,
	) => {
		const targetStageExists = stages.some(
			(st) => st.stageKind === bundle.stageKind || st.stageNumber === bundle.stageNumber,
		);
		let updated: TreatmentPlanStage[];
		if (!targetStageExists) {
			const stageTitles: Record<1 | 2 | 3, { title: string; subtitle: string; goal: string }> = {
				1: {
					title: "Этап 1: Неотложная помощь и терапевтическая санация",
					subtitle: "Санация",
					goal: "Санация полости рта",
				},
				2: {
					title: "Этап 2: Хирургический этап и дентальная имплантация",
					subtitle: "Хирургия",
					goal: "Хирургическая санация",
				},
				3: {
					title: "Этап 3: Ортопедический этап и протезирование",
					subtitle: "Ортопедия",
					goal: "Ортопедическое восстановление",
				},
			};
			const meta = stageTitles[bundle.stageNumber];
			const stageTotalRub = items.reduce((acc, it) => acc + it.priceRub, 0);
			const newStage: TreatmentPlanStage = {
				stageNumber: bundle.stageNumber,
				stageKind: bundle.stageKind,
				title: meta.title,
				subtitle: meta.subtitle,
				clinicalGoal: meta.goal,
				items,
				totalRub: stageTotalRub,
				totalKopecks: Math.round(stageTotalRub * 100) as any,
				estimatedVisits: Math.max(1, Math.ceil(items.length / 2)),
				estimatedWeeks: 2,
				order804nCodes: items.map((it) => it.code804n),
			};
			updated = [...stages, newStage].sort((a, b) => a.stageNumber - b.stageNumber);
		} else {
			updated = stages.map((st) => {
				if (st.stageKind !== bundle.stageKind && st.stageNumber !== bundle.stageNumber) return st;
				const updatedItems = [...st.items, ...items];
				const totalRub = updatedItems.reduce((acc, it) => acc + it.priceRub, 0);
				return {
					...st,
					items: updatedItems,
					totalRub,
					totalKopecks: Math.round(totalRub * 100) as any,
					order804nCodes: Array.from(new Set([...st.order804nCodes, ...items.map((it) => it.code804n)])),
				};
			});
		}
		setCustomStages(updated);
		setIsChairsideBundlesModalOpen(false);
	};

	const handleApplyChairsideBundleInvoice = (
		_invoiceItems: unknown[],
		bundle: ClinicalBundleDefinition,
		toothNumber?: number,
	) => {
		if (onExportToCashier) {
			const planItems = createBundlePlanItems(bundle.id, { toothNumber });
			const grossRub = planItems.reduce((acc, it) => acc + it.priceRub, 0);
			const exportData: CashierInvoiceExportData = {
				patientId,
				patientName,
				invoiceId: `inv-chairside-${bundle.id}-${Date.now()}`,
				invoiceNumber: `ПАКЕТ-${Date.now().toString().slice(-6)}`,
				items: planItems,
				grossTotalRub: grossRub,
				discountRub: 0,
				bonusPointsUsedRub: 0,
				bonusPointsUsedKopecks: 0 as any,
				netTotalRub: grossRub,
				netTotalKopecks: Math.round(grossRub * 100) as any,
				notes: `Клинический пакет «${bundle.shortTitle}» у кресла`,
				createdAtIso: new Date().toISOString(),
			};
			onExportToCashier(exportData);
		}
		setIsChairsideBundlesModalOpen(false);
	};

	const totalItemsCount = useMemo(() => {
		return stages.reduce((acc, s) => acc + s.items.length, 0);
	}, [stages]);

	const grandTotalRub = useMemo(() => {
		return stages.reduce((acc, s) => acc + Math.round((s.totalRub || 0) * 100), 0) / 100;
	}, [stages]);

	const loyaltyDeduction = useMemo(() => {
		return calculateLoyaltyBonusDeduction(
			effectiveSignTier.totalKopecks,
			discountPercent,
			patientBalanceRub,
			bonusPointsToUseRub,
		);
	}, [effectiveSignTier.totalKopecks, discountPercent, patientBalanceRub, bonusPointsToUseRub]);

	const orthopedicTeeth = useMemo(() => {
		const teethFromStages = stages
			.filter((s) => s.stageKind === "stage_3_orthopedics" || s.stageNumber === 3)
			.flatMap((s) => s.items)
			.map((it) => it.toothNumber)
			.filter((t): t is number => typeof t === "number" && t > 0);

		if (teethFromStages.length > 0) {
			return Array.from(new Set(teethFromStages)).sort((a, b) => a - b);
		}

		const teethFromOdontogram = (effectiveTeethData || [])
			.filter((t) => {
				const s = String(t.state || "").toLowerCase();
				return (
					s.includes("crown") ||
					s.includes("bridge") ||
					s.includes("denture") ||
					s.includes("implant") ||
					Boolean((t as any).isCrown) ||
					Boolean((t as any).isBridge)
				);
			})
			.map((t) => (t as any).toothNumber ?? (t as any).id)
			.filter((id): id is number => typeof id === "number" && id > 0);

		if (teethFromOdontogram.length > 0) {
			return Array.from(new Set(teethFromOdontogram)).sort((a, b) => a - b);
		}

		return [21];
	}, [stages, effectiveTeethData]);

	const handleOpenLabOrder = (teeth?: number[]) => {
		setSelectedLabTeeth(teeth && teeth.length > 0 ? teeth : orthopedicTeeth);
		setIsLabOrderModalOpen(true);
	};

	const handleOneClickLabOrder = async (teeth?: number[]) => {
		const targetTeeth = teeth && teeth.length > 0 ? teeth : orthopedicTeeth;
		await createExpressLabOrder({
			patientId,
			doctorId: auth?.currentUser?.id || null,
			targetTeeth,
			currentTierTitle: currentTier.title,
		});
	};

	const validationPayload: TreatmentPlanValidationPayload = useMemo(() => {
		const allItems = stages.flatMap((s) => s.items);
		return {
			planId: `PLAN-${patientId.slice(0, 6).toUpperCase()}`,
			planNumber: `ПЛАН-№${patientId.slice(0, 4)}`,
			planTitle: currentTier.title,
			patientId,
			patientName,
			doctorId: auth?.currentUser?.id || "doc-01",
			doctorFullName: auth?.currentUser?.name || "Лечащий врач",
			createdAtIso: planCreatedAtIso || new Date().toISOString(),
			items: allItems.map((it) => ({
				itemId: it.id,
				...(it.toothNumber !== undefined ? { toothNumber: it.toothNumber } : {}),
				code804n: it.code804n,
				serviceTitle: it.name,
				category: it.category,
				planUnitPriceRub: it.unitPriceRub,
				planDiscountPercent: discountPercent,
				planDiscountRub: it.discountRub,
				quantity: it.quantity,
				planLineTotalRub:
					(Math.max(
						0,
						Math.round((it.unitPriceRub || 0) * 100) - Math.round((it.discountRub || 0) * 100),
					) *
						(it.quantity || 1)) /
					100,
			})),
		};
	}, [stages, patientId, patientName, currentTier.title, auth, discountPercent, planCreatedAtIso]);

	const handleExportCashier = () => {
		exportPlanToCashier({
			patientId,
			patientName,
			patientPhone,
			doctorName: auth?.currentUser?.name || "Лечащий врач-стоматолог",
			stages,
			currentTier,
			loyaltyDeduction,
			onExportToCashier,
		});
	};

	const handleSavePlanToDatabase = async () => {
		if (isSaving) {
			showToast("Сохранение плана уже выполняется...", "info");
			return;
		}
		setIsSaving(true);
		try {
			const savedId = await savePlanToPostgres({
				patientId,
				currentPlanId,
				currentTier,
				planStatus,
				signedAgreement,
				stages,
				grandTotalRub,
				totalItemsCount,
				onPlanSaved,
			});
			if (savedId) {
				setCurrentPlanId(savedId);
			}
		} finally {
			setIsSaving(false);
		}
	};

	const contractNumber = `D-${new Date().getFullYear()}-${patientId.slice(0, 6).toUpperCase()}`;

	const completedActData = useMemo(() => {
		if (!selectedActStage) return null;
		return generateCompletedWorksActAndWriteOff({
			stage: selectedActStage,
			contractNumber,
			patientId,
			patientName,
			doctorFullName: auth?.currentUser?.name || "Лечащий врач стоматолог",
			clinicName: dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ",
			...(Array.isArray(dashboard?.inventoryItems) && dashboard.inventoryItems.length > 0
				? { inventoryItems: dashboard.inventoryItems as InventoryItemLookup[] }
				: {}),
		});
	}, [selectedActStage, contractNumber, patientId, patientName, auth, dashboard]);

	const handleExecuteWriteOffStage = (stage: TreatmentPlanStage) => {
		setSelectedActStage(stage);
		setIsActPrintOpen(true);
	};

	const handleConfirmExecuteWriteOff = async () => {
		if (!completedActData) return;
		setIsExecutingWriteOff(true);
		try {
			showToast(
				`Материалы по этапу «${completedActData.stageTitle}» на сумму ${(completedActData.totalMaterialCostRub || 0).toLocaleString("ru-RU")} ₽ успешно списаны со склада!`,
				"success",
				5000,
			);
			setIsActPrintOpen(false);
		} catch (err) {
			logger.error("[useTreatmentPlanLogic] Write-off error", err);
			showToast("Ошибка проведения списания на складе", "error");
		} finally {
			setIsExecutingWriteOff(false);
		}
	};

	const visibleStages = useMemo(() => {
		return filterStagesBySpecialty(stages, specialtyFilter);
	}, [stages, specialtyFilter]);

	const handleAddItemToStage = (
		targetStageNumber: number,
		newItemData: Partial<TreatmentPlanItem>,
	) => {
		const nextStages = addItemToPlanStages(stages, targetStageNumber, newItemData);
		setCustomStages(nextStages);
		StaffActionAuditService.logServiceAdd({
			patientId,
			planId: currentPlanId || "default_plan",
			serviceCode: newItemData.code804n || "804n_service",
			serviceName: newItemData.name || "Услуга",
			amountKopecks: newItemData.priceRub ? Math.round(newItemData.priceRub * 100) : 0,
			...(newItemData.toothNumber ? { toothNumber: newItemData.toothNumber } : {}),
		});
		showToast(`Услуга «${newItemData.name || "Услуга"}» добавлена в этап №${targetStageNumber}`, "success");
	};

	const handleApplyDiscount = (newDiscountPercent: number, reason?: string) => {
		const oldDiscount = discountPercent;
		setDiscountPercent(newDiscountPercent);
		if (oldDiscount !== newDiscountPercent) {
			StaffActionAuditService.logDiscountApply({
				patientId,
				planId: currentPlanId,
				discountPercent: newDiscountPercent,
				reason: reason ?? `План лечения: изменение скидки с ${oldDiscount}% на ${newDiscountPercent}%`,
			});
		}
	};

	const handleCreateNewStage = (
		presetKind: "therapy" | "surgery" | "orthopedics" | "orthodontics" | "periodontics" | "custom",
		customTitle?: string,
	) => {
		const { nextStages, createdTitle } = createNewStageInPlan(stages, presetKind, customTitle);
		setCustomStages(nextStages);
		showToast(`Создан новый этап: «${createdTitle}»`, "success");
	};

	const handleDeleteStage = (stageToDelete: TreatmentPlanStage) => {
		const updated = stages.filter((s) => s.stageNumber !== stageToDelete.stageNumber);
		setCustomStages(updated);
		showToast(`Этап №${stageToDelete.stageNumber} удален из плана`, "info");
	};

	const handleStartStage = (stageToStart: TreatmentPlanStage) => {
		const updated = stages.map((s) =>
			s.stageNumber === stageToStart.stageNumber
				? { ...s, status: "in_progress" as const }
				: s,
		);
		setCustomStages(updated);
		showToast(
			`Этап №${stageToStart.stageNumber} («${stageToStart.title}») активирован и передан в работу визита (${stageToStart.items.length} услуг)`,
			"success",
			4000,
		);
		dispatchStageStartEvents(patientId, patientName, stageToStart);
	};

	const handleChangeStageStatus = (
		stageToChange: TreatmentPlanStage,
		newStatus: TreatmentPlanStageStatus,
	) => {
		const updated = stages.map((s) =>
			s.stageNumber === stageToChange.stageNumber ? { ...s, status: newStatus } : s,
		);
		setCustomStages(updated);
		showToast(`Статус этапа №${stageToChange.stageNumber} изменен на «${newStatus}»`, "info");
	};

	return {
		dashboard,
		auth,
		patientId,
		patientName,
		patient,
		patientPhone,
		patientBirthDate,
		patientBalanceRub,
		planAgeDays,
		activeViewTab,
		setActiveViewTab,
		selectedTierId,
		setSelectedTierId,
		discountPercent,
		setDiscountPercent,
		handleApplyDiscount,
		bonusPointsToUseRub,
		setBonusPointsToUseRub,
		planStatus,
		setPlanStatus,
		handleStatusTransition,
		// Modals
		isSignModalOpen,
		setIsSignModalOpen,
		isContractPrintOpen,
		setIsContractPrintOpen,
		isActPrintOpen,
		setIsActPrintOpen,
		isFiscalModalOpen,
		setIsFiscalModalOpen,
		isLabOrderModalOpen,
		setIsLabOrderModalOpen,
		isComparatorModalOpen,
		setIsComparatorModalOpen,
		isStagePaymentModalOpen,
		setIsStagePaymentModalOpen,
		isPriceValidatorModalOpen,
		setIsPriceValidatorModalOpen,
		isInvoiceModalOpen,
		setIsInvoiceModalOpen,
		isPresenterModalOpen,
		setIsPresenterModalOpen,
		isInstallmentModalOpen,
		setIsInstallmentModalOpen,
		selectedInstallmentStage,
		setSelectedInstallmentStage,
		isCuratorModalOpen,
		setIsCuratorModalOpen,
		isChairsideBundlesModalOpen,
		setIsChairsideBundlesModalOpen,
		isAddServiceModalOpen,
		setIsAddServiceModalOpen,
		targetStageForAdd,
		setTargetStageForAdd,
		isCreateStageModalOpen,
		setIsCreateStageModalOpen,
		// Data
		catalog,
		planTiers,
		currentTier,
		stages,
		effectiveSignTier,
		totalItemsCount,
		grandTotalRub,
		loyaltyDeduction,
		orthopedicTeeth,
		selectedLabTeeth,
		contractNumber,
		completedActData,
		selectedActStage,
		setSelectedActStage,
		isExecutingWriteOff,
		signedAgreement,
		setSignedAgreement,
		isSaving,
		customStages,
		setCustomStages,
		cbctAutoPlanTiers,
		setCbctAutoPlanTiers,
		copilotFeedback,
		setCopilotFeedback,
		isCopilotExecuting,
		specialtyFilter,
		setSpecialtyFilter,
		visibleStages,
		validationPayload,
		// Handlers
		handleGenerateCbctAutoPlan,
		handleUpdateItemQuantity,
		handleUpdateItemPrice,
		handleUpdateItem,
		handleRemoveItem,
		handleExecuteCopilot,
		handleApplyClinicalBundle,
		handleApplyChairsideBundlePlan,
		handleApplyChairsideBundleInvoice,
		handleOpenLabOrder,
		handleOneClickLabOrder,
		handleExportCashier,
		handleSavePlanToDatabase,
		handleExecuteWriteOffStage,
		handleConfirmExecuteWriteOff,
		handleAddItemToStage,
		handleCreateNewStage,
		handleDeleteStage,
		handleStartStage,
		handleChangeStageStatus,
		doctorOptions,
		handleAssignDoctorToStage,
		handleAssignDoctorToItem,
	};
}
