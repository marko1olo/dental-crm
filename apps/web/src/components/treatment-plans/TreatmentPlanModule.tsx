/**
 * TreatmentPlanModule.tsx — главный модуль управления планами лечения и финансовой оценки DENTE CRM.
 */

import React, { useMemo, useState, useRef, useEffect, lazy, Suspense } from "react";
import {
	Activity,
	Bot,
	Check,
	ChevronDown,
	Clock,
	Coins,
	FileCheck,
	FileText,
	Filter,
	FlaskConical,
	FolderPlus,
	Layers,
	MoreVertical,
	PackageCheck,
	PenTool,
	Percent,
	Plus,
	Receipt,
	Save,
	Search,
	Send,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Trash2,
	UserCheck,
	X,
	Zap,
} from "lucide-react";
import { type Kopecks, parseKopecks } from "@dental/shared";
import type { TreatmentPlanItem, TreatmentPlanStageKind } from "./types";
import { romanizeStageNumber } from "./types";
import {
	type BillingInvoice,
	loadStoredInvoices,
	saveStoredInvoices,
} from "../billing/InvoicesView";
import type { ToothData } from "../odontogram/ToothChart";
import { showToast } from "../GlobalToast";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { logger } from "../../utils/logger";
import {
	type CatalogServiceLookupItem,
	calculateLoyaltyBonusDeduction,
	generate3TierPlanComparison,
	generateTreatmentPlanStages,
	buildStagesFromPlanItems,
	ORDER_804N_DICTIONARY,
} from "./treatmentPlanStagesEngine";
import { loadPersistedCustomPlanItems } from "../radiology/ctImplantIntegrationBridge";
import {
	type InventoryItemLookup,
	generateCompletedWorksActAndWriteOff,
} from "./treatmentPlanMaterialEngine";
import {
	applyCopilotCommandToPlan,
	COPILOT_PRESET_ACTIONS,
	type CopilotCommandType,
} from "../../services/ai/treatmentPlanCopilot";
import { TreatmentPlan3TierComparison } from "./TreatmentPlan3TierComparison";
import { TreatmentPlanPhased4StageView } from "./TreatmentPlanPhased4StageView";

const TreatmentPlanContractPrint = lazy(() =>
	import("./TreatmentPlanContractPrint").then((module) => ({
		default: module.TreatmentPlanContractPrint,
	})),
);
const TreatmentPlanCompletedActPrint = lazy(() =>
	import("./TreatmentPlanCompletedActPrint").then((module) => ({
		default: module.TreatmentPlanCompletedActPrint,
	})),
);
const TreatmentPlanSignatureModal = lazy(() =>
	import("./TreatmentPlanSignatureModal").then((module) => ({
		default: module.TreatmentPlanSignatureModal,
	})),
);
import { TreatmentPlanStageCard, type TreatmentPlanStageStatus } from "./TreatmentPlanStageCard";
const TreatmentPlanComparatorModal = lazy(() =>
	import("./comparator/TreatmentPlanComparatorModal").then((module) => ({
		default: module.TreatmentPlanComparatorModal,
	})),
);
const StagePaymentPlanModal = lazy(() =>
	import("./stagePayment/StagePaymentPlanModal").then((module) => ({
		default: module.StagePaymentPlanModal,
	})),
);
const TreatmentPlanPriceValidatorModal = lazy(() =>
	import("./validation/TreatmentPlanPriceValidatorModal").then((module) => ({
		default: module.TreatmentPlanPriceValidatorModal,
	})),
);
const TreatmentPlanPresenterModal = lazy(() =>
	import("./TreatmentPlanPresenterModal").then((module) => ({
		default: module.TreatmentPlanPresenterModal,
	})),
);
import { ClinicalBundlesPanel } from "./ClinicalBundlesPanel";
import {
	CLINICAL_BUNDLES,
	applyClinicalBundleToStages,
	getClinicalBundleById,
	type ClinicalBundleDefinition,
	type ClinicalBundleId,
	createBundlePlanItems,
} from "./treatmentPlanBundlesEngine";
const ClinicalServiceBundlesModal = lazy(() =>
	import("./ClinicalServiceBundlesModal").then((module) => ({
		default: module.ClinicalServiceBundlesModal,
	})),
);
const FiscalReceipt54FzModal = lazy(() =>
	import("../finance/FiscalReceipt54FzModal").then((module) => ({
		default: module.FiscalReceipt54FzModal,
	})),
);
const InvoiceGenerationModal = lazy(() =>
	import("../finance/InvoiceGenerationModal").then((module) => ({
		default: module.InvoiceGenerationModal,
	})),
);
const LabWorkOrderModal = lazy(() =>
	import("../lab/orders/LabWorkOrderModal").then((module) => ({
		default: module.LabWorkOrderModal,
	})),
);
import {
	ONE_CLICK_LAB_DEFAULTS,
	addWorkingDays,
	calculateMaterialTotalCostKopecks,
} from "../lab/labMath";
const BankInstallmentQrModal = lazy(() =>
	import("../payments/BankInstallmentQrModal").then((module) => ({
		default: module.BankInstallmentQrModal,
	})),
);
const CuratorPlanAssignmentModal = lazy(() =>
	import("./CuratorPlanAssignmentModal").then((module) => ({
		default: module.CuratorPlanAssignmentModal,
	})),
);
import type {
	CashierInvoiceExportData,
	DigitalSignatureAgreementData,
	TreatmentPlanStage,
	TreatmentPlanTierId,
} from "./types";
import type { TreatmentPlanValidationPayload } from "./validation/planPriceValidationPresets";
import { detectMutuallyExclusiveToothProcedures } from "./validation/starProtocolValidationEngine";

export type TreatmentPlanStatusFilter = "all" | "draft" | "agreed" | "in_progress" | "completed";

export interface TreatmentPlanModuleProps {
	readonly patientId: string;
	readonly patientName?: string;
	readonly teethData: readonly ToothData[];
	readonly onExportToCashier?: ((data: CashierInvoiceExportData) => void) | undefined;
	readonly onPlanSaved?: (planId: string) => void;
	readonly className?: string;
	readonly planCreatedAtIso?: string;
	readonly initialOptionsMenuOpen?: boolean;
	readonly initialStatus?: "draft" | "agreed" | "in_progress" | "completed";
	readonly onStatusChange?: (status: "draft" | "agreed" | "in_progress" | "completed") => void;
}

