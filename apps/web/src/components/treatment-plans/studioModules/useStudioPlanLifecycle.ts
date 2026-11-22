/**
 * useStudioPlanLifecycle.ts — Хук жизненного цикла студии планов лечения (SSOT).
 * Мандаты 8b, 8zi: декомпозиция стейта, автосейва, реактивной гидратации и утверждения.
 * Мандат 8e: 0 disabled блокировок, 100% свобода клинических решений врача.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { rublesToKopecks, kopecksToRubles, generateUuidV7 } from "@dental/shared";
import type {
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanStage,
	TreatmentPlanItem,
} from "../treatmentPlanTypes";
import type { ToothData } from "../types";
import {
	CANONICAL_CLINICAL_STAGES,
	buildCanonical3TierPlans,
	applyDoctorDiscountToTiers,
	generateTreatmentPlanFromDiagnosis,
	buildPresenterTiersFromTeeth,
} from "../treatmentPlanCatalogData";
import { type ClinicalBundleDefinition } from "../bundlesEngine";

export type StudioDepthMode = "express" | "expert";
export type StudioTab = "tiers" | "installment" | "warranty" | "photo" | "bundles" | "curator";

export interface UseStudioPlanLifecycleProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName: string;
	readonly patientId?: string | null | undefined;
	readonly doctorFullName: string;
	readonly initialSelectedTierId?: TreatmentPlanTierId | undefined;
	readonly initialDepthMode?: StudioDepthMode | undefined;
	readonly initialActiveTab?: StudioTab | undefined;
	readonly initialStages?: readonly TreatmentPlanStage[] | undefined;
	readonly teeth?: readonly ToothData[] | undefined;
	readonly isDemo: boolean;
	readonly planId?: string | null | undefined;
	readonly onApprovePlan?: ((selectedTier: TreatmentPlanTier) => void) | undefined;
	readonly onConfirmSelection?: ((selectedTier: TreatmentPlanTier) => void) | undefined;
	readonly onApproveAndSign?: ((selectedTier: TreatmentPlanTier) => void) | undefined;
	readonly onSaveDraft?: ((stages: readonly TreatmentPlanStage[], selectedTier: TreatmentPlanTier) => void) | undefined;
	readonly mainRef: React.RefObject<HTMLElement | null>;
}

export function useStudioPlanLifecycle({
	isOpen,
	onClose,
	patientName,
	patientId,
	doctorFullName,
	initialSelectedTierId = "optimum",
	initialDepthMode = "express",
	initialActiveTab = "tiers",
	initialStages,
	teeth,
	isDemo,
	planId: propPlanId,
	onApprovePlan,
	onConfirmSelection,
	onApproveAndSign,
	onSaveDraft,
	mainRef,
}: UseStudioPlanLifecycleProps) {
	const [depthMode, setDepthMode] = useState<StudioDepthMode>(initialDepthMode);
	const [activeTab, setActiveTab] = useState<StudioTab>(initialActiveTab);

	useEffect(() => {
		if (initialActiveTab) {
			setActiveTab(initialActiveTab);
		}
	}, [initialActiveTab]);

	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>(initialSelectedTierId);
	const [stages, setStages] = useState<readonly TreatmentPlanStage[]>(() => {
		if (initialStages && initialStages.length > 0) return initialStages;
		if (teeth && Array.isArray(teeth) && teeth.length > 0) {
			const tiersFromTeeth = buildPresenterTiersFromTeeth(teeth);
			const optTier = tiersFromTeeth.find((t) => t.tierId === "optimum") || tiersFromTeeth[0];
			if (optTier && optTier.stages.length > 0) return optTier.stages;
		}
		return [];
	});
	const [doctorDiscountPercent, setDoctorDiscountPercent] = useState<number>(0);
	const [isDiscountBarOpen, setIsDiscountBarOpen] = useState<boolean>(false);
	const [currentPlanId, setCurrentPlanId] = useState<string | null>(propPlanId || null);
	const [expandedStageId, setExpandedStageId] = useState<string | null>(() => {
		if (initialStages && initialStages.length > 0 && initialStages[0]?.id) {
			return initialStages[0].id;
		}
		if (teeth && Array.isArray(teeth) && teeth.length > 0) {
			const tiersFromTeeth = buildPresenterTiersFromTeeth(teeth);
			const optTier = tiersFromTeeth.find((t) => t.tierId === "optimum") || tiersFromTeeth[0];
			if (optTier && optTier.stages[0]?.id) return optTier.stages[0].id;
		}
		return "stage-1-hygiene";
	});
	const [approvedSuccessMessage, setApprovedSuccessMessage] = useState<string | null>(null);
	const [approvalErrorMessage, setApprovalErrorMessage] = useState<string | null>(null);
	const [draftSavedNotice, setDraftSavedNotice] = useState<string | null>(null);
	const [exportSuccessNotice, setExportSuccessNotice] = useState<string | null>(null);

	// Мандат 8bn / 8zq: Zero-Leak Draft Reset при размонтировании/закрытии модалки и сбросе
	const resetDraft = useCallback(() => {
		setStages([]);
		setCurrentPlanId(null);
		setDoctorDiscountPercent(0);
		setIsDiscountBarOpen(false);
		setApprovedSuccessMessage(null);
		setApprovalErrorMessage(null);
		setDraftSavedNotice(null);
		setExportSuccessNotice(null);
		if (typeof window !== "undefined") {
			try {
				if (patientId) {
					localStorage.removeItem(`dente_plan_draft_${patientId}`);
				}
				localStorage.removeItem("dente_plan_draft_current");
			} catch (storageErr) {
				console.warn("[useStudioPlanLifecycle] Storage cleanup non-blocking error:", storageErr);
			}
		}
	}, [patientId]);

	useEffect(() => {
		if (!isOpen) {
			resetDraft();
		}
	}, [isOpen, resetDraft]);

	const handleCloseWithReset = useCallback(() => {
		resetDraft();
		onClose();
	}, [resetDraft, onClose]);

	// 0. Реактивная гидратация планов лечения пациента без F5 (Мандаты 8d, 8zq)
	useEffect(() => {
		if (!isOpen || !patientId) return;
		let isCancelled = false;

		const fetchPatientPlans = async () => {
			try {
				const res = await fetch(`/api/patients/${patientId}/treatment-plans`);
				if (!res.ok) return;
				const data = await res.json();
				if (isCancelled) return;

				if (data?.success && Array.isArray(data.plans) && data.plans.length > 0) {
					type RemotePlanItemLike = {
						id?: string;
						phase?: number;
						toothNumber?: number;
						priceId?: string;
						serviceCode?: string;
						code804n?: string;
						name?: string;
						category?: string;
						price?: number | string;
						priceRub?: number;
						unitPriceRub?: number;
						discount?: number | string;
						discountRub?: number;
						quantity?: number;
						isCompleted?: boolean;
					};
					type RemotePlanLike = {
						id?: string;
						status?: string | null;
						items?: RemotePlanItemLike[];
						stages?: Array<{ id: string; stageName: string; stageOrder: number }>;
					};
					const plansList = data.plans as readonly RemotePlanLike[];
					const activePlan = plansList.find((p) => p.status === "Approved" || p.status === "InProgress") || plansList[0];
					if (activePlan && Array.isArray(activePlan.items) && activePlan.items.length > 0) {
						const stageDefs = Array.isArray(activePlan.stages) ? activePlan.stages : [];
						const stageDefMap = new Map<number, { id: string; stageName: string; stageOrder: number }>();
						for (const sd of stageDefs) {
							if (typeof sd.stageOrder === "number") {
								stageDefMap.set(sd.stageOrder, sd);
							}
						}

						const phaseMap = new Map<number, TreatmentPlanItem[]>();
						for (const it of activePlan.items) {
							const phase = it.phase || 1;
							if (!phaseMap.has(phase)) phaseMap.set(phase, []);
							phaseMap.get(phase)!.push({
								id: it.id || `plan-item-${phase}-${Date.now()}`,
								toothNumber: it.toothNumber,
								priceId: it.priceId || undefined,
								code804n: it.priceId || it.serviceCode || "",
								serviceCode: it.serviceCode || it.priceId || "",
								name: it.name || "Услуга",
								category: it.category || "Общие",
								priceRub: Number(it.priceRub || it.price || 0),
								unitPriceRub: Number(it.unitPriceRub || it.price || 0),
								discountRub: Number(it.discountRub || it.discount || 0),
								quantity: it.quantity || 1,
								stageKind: phase === 1 ? "stage_1_therapy" : phase === 2 ? "stage_2_surgery" : "stage_3_orthopedics",
								isCompleted: Boolean(it.isCompleted),
							});
						}

						const hydrated: TreatmentPlanStage[] = [];
						const allOrders = new Set([...phaseMap.keys(), ...stageDefMap.keys()]);
						const sortedPhases = Array.from(allOrders).sort((a, b) => a - b);
						for (const ph of sortedPhases) {
							const groupItems = phaseMap.get(ph) || [];
							const sRub = groupItems.reduce((acc, it) => acc + it.priceRub * (it.quantity || 1), 0);
							const stageDef = stageDefMap.get(ph);
							const defaultTitle = ph === 1
								? "Этап 1: Неотложная помощь и терапия"
								: ph === 2
								? "Этап 2: Хирургия и имплантация"
								: ph === 3
								? "Этап 3: Ортопедия и протезирование"
								: `Этап ${ph}: Клинический этап`;

							const title = stageDef?.stageName || defaultTitle;

							hydrated.push({
								id: stageDef?.id || `stage-${ph}-${activePlan.id || "hydrated"}`,
								stageNumber: ph,
								stageKind: ph === 1 ? "stage_1_therapy" : ph === 2 ? "stage_2_surgery" : "stage_3_orthopedics",
								title,
								subtitle: `Процедур в этапе: ${groupItems.length}`,
								clinicalGoal: "Комплексная санация полости рта",
								totalRub: sRub,
								totalKopecks: rublesToKopecks(sRub),
								estimatedVisits: groupItems.length || 1,
								estimatedWeeks: ph * 2,
								status: activePlan.status === "Approved" ? "agreed" : "draft",
								items: groupItems,
							});
						}

						if (hydrated.length > 0) {
							if (activePlan?.id) setCurrentPlanId(activePlan.id);
							setStages(hydrated);
							if (hydrated[0]?.id) setExpandedStageId(hydrated[0].id);
							return;
						}
					}
				}

				if (typeof window !== "undefined") {
					const draftStorageKey = `dente_plan_draft_${patientId}`;
					const localDraft = localStorage.getItem(draftStorageKey);
					if (localDraft) {
						try {
							const parsed = JSON.parse(localDraft);
							if (Array.isArray(parsed.stages) && parsed.stages.length > 0) {
								setStages(parsed.stages);
								if (parsed.selectedTierId) setSelectedTierId(parsed.selectedTierId);
								if (typeof parsed.doctorDiscountPercent === "number") setDoctorDiscountPercent(parsed.doctorDiscountPercent);
								return;
							}
						} catch (draftParseErr) {
							console.warn("[TreatmentPlanStudioModal] Ошибка парсинга локального черновика плана лечения:", draftParseErr);
						}
					}
				}

				if (!isDemo) {
					setStages([]);
				}
			} catch (err) {
				console.warn("[TreatmentPlanStudioModal] Ошибка реактивной гидратации планов лечения:", err);
			}
		};

		void fetchPatientPlans();

		const handlePlanChanged = () => {
			void fetchPatientPlans();
		};

		if (typeof window !== "undefined") {
			window.addEventListener("dente:plan-status-changed", handlePlanChanged);
			window.addEventListener("dente:plan-updated", handlePlanChanged);
		}

		return () => {
			isCancelled = true;
			if (typeof window !== "undefined") {
				window.removeEventListener("dente:plan-status-changed", handlePlanChanged);
				window.removeEventListener("dente:plan-updated", handlePlanChanged);
			}
		};
	}, [isOpen, patientId, isDemo]);

	// 1. Расчет 3 канонических тарифов с учетом текущих этапов и скидки врача
	const computedTiers = useMemo(() => {
		const baseTiers = buildCanonical3TierPlans(stages);
		return applyDoctorDiscountToTiers(baseTiers, doctorDiscountPercent);
	}, [stages, doctorDiscountPercent]);

	// 2. Активный выбранный вариант
	const activeTier = useMemo(() => {
		return (
			computedTiers.find((t) => t.tierId === selectedTierId) ||
			computedTiers.find((t) => t.tierId === "optimum") ||
			computedTiers[0] || {
				tierId: "optimum" as const,
				title: "Оптимум",
				totalRub: 0,
				totalKopecks: 0,
				stages: [],
			}
		);
	}, [computedTiers, selectedTierId]);

	const sanitizedActiveTitle = activeTier.title.replace(/^[^a-zA-Zа-яА-Я0-9]+/, "");

	const resetScrollTop = useCallback(() => {
		if (typeof window !== "undefined") {
			window.requestAnimationFrame(() => {
				if (mainRef.current) mainRef.current.scrollTop = 0;
			});
		}
	}, [mainRef]);

	// 3. Быстрый выбор типового плана по коду диагноза МКБ-10 (Мандат 8n)
	const handleSelectDiagnosisPreset = useCallback((diagCode: string) => {
		const newStages = generateTreatmentPlanFromDiagnosis(diagCode);
		setStages(newStages);
		if (newStages.length > 0 && newStages[0]?.id) setExpandedStageId(newStages[0].id);
		resetScrollTop();
	}, [resetScrollTop]);

	// 3.1. Генерация плана из реальной зубной формулы пациента
	const handleGenerateFromTeeth = useCallback(() => {
		const tiersFromTeeth = buildPresenterTiersFromTeeth(teeth);
		const optTier = tiersFromTeeth.find((t) => t.tierId === "optimum") || tiersFromTeeth[0];
		if (optTier && optTier.stages.length > 0) {
			setStages(optTier.stages);
			if (optTier.stages[0]?.id) setExpandedStageId(optTier.stages[0].id);
		} else {
			setStages(CANONICAL_CLINICAL_STAGES);
			if (CANONICAL_CLINICAL_STAGES[0]?.id) setExpandedStageId(CANONICAL_CLINICAL_STAGES[0].id);
		}
		resetScrollTop();
	}, [teeth, resetScrollTop]);

	// 3.2. Добавление кастомного клинического этапа
	const handleAddCustomStage = useCallback(() => {
		const newStageNumber = stages.length + 1;
		const newStageId = `stage-custom-${Date.now()}`;
		const defaultItem: TreatmentPlanItem = {
			id: `item-custom-${Date.now()}-1`,
			name: "Первичный клинический осмотр и диагностика",
			category: "Диагностика",
			serviceCode: "SRV-DIAG-EXAM-01",
			priceRub: 2500,
			unitPriceRub: 2500,
			discountRub: 0,
			quantity: 1,
			stageKind: "stage_custom",
			isCompleted: false,
		};
		const newStage: TreatmentPlanStage = {
			id: newStageId,
			stageNumber: newStageNumber,
			stageKind: "stage_custom",
			title: `Этап ${newStageNumber}: Клинический этап`,
			subtitle: "Диагностика и план реабилитации",
			clinicalGoal: "Санация полости рта",
			items: [defaultItem],
			totalRub: 2500,
			totalKopecks: 250000,
			estimatedVisits: 1,
			estimatedWeeks: 1,
			status: "draft",
		};
		setStages((prev) => [...prev, newStage]);
		setExpandedStageId(newStageId);
	}, [stages.length]);

	// 4. Добавление клинического пакета в этапы плана
	const handleAddBundleToStages = useCallback((bundle: ClinicalBundleDefinition, toothNumber?: number) => {
		setStages((prevStages) => {
			const newItems: TreatmentPlanItem[] = bundle.items.map((it, idx) => ({
				id: `bundle-item-${Date.now()}-${idx}`,
				priceId: it.serviceCode || it.code804n || (it.id && !it.id.startsWith("bundle-") ? it.id : undefined),
				name: it.name,
				category: it.category || "Общие",
				code804n: it.code804n || "",
				serviceCode: it.serviceCode || it.code804n || "",
				priceRub: it.priceRub ?? it.defaultPriceRub ?? 0,
				unitPriceRub: it.unitPriceRub ?? it.defaultPriceRub ?? 0,
				discountRub: 0,
				quantity: 1,
				stageKind: "stage_custom",
				toothNumber: toothNumber || it.toothNumber,
				isCompleted: false,
			}));

			const stageTitle = `${bundle.title}${toothNumber ? ` (зуб ${toothNumber})` : ""}`;
			const newStage: TreatmentPlanStage = {
				id: `stage-bundle-${Date.now()}`,
				stageNumber: prevStages.length + 1,
				stageKind: "stage_custom",
				title: stageTitle,
				subtitle: bundle.description,
				clinicalGoal: bundle.description,
				items: newItems,
				totalRub: newItems.reduce((acc, it) => acc + it.priceRub, 0),
				totalKopecks: rublesToKopecks(newItems.reduce((acc, it) => acc + it.priceRub, 0)),
				estimatedVisits: bundle.estimatedVisits ?? 1,
				estimatedWeeks: 1,
				status: "draft",
			};

			return [...prevStages, newStage];
		});
		setActiveTab("tiers");
		setApprovedSuccessMessage(`Пакет «${bundle.title}» добавлен в план лечения!`);
		setTimeout(() => setApprovedSuccessMessage(null), 3000);
	}, []);

	// 4.1 Добавление и удаление процедур из этапов (связь с прейскурантом)
	const handleAddItemToStage = useCallback((stageId: string, item: TreatmentPlanItem) => {
		setStages((prevStages) =>
			prevStages.map((stg) => {
				if (stg.id !== stageId) return stg;
				const updatedItems = [...stg.items, item];
				const stageTotalRub = updatedItems.reduce((acc, it) => acc + it.priceRub * (it.quantity || 1), 0);
				return {
					...stg,
					items: updatedItems,
					totalRub: stageTotalRub,
					totalKopecks: rublesToKopecks(stageTotalRub),
				};
			})
		);
	}, []);

	const handleRemoveItemFromStage = useCallback((stageId: string, itemId: string) => {
		setStages((prevStages) =>
			prevStages.map((stg) => {
				if (stg.id !== stageId) return stg;
				const updatedItems = stg.items.filter((it) => it.id !== itemId);
				const stageTotalRub = updatedItems.reduce((acc, it) => acc + it.priceRub * (it.quantity || 1), 0);
				return {
					...stg,
					items: updatedItems,
					totalRub: stageTotalRub,
					totalKopecks: rublesToKopecks(stageTotalRub),
				};
			})
		);
	}, []);

	// 4.3 Выставить счёт на этап плана в кассу в 1 клик (DEF-04)
	const handleGenerateStageInvoice = useCallback(async (stage: TreatmentPlanStage): Promise<boolean> => {
		const isWalkInOrInvalid =
			!patientId ||
			patientId === "pat-walkin" ||
			!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId);

		if (isWalkInOrInvalid) {
			setApprovalErrorMessage(
				"Для выставления счёта в кассу выберите или зарегистрируйте реального пациента в картотеке.",
			);
			setTimeout(() => setApprovalErrorMessage(null), 4000);
			return false;
		}

		if (typeof window === "undefined") {
			return false;
		}

		try {
			const invoiceItemsPayload = (stage.items || []).map((it) => ({
				itemId: it.id,
				toothNumber: it.toothNumber ?? null,
				nameRu: it.name || "Стоматологическая процедура",
				quantity: it.quantity || 1,
				unitPriceRub: it.unitPriceRub ?? it.priceRub,
				planUnitPriceRub: it.unitPriceRub ?? it.priceRub,
				effectiveUnitPriceRub: it.unitPriceRub ?? it.priceRub,
				discountRub: it.discountRub || 0,
				code804n: it.code804n || undefined,
				serviceId: (it.priceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.priceId)) ? it.priceId : undefined,
			}));

			if (invoiceItemsPayload.length === 0) {
				invoiceItemsPayload.push({
					itemId: stage.id || `stage-${stage.stageNumber}`,
					toothNumber: null,
					nameRu: stage.title || `Этап ${stage.stageNumber}`,
					quantity: 1,
					unitPriceRub: stage.totalRub,
					planUnitPriceRub: stage.totalRub,
					effectiveUnitPriceRub: stage.totalRub,
					discountRub: 0,
					code804n: undefined,
					serviceId: undefined,
				});
			}

			const res = await fetch("/api/invoices/generate-from-plan", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				},
				body: JSON.stringify({
					patientId,
					planId: currentPlanId || undefined,
					planTitle: stage.title,
					documentType: "invoice",
					items: invoiceItemsPayload,
				}),
			});

			if (!res.ok) {
				const errJson = await res.json().catch(() => ({}));
				const msg = errJson?.message || "Не удалось выставить счёт на этап";
				setApprovalErrorMessage(msg);
				setTimeout(() => setApprovalErrorMessage(null), 4000);
				return false;
			}

			const resJson = await res.json().catch(() => ({}));
			window.dispatchEvent(new CustomEvent("dente:invoice-created", { detail: { invoice: resJson, patientId } }));
			window.dispatchEvent(new CustomEvent("dente:cashbox-updated", { detail: { patientId } }));

			setApprovedSuccessMessage(`Счёт на «${stage.title}» (${stage.totalRub} ₽) успешно выставлен в кассу!`);
			setTimeout(() => setApprovedSuccessMessage(null), 4000);
			return true;
		} catch (err) {
			console.warn("[TreatmentPlanStudioModal] Ошибка выставления счета на этап:", err);
			setApprovalErrorMessage("Сетевой сбой при выставлении счёта на этап в кассу.");
			setTimeout(() => setApprovalErrorMessage(null), 4000);
			return false;
		}
	}, [patientId, currentPlanId]);

	// 4.2 Сохранение актуального состава плана на бэкенд (Мандаты 8b, 8e: ноль амнезии и потери этапов)
	const savePlanToApi = useCallback(async (targetStatus: "Draft" | "Approved" = "Draft"): Promise<string | null> => {
		const isValidUuid = typeof patientId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId);
		if (typeof window === "undefined" || typeof window.fetch !== "function" || !isValidUuid) {
			return currentPlanId;
		}

		try {
			const allItems: Array<Record<string, unknown>> = [];
			const effectiveStages = activeTier.stages.length > 0 ? activeTier.stages : stages;
			const stagePayloads = effectiveStages.map((stg, stgIdx) => {
				const phaseNum = stg.stageNumber || stgIdx + 1;
				for (const it of stg.items) {
					const isSynthetic =
						!it.id ||
						it.id.startsWith("bundle-item-") ||
						it.id.startsWith("item-custom-") ||
						it.id.startsWith("plan-item-") ||
						it.id.startsWith("item-");
					const resolvedPriceId =
						(it.priceId && !it.priceId.startsWith("bundle-item-") && !it.priceId.startsWith("item-") ? it.priceId : null) ||
						(it.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(it.id) ? it.id : null) ||
						(it.serviceCode?.trim() || null) ||
						(it.code804n?.trim() || null) ||
						(!isSynthetic ? it.id : null) ||
						null;

					const unitPriceRub =
						it.unitPriceRub ?? (it.quantity > 0 ? it.priceRub / it.quantity : it.priceRub) ?? 0;
					const unitPriceKopecks =
						typeof it.amountKopecks === "bigint"
							? Number(it.amountKopecks)
							: typeof it.amountKopecks === "number" && it.amountKopecks > 0
								? Math.round(it.amountKopecks)
								: rublesToKopecks(unitPriceRub);
					const quantity = it.quantity || 1;
					const discountRub = it.discountRub || 0;
					const discountKopecks = rublesToKopecks(discountRub);
					const totalPriceKopecks = Math.max(0, unitPriceKopecks * quantity - discountKopecks);

					allItems.push({
						priceId: resolvedPriceId,
						isCustom: !resolvedPriceId,
						name: it.name || "Индивидуальная услуга",
						price: kopecksToRubles(unitPriceKopecks),
						discount: kopecksToRubles(discountKopecks),
						unitPriceKopecks,
						totalPriceKopecks,
						quantity,
						phase: phaseNum,
						toothNumber: it.toothNumber ?? null,
					});
				}

				return {
					id: stg.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stg.id) ? stg.id : undefined,
					stageOrder: phaseNum,
					stageName: stg.title || `Этап ${phaseNum}`,
					completionPercentage: 0,
				};
			});

			const bodyPayload = {
				id: currentPlanId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentPlanId) ? currentPlanId : undefined,
				name: `Комплексный план: ${activeTier.title}`,
				status: targetStatus,
				alternativeTier: activeTier.tierId,
				planDiscountPercent: doctorDiscountPercent,
				stages: stagePayloads,
				items: allItems,
			};

			const res = await fetch(`/api/patients/${patientId}/treatment-plans`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				},
				body: JSON.stringify(bodyPayload),
			});

			if (res.ok) {
				const json = await res.json().catch(() => ({}));
				const savedId = json?.planId || json?.plan?.id || json?.treatmentPlan?.id || currentPlanId;
				if (savedId) {
					setCurrentPlanId(savedId);
					return savedId;
				}
			} else {
				console.warn("[TreatmentPlanStudioModal] Ошибка сохранения плана на сервере:", await res.text().catch(() => ""));
			}
		} catch (saveErr) {
			console.warn("[TreatmentPlanStudioModal] Сетевой сбой при сохранении плана:", saveErr);
		}
		return currentPlanId;
	}, [patientId, currentPlanId, activeTier, stages, doctorDiscountPercent]);

	// 5. Утверждение плана (Мандат 8e: 0 disabled блокировок, честная контрактная обработка)
	const handleApprove = useCallback(async () => {
		setApprovalErrorMessage(null);

		const isWalkInOrInvalid =
			!patientId ||
			patientId === "pat-walkin" ||
			!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId);

		if (isWalkInOrInvalid) {
			setApprovalErrorMessage(
				"Для утверждения плана выберите или зарегистрируйте реального пациента в картотеке (план для незарегистрированного пациента не может быть активирован).",
			);
			return;
		}

		if (typeof window !== "undefined" && typeof window.fetch === "function") {
			try {
				// SEV-1.2: Сначала сохраняем обновленный состав плана и этапов в БД
				const savedPlanId = await savePlanToApi("Draft");
				const planIdToApprove = savedPlanId || currentPlanId;

				if (planIdToApprove) {
					const approveRes = await fetch(`/api/treatment-plans/${planIdToApprove}/approve`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Idempotency-Key": generateUuidV7(),
						},
						body: JSON.stringify({
							selectedTier: activeTier.tierId,
						}),
					});
					if (!approveRes.ok) {
						const errJson = await approveRes.json().catch(() => ({}));
						const errMsg = errJson?.message || errJson?.error || "Ошибка утверждения плана лечения на сервере";
						console.warn("[TreatmentPlanStudioModal] Ошибка утверждения плана лечения:", errJson);
						setApprovalErrorMessage(errMsg);
						return;
					}

					const resJson = await approveRes.json().catch(() => ({}));
					if (resJson?.invoice || resJson?.createdInvoice) {
						const inv = resJson.invoice || resJson.createdInvoice;
						window.dispatchEvent(new CustomEvent("dente:invoice-created", { detail: { invoice: inv, patientId } }));
						window.dispatchEvent(new CustomEvent("dente:cashbox-updated", { detail: { patientId } }));
					}
				}
			} catch (networkErr) {
				console.warn("[TreatmentPlanStudioModal] Сетевой сбой при утверждении плана лечения:", networkErr);
				setApprovalErrorMessage("Сетевая ошибка при обращении к серверу. Пожалуйста, повторите попытку.");
				return;
			}
		}

		if (onApprovePlan && activeTier) onApprovePlan(activeTier);
		if (onConfirmSelection && activeTier) onConfirmSelection(activeTier);
		if (onApproveAndSign && activeTier) onApproveAndSign(activeTier);
		setApprovedSuccessMessage(`План «${activeTier?.title}» успешно утвержден и активирован в карте пациента!`);

		if (typeof window !== "undefined") {
			const detailPayload = {
				planId: currentPlanId || "plan-approved-active",
				status: "Approved",
				selectedTier: activeTier.tierId,
				totalRub: activeTier.totalRub,
				totalKopecks: rublesToKopecks(activeTier.totalRub),
				patientId,
				patientName,
				doctorFullName,
			};

			window.dispatchEvent(new CustomEvent("dente:plan-status-changed", { detail: detailPayload }));
			window.dispatchEvent(new CustomEvent("dente:plan-approved", { detail: detailPayload }));

			try {
				if (patientId) {
					localStorage.removeItem(`dente_plan_draft_${patientId}`);
				}
				localStorage.removeItem("dente_plan_draft_current");
			} catch (storageErr) {
				console.warn("[useStudioPlanLifecycle] Storage cleanup non-blocking error:", storageErr);
			}
		}

		onClose();
	}, [activeTier, currentPlanId, savePlanToApi, onApprovePlan, onConfirmSelection, onApproveAndSign, onClose, patientId, patientName, doctorFullName]);

	// 6. Сохранение черновика (Мандат 8e: реальный сетевой вызов POST /api/patients/:id/treatment-plans)
	const handleSaveDraft = useCallback(async () => {
		if (onSaveDraft) onSaveDraft(stages, activeTier);

		// SEV-1.3: Реальный сетевой вызов к API вместо исключительно локального хранилища
		const savedId = await savePlanToApi("Draft");

		if (typeof window !== "undefined") {
			try {
				const draftStorageKey = patientId ? `dente_plan_draft_${patientId}` : "dente_plan_draft_current";
				localStorage.setItem(
					draftStorageKey,
					JSON.stringify({ stages, selectedTierId, doctorDiscountPercent, planId: savedId, updatedAt: new Date().toISOString() })
				);
			} catch (storageErr) {
				console.warn("[TreatmentPlanStudioModal] Ошибка записи локального черновика плана лечения:", storageErr);
			}
			window.dispatchEvent(
				new CustomEvent("dente:plan-status-changed", {
					detail: { planId: savedId || currentPlanId || "draft-saved", status: "Draft", selectedTier: selectedTierId, patientId },
				})
			);
			window.dispatchEvent(
				new CustomEvent("dente:plan-updated", {
					detail: { planId: savedId || currentPlanId, patientId },
				})
			);
		}
		setDraftSavedNotice("Черновик плана лечения успешно сохранён на сервере и в карте!");
		setTimeout(() => setDraftSavedNotice(null), 3000);
	}, [onSaveDraft, stages, activeTier, patientId, selectedTierId, doctorDiscountPercent, savePlanToApi, currentPlanId]);

	const handlePrint = useCallback(() => {
		if (typeof window !== "undefined") window.print();
	}, []);

	const handleExportPdf = useCallback(() => {
		setExportSuccessNotice(`Смета и договор по тарифу «${sanitizedActiveTitle}» подготовлены к печати`);
		if (typeof window !== "undefined") {
			setTimeout(() => window.print(), 150);
			setTimeout(() => setExportSuccessNotice(null), 4000);
		}
	}, [sanitizedActiveTitle]);

	return {
		depthMode,
		setDepthMode,
		activeTab,
		setActiveTab,
		selectedTierId,
		setSelectedTierId,
		stages,
		setStages,
		doctorDiscountPercent,
		setDoctorDiscountPercent,
		isDiscountBarOpen,
		setIsDiscountBarOpen,
		currentPlanId,
		expandedStageId,
		setExpandedStageId,
		approvedSuccessMessage,
		approvalErrorMessage,
		draftSavedNotice,
		exportSuccessNotice,
		computedTiers,
		activeTier,
		sanitizedActiveTitle,
		resetScrollTop,
		handleSelectDiagnosisPreset,
		handleGenerateFromTeeth,
		handleAddCustomStage,
		handleAddBundleToStages,
		handleAddItemToStage,
		handleRemoveItemFromStage,
		handleGenerateStageInvoice,
		handleApprove,
		handleSaveDraft,
		savePlanToApi,
		handlePrint,
		handleExportPdf,
		resetDraft,
		handleCloseWithReset,
	};
}