export const TreatmentPlanModule: React.FC<TreatmentPlanModuleProps> = ({
	patientId,
	patientName = "Пациент",
	teethData,
	onExportToCashier,
	onPlanSaved,
	className = "",
	planCreatedAtIso,
	initialOptionsMenuOpen = false,
	initialStatus,
	onStatusChange,
}) => {
	const { dashboard, auth } = useAppLogicContext();

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

	// Treatment Plan 1-Click Status Transitions (Mandates 8e, 8c — Doctor Autonomy & Zero Barriers)
	const [planStatus, setPlanStatus] = useState<"draft" | "agreed" | "in_progress" | "completed">(
		initialStatus || "agreed",
	);

	const handleStatusTransition = (newStatus: "draft" | "agreed" | "in_progress" | "completed") => {
		if (newStatus === "agreed" || newStatus === "in_progress") {
			const allItems = stages.flatMap((s) => s.items);
			const conflicts = detectMutuallyExclusiveToothProcedures(allItems);
			if (conflicts.length > 0) {
				const first = conflicts[0]!;
				showToast(
					`Невозможно согласовать план: обнаружен клинический конфликт на зубе №${first.toothNumber}! Одновременно назначены «${first.procedureA.name}» и «${first.procedureB.name}».`,
					"error",
					7000,
				);
				return;
			}
		}

		setPlanStatus(newStatus);
		onStatusChange?.(newStatus);
		const statusLabels: Record<"draft" | "agreed" | "in_progress" | "completed", string> = {
			draft: "Черновик",
			agreed: "Согласован",
			in_progress: "В работе",
			completed: "Завершен",
		};
		showToast(`Статус плана лечения: «${statusLabels[newStatus]}»`, "success", 3000);
	};

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
	const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState<boolean>(initialOptionsMenuOpen);
	const optionsMenuRef = useRef<HTMLDivElement>(null);

	// PostgreSQL 18: идентификатор плана в базе и статус сетевой загрузки
	const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
	const [isLoadingPlan, setIsLoadingPlan] = useState<boolean>(false);

	// Фильтр по специальности врача и ручное редактирование этапов / услуг
	const [specialtyFilter, setSpecialtyFilter] = useState<
		"all" | "therapy" | "surgery" | "orthopedics" | "orthodontics" | "periodontics"
	>("all");
	const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState<boolean>(false);
	const [targetStageForAdd, setTargetStageForAdd] = useState<TreatmentPlanStage | null>(null);
	const [isCreateStageModalOpen, setIsCreateStageModalOpen] = useState<boolean>(false);

	// Модальное окно добавления услуги из прейскуранта
	const [serviceSearchQuery, setServiceSearchQuery] = useState<string>("");
	const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogServiceLookupItem | null>(null);
	const [selectedToothForService, setSelectedToothForService] = useState<number | null>(null);
	const [serviceQuantity, setServiceQuantity] = useState<number>(1);
	const [serviceDiscountPercent, setServiceDiscountPercent] = useState<number>(0);
	const [serviceTargetStageNumber, setServiceTargetStageNumber] = useState<number>(1);
	const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>("all");

	// Модальное окно создания этапа
	const [newStagePreset, setNewStagePreset] = useState<
		"therapy" | "surgery" | "orthopedics" | "orthodontics" | "periodontics" | "custom"
	>("therapy");
	const [newStageCustomTitle, setNewStageCustomTitle] = useState<string>("");

	// AI Copilot & Custom Stages State
	const [customStages, setCustomStages] = useState<TreatmentPlanStage[] | null>(null);
	const [copilotFeedback, setCopilotFeedback] = useState<string | null>(null);
	const [isCopilotExecuting, setIsCopilotExecuting] = useState<boolean>(false);

	const catalog = dashboard?.serviceCatalog as CatalogServiceLookupItem[] | undefined;

	// Честная загрузка плана лечения из PostgreSQL 18
	useEffect(() => {
		if (!patientId) return;
		let isCancelled = false;

		async function loadPatientPlans() {
			setIsLoadingPlan(true);
			try {
				const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/treatment-plans`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (isCancelled) return;
				if (data?.success && Array.isArray(data.plans) && data.plans.length > 0) {
					const latestPlan =
						data.plans.find((p: any) => p.status === "Approved" || p.status === "Active") ||
						data.plans[0];
					if (latestPlan) {
						setCurrentPlanId(latestPlan.id);
						if (latestPlan.status === "Approved") setPlanStatus("agreed");
						else if (latestPlan.status === "Active") setPlanStatus("in_progress");
						else if (latestPlan.status === "Completed") setPlanStatus("completed");
						else setPlanStatus("draft");

						if (Array.isArray(latestPlan.items) && latestPlan.items.length > 0) {
							const rebuilt = buildStagesFromPlanItems(latestPlan.items, catalog);
							if (rebuilt.length > 0) {
								setCustomStages(rebuilt);
							}
						}
					}
				}
			} catch (e) {
				logger.warn("[TreatmentPlanModule] Ошибка загрузки планов пациента из БД", e);
			} finally {
				if (!isCancelled) setIsLoadingPlan(false);
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
	}, [patientId, catalog]);

	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
				setIsOptionsMenuOpen(false);
			}
		};
		if (isOptionsMenuOpen) {
			document.addEventListener("mousedown", handleOutside);
		}
		return () => document.removeEventListener("mousedown", handleOutside);
	}, [isOptionsMenuOpen]);

	const [selectedLabTeeth, setSelectedLabTeeth] = useState<number[] | undefined>(undefined);
	const [selectedActStage, setSelectedActStage] = useState<TreatmentPlanStage | null>(null);
	const [isExecutingWriteOff, setIsExecutingWriteOff] = useState<boolean>(false);
	const [signedAgreement, setSignedAgreement] =
		useState<DigitalSignatureAgreementData | null>(null);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	const patient = (dashboard?.patients as any[] | undefined)?.find(
		(p: any) => p.id === patientId,
	);
	const patientBalanceRub = Math.max(0, Number(patient?.balanceRub) || 0);
	const patientPhone = patient?.phone || "+7 (___) ___-__-__";
	const patientBirthDate = patient?.birthDate;

	// 1. Auto-generate 3-tier proposals from odontogram teeth findings
	const planTiers = useMemo(() => {
		return generate3TierPlanComparison(teethData, catalog, discountPercent);
	}, [teethData, catalog, discountPercent]);

	const currentTier = useMemo(() => {
		return planTiers.find((t) => t.tierId === selectedTierId) ?? planTiers[2]!;
	}, [planTiers, selectedTierId]);

	// 2. Generate granular 3 clinical stages (auto or AI-customized)
	const autoStages = useMemo(() => {
		const generated = generateTreatmentPlanStages(teethData, catalog, discountPercent);
		const hasItems = generated.some((s) => s.items && s.items.length > 0);
		if (!hasItems && currentTier?.stages && currentTier.stages.length > 0) {
			return currentTier.stages;
		}
		return generated;
	}, [teethData, catalog, discountPercent, currentTier]);

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
			setCustomStages((prevStages) => {
				const current = prevStages ?? autoStages;
				return current.map((st) => {
					if (st.stageKind === newItem.stageKind || (newItem.phase && st.stageNumber === newItem.phase)) {
						if (st.items.some((it) => it.id === newItem.id)) {
							return st;
						}
						const updatedItems = [...st.items, newItem];
						const totalKopecks = updatedItems.reduce((acc, it) => acc + Math.round((it.priceRub || 0) * 100), 0);
						return {
							...st,
							items: updatedItems,
							totalRub: totalKopecks / 100,
							totalKopecks,
							order804nCodes: Array.from(new Set([...st.order804nCodes, newItem.code804n])),
						};
					}
					return st;
				});
			});
		};
		window.addEventListener("dente-add-treatment-plan-item", handleAddItem);
		return () => window.removeEventListener("dente-add-treatment-plan-item", handleAddItem);
	}, [autoStages]);

	useEffect(() => {
		if (!patientId) return;
		const persistedItems = loadPersistedCustomPlanItems(patientId);
		if (persistedItems.length === 0) return;
		setCustomStages((prevStages) => {
			const current = prevStages ?? autoStages;
			let changed = false;
			const updated = current.map((st) => {
				const matching = persistedItems.filter(
					(it) => it.stageKind === st.stageKind || (it.phase && st.stageNumber === it.phase),
				);
				if (matching.length === 0) return st;
				const newUnique = matching.filter((m) => !st.items.some((it) => it.id === m.id));
				if (newUnique.length === 0) return st;
				changed = true;
				const updatedItems = [...st.items, ...newUnique];
				const totalKopecks = updatedItems.reduce((acc, it) => acc + Math.round((it.priceRub || 0) * 100), 0);
				return {
					...st,
					items: updatedItems,
					totalRub: totalKopecks / 100,
					totalKopecks,
					order804nCodes: Array.from(new Set([...st.order804nCodes, ...newUnique.map((it) => it.code804n)])),
				};
			});
			return changed ? updated : prevStages;
		});
	}, [patientId, autoStages]);

	const handleUpdateItemQuantity = (itemId: string, newQty: number) => {
		const safeQty = Math.max(1, Math.round(newQty));
		const updated = stages.map((st) => {
			let modified = false;
			const updatedItems = st.items.map((it) => {
				if (it.id === itemId) {
					modified = true;
					const unitPriceRub =
						it.unitPriceRub > 0
							? it.unitPriceRub
							: Math.round(
									(it.priceRub + (it.discountRub || 0)) /
										Math.max(1, it.quantity || 1),
								);
					const unitKop = parseKopecks(unitPriceRub);
					const discountPct = discountPercent || 0;
					const unitDiscountKop =
						discountPct > 0 ? Math.round((unitKop * discountPct) / 100) : 0;
					const finalUnitKop = Math.max(0, unitKop - unitDiscountKop);
					const totalLineKop = finalUnitKop * safeQty;
					const totalDiscountKop = unitDiscountKop * safeQty;

					return {
						...it,
						quantity: safeQty,
						unitPriceRub: unitKop / 100,
						discountRub: totalDiscountKop / 100,
						priceRub: totalLineKop / 100,
					};
				}
				return it;
			});
			if (!modified) return st;

			const stTotalKopecks = updatedItems.reduce(
				(acc, it) => acc + Math.round(it.priceRub * 100),
				0,
			);
			const stTotalRub = stTotalKopecks / 100;
			return {
				...st,
				items: updatedItems,
				totalRub: stTotalRub,
				totalKopecks: stTotalKopecks,
			};
		});

		setCustomStages(updated);
	};

	const handleUpdateItemPrice = (itemId: string, newPriceRub: number) => {
		const updated = stages.map((st) => {
			let modified = false;
			const updatedItems = st.items.map((it) => {
				if (it.id === itemId) {
					modified = true;
					const safeQty = Math.max(1, it.quantity || 1);
					const unitKop = parseKopecks(newPriceRub);
					const discountPct = discountPercent || 0;
					const unitDiscountKop =
						discountPct > 0 ? Math.round((unitKop * discountPct) / 100) : 0;
					const finalUnitKop = Math.max(0, unitKop - unitDiscountKop);
					const totalLineKop = finalUnitKop * safeQty;
					const totalDiscountKop = unitDiscountKop * safeQty;

					return {
						...it,
						quantity: safeQty,
						unitPriceRub: newPriceRub,
						discountRub: totalDiscountKop / 100,
						priceRub: totalLineKop / 100,
						requiresManualPricing: false,
					};
				}
				return it;
			});
			if (!modified) return st;

			const stTotalKopecks = updatedItems.reduce(
				(acc, it) => acc + Math.round(it.priceRub * 100),
				0,
			);
			const stTotalRub = stTotalKopecks / 100;
			return {
				...st,
				items: updatedItems,
				totalRub: stTotalRub,
				totalKopecks: stTotalKopecks,
			};
		});

		setCustomStages(updated);
		showToast(`Цена услуги обновлена: ${newPriceRub.toLocaleString("ru-RU")} ₽`, "success");
	};

	const handleUpdateItem = (updatedItem: TreatmentPlanItem) => {
		const updated = stages.map((st) => {
			let modified = false;
			const updatedItems = st.items.map((it) => {
				if (it.id === updatedItem.id) {
					modified = true;
					const safeQty = Math.max(1, updatedItem.quantity || 1);
					const unitPriceRub =
						updatedItem.unitPriceRub > 0
							? updatedItem.unitPriceRub
							: Math.round(
									(updatedItem.priceRub + (updatedItem.discountRub || 0)) /
										safeQty,
								);
					const unitKop = parseKopecks(unitPriceRub);
					const discountPct = discountPercent || 0;
					const unitDiscountKop =
						discountPct > 0 ? Math.round((unitKop * discountPct) / 100) : 0;
					const finalUnitKop = Math.max(0, unitKop - unitDiscountKop);
					const totalLineKop = finalUnitKop * safeQty;
					const totalDiscountKop = unitDiscountKop * safeQty;

					return {
						...updatedItem,
						quantity: safeQty,
						unitPriceRub: unitKop / 100,
						discountRub: totalDiscountKop / 100,
						priceRub: totalLineKop / 100,
						requiresManualPricing: false,
					};
				}
				return it;
			});
			if (!modified) return st;

			const stTotalKopecks = updatedItems.reduce(
				(acc, it) => acc + Math.round(it.priceRub * 100),
				0,
			);
			const stTotalRub = stTotalKopecks / 100;
			return {
				...st,
				items: updatedItems,
				totalRub: stTotalRub,
				totalKopecks: stTotalKopecks,
			};
		});

		setCustomStages(updated);
		showToast(`Процедура «${updatedItem.name}» обновлена`, "success");
	};

	const handleRemoveItem = (itemId: string) => {
		const updated = stages.map((st) => {
			if (!st.items.some((it) => it.id === itemId)) return st;
			const updatedItems = st.items.filter((it) => it.id !== itemId);
			const stTotalKopecks = updatedItems.reduce(
				(acc, it) => acc + Math.round(it.priceRub * 100),
				0,
			);
			const stTotalRub = stTotalKopecks / 100;
			return {
				...st,
				items: updatedItems,
				totalRub: stTotalRub,
				totalKopecks: stTotalKopecks,
			};
		});

		setCustomStages(updated);
		showToast("Процедура удалена из этапа", "info");
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
		toothNumber?: number,
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
				totalKopecks: parseKopecks(stageTotalRub),
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
					totalKopecks: parseKopecks(totalRub),
					order804nCodes: Array.from(new Set([...st.order804nCodes, ...items.map((it) => it.code804n)])),
				};
			});
		}
		setCustomStages(updated);
		setIsChairsideBundlesModalOpen(false);
	};

	const handleApplyChairsideBundleInvoice = (
		invoiceItems: unknown[],
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
				bonusPointsUsedKopecks: 0 as Kopecks,
				netTotalRub: grossRub,
				netTotalKopecks: parseKopecks(grossRub),
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

	// Loyalty and Bonus Points deduction calculation
	const loyaltyDeduction = useMemo(() => {
		return calculateLoyaltyBonusDeduction(
			effectiveSignTier.totalKopecks,
			discountPercent,
			patientBalanceRub,
			bonusPointsToUseRub,
		);
	}, [effectiveSignTier.totalKopecks, discountPercent, patientBalanceRub, bonusPointsToUseRub]);

	// 3. Extract orthopedic teeth (crowns, bridges, dentures, veneers, implant crowns)
	const orthopedicTeeth = useMemo(() => {
		const teethFromStages = stages
			.filter((s) => s.stageKind === "stage_3_orthopedics" || s.stageNumber === 3)
			.flatMap((s) => s.items)
			.map((it) => it.toothNumber)
			.filter((t): t is number => typeof t === "number" && t > 0);

		if (teethFromStages.length > 0) {
			return Array.from(new Set(teethFromStages)).sort((a, b) => a - b);
		}

		const teethFromOdontogram = (teethData || [])
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
	}, [stages, teethData]);

	const handleOpenLabOrder = (teeth?: number[]) => {
		setSelectedLabTeeth(teeth && teeth.length > 0 ? teeth : orthopedicTeeth);
		setIsLabOrderModalOpen(true);
	};

	const handleOneClickLabOrder = async (teeth?: number[]) => {
		const targetTeeth = teeth && teeth.length > 0 ? teeth : orthopedicTeeth;
		if (!targetTeeth || targetTeeth.length === 0) {
			showToast("Нет выбранных ортопедических зубов для наряда ЗТЛ", "warning");
			return;
		}

		const due = addWorkingDays(new Date(), ONE_CLICK_LAB_DEFAULTS.workingDays);
		const dueDateIso = due.toISOString();
		const dueDateFormatted = due.toLocaleDateString("ru-RU");
		const isBridge = targetTeeth.length > 1;
		const construction = isBridge
			? ONE_CLICK_LAB_DEFAULTS.restorationTypeBridge
			: ONE_CLICK_LAB_DEFAULTS.restorationTypeSingle;
		const priceRub =
			(calculateMaterialTotalCostKopecks(ONE_CLICK_LAB_DEFAULTS.materialId, targetTeeth.length) ||
				650000 * targetTeeth.length) / 100;
		const toothFdiStr = targetTeeth.join(", ");

		try {
			showToast(`Создаём наряд ЗТЛ в 1 клик для зубов ${toothFdiStr}...`, "info", 2000);
			const res = await fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					patientId,
					doctorId: auth?.currentUser?.id || null,
					toothFdi: toothFdiStr,
					material: ONE_CLICK_LAB_DEFAULTS.materialName,
					colorVita: ONE_CLICK_LAB_DEFAULTS.colorVita,
					dueDate: dueDateIso,
					clinicalNotes: `• Экспресс 1-клик наряд ЗТЛ из плана лечения (${currentTier.title})\n• Конструкция: ${isBridge ? `Мостовидный протез (${targetTeeth.length} ед.: ${targetTeeth.join("-")})` : "Одиночная коронка"}\n• Материал: ${ONE_CLICK_LAB_DEFAULTS.materialName}\n• Цвет: VITA Classical ${ONE_CLICK_LAB_DEFAULTS.colorVita}\n• Срок: 7 рабочих дней (до ${dueDateFormatted})\n• Цементный зазор: ${ONE_CLICK_LAB_DEFAULTS.cementGapMicrons} мкм`,
					priceRub,
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка создания наряда ЗТЛ");
			}

			const savedOrder = await res.json();

			if (savedOrder?.id) {
				for (const tooth of targetTeeth) {
					try {
						await fetch(`/api/clinical/lab-orders/${savedOrder.id}/items`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								...denteAdminSecretRequestHeaders(),
							},
							body: JSON.stringify({
								toothFdi: tooth,
								restorationType: construction,
								material: ONE_CLICK_LAB_DEFAULTS.materialId,
								shadeFinal: ONE_CLICK_LAB_DEFAULTS.colorVita,
								translucencyLevel: ONE_CLICK_LAB_DEFAULTS.translucency,
								cementGapMicrons: ONE_CLICK_LAB_DEFAULTS.cementGapMicrons,
								priceRub: priceRub / targetTeeth.length,
							}),
						});
					} catch {
						// Non-blocking item fallback
					}
				}
			}

			showToast(
				`Наряд ЗТЛ успешно оформлен в 1 клик для зубов ${toothFdiStr} (Цирконий A2, срок до ${dueDateFormatted})!`,
				"success",
				6000,
			);
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", { detail: { order: savedOrder } }),
			);
		} catch (err: any) {
			showToast(err.message || "Не удалось оформить наряд в ЗТЛ", "error");
		}
	};

	// Validation payload
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
	}, [stages, patientId, patientName, currentTier.title, auth, discountPercent]);

	// Action: Export directly to cashier as an Invoice (Mandates 8e, 8k, 8n)
	const handleExportCashier = () => {
		const allItems = stages.flatMap((s) => s.items);
		if (allItems.length === 0) {
			showToast("Нет позиций для формирования счета", "warning", 3000);
			return;
		}

		const grossTotalRub =
			allItems.reduce(
				(acc, it) => acc + Math.round((it.unitPriceRub || 0) * 100) * (it.quantity || 1),
				0,
			) / 100;
		const discountRub =
			allItems.reduce((acc, it) => acc + Math.round((it.discountRub || 0) * 100), 0) / 100;
		const netTotalRub = loyaltyDeduction.netPayableRub;

		const cleanPat = (patientId || "pat").replace(/\D/g, "").slice(0, 4) || "0001";
		const invoiceId = `inv-plan-${Date.now()}-${cleanPat}`;
		const invoiceNumber = `СЧ-${new Date().getFullYear()}-${cleanPat.padStart(4, "0")}`;

		const exportData: CashierInvoiceExportData = {
			patientId,
			patientName,
			invoiceId,
			invoiceNumber,
			items: allItems,
			grossTotalRub,
			discountRub,
			bonusPointsUsedRub: loyaltyDeduction.appliedBonusRub,
			bonusPointsUsedKopecks: loyaltyDeduction.appliedBonusKopecks,
			netTotalRub,
			netTotalKopecks: loyaltyDeduction.netPayableKopecks,
			notes: `Счет на оплату по комплексному плану «${currentTier.title}»${
				loyaltyDeduction.appliedBonusRub > 0
					? ` (Списано бонусов: ${loyaltyDeduction.appliedBonusRub} ₽)`
					: ""
			}`,
			createdAtIso: new Date().toISOString(),
		};

		const newBillingInvoice: BillingInvoice = {
			id: invoiceId,
			number: invoiceNumber,
			patientId,
			patientName,
			patientPhone,
			doctorName: auth?.currentUser?.name || "Лечащий врач-стоматолог",
			date: new Date().toLocaleDateString("ru-RU"),
			totalAmountRub: netTotalRub,
			paidAmountRub: 0,
			status: (netTotalRub === 0 ? "warranty_100" : "issued") as BillingInvoice["status"],
			items: allItems.map((it, idx) => ({
				id: it.id || `item-${idx}`,
				code: it.code804n || "A16.07.002",
				name: `${it.name}${it.toothNumber ? ` (зуб ${it.toothNumber})` : ""}`,
				quantity: it.quantity || 1,
				priceRub: it.unitPriceRub || 0,
			})),
			createdAt: new Date().toISOString(),
			notes: exportData.notes,
		};

		// 1. Two-tier persistent storage synchronized with InvoicesView
		const existingInvoices = loadStoredInvoices();
		const updatedInvoices = [
			newBillingInvoice,
			...existingInvoices.filter(
				(inv) => inv.id !== newBillingInvoice.id && inv.number !== newBillingInvoice.number,
			),
		];
		saveStoredInvoices(updatedInvoices);

		// 2. Real-time reactive dispatch for open InvoicesView / FinanceView
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-invoices-updated", {
					detail: newBillingInvoice,
				}),
			);
		}

		// 3. Callback execution if passed by parent
		if (onExportToCashier) {
			onExportToCashier(exportData);
		}

		// 4. Background server persistence under Mandates 8e, 8n (Zero-downtime, soft-fallback)
		void fetch("/api/invoices/generate-from-plan", {
			method: "POST",
			headers: {
				...denteAdminSecretRequestHeaders(),
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				patientId,
				planId: `PLAN-${patientId.slice(0, 6).toUpperCase()}`,
				planNumber: `ПЛАН-№${patientId.slice(0, 4)}`,
				planTitle: currentTier.title,
				documentType: "invoice",
				items: allItems.map((it, idx) => ({
					itemId: it.id || `item-${idx}`,
					toothNumber: it.toothNumber ?? null,
					nameRu: it.name,
					quantity: it.quantity || 1,
					unitPriceRub: it.unitPriceRub || 0,
					discountRub: it.discountRub || 0,
					code804n: it.code804n || undefined,
				})),
				allowUnplannedServices: true,
				notes: exportData.notes,
			}),
		}).catch((err) => {
			logger.warn("[TreatmentPlanModule] Background server invoice export fallback", err);
		});

		showToast(
			`Счет №${invoiceNumber} на сумму ${(netTotalRub || 0).toLocaleString("ru-RU")} ₽ успешно отправлен в кассу!`,
			"success",
			5000,
		);
	};

	// Action: Save Plan to Database
	const handleSavePlanToDatabase = async () => {
		if (isSaving) {
			showToast("Сохранение плана уже выполняется...", "info");
			return;
		}

		if (totalItemsCount === 0) {
			showToast("План пуст: добавьте или отметьте зубы на схеме", "warning");
			return;
		}

		setIsSaving(true);
		try {
			const allItems = stages.flatMap((s) => s.items);
			const itemsForApi = allItems.map((it) => ({
				toothNumber: it.toothNumber ?? null,
				priceId: it.priceId || it.code804n,
				name: it.name,
				quantity: it.quantity || 1,
				price: it.unitPriceRub || 0,
				discount: it.discountRub || 0,
				phase: it.phase,
				isAuto: it.isAuto ?? true,
			}));

			const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/treatment-plans`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					...(currentPlanId ? { id: currentPlanId } : {}),
					name: `${currentTier.title} (${new Date().toLocaleDateString("ru-RU")})`,
					status:
						planStatus === "agreed"
							? "Approved"
							: planStatus === "in_progress"
								? "Active"
								: planStatus === "completed"
									? "Completed"
									: "Draft",
					patientSignature: signedAgreement?.signatureBase64 || null,
					items: itemsForApi,
				}),
			});

			if (res.ok) {
				const data = await res.json();
				if (data.planId) {
					setCurrentPlanId(data.planId);
					if (onPlanSaved) {
						onPlanSaved(data.planId);
					}
				}
				showToast(
					`Комплексный план лечения успешно сохранен в базе на сумму ${(grandTotalRub || 0).toLocaleString("ru-RU")} ₽!`,
					"success",
					4000,
				);
			} else {
				showToast("Не удалось сохранить план на сервере", "error");
			}
		} catch (err) {
			logger.error("[TreatmentPlanModule] Save error", err);
			showToast("Ошибка сохранения плана", "error");
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
			logger.error("[TreatmentPlanModule] Write-off error", err);
			showToast("Ошибка проведения списания на складе", "error");
		} finally {
			setIsExecutingWriteOff(false);
		}
	};

	// Фильтрация этапов по специальности врача клиники (Мандат 8e: универсальность)
	const visibleStages = useMemo(() => {
		if (specialtyFilter === "all") return stages;
		return stages.filter((s) => {
			if (specialtyFilter === "therapy") {
				return (
					s.stageKind === "stage_1_therapy" ||
					s.items.some((i) => {
						const c = (i.category || "").toLowerCase();
						return c.includes("терап") || c.includes("кариес") || c.includes("эндо");
					})
				);
			}
			if (specialtyFilter === "surgery") {
				return (
					s.stageKind === "stage_2_surgery" ||
					s.items.some((i) => {
						const c = (i.category || "").toLowerCase();
						return c.includes("хирург") || c.includes("имплант") || c.includes("удал");
					})
				);
			}
			if (specialtyFilter === "orthopedics") {
				return (
					s.stageKind === "stage_3_orthopedics" ||
					s.items.some((i) => {
						const c = (i.category || "").toLowerCase();
						return c.includes("ортопед") || c.includes("коронк") || c.includes("протез") || c.includes("мост");
					})
				);
			}
			if (specialtyFilter === "orthodontics") {
				return (
					s.stageKind === "stage_4_orthodontics" ||
					s.items.some((i) => {
						const c = (i.category || "").toLowerCase();
						return c.includes("ортодонт") || c.includes("брекет") || c.includes("элайнер");
					})
				);
			}
			if (specialtyFilter === "periodontics") {
				return (
					s.stageKind === "stage_5_periodontics" ||
					s.items.some((i) => {
						const c = (i.category || "").toLowerCase();
						return c.includes("пародонт") || c.includes("гигиен") || c.includes("десн");
					})
				);
			}
			return true;
		});
	}, [stages, specialtyFilter]);

	// Ручное добавление любой услуги из прейскуранта клиники в этап (Мандаты 8e, 8k)
	const handleAddItemToStage = (
		targetStageNumber: number,
		newItemData: {
			code804n: string;
			name: string;
			category: string;
			toothNumber?: number;
			quantity: number;
			unitPriceRub: number;
			discountRub: number;
		},
	) => {
		const grossKopecks = Math.round(newItemData.unitPriceRub * newItemData.quantity * 100);
		const discKopecks = Math.round(newItemData.discountRub * 100);
		const netKopecks = Math.max(0, grossKopecks - discKopecks);
		const netRub = netKopecks / 100;

		const stageKind: TreatmentPlanStageKind =
			targetStageNumber === 2
				? "stage_2_surgery"
				: targetStageNumber === 3
					? "stage_3_orthopedics"
					: targetStageNumber === 4
						? "stage_4_orthodontics"
						: targetStageNumber === 5
							? "stage_5_periodontics"
							: "stage_1_therapy";

		const newItem: TreatmentPlanItem = {
			id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
			toothNumber: newItemData.toothNumber,
			code804n: newItemData.code804n,
			name: newItemData.name,
			category: newItemData.category,
			priceRub: netRub,
			unitPriceRub: newItemData.unitPriceRub,
			discountRub: newItemData.discountRub,
			quantity: newItemData.quantity,
			phase: targetStageNumber,
			stageKind,
			priceId: newItemData.code804n,
			fromCatalog: true,
			isAuto: false,
		};

		const existingStage = stages.find((s) => s.stageNumber === targetStageNumber);
		let nextStages: TreatmentPlanStage[];

		if (existingStage) {
			nextStages = stages.map((s) => {
				if (s.stageNumber !== targetStageNumber) return s;
				const updatedItems = [...s.items, newItem];
				const totalKopecks = updatedItems.reduce((acc, it) => {
					const g = Math.round(it.unitPriceRub * it.quantity * 100);
					const d = Math.round(it.discountRub * 100);
					return (acc + Math.max(0, g - d)) as Kopecks;
				}, 0 as Kopecks);
				return {
					...s,
					items: updatedItems,
					totalKopecks,
					totalRub: totalKopecks / 100,
					order804nCodes: Array.from(new Set(updatedItems.map((i) => i.code804n))),
				};
			});
		} else {
			const newStage: TreatmentPlanStage = {
				stageNumber: targetStageNumber,
				stageKind,
				title: `Этап ${romanizeStageNumber(targetStageNumber)}: Клинический этап`,
				subtitle: "Процедуры по назначению врача",
				clinicalGoal: "Достижение согласованного клинического результата",
				items: [newItem],
				totalRub: netRub,
				totalKopecks: netKopecks as Kopecks,
				estimatedVisits: 1,
				estimatedWeeks: 2,
				order804nCodes: [newItem.code804n],
				status: "agreed",
			};
			nextStages = [...stages, newStage].sort((a, b) => a.stageNumber - b.stageNumber);
		}

		setCustomStages(nextStages);
		showToast(`Услуга «${newItem.name}» добавлена в этап №${targetStageNumber}`, "success");
	};

	// Создание нового этапа плана лечения
	const handleCreateNewStage = (
		presetKind: "therapy" | "surgery" | "orthopedics" | "orthodontics" | "periodontics" | "custom",
		customTitle?: string,
	) => {
		const newStageNumber = stages.length > 0 ? Math.max(...stages.map((s) => s.stageNumber)) + 1 : 1;
		let stageKind: TreatmentPlanStageKind = "stage_1_therapy";
		let title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Терапевтический этап"}`;
		let subtitle = "Санация и терапевтические процедуры";
		let clinicalGoal = "Полная санация и купирование воспалительных процессов";

		if (presetKind === "surgery") {
			stageKind = "stage_2_surgery";
			title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Хирургический этап и имплантация"}`;
			subtitle = "Удаление несостоятельных зубов, пластика и имплантация";
			clinicalGoal = "Восстановление костной опоры и подготовка к протезированию";
		} else if (presetKind === "orthopedics") {
			stageKind = "stage_3_orthopedics";
			title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Ортопедическая реабилитация"}`;
			subtitle = "Коронки, мостовидные протезы и функциональная окклюзия";
			clinicalGoal = "Восстановление жевательной функции и эстетики";
		} else if (presetKind === "orthodontics") {
			stageKind = "stage_4_orthodontics";
			title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Ортодонтическое лечение"}`;
			subtitle = "Нормализация окклюзии, исправление прикуса";
			clinicalGoal = "Формирование стабильного правильного прикуса";
		} else if (presetKind === "periodontics") {
			stageKind = "stage_5_periodontics";
			title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Пародонтология и профилактика"}`;
			subtitle = "Вектор-терапия, кюретаж и стабилизация пародонта";
			clinicalGoal = "Купирование воспаления десны и защита от рецидивов";
		} else if (presetKind === "custom") {
			stageKind = "stage_custom";
			title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Индивидуальный клинический этап"}`;
			subtitle = "Специализированный протокол лечения";
			clinicalGoal = "Выполнение индивидуальных клинических назначений";
		}

		const newStage: TreatmentPlanStage = {
			stageNumber: newStageNumber,
			stageKind,
			title,
			subtitle,
			clinicalGoal,
			items: [],
			totalRub: 0,
			totalKopecks: 0 as Kopecks,
			estimatedVisits: 1,
			estimatedWeeks: 2,
			order804nCodes: [],
			status: "agreed",
		};

		setCustomStages([...stages, newStage]);
		showToast(`Создан новый этап: «${title}»`, "success");
	};

	const handleDeleteStage = (stageToDelete: TreatmentPlanStage) => {
		const updated = stages.filter((s) => s.stageNumber !== stageToDelete.stageNumber);
		setCustomStages(updated);
		showToast(`Этап №${stageToDelete.stageNumber} удален из плана`, "info");
	};

	// 5. Сквозная связка: согласованный этап передается в работу визита («Взять этап в работу визита»)
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
		if (typeof window !== "undefined") {
			// 1. Dispatch custom event to hand over to active visit
			window.dispatchEvent(
				new CustomEvent("dente-take-stage-to-visit", {
					detail: {
						patientId,
						patientName,
						stage: stageToStart,
						items: stageToStart.items,
					},
				}),
			);

			// 2. Dispatch billing addition for every item in this stage
			for (const item of stageToStart.items) {
				window.dispatchEvent(
					new CustomEvent("dente-add-billing-item", {
						detail: {
							item: {
								code804n: item.code804n || item.priceId || "A16.07.001",
								title: item.name,
								toothCode: item.toothNumber ? String(item.toothNumber) : undefined,
								quantity: item.quantity || 1,
								unitPriceRub: item.unitPriceRub,
								discountRub: item.discountRub || 0,
							},
						},
					}),
				);
			}

			window.dispatchEvent(
				new CustomEvent("dente-book-stage-appointment", {
					detail: {
						patientId,
						patientName,
						stageNumber: stageToStart.stageNumber,
						stageTitle: stageToStart.title,
						items: stageToStart.items,
					},
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente-stage-activated", {
					detail: {
						patientId,
						stageNumber: stageToStart.stageNumber,
						stageTitle: stageToStart.title,
					},
				}),
			);
		}
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

	// Эффективный каталог услуг: прейскурант клиники из базы или номенклатура 804н
	const effectiveCatalog = useMemo<CatalogServiceLookupItem[]>(() => {
		if (Array.isArray(catalog) && catalog.length > 0) {
			return catalog;
		}
		return Object.values(ORDER_804N_DICTIONARY).map((proc) => ({
			id: proc.code,
			title: proc.title,
			category: proc.category,
			basePriceRub: proc.defaultPriceRub,
			code: proc.code,
			order804nCode: proc.code,
			active: true,
		}));
	}, [catalog]);

	const availableCategories = useMemo(() => {
		const set = new Set<string>();
		for (const it of effectiveCatalog) {
			if (it.category) set.add(it.category);
		}
		return Array.from(set).sort();
	}, [effectiveCatalog]);

	const filteredCatalogServices = useMemo(() => {
		const q = serviceSearchQuery.trim().toLowerCase();
		return effectiveCatalog.filter((item) => {
			if (serviceCategoryFilter !== "all") {
				const cat = (item.category || "").toLowerCase();
				if (!cat.includes(serviceCategoryFilter.toLowerCase())) return false;
			}
			if (!q) return true;
			const t = (item.title || "").toLowerCase();
			const c = (item.code || item.order804nCode || "").toLowerCase();
			const cat = (item.category || "").toLowerCase();
			return t.includes(q) || c.includes(q) || cat.includes(q);
		});
	}, [effectiveCatalog, serviceSearchQuery, serviceCategoryFilter]);

	const handleConfirmAddService = () => {
		if (!selectedCatalogItem) {
			showToast("Выберите услугу из каталога", "warning");
			return;
		}
		const basePrice = selectedCatalogItem.basePriceRub || 0;
		const qty = Math.max(1, serviceQuantity);
		const discPct = Math.max(0, Math.min(100, serviceDiscountPercent));
		const grossRub = basePrice * qty;
		const discountRub = Math.round((grossRub * discPct) / 100);

		handleAddItemToStage(serviceTargetStageNumber, {
			code804n: selectedCatalogItem.order804nCode || selectedCatalogItem.code || selectedCatalogItem.id,
			name: selectedCatalogItem.title,
			category: selectedCatalogItem.category || "Общее",
			...(selectedToothForService ? { toothNumber: selectedToothForService } : {}),
			quantity: qty,
			unitPriceRub: basePrice,
			discountRub,
		});

		setIsAddServiceModalOpen(false);
		setSelectedCatalogItem(null);
		setSelectedToothForService(null);
		setServiceQuantity(1);
		setServiceDiscountPercent(0);
	};

	const handleConfirmCreateStage = () => {
		handleCreateNewStage(newStagePreset, newStageCustomTitle.trim() || undefined);
		setIsCreateStageModalOpen(false);
		setNewStageCustomTitle("");
		setNewStagePreset("therapy");
	};

	return (
		<div
			className={`treatment-plan-module flex flex-col gap-5 w-full bg-[var(--paper,var(--background,#ffffff))] text-[var(--ink,#0f172a)] rounded-3xl border border-[var(--line,var(--border,#cbd5e1))] p-5 shadow-xl ${className}`.trim()}
			data-testid="treatment-plan-module"
		>
			{/* Top Bar: Title & Global Quick Actions */}
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--line,var(--border,#cbd5e1))]">
				<div className="flex items-center gap-3 min-w-0 max-w-full">
					<div className="p-3 rounded-2xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal,var(--brand-primary))]/20 shrink-0">
						<Layers size={22} />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2 flex-wrap">
							<h2 className="text-lg font-black text-[var(--ink,#0f172a)] truncate">
								Комплексный план лечения
							</h2>
							<span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-mono font-bold border border-cyan-500/20 shrink-0">
								Клинический протокол
							</span>
							<span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold border border-emerald-500/20 shrink-0">
								СтАР
							</span>
							{planAgeDays > 30 && (
								<span
									className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-200 font-bold border border-amber-500/30 inline-flex items-center gap-1 shadow-2xs shrink-0"
									title="План составлен более 30 дней назад, цены могут быть скорректированы. Создание нарядов ЗТЛ, оказание услуг и оплата не блокируются (Мандат 8e)."
								>
									<Clock size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
									План составлен более 30 дней назад, цены могут быть скорректированы
								</span>
							)}

							{/* 1-Click Status Transitions (Mandates 8e, 8c — Doctor Autonomy & Zero Barriers) */}
							<div
								className="inline-flex items-center p-0.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))] shadow-2xs text-xs shrink-0"
								role="group"
								aria-label="Статус плана лечения"
								data-testid="treatment-plan-status-control"
							>
								<button
									type="button"
									onClick={() => handleStatusTransition("draft")}
									data-testid="tp-status-btn-draft"
									className={`min-h-[26px] h-[26px] px-2.5 py-0 rounded-lg text-xs font-bold transition-all cursor-pointer ${
										planStatus === "draft"
											? "bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
									title="Черновик плана лечения"
								>
									Черновик
								</button>
								<button
									type="button"
									onClick={() => handleStatusTransition("agreed")}
									data-testid="tp-status-btn-agreed"
									className={`min-h-[26px] h-[26px] px-2.5 py-0 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
										planStatus === "agreed"
											? "bg-emerald-600 text-white shadow-2xs"
											: "text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
									}`}
									title="План согласован с пациентом (1 клик)"
								>
									<Check size={12} />
									<span>Согласован</span>
								</button>
								<button
									type="button"
									onClick={() => handleStatusTransition("in_progress")}
									data-testid="tp-status-btn-in-progress"
									className={`min-h-[26px] h-[26px] px-2.5 py-0 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
										planStatus === "in_progress"
											? "bg-teal-600 text-white shadow-2xs"
											: "text-teal-700 dark:text-teal-400 hover:text-teal-800"
									}`}
									title="План переведен в работу (1 клик)"
								>
									<Zap size={12} />
									<span>В работе</span>
								</button>
								<button
									type="button"
									onClick={() => handleStatusTransition("completed")}
									data-testid="tp-status-btn-completed"
									className={`min-h-[26px] h-[26px] px-2.5 py-0 rounded-lg text-xs font-bold transition-all cursor-pointer ${
										planStatus === "completed"
											? "bg-blue-600 text-white shadow-2xs"
											: "text-blue-700 dark:text-blue-400 hover:text-blue-800"
									}`}
									title="Лечение по плану завершено"
								>
									Завершен
								</button>
							</div>
						</div>
						<p
							className="text-xs text-[var(--muted,#64748b)] truncate"
							title={`Пациент: ${patientName} · ${totalItemsCount} процедур · 3 клинических этапа`}
						>
							Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong> ·{" "}
							{totalItemsCount} процедур · 3 клинических этапа
						</p>
					</div>
				</div>

				{/* Global Buttons: View Toggles, Clean Hick's/Miller's Toolbar & Actions */}
				<div className="flex flex-wrap items-center gap-2">
					{/* Tab Switcher: 3 Tiers vs Stages vs 4 Phases */}
					<div className="inline-flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] max-w-full overflow-x-auto">
						<button
							type="button"
							onClick={() => setActiveViewTab("3tier")}
							className={`min-h-[44px] sm:min-h-[38px] sm:h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
								activeViewTab === "3tier"
									? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							3 Варианта
						</button>
						<button
							type="button"
							onClick={() => setActiveViewTab("stages")}
							className={`min-h-[44px] sm:min-h-[38px] sm:h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
								activeViewTab === "stages"
									? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Поэтапный (I, II, III)
						</button>
						<button
							type="button"
							onClick={() => setActiveViewTab("phased4")}
							data-testid="tp-tab-phased4"
							className={`min-h-[44px] sm:min-h-[38px] sm:h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
								activeViewTab === "phased4"
									? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							4 Фазы
						</button>
					</div>

					{/* Secondary 1: Digital Signature Indicator / Button */}
					{signedAgreement ? (
						<div
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold min-h-[44px] sm:min-h-[38px] sm:h-[38px] touch-manipulation"
							data-testid="tp-signed-badge"
						>
							<ShieldCheck size={16} />
							<span>ПОДПИСАНО</span>
						</div>
					) : (
						<button
							type="button"
							onClick={() => setIsSignModalOpen(true)}
							className="min-h-[44px] sm:min-h-[38px] sm:h-[38px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] cursor-pointer transition-colors touch-manipulation shadow-xs"
							title="Открыть окно цифровой подписи согласия"
							data-testid="tp-sign-btn"
						>
							<PenTool size={14} />
							<span>Подписать</span>
						</button>
					)}

					{/* Secondary 2: Quick Export to Cashier (1 click) */}
					<button
						type="button"
						onClick={handleExportCashier}
						className="min-h-[44px] sm:min-h-[38px] sm:h-[38px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 shadow-xs cursor-pointer transition-colors touch-manipulation"
						title="Мгновенно отправить счет кассиру в 1 клик (StomX / DentalPRO Parity)"
						data-testid="tp-quick-cashier-btn"
					>
						<Send size={15} />
						<span>В кассу</span>
					</button>

					{/* Secondary 3: Overflow Dropdown Menu [⋮ Опции] */}
					<div className="relative inline-flex items-center" ref={optionsMenuRef}>
						<button
							type="button"
							onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
							className="min-h-[44px] sm:min-h-[38px] sm:h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)] cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs transition-colors touch-manipulation"
							title="Дополнительные студии, валидация и печать"
							aria-label="Опции плана лечения"
							aria-expanded={isOptionsMenuOpen}
							data-testid="treatment-plan-options-menu-btn"
						>
							<MoreVertical size={15} className="text-[var(--teal,var(--brand-primary))]" />
							<span className="hidden sm:inline">Опции</span>
						</button>

						<div
							className={`absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl shadow-2xl min-w-[260px] text-xs ${
								isOptionsMenuOpen ? "animate-in fade-in zoom-in-95 duration-100" : "hidden"
							}`}
							role="menu"
							aria-hidden={!isOptionsMenuOpen}
						>
							<button
								type="button"
								onClick={() => {
									handleExportCashier();
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
								role="menuitem"
								data-testid="options-menu-export-cashier-btn"
							>
								<Send size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span>Отправить счет кассиру (1 клик)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsInvoiceModalOpen(true);
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
								role="menuitem"
								data-testid="tp-invoice-btn"
								title="Сформировать наряд / счет на оплату с контролем цен и защитой сметы"
							>
								<Receipt size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>Счет / Наряд на оплату</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsFiscalModalOpen(true);
									setIsOptionsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--teal-dark,var(--teal))] hover:bg-[var(--teal-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
								role="menuitem"
								data-testid="tp-fiscal-btn"
								title="Принять оплату (карты, СБП QR, наличные) и пробить кассовый чек"
							>
								<ShieldCheck size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>Кассовый чек & Оплата</span>
							</button>

								<div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
									Специализированные студии
								</div>
								<button
									type="button"
									onClick={() => {
										setIsCuratorModalOpen(true);
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
									role="menuitem"
									data-testid="options-menu-curator-btn"
								>
									<div className="flex items-center gap-2">
										<UserCheck size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
										<span className="font-semibold">Куратор лечения (воронка и комиссия)</span>
									</div>
									{patient?.administrativeProfile?.curatorFullName ? (
										<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shrink-0 border border-indigo-500/20">
											{patient.administrativeProfile.curatorFullName.split(" ")[0]}
										</span>
									) : (
										<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] shrink-0">
											Назначить
										</span>
									)}
								</button>
								<button
									type="button"
									onClick={() => {
										setIsPresenterModalOpen(true);
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
									role="menuitem"
									data-testid="options-menu-presenter-btn"
								>
									<Bot size={14} className="text-amber-500 shrink-0" />
									<span>Презентация пациенту (2-й экран & ИИ)</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsComparatorModalOpen(true);
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
									role="menuitem"
								>
									<Sparkles size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
									<span>Студия 3-Tier сравнения</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsStagePaymentModalOpen(true);
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
									role="menuitem"
								>
									<Coins size={14} className="text-amber-500" />
									<span>Эскроу & Поэтапная оплата</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsPriceValidatorModalOpen(true);
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
									role="menuitem"
								>
									<FileCheck size={14} className="text-emerald-600" />
									<span>Клинический валидатор СтАР</span>
								</button>

								<div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1.5">
									Документы и производство
								</div>
								<button
									type="button"
									onClick={() => {
										setIsContractPrintOpen(true);
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
									role="menuitem"
								>
									<FileText size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
									<span>Договор и смета (QR)</span>
								</button>
								<button
									type="button"
									onClick={() => {
										handleOpenLabOrder();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
									role="menuitem"
									data-testid="lab-work-order-btn"
								>
									<FlaskConical size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
									<span>Наряд-заказ в ЗТЛ</span>
								</button>
								<button
									type="button"
									onClick={() => {
										void handleOneClickLabOrder();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[36px]"
									role="menuitem"
									data-testid="lab-work-order-one-click-btn"
								>
									<Zap size={14} className="text-amber-600 dark:text-amber-400" />
									<span>Наряд ЗТЛ в 1 клик (Цирконий A2)</span>
								</button>
							</div>
					</div>

					{/* STRICTLY 1 DOMINANT PRIMARY ACTION: Save to DB */}
					<button
						type="button"
						onClick={handleSavePlanToDatabase}
						className="min-h-[44px] sm:min-h-[38px] sm:h-[38px] flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-[var(--teal-dark,var(--brand-primary))] hover:bg-[var(--teal,var(--brand-primary))] cursor-pointer transition-all shadow-md shadow-[var(--teal)]/20 active:scale-98 ml-auto touch-manipulation"
						data-testid="treatment-plan-save-btn"
					>
						<Save size={15} className={isSaving ? "animate-spin" : ""} />
						<span>{isSaving ? "Сохранение..." : "Сохранить"}</span>
					</button>
				</div>
			</div>

			{/* Service Area: Collapsible Toolbars (Mandates 8p, 8d — Screen Height Budget <= 160-180px) */}
			<div className="flex flex-col gap-2">
				{/* Financial Adjustments Bar: Discounts & Loyalty Bonus Points */}
				<details className="group rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))] text-xs overflow-hidden transition-all">
					<summary className="cursor-pointer text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] py-2 px-3.5 flex items-center justify-between gap-2 select-none list-none [&::-webkit-details-marker]:hidden">
						<div className="flex items-center gap-2 flex-wrap">
							<Percent size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
							<span>Скидки и бонусы пациента</span>
							{discountPercent > 0 && (
								<span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
									-{discountPercent}%
								</span>
							)}
							{bonusPointsToUseRub > 0 && (
								<span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
									-{bonusPointsToUseRub.toLocaleString("ru-RU")} ₽
								</span>
							)}
						</div>
						<div className="flex items-center gap-2 text-[11px] text-[var(--muted,#64748b)]">
							<Coins size={13} className="text-amber-500 shrink-0" />
							<span className="font-mono">{patientBalanceRub.toLocaleString("ru-RU")} ₽</span>
							<ChevronDown size={14} className="transition-transform group-open:rotate-180" />
						</div>
					</summary>
					<div className="p-3.5 pt-1.5 border-t border-[var(--line,var(--border,#cbd5e1))] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						{/* Quick Discounts */}
						<div className="flex items-center gap-2">
							<span className="font-semibold text-[var(--muted,#64748b)]">Скидка:</span>
							<div className="flex items-center gap-1 flex-wrap">
								{[0, 5, 10, 15, 20, 50, 100].map((pct) => (
									<button
										key={pct}
										type="button"
										onClick={() => setDiscountPercent(pct)}
										title={
											pct === 100
												? "100% скидка: гарантийные переделки и персонал (без паролей и согласований)"
												: `Применить скидку ${pct}%`
										}
										className={`px-2.5 py-1 min-h-[44px] sm:min-h-[32px] inline-flex items-center justify-center rounded-lg font-mono font-bold text-xs cursor-pointer transition-all ${
											discountPercent === pct
												? pct === 100
													? "bg-emerald-600 text-white shadow-xs"
													: "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
												: pct === 100
													? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 border border-emerald-500/30"
													: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))]"
										}`}
									>
										{pct === 100 ? "100% (Гарантия)" : `${pct}%`}
									</button>
								))}
								{discountPercent === 100 && (
									<span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 ml-1">
										0 ₽ (Гарантия / Персонал)
									</span>
								)}
								<div className="inline-flex items-center gap-1 ml-1.5" title="Произвольная скидка врача (0-100%) без мастер-паролей (Мандат 8e)">
									<input
										type="number"
										min="0"
										max="100"
										value={discountPercent}
										onChange={(e) => {
											const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
											setDiscountPercent(val);
										}}
										className="w-14 min-h-[32px] h-8 px-1.5 text-xs font-mono font-bold rounded-lg border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-center focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
										placeholder="%"
									/>
									<span className="text-xs text-[var(--muted,#64748b)] font-bold">%</span>
								</div>
							</div>
						</div>

						{/* Loyalty Points / Patient Deposit */}
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-1.5">
								<Coins size={14} className="text-amber-500" />
								<span className="text-[var(--muted,#64748b)]">
									Баланс/Бонусы:{" "}
									<strong className="font-mono text-[var(--ink,#0f172a)]">
										{patientBalanceRub.toLocaleString("ru-RU")} ₽
									</strong>
								</span>
							</div>

							{patientBalanceRub > 0 && (
								<div className="flex items-center gap-1.5">
									<input
										type="number"
										min={0}
										max={patientBalanceRub}
										value={bonusPointsToUseRub || ""}
										onChange={(e) => {
											const val = Math.max(0, Math.min(patientBalanceRub, Number(e.target.value) || 0));
											setBonusPointsToUseRub(val);
										}}
										placeholder="Списать ₽"
										className="w-24 min-h-[44px] sm:min-h-[32px] px-2 py-1 text-xs font-mono rounded-lg border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
									/>
									{bonusPointsToUseRub > 0 && (
										<button
											type="button"
											onClick={() => setBonusPointsToUseRub(0)}
											className="min-h-[44px] sm:min-h-0 px-2 py-1 text-[11px] text-rose-500 hover:underline cursor-pointer inline-flex items-center"
										>
											Сбросить
										</button>
									)}
								</div>
							)}
						</div>
					</div>
				</details>

				{/* AI Copilot Clinical Assistant Bar */}
				<details className="group rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] text-xs shadow-xs overflow-hidden transition-all">
					<summary className="cursor-pointer text-xs font-bold text-[var(--teal-dark,var(--teal))] hover:text-[var(--ink,#0f172a)] py-2 px-3.5 flex items-center justify-between gap-2 select-none list-none [&::-webkit-details-marker]:hidden">
						<div className="flex items-center gap-2 flex-wrap">
							<Sparkles size={15} className="text-amber-500 shrink-0" />
							<span>AI Copilot (Ассистент врача & Аудит)</span>
							{customStages && (
								<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
									AI-модификации
								</span>
							)}
							{copilotFeedback && (
								<span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 border border-indigo-500/20 truncate max-w-[240px]">
									{copilotFeedback}
								</span>
							)}
						</div>
						<div className="flex items-center gap-2 text-[11px] text-[var(--muted,#64748b)]">
							<span className="hidden sm:inline">Пресеты СтАР, Оптимизация, Аудит</span>
							<ChevronDown size={14} className="transition-transform group-open:rotate-180 text-[var(--ink,#0f172a)]" />
						</div>
					</summary>
					<div className="p-3.5 pt-1.5 border-t border-[var(--line,var(--border,#cbd5e1))] flex flex-col gap-2.5">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
							<div className="flex items-center gap-2 flex-wrap">
								{COPILOT_PRESET_ACTIONS.map((action) => (
									<button
										key={action.id}
										type="button"
										disabled={isCopilotExecuting}
										onClick={() => handleExecuteCopilot(action.id)}
										className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-xl font-bold bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--teal-soft,var(--paper-soft))] hover:text-[var(--teal-dark,var(--teal))] border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-all disabled:opacity-50 shadow-2xs text-[11px] inline-flex items-center justify-center touch-manipulation"
										title={action.description}
										data-testid={`module-copilot-btn-${action.id}`}
									>
										{action.title}
									</button>
								))}

								<button
									type="button"
									onClick={() => setIsPresenterModalOpen(true)}
									className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-xl font-bold bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer transition-all shadow-2xs text-[11px] inline-flex items-center justify-center gap-1.5 touch-manipulation"
									title="Запустить клиническую валидацию СтАР, проверку анатомии FDI и генерацию объяснения для пациента"
									data-testid="module-copilot-ai-audit-btn"
								>
									<Bot size={13} className="text-amber-600 dark:text-amber-400" />
									<span>ИИ-Аудит & Презентация</span>
								</button>
							</div>

							<div className="flex items-center gap-2 shrink-0">
								{customStages && (
									<button
										type="button"
										onClick={() => {
											setCustomStages(null);
											setCopilotFeedback(null);
											showToast("План сброшен к исходной одонтограмме", "info");
										}}
										className="min-h-[44px] sm:min-h-0 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 cursor-pointer inline-flex items-center justify-center touch-manipulation"
										title="Сбросить все ручные правки и AI модификации"
										data-testid="copilot-reset-plan-btn"
									>
										Сбросить к исходному
									</button>
								)}
							</div>
						</div>

						{copilotFeedback && (
							<div
								className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-950 dark:text-indigo-100 text-xs mt-1"
								data-testid="module-copilot-feedback"
							>
								<div className="flex items-center gap-2">
									<Bot size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
									<span>{copilotFeedback}</span>
								</div>
								<button
									type="button"
									onClick={() => setCopilotFeedback(null)}
									className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer ml-4 shrink-0"
								>
									Скрыть
								</button>
							</div>
						)}
					</div>
				</details>

				{/* Turnkey Clinical Packages 1-Click Panel (Mandate 8e, 8p) */}
				<div className="flex items-center justify-between gap-2 p-1">
					<button
						type="button"
						onClick={() => setIsChairsideBundlesModalOpen(true)}
						className="h-8 px-3.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
						title="Открыть клинические пакеты услуг у кресла («Все включено»)"
						data-testid="open-chairside-bundles-modal-btn"
					>
						<PackageCheck size={15} />
						<span>Клинические пакеты («Все включено»)</span>
						<span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-white/20 text-white ml-1">
							{CLINICAL_BUNDLES.length} пакетов
						</span>
					</button>
				</div>
				<details className="group rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))] text-xs overflow-hidden transition-all">
					<summary className="cursor-pointer text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] py-2 px-3.5 flex items-center justify-between gap-2 select-none list-none [&::-webkit-details-marker]:hidden">
						<div className="flex items-center gap-2">
							<Layers size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
							<span>Готовые клинические пакеты «под ключ» ({CLINICAL_BUNDLES.length} пакетов)</span>
							<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
								1 клик
							</span>
						</div>
						<div className="flex items-center gap-2 text-[11px] text-[var(--muted,#64748b)]">
							<span className="hidden sm:inline font-mono">Прейскурант услуг</span>
							<ChevronDown size={14} className="transition-transform group-open:rotate-180" />
						</div>
					</summary>
					<div className="p-2 border-t border-[var(--line,var(--border,#cbd5e1))]">
						<ClinicalBundlesPanel
							compact={true}
							onApplyBundle={handleApplyClinicalBundle}
							initialToothNumber={orthopedicTeeth[0] || 16}
							className="border-0 shadow-none p-2"
						/>
					</div>
				</details>
			</div>

			{/* Main Content Area */}
			{activeViewTab === "3tier" ? (
				<TreatmentPlan3TierComparison
					tiers={planTiers}
					selectedTierId={selectedTierId}
					planAgeDays={planAgeDays}
					planCreatedAtIso={planCreatedAtIso}
					onSelectTier={(tier) => setSelectedTierId(tier.tierId)}
					onApproveAndSign={(tier) => {
						setSelectedTierId(tier.tierId);
						setIsSignModalOpen(true);
					}}
					onOpenComparatorStudio={() => setIsComparatorModalOpen(true)}
					onOpenStagePaymentStudio={() => setIsStagePaymentModalOpen(true)}
					onOpenPriceValidatorStudio={() => setIsPriceValidatorModalOpen(true)}
					onOpenInstallment={(tier) => {
						setSelectedTierId(tier.tierId);
						if (stages.length > 0) {
							setSelectedInstallmentStage(stages[0]!);
							setIsInstallmentModalOpen(true);
						}
					}}
					onPrintContract={(tier) => {
						setSelectedTierId(tier.tierId);
						setIsContractPrintOpen(true);
					}}
				/>
			) : activeViewTab === "phased4" ? (
				<TreatmentPlanPhased4StageView
					stages={stages}
					patientName={patientName}
					planAgeDays={planAgeDays}
					planCreatedAtIso={planCreatedAtIso}
					onExecuteStage={(category) => {
						const matchingStage =
							stages.find((s) => {
								if (category === "hygiene_sanitation" || category === "endo_therapy") {
									return s.stageKind === "stage_1_therapy";
								}
								if (category === "surgery_implant") {
									return s.stageKind === "stage_2_surgery";
								}
								if (category === "ortho_prosthetics") {
									return s.stageKind === "stage_3_orthopedics";
								}
								return false;
							}) || stages[0];
						if (matchingStage) {
							handleExecuteWriteOffStage(matchingStage);
						}
					}}
					onBookStageToVisit={(_category, items) => {
						showToast(
							`Запись на приём: сформирован визит для этапа (${items.length} услуг)`,
							"info",
							3000,
						);
						if (typeof window !== "undefined") {
							window.dispatchEvent(
								new CustomEvent("dente-book-stage-appointment", {
									detail: { patientId, patientName, items },
								}),
							);
						}
					}}
					onOpenStagePayment={() => {
						if (stages.length > 0) {
							setSelectedInstallmentStage(stages[0]!);
						}
						setIsFiscalModalOpen(true);
					}}
					onOpenInstallment={() => {
						if (stages.length > 0) {
							setSelectedInstallmentStage(stages[0]!);
							setIsInstallmentModalOpen(true);
						}
					}}
					onApproveAndSign={() => setIsSignModalOpen(true)}
					onPrintContract={() => setIsContractPrintOpen(true)}
				/>
			) : (
				<div className="flex flex-col gap-4">
					{/* Doctor Specialty Filter Bar & Stage Actions (Mandate 8e: Doctor Autonomy & Universal for all specialists) */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,var(--border,#cbd5e1))] shadow-xs">
						{/* Specialty Filter Pills */}
						<div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Фильтр по специализациям">
							{[
								{ id: "all", label: "Все специалисты", count: stages.length },
								{
									id: "therapy",
									label: "Терапия",
									count: stages.filter(
										(s) =>
											s.stageKind === "stage_1_therapy" ||
											s.items.some((i) => {
												const c = (i.category || "").toLowerCase();
												return c.includes("терап") || c.includes("кариес") || c.includes("эндо");
											}),
									).length,
								},
								{
									id: "surgery",
									label: "Хирургия",
									count: stages.filter(
										(s) =>
											s.stageKind === "stage_2_surgery" ||
											s.items.some((i) => {
												const c = (i.category || "").toLowerCase();
												return c.includes("хирург") || c.includes("имплант") || c.includes("удал");
											}),
									).length,
								},
								{
									id: "orthopedics",
									label: "Ортопедия",
									count: stages.filter(
										(s) =>
											s.stageKind === "stage_3_orthopedics" ||
											s.items.some((i) => {
												const c = (i.category || "").toLowerCase();
												return c.includes("ортопед") || c.includes("коронк") || c.includes("мост");
											}),
									).length,
								},
								{
									id: "orthodontics",
									label: "Ортодонтия",
									count: stages.filter(
										(s) =>
											s.stageKind === "stage_4_orthodontics" ||
											s.items.some((i) => {
												const c = (i.category || "").toLowerCase();
												return c.includes("ортодонт") || c.includes("брекет") || c.includes("элайнер");
											}),
									).length,
								},
								{
									id: "periodontics",
									label: "Пародонтология",
									count: stages.filter(
										(s) =>
											s.stageKind === "stage_5_periodontics" ||
											s.items.some((i) => {
												const c = (i.category || "").toLowerCase();
												return c.includes("пародонт") || c.includes("гигиен") || c.includes("десн");
											}),
									).length,
								},
							].map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => setSpecialtyFilter(tab.id as any)}
									data-testid={`tp-specialty-filter-${tab.id}`}
									className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 touch-manipulation ${
										specialtyFilter === tab.id
											? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
											: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))]"
									}`}
								>
									<span>{tab.label}</span>
									{tab.count > 0 && (
										<span
											className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
												specialtyFilter === tab.id
													? "bg-white/20 text-white"
													: "bg-[var(--paper-strong)] text-[var(--muted)]"
											}`}
										>
											{tab.count}
										</span>
									)}
								</button>
							))}
						</div>

						{/* Actions: + Добавить услугу из каталога, + Добавить этап плана */}
						<div className="flex items-center gap-2 flex-wrap shrink-0">
							<button
								type="button"
								onClick={() => {
									const defaultStage = visibleStages[0] || stages[0] || null;
									setTargetStageForAdd(defaultStage);
									if (defaultStage) {
										setServiceTargetStageNumber(defaultStage.stageNumber);
									}
									setIsAddServiceModalOpen(true);
								}}
								data-testid="tp-add-catalog-service-btn"
								className="min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft)] border border-[var(--teal)]/30 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs touch-manipulation"
								title="Добавить любую услугу из утвержденного прейскуранта клиники (Мандат 8e)"
							>
								<Plus size={14} />
								<span>+ Услуга из каталога</span>
							</button>

							<button
								type="button"
								onClick={() => setIsCreateStageModalOpen(true)}
								data-testid="tp-create-stage-btn"
								className="min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] border border-[var(--line,var(--border,#cbd5e1))] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs touch-manipulation"
								title="Добавить новый этап в план лечения"
							>
								<Layers size={14} className="text-[var(--teal,var(--brand-primary))]" />
								<span>+ Добавить этап</span>
							</button>
						</div>
					</div>

					{/* Stage list or Empty state */}
					{visibleStages.length === 0 ? (
						<div className="p-8 rounded-2xl border border-dashed border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] text-center text-xs text-[var(--muted,#64748b)] space-y-3">
							<Layers className="w-10 h-10 mx-auto text-[var(--muted,#64748b)] opacity-40" />
							<div className="font-bold text-sm text-[var(--ink,#0f172a)]">
								{specialtyFilter !== "all"
									? "В выбранной специализации пока нет этапов"
									: "В плане лечения пока нет сформированных этапов"}
							</div>
							<p className="max-w-md mx-auto m-0 text-xs text-[var(--muted,#64748b)]">
								{specialtyFilter !== "all"
									? "Сбросьте фильтр или добавьте новый этап по этой специальности."
									: "Добавьте клинический пакет, услугу из каталога или создайте этап вручную."}
							</p>
							<div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
								{specialtyFilter !== "all" ? (
									<button
										type="button"
										onClick={() => setSpecialtyFilter("all")}
										className="h-8 px-3 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] border border-[var(--line,var(--border,#cbd5e1))] transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
									>
										<span>Показать все этапы</span>
									</button>
								) : (
									<>
										<button
											type="button"
											onClick={() => handleApplyClinicalBundle("hygiene_turnkey")}
											className="h-8 px-3 rounded-lg text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft)] border border-[var(--teal)]/30 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
										>
											<Sparkles size={13} />
											<span>+ Пакет: Профгигиена</span>
										</button>
										<button
											type="button"
											onClick={() => setIsCreateStageModalOpen(true)}
											className="h-8 px-3 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] border border-[var(--line,var(--border,#cbd5e1))] transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
										>
											<span>+ Создать этап</span>
										</button>
									</>
								)}
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-4">
							{visibleStages.map((stage) => (
								<TreatmentPlanStageCard
									key={stage.stageNumber}
									stage={stage}
									defaultExpanded={true}
									{...(Array.isArray(dashboard?.inventoryItems) && dashboard.inventoryItems.length > 0
										? { inventoryItems: dashboard.inventoryItems as InventoryItemLookup[] }
										: {})}
									onUpdateItemQuantity={handleUpdateItemQuantity}
									onUpdateItemPrice={handleUpdateItemPrice}
									onUpdateItem={handleUpdateItem}
									onRemoveItem={handleRemoveItem}
									onAddItem={(st) => {
										setTargetStageForAdd(st);
										setServiceTargetStageNumber(st.stageNumber);
										setIsAddServiceModalOpen(true);
									}}
									onDeleteStage={handleDeleteStage}
									onExecuteWriteOffStage={handleExecuteWriteOffStage}
									onStartStage={handleStartStage}
									onChangeStageStatus={handleChangeStageStatus}
									onPayStage={(stageToPay) => {
										setSelectedInstallmentStage(stageToPay);
										setIsFiscalModalOpen(true);
									}}
									onApplyStageDiscount={() => {
										setDiscountPercent(10);
										showToast("Применена скидка врача 10% на план лечения", "success");
									}}
									onOpenLabOrder={handleOpenLabOrder}
									onOneClickLabOrder={handleOneClickLabOrder}
									onOpenInstallment={(stageToFinance) => {
										setSelectedInstallmentStage(stageToFinance);
										setIsInstallmentModalOpen(true);
									}}
								/>
							))}
						</div>
					)}
				</div>
			)}

			{/* 3-Tier Multi-Variant Presentation Studio Modal */}
			{isComparatorModalOpen && (
				<Suspense fallback={null}>
					<TreatmentPlanComparatorModal
						isOpen={isComparatorModalOpen}
						onClose={() => setIsComparatorModalOpen(false)}
						patientName={patientName}
						doctorName={auth?.currentUser?.name || "Лечащий врач"}
						clinicName={dashboard?.clinicSettings?.profile?.brandName || "Стоматологическая клиника DENTE"}
						planAgeDays={planAgeDays}
						planCreatedAtIso={planCreatedAtIso}
						onPlanSelected={(tierCode) => {
							const mappedTierId =
								tierCode === "economy_basic"
									? "economy"
									: tierCode === "standard_recommended"
										? "standard"
										: "optimum";
							setSelectedTierId(mappedTierId);
							setIsComparatorModalOpen(false);
							showToast(`Выбран вариант лечения «${tierCode}»`, "success");
						}}
						onApproveAndSign={(tierCode) => {
							const mappedTierId =
								tierCode === "economy_basic"
									? "economy"
									: tierCode === "standard_recommended"
										? "standard"
										: "optimum";
							setSelectedTierId(mappedTierId);
							setIsComparatorModalOpen(false);
							setIsSignModalOpen(true);
						}}
						onOpenInstallment={() => {
							if (stages.length > 0) {
								setSelectedInstallmentStage(stages[0]!);
								setIsInstallmentModalOpen(true);
							}
						}}
						onPrintContract={() => {
							setIsContractPrintOpen(true);
						}}
					/>
				</Suspense>
			)}

			{/* Stage Payment & Escrow Studio Modal */}
			{isStagePaymentModalOpen && (
				<Suspense fallback={null}>
					<StagePaymentPlanModal
						isOpen={isStagePaymentModalOpen}
						onClose={() => setIsStagePaymentModalOpen(false)}
						patientName={patientName}
						patientId={patientId}
						planTitle={currentTier.title}
						clinicName={dashboard?.clinicSettings?.profile?.brandName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
						doctorFullName={auth?.currentUser?.name || "Лечащий врач"}
					/>
				</Suspense>
			)}

			{/* Price & Star Protocols Validator Modal */}
			{isPriceValidatorModalOpen && (
				<Suspense fallback={null}>
					<TreatmentPlanPriceValidatorModal
						isOpen={isPriceValidatorModalOpen}
						onClose={() => setIsPriceValidatorModalOpen(false)}
						planPayload={validationPayload}
						stages={stages}
						catalogPricelist={(catalog as any) || []}
						onExportWorkOrder={(order) => {
							showToast(
								`Наряд-заказ №${order.orderNumber} на сумму ${order.totalPayableRub.toLocaleString("ru-RU")} ₽ выписан!`,
								"success",
								5000,
							);
						}}
						onExportCompletedAct={(act) => {
							showToast(
								`Акт выполненных работ №${act.orderNumber} на сумму ${act.totalPayableRub.toLocaleString("ru-RU")} ₽ сформирован!`,
								"success",
								5000,
							);
						}}
					/>
				</Suspense>
			)}

			{/* Digital Signature Modal */}
			{isSignModalOpen && (
				<Suspense fallback={null}>
					<TreatmentPlanSignatureModal
						isOpen={isSignModalOpen}
						tier={effectiveSignTier}
						patientName={patientName}
						patientId={patientId}
						doctorFullName={auth?.currentUser?.name || "Лечащий врач стоматолог"}
						clinicName={dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ"}
						onClose={() => setIsSignModalOpen(false)}
						onSignedSuccess={(agreement) => {
							setSignedAgreement(agreement);
							setIsSignModalOpen(false);
							showToast(
								`План «${effectiveSignTier.title}» успешно подписан пациентом ${patientName}!`,
								"success",
								5000,
							);
						}}
					/>
				</Suspense>
			)}

			{/* Contract and Plan Specification Printable Modal */}
			{isContractPrintOpen && (
				<Suspense fallback={null}>
					<TreatmentPlanContractPrint
						isOpen={isContractPrintOpen}
						tier={effectiveSignTier}
						stages={stages}
						patientName={patientName}
						patientId={patientId}
						patientPhone={patientPhone}
						patientBirthDate={patientBirthDate}
						doctorFullName={auth?.currentUser?.name || "Лечащий врач стоматолог"}
						clinicName={dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ"}
						signedAgreement={signedAgreement}
						discountPercent={discountPercent}
						bonusPointsDeductedRub={loyaltyDeduction.appliedBonusRub}
						planAgeDays={planAgeDays}
						onClose={() => setIsContractPrintOpen(false)}
					/>
				</Suspense>
			)}

			{/* Completed Works Act and Material Write-off Modal */}
			{isActPrintOpen && completedActData && (
				<Suspense fallback={null}>
					<TreatmentPlanCompletedActPrint
						isOpen={isActPrintOpen}
						actData={completedActData}
						onClose={() => {
							setIsActPrintOpen(false);
							setSelectedActStage(null);
						}}
						onConfirmExecuteWriteOff={handleConfirmExecuteWriteOff}
						isExecuting={isExecutingWriteOff}
					/>
				</Suspense>
			)}

			{/* 54-FZ Fiscal Receipt & Split Payment Modal */}
			{isFiscalModalOpen && (
				<Suspense fallback={null}>
					<FiscalReceipt54FzModal
						isOpen={isFiscalModalOpen}
						items={effectiveSignTier.stages.flatMap((s) => s.items)}
						patientId={patientId}
						patientName={patientName}
						patientPhone={dashboard?.activePatient?.phone || ""}
						patientDepositRub={Math.round((dashboard?.activePatient?.balanceKopecks || 0) / 100)}
						cashierFullName={auth?.currentUser?.name || "Кассир-администратор"}
						clinicName={dashboard?.clinicSettings?.profile?.brandName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
						onClose={() => setIsFiscalModalOpen(false)}
						onReceiptFiscalized={(receiptNum) => {
							showToast(`Чек №${receiptNum} сохранен в истории оплат`, "success");
						}}
					/>
				</Suspense>
			)}

			{/* Statutory Lab Work Order & Tracking Studio Modal */}
			{isLabOrderModalOpen && (
				<Suspense fallback={null}>
					<LabWorkOrderModal
						isOpen={isLabOrderModalOpen}
						onClose={() => setIsLabOrderModalOpen(false)}
						patientId={patientId}
						patientName={patientName}
						patientChartNumber={
							patient?.chartNumber || patient?.cardNumber || `К-${patientId.slice(0, 5)}`
						}
						doctorId={auth?.currentUser?.id || `doc-${Date.now()}`}
						doctorName={auth?.currentUser?.name || "Лечащий врач"}
						initialTeeth={
							selectedLabTeeth && selectedLabTeeth.length > 0 ? selectedLabTeeth : orthopedicTeeth
						}
						initialOrder={
							selectedActStage
								? ({
										id: `LAB-${patientId.slice(0, 4)}-${Date.now().toString().slice(-4)}`,
										orderNumber: `НРД-${patientId.slice(0, 4)}-${Date.now().toString().slice(-4)}`,
										patientId,
										patientName,
										doctorId: auth?.currentUser?.id || `doc-${Date.now()}`,
										doctorName: auth?.currentUser?.name || "Лечащий врач",
										selectedTeeth:
											selectedLabTeeth && selectedLabTeeth.length > 0
												? selectedLabTeeth
												: orthopedicTeeth,
										prostheticTypeId: "crown_zirconia_monolithic",
										materialId: "zirconia_katana_ml",
										shadeSystem: "classical",
										shadeCode: "A2",
										stumpShadeCode: "ND2",
										currentStage: "in_progress",
										completedStages: ["order_placed"],
										patientPriceRub: selectedActStage.totalRub,
										costPriceRub: Math.round(selectedActStage.totalRub * 0.4),
										createdAt: new Date().toISOString(),
										updatedAt: new Date().toISOString(),
										stagesLog: [],
										clinicNotes: `Оформлено по этапу №${selectedActStage.stageNumber} плана «${currentTier.title}». Зафиксированная стоимость: ${selectedActStage.totalRub.toLocaleString("ru-RU")} ₽.`,
									} as any)
								: null
						}
						onSaveOrder={(order) => {
							showToast(
								`Наряд-заказ №${order.orderNumber} в зуботехническую лабораторию на сумму ${order.financials.patientPriceTotalRub.toLocaleString("ru-RU")} ₽ успешно сохранен!`,
								"success",
								5000,
							);
						}}
					/>
				</Suspense>
			)}

			{/* Fast Invoice & Work Order Generation Modal (Feature #41 PriceGuard) */}
			{isInvoiceModalOpen && (
				<Suspense fallback={null}>
					<InvoiceGenerationModal
						isOpen={isInvoiceModalOpen}
						onClose={() => setIsInvoiceModalOpen(false)}
						patientId={patientId}
						patientName={patientName}
						patientPhone={patientPhone}
						patientBalanceRub={patientBalanceRub}
						planId={`PLAN-${patientId.slice(0, 6).toUpperCase()}`}
						planNumber={`ПЛАН-№${patientId.slice(0, 4)}`}
						planTitle={currentTier.title}
						planCreatedAtIso={new Date().toISOString()}
						approvedAtIso={signedAgreement ? new Date().toISOString() : undefined}
						isSignedWithPatient={Boolean(signedAgreement)}
						doctorFullName={auth?.currentUser?.name || "Лечащий врач"}
						doctorUserId={auth?.currentUser?.id || undefined}
						planItems={stages.flatMap((s) => s.items)}
						onInvoiceCreated={(inv) => {
							const allItems = stages.flatMap((s) => s.items);
							const grossTotalRub = allItems.reduce(
								(acc, it) => acc + it.unitPriceRub * it.quantity,
								0,
							);
							const discountRub = allItems.reduce((acc, it) => acc + it.discountRub, 0);
							const netTotalRub = inv.totalNetRub ?? loyaltyDeduction.netPayableRub;

							const exportData: CashierInvoiceExportData = {
								patientId,
								patientName,
								invoiceId: inv.invoiceId,
								invoiceNumber: inv.invoiceNumber,
								items: allItems,
								grossTotalRub,
								discountRub,
								netTotalRub,
								netTotalKopecks: Math.round(netTotalRub * 100),
								notes: `Выписан счет №${inv.invoiceNumber || ""} по плану «${currentTier.title}»`,
								createdAtIso: new Date().toISOString(),
							};

							if (onExportToCashier) {
								onExportToCashier(exportData);
							}

							showToast(`Документ ${inv.invoiceNumber} успешно сформирован и передан в кассу!`, "success", 4000);
						}}
					/>
				</Suspense>
			)}


			{/* Bank Installment QR Financing Modal */}
			{isInstallmentModalOpen && selectedInstallmentStage && (
				<Suspense fallback={null}>
					<BankInstallmentQrModal
						isOpen={isInstallmentModalOpen}
						onClose={() => {
							setIsInstallmentModalOpen(false);
							setSelectedInstallmentStage(null);
						}}
						stageTitle={`Этап №${selectedInstallmentStage.stageNumber}: ${selectedInstallmentStage.title}`}
						stageNumber={selectedInstallmentStage.stageNumber}
						stageAmountKopecks={selectedInstallmentStage.totalKopecks}
						patientId={patientId}
						patientName={patientName}
						patientPhone={patientPhone}
						clinicName={dashboard?.clinicSettings?.profile?.brandName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
						clinicInn={dashboard?.clinicSettings?.requisites?.inn || ""}
						planId={`PLAN-${patientId.slice(0, 6).toUpperCase()}`}
						onInstallmentApproved={(approval) => {
							showToast(
								`Рассрочка на сумму ${selectedInstallmentStage.totalRub.toLocaleString("ru-RU")} ₽ одобрена банком!`,
								"success",
								5000,
							);
						}}
					/>
				</Suspense>
			)}

			{/* AI Audit & 3-Tier Chairside Presenter Modal */}
			{isPresenterModalOpen && (
				<Suspense fallback={null}>
					<TreatmentPlanPresenterModal
						isOpen={isPresenterModalOpen}
						onClose={() => setIsPresenterModalOpen(false)}
						patientId={patientId}
						patientName={patientName}
						patientPhone={dashboard?.activePatient?.phone || ""}
						doctorFullName={auth?.currentUser?.name || "Лечащий врач"}
						teeth={teethData}
						tiers={planTiers}
						initialSelectedTierId={selectedTierId}
						contractNumber={contractNumber}
						onSelectPlan={(plan) => {
							setSelectedTierId(plan.tierId);
							showToast(`Выбран план: ${plan.title} (${plan.totalRub.toLocaleString("ru-RU")} ₽)`, "success");
						}}
						onConfirmSelection={(plan) => {
							setSelectedTierId(plan.tierId);
							setPlanStatus("agreed");
							showToast(`Пациент подтвердил выбор: ${plan.title}`, "success");
						}}
						onApproveAndSign={(plan) => {
							setSelectedTierId(plan.tierId);
							setIsPresenterModalOpen(false);
							setIsSignModalOpen(true);
						}}
						onPrintContract={(plan) => {
							setSelectedTierId(plan.tierId);
							setIsPresenterModalOpen(false);
							setIsContractPrintOpen(true);
						}}
					/>
				</Suspense>
			)}

			{/* Curator Plan Assignment Modal */}
			{isCuratorModalOpen && (
				<Suspense fallback={null}>
					<CuratorPlanAssignmentModal
						isOpen={isCuratorModalOpen}
						onClose={() => setIsCuratorModalOpen(false)}
						patientId={patientId}
						patientName={patientName}
						treatmentPlanId={`PLAN-${patientId.slice(0, 6).toUpperCase()}`}
						treatmentPlanTitle={`${currentTier.title} (${grandTotalRub.toLocaleString("ru-RU")} ₽)`}
						currentCuratorId={patient?.administrativeProfile?.curatorId || undefined}
						currentStage={patient?.administrativeProfile?.curatorFunnelStage || "consultation"}
						onAssigned={(assigned) => {
							showToast(`Куратор ${assigned.curatorFullName} успешно закреплен!`, "success");
						}}
					/>
				</Suspense>
			)}

			{/* Chairside Clinical Service Bundles 804n Modal */}
			{isChairsideBundlesModalOpen && (
				<Suspense fallback={null}>
					<ClinicalServiceBundlesModal
						isOpen={isChairsideBundlesModalOpen}
						onClose={() => setIsChairsideBundlesModalOpen(false)}
						initialToothNumber={orthopedicTeeth[0] || 16}
						patientId={patientId}
						patientName={patientName}
						onApplyToPlan={handleApplyChairsideBundlePlan}
						onApplyToInvoice={handleApplyChairsideBundleInvoice}
						targetMode="both"
					/>
				</Suspense>
			)}

			{/* Manual Service Addition from Catalog Modal (Mandates 8e, 8k) */}
			{isAddServiceModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
					role="dialog"
					aria-modal="true"
					aria-labelledby="add-service-modal-title"
					data-testid="add-service-from-catalog-modal"
				>
					<div
						className="w-full max-w-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] rounded-3xl border border-[var(--line,var(--border,#cbd5e1))] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b border-[var(--line,var(--border,#cbd5e1))]">
							<div className="flex items-center gap-2.5">
								<div className="p-2 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal)]/20">
									<FolderPlus size={18} />
								</div>
								<div>
									<h3 id="add-service-modal-title" className="text-sm font-black text-[var(--ink,#0f172a)]">
										Добавить услугу из каталога
									</h3>
									<p className="text-[11px] text-[var(--muted,#64748b)]">
										Прейскурант клиники & Номенклатура Минздрава 804н (Мандат 8e)
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => {
									setIsAddServiceModalOpen(false);
									setSelectedCatalogItem(null);
								}}
								className="p-1.5 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer transition-colors"
								aria-label="Закрыть окно"
							>
								<X size={18} />
							</button>
						</div>

						{/* Body */}
						<div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
							{/* Search & Category Filter */}
							<div className="space-y-2">
								<div className="relative">
									<Search
										size={15}
										className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)]"
									/>
									<input
										type="text"
										value={serviceSearchQuery}
										onChange={(e) => setServiceSearchQuery(e.target.value)}
										placeholder="Поиск по названию или коду 804н (кариес, коронка, имплант, A16.07...)"
										className="w-full h-9 pl-9 pr-8 text-xs rounded-xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
										data-testid="catalog-service-search-input"
									/>
									{serviceSearchQuery && (
										<button
											type="button"
											onClick={() => setServiceSearchQuery("")}
											className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
										>
											<X size={14} />
										</button>
									)}
								</div>

								{/* Category Pills */}
								{availableCategories.length > 0 && (
									<div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
										<button
											type="button"
											onClick={() => setServiceCategoryFilter("all")}
											className={`h-6 px-2.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shrink-0 ${
												serviceCategoryFilter === "all"
													? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs"
													: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink)] border border-[var(--line,#e2e8f0)]"
											}`}
										>
											Все ({effectiveCatalog.length})
										</button>
										{availableCategories.map((cat) => (
											<button
												key={cat}
												type="button"
												onClick={() => setServiceCategoryFilter(cat)}
												className={`h-6 px-2.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shrink-0 ${
													serviceCategoryFilter === cat
														? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs"
														: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink)] border border-[var(--line,#e2e8f0)]"
												}`}
											>
												{cat}
											</button>
										))}
									</div>
								)}
							</div>

							{/* Services List */}
							<div className="border border-[var(--line,var(--border,#cbd5e1))] rounded-2xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
								{filteredCatalogServices.length === 0 ? (
									<div className="p-4 text-center text-xs text-[var(--muted,#64748b)]">
										Услуги не найдены. Попробуйте изменить поисковый запрос.
									</div>
								) : (
									filteredCatalogServices.map((item) => {
										const isSelected = selectedCatalogItem?.id === item.id;
										return (
											<div
												key={item.id}
												onClick={() => setSelectedCatalogItem(item)}
												data-testid={`catalog-item-${item.id}`}
												className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
													isSelected
														? "bg-[var(--teal-soft,var(--paper-soft))] border-l-4 border-l-[var(--teal,var(--brand-primary))]"
														: "hover:bg-[var(--paper-strong,#ffffff)]"
												}`}
											>
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-1.5 flex-wrap">
														<span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--teal-dark,var(--teal))]">
															{item.order804nCode || item.code || item.id}
														</span>
														<span className="text-[10px] text-[var(--muted,#64748b)]">
															{item.category}
														</span>
													</div>
													<div className="font-semibold text-xs text-[var(--ink,#0f172a)] truncate mt-0.5">
														{item.title}
													</div>
												</div>
												<div className="text-right shrink-0 flex items-center gap-2">
													<span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
														{(item.basePriceRub || 0).toLocaleString("ru-RU")} ₽
													</span>
													{isSelected && (
														<Check size={14} className="text-[var(--teal,var(--brand-primary))]" />
													)}
												</div>
											</div>
										);
									})
								)}
							</div>

							{/* Configuration when a service is selected */}
							{selectedCatalogItem && (
								<div className="p-3 rounded-2xl bg-[var(--paper-strong,#ffffff)] border border-[var(--teal)]/40 space-y-3 shadow-xs">
									<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
										<div className="min-w-0">
											<div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">
												Выбранная процедура:
											</div>
											<div className="font-bold text-xs text-[var(--ink)] truncate">
												{selectedCatalogItem.title}
											</div>
										</div>
										<span className="font-mono font-bold text-sm text-emerald-600 shrink-0">
											{(selectedCatalogItem.basePriceRub || 0).toLocaleString("ru-RU")} ₽ / ед.
										</span>
									</div>

									{/* Target Stage selector */}
									<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
										<label className="text-[11px] font-bold text-[var(--muted)]">
											Назначить в этап плана:
										</label>
										<select
											value={serviceTargetStageNumber}
											onChange={(e) => setServiceTargetStageNumber(Number(e.target.value))}
											className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
											data-testid="target-stage-selector"
										>
											{stages.map((st) => (
												<option key={st.stageNumber} value={st.stageNumber}>
													Этап {romanizeStageNumber(st.stageNumber)}: {st.title}
												</option>
											))}
											{stages.length === 0 && (
												<option value={1}>Этап I: Клинический этап</option>
											)}
										</select>
									</div>

									{/* FDI Tooth Selector */}
									<div className="space-y-1.5">
										<div className="flex items-center justify-between">
											<label className="text-[11px] font-bold text-[var(--muted)]">
												Привязка к зубу (FDI ISO 3950):
											</label>
											<button
												type="button"
												onClick={() => setSelectedToothForService(null)}
												className={`text-[10px] px-2 py-0.5 rounded-md font-bold cursor-pointer transition-colors ${
													selectedToothForService === null
														? "bg-[var(--teal)] text-white"
														: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
												}`}
											>
												Без зуба / Общая
											</button>
										</div>

										{/* Quick tooth selector chips */}
										<div className="space-y-1 bg-[var(--paper-soft)] p-2 rounded-xl border border-[var(--line)]">
											{/* Upper Jaw: Q1 (18..11) | Q2 (21..28) */}
											<div className="flex items-center justify-center gap-1 flex-wrap text-[10px] font-mono font-bold">
												<span className="text-[9px] text-[var(--muted)] mr-1">В/Ч:</span>
												{[18, 17, 16, 15, 14, 13, 12, 11].map((t) => (
													<button
														key={t}
														type="button"
														onClick={() => setSelectedToothForService(selectedToothForService === t ? null : t)}
														className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-all ${
															selectedToothForService === t
																? "bg-[var(--teal)] text-white shadow-2xs font-black"
																: "bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)]"
														}`}
													>
														{t}
													</button>
												))}
												<span className="text-[var(--line)] font-normal">|</span>
												{[21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
													<button
														key={t}
														type="button"
														onClick={() => setSelectedToothForService(selectedToothForService === t ? null : t)}
														className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-all ${
															selectedToothForService === t
																? "bg-[var(--teal)] text-white shadow-2xs font-black"
																: "bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)]"
														}`}
													>
														{t}
													</button>
												))}
											</div>

											{/* Lower Jaw: Q4 (48..41) | Q3 (31..38) */}
											<div className="flex items-center justify-center gap-1 flex-wrap text-[10px] font-mono font-bold">
												<span className="text-[9px] text-[var(--muted)] mr-1">Н/Ч:</span>
												{[48, 47, 46, 45, 44, 43, 42, 41].map((t) => (
													<button
														key={t}
														type="button"
														onClick={() => setSelectedToothForService(selectedToothForService === t ? null : t)}
														className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-all ${
															selectedToothForService === t
																? "bg-[var(--teal)] text-white shadow-2xs font-black"
																: "bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)]"
														}`}
													>
														{t}
													</button>
												))}
												<span className="text-[var(--line)] font-normal">|</span>
												{[31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
													<button
														key={t}
														type="button"
														onClick={() => setSelectedToothForService(selectedToothForService === t ? null : t)}
														className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-all ${
															selectedToothForService === t
																? "bg-[var(--teal)] text-white shadow-2xs font-black"
																: "bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)]"
														}`}
													>
														{t}
													</button>
												))}
											</div>
										</div>
									</div>

									{/* Quantity & Discount */}
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
										{/* Quantity */}
										<div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
											<span className="text-[11px] font-bold text-[var(--muted)]">Количество:</span>
											<div className="flex items-center gap-1.5">
												<button
													type="button"
													onClick={() => setServiceQuantity(Math.max(1, serviceQuantity - 1))}
													className="w-7 h-7 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-xs font-bold flex items-center justify-center cursor-pointer hover:bg-[var(--line)]"
												>
													-
												</button>
												<span className="w-8 text-center font-mono font-bold text-xs">
													{serviceQuantity}
												</span>
												<button
													type="button"
													onClick={() => setServiceQuantity(serviceQuantity + 1)}
													className="w-7 h-7 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-xs font-bold flex items-center justify-center cursor-pointer hover:bg-[var(--line)]"
												>
													+
												</button>
											</div>
										</div>

										{/* Doctor Discount */}
										<div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
											<span className="text-[11px] font-bold text-[var(--muted)]">Скидка врача:</span>
											<div className="flex items-center gap-1">
												{[0, 10, 50, 100].map((pct) => (
													<button
														key={pct}
														type="button"
														onClick={() => setServiceDiscountPercent(pct)}
														className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
															serviceDiscountPercent === pct
																? "bg-[var(--teal)] text-white"
																: "bg-[var(--paper-strong)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
														}`}
													>
														{pct}%
													</button>
												))}
												<input
													type="number"
													min="0"
													max="100"
													value={serviceDiscountPercent}
													onChange={(e) => {
														const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
														setServiceDiscountPercent(v);
													}}
													className="w-10 h-7 text-center font-mono font-bold text-xs rounded border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]"
												/>
											</div>
										</div>
									</div>

									{/* Total Calculation Strip (Mandate 8k: Kopeck Exact Money) */}
									{(() => {
										const basePrice = selectedCatalogItem.basePriceRub || 0;
										const grossRub = basePrice * serviceQuantity;
										const discRub = Math.round((grossRub * serviceDiscountPercent) / 100);
										const netRub = Math.max(0, grossRub - discRub);
										return (
											<div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-bold">
												<span className="text-emerald-900 dark:text-emerald-200">
													Итого к начислению в план:
												</span>
												<div className="flex items-center gap-2">
													{discRub > 0 && (
														<span className="text-[11px] text-[var(--muted)] line-through font-mono">
															{grossRub.toLocaleString("ru-RU")} ₽
														</span>
													)}
													<span className="font-mono text-sm text-emerald-700 dark:text-emerald-300">
														{netRub.toLocaleString("ru-RU")} ₽
													</span>
												</div>
											</div>
										);
									})()}
								</div>
							)}
						</div>

						{/* Footer */}
						<div className="p-4 border-t border-[var(--line,var(--border,#cbd5e1))] flex items-center justify-between gap-3 bg-[var(--paper-soft,#f8fafc)]">
							<button
								type="button"
								onClick={() => {
									setIsAddServiceModalOpen(false);
									setSelectedCatalogItem(null);
								}}
								className="min-h-[44px] sm:min-h-[36px] px-4 py-2 rounded-xl text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] cursor-pointer transition-colors"
							>
								Отмена
							</button>

							<button
								type="button"
								disabled={!selectedCatalogItem}
								onClick={handleConfirmAddService}
								data-testid="confirm-add-service-to-stage-btn"
								className="min-h-[44px] sm:min-h-[36px] px-5 py-2 rounded-xl text-xs font-black text-white bg-[var(--teal,var(--brand-primary))] hover:bg-[var(--teal-dark,#0f766e)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-md flex items-center gap-1.5"
							>
								<Plus size={15} />
								<span>Добавить в этап</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Create New Plan Stage Modal (Mandate 8e: Doctor Autonomy) */}
			{isCreateStageModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
					role="dialog"
					aria-modal="true"
					aria-labelledby="create-stage-modal-title"
					data-testid="create-stage-modal"
				>
					<div
						className="w-full max-w-lg bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] rounded-3xl border border-[var(--line,var(--border,#cbd5e1))] shadow-2xl flex flex-col overflow-hidden"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b border-[var(--line,var(--border,#cbd5e1))]">
							<div className="flex items-center gap-2.5">
								<div className="p-2 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal)]/20">
									<Layers size={18} />
								</div>
								<div>
									<h3 id="create-stage-modal-title" className="text-sm font-black text-[var(--ink,#0f172a)]">
										Новый этап плана лечения
									</h3>
									<p className="text-[11px] text-[var(--muted,#64748b)]">
										Выберите профиль или создайте индивидуальный этап
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsCreateStageModalOpen(false)}
								className="p-1.5 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer transition-colors"
								aria-label="Закрыть окно"
							>
								<X size={18} />
							</button>
						</div>

						{/* Body */}
						<div className="p-4 space-y-4 text-xs">
							{/* Presets Grid */}
							<div className="space-y-1.5">
								<label className="text-[11px] font-bold text-[var(--muted)]">
									Клиническая специализация этапа:
								</label>
								<div className="grid grid-cols-2 gap-2">
									{[
										{ id: "therapy", label: "Терапия и санация", desc: "Кариес, эндодонтия, гигиена" },
										{ id: "surgery", label: "Хирургия и имплантация", desc: "Удаление, пластика, импланты" },
										{ id: "orthopedics", label: "Ортопедическая реабилитация", desc: "Коронки, мосты, виниры" },
										{ id: "orthodontics", label: "Ортодонтическое лечение", desc: "Брекеты, элайнеры, прикус" },
										{ id: "periodontics", label: "Пародонтология", desc: "SRP, Вектор, кюретаж" },
										{ id: "custom", label: "Индивидуальный этап", desc: "Специализированный протокол" },
									].map((preset) => {
										const isSelected = newStagePreset === preset.id;
										return (
											<button
												key={preset.id}
												type="button"
												onClick={() => setNewStagePreset(preset.id as any)}
												className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
													isSelected
														? "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal,var(--brand-primary))] shadow-xs"
														: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#ffffff)]"
												}`}
											>
												<div className="font-bold text-xs text-[var(--ink,#0f172a)]">
													{preset.label}
												</div>
												<div className="text-[10px] text-[var(--muted,#64748b)] mt-0.5 line-clamp-1">
													{preset.desc}
												</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* Custom Stage Title input */}
							<div className="space-y-1.5">
								<label className="text-[11px] font-bold text-[var(--muted)]">
									Пользовательское название этапа (необязательно):
								</label>
								<input
									type="text"
									value={newStageCustomTitle}
									onChange={(e) => setNewStageCustomTitle(e.target.value)}
									placeholder="Например: Протезирование на мультиюнитах All-on-4"
									className="w-full h-9 px-3 text-xs rounded-xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
									data-testid="create-stage-title-input"
								/>
							</div>
						</div>

						{/* Footer */}
						<div className="p-4 border-t border-[var(--line,var(--border,#cbd5e1))] flex items-center justify-between gap-3 bg-[var(--paper-soft,#f8fafc)]">
							<button
								type="button"
								onClick={() => setIsCreateStageModalOpen(false)}
								className="min-h-[44px] sm:min-h-[36px] px-4 py-2 rounded-xl text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] cursor-pointer transition-colors"
							>
								Отмена
							</button>

							<button
								type="button"
								onClick={handleConfirmCreateStage}
								data-testid="confirm-create-stage-btn"
								className="min-h-[44px] sm:min-h-[36px] px-5 py-2 rounded-xl text-xs font-black text-white bg-[var(--teal,var(--brand-primary))] hover:bg-[var(--teal-dark,#0f766e)] cursor-pointer transition-all shadow-md flex items-center gap-1.5"
							>
								<Plus size={15} />
								<span>Создать этап</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default TreatmentPlanModule;

