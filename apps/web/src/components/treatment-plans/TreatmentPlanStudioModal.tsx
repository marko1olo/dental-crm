/**
 * TreatmentPlanStudioModal.tsx — Интерактивная студия планов лечения и кресельный презентер (SSOT).
 * Мандаты 8b, 8zi: Целевой размер 350–450 строк (Sweet Spot). Консолидированный монолит без микро-шредера.
 * Мандат 8e: Автономия врача — свобода скидок до 100%, автосейв, кнопки НИКОГДА не блокируются (disabled=false).
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal) (#0d9488) на видимый экран, вторичные кнопки в нейтрале.
 * Мандат 8n: Простота для соло-врача и клиники у кресла — выбор из 3 вариантов в 1 клик, генератор по МКБ-10.
 * Мандат 8x & 8ap: Человеческий клинический язык без советского канцелярита в прод-UI.
 * Режимы глубины: Экспресс-смета (чистый 1-экранный интерфейс) и Клинический эксперт (этапы, гарантийный паспорт, фотопротокол).
 * Apple HIG: Сенсорная зона >= 44x44px, Drag Handle 36x5px, нативный Segmented Switcher на смартфонах (390x844).
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
	Stethoscope, Percent, Printer, X, CheckCircle2,
	FileText, BarChart3, Package, UserCheck, Zap,
	ShieldCheck, Camera, Save, CreditCard,
} from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId, TreatmentPlanStage, TreatmentPlanItem } from "./treatmentPlanTypes";
import { formatRubles } from "./treatmentPlanTypes";
import {
	CANONICAL_CLINICAL_STAGES, buildCanonical3TierPlans,
	applyDoctorDiscountToTiers, generateTreatmentPlanFromDiagnosis,
	buildPresenterTiersFromTeeth,
} from "./treatmentPlanCatalogData";
import { type ClinicalBundleDefinition } from "./treatmentPlanBundlesEngine";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { StudioTiersAndStagesTab } from "./studioTabs/StudioTiersAndStagesTab";
import { StudioInstallmentTab } from "./studioTabs/StudioInstallmentTab";
import { StudioClinicalBundlesTab } from "./studioTabs/StudioClinicalBundlesTab";
import { StudioCuratorAssignmentTab } from "./studioTabs/StudioCuratorAssignmentTab";
import { StudioWarrantyPassportTab } from "./studioTabs/StudioWarrantyPassportTab";
import { StudioPhotoProtocolTab } from "./studioTabs/StudioPhotoProtocolTab";

if (typeof window !== "undefined") {
	void import("./styles/treatmentPlanStudio.css");
}

export interface TreatmentPlanStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | null;
	readonly patientId?: string | null;
	readonly patientPhone?: string | null;
	readonly doctorFullName?: string | null;
	readonly doctorSpecialty?: string | null;
	readonly initialSelectedTierId?: TreatmentPlanTierId;
	readonly initialDepthMode?: "express" | "expert";
	readonly initialStages?: readonly TreatmentPlanStage[];
	readonly initialTiers?: readonly TreatmentPlanTier[] | undefined;
	readonly tiers?: readonly TreatmentPlanTier[] | undefined;
	readonly contractNumber?: string | undefined;
	readonly onSelectPlan?: ((plan: TreatmentPlanTier) => void) | undefined;
	readonly onPrintContract?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onApprovePlan?: (selectedTier: TreatmentPlanTier) => void;
	readonly onConfirmSelection?: (selectedTier: TreatmentPlanTier) => void;
	readonly onApproveAndSign?: (selectedTier: TreatmentPlanTier) => void;
	readonly onSaveDraft?: (stages: readonly TreatmentPlanStage[], selectedTier: TreatmentPlanTier) => void;
	readonly className?: string;
	readonly teeth?: unknown;
	readonly isDemoMode?: boolean;
	readonly planId?: string | null;
	readonly clinicName?: string | null;
	readonly clinicAddress?: string | null;
	readonly patientBirthDate?: string | null;
}

const DISCOUNT_PRESETS = [0, 5, 10, 15, 20, 50, 100] as const;
export type StudioDepthMode = "express" | "expert";
export type StudioTab = "tiers" | "installment" | "warranty" | "photo" | "bundles" | "curator";

export const TreatmentPlanStudioModal: React.FC<TreatmentPlanStudioModalProps> = ({
	isOpen,
	onClose,
	patientName: propPatientName,
	patientId: propPatientId,
	patientPhone,
	doctorFullName: propDoctorFullName,
	doctorSpecialty,
	initialSelectedTierId = "optimum",
	initialDepthMode = "express",
	initialStages,
	onApprovePlan,
	onConfirmSelection,
	onApproveAndSign,
	onSaveDraft,
	className = "",
	teeth,
	isDemoMode: explicitDemoMode,
	planId: propPlanId,
	clinicName: propClinicName,
	clinicAddress: propClinicAddress,
	patientBirthDate: propPatientBirthDate,
}) => {
	const isDemo = explicitDemoMode ?? isDemoShowcaseMode();
	const patientName = propPatientName ?? (isDemo ? "Демо-пациент" : "");
	const patientId = propPatientId ?? (isDemo ? "00000000-0000-0000-0000-000000000001" : undefined);
	const doctorFullName = propDoctorFullName ?? (isDemo ? "Дежурный врач" : "");
	const [depthMode, setDepthMode] = useState<StudioDepthMode>(initialDepthMode);
	const [activeTab, setActiveTab] = useState<StudioTab>("tiers");
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>(initialSelectedTierId);
	const [stages, setStages] = useState<readonly TreatmentPlanStage[]>(() => {
		if (initialStages && initialStages.length > 0) return initialStages;
		return [];
	});
	const [doctorDiscountPercent, setDoctorDiscountPercent] = useState<number>(0);
	const [isDiscountBarOpen, setIsDiscountBarOpen] = useState<boolean>(false);
	const [currentPlanId, setCurrentPlanId] = useState<string | null>(propPlanId || null);
	const [expandedStageId, setExpandedStageId] = useState<string | null>(() => {
		if (initialStages && initialStages.length > 0 && initialStages[0]?.id) {
			return initialStages[0].id;
		}
		return "stage-1-hygiene";
	});
	const [approvedSuccessMessage, setApprovedSuccessMessage] = useState<string | null>(null);
	const [draftSavedNotice, setDraftSavedNotice] = useState<string | null>(null);
	const [exportSuccessNotice, setExportSuccessNotice] = useState<string | null>(null);

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
					// Находим активный, в процессе или самый свежий план лечения
					const activePlan = data.plans.find((p: any) => p.status === "Approved" || p.status === "InProgress") || data.plans[0];
					if (activePlan && Array.isArray(activePlan.items) && activePlan.items.length > 0) {
						const phaseMap = new Map<number, TreatmentPlanItem[]>();
						for (const it of activePlan.items) {
							const phase = it.phase || 1;
							if (!phaseMap.has(phase)) phaseMap.set(phase, []);
							phaseMap.get(phase)!.push({
								id: it.id || `plan-item-${phase}-${Date.now()}`,
								toothNumber: it.toothNumber,
								code804n: it.priceId || it.serviceCode || "",
								serviceCode: it.serviceCode || it.priceId || "",
								name: it.name || "Услуга",
								category: it.category || "Общие",
								priceRub: Number(it.price || 0),
								unitPriceRub: Number(it.price || 0),
								discountRub: Number(it.discount || 0),
								quantity: it.quantity || 1,
								stageKind: phase === 1 ? "stage_1_therapy" : phase === 2 ? "stage_2_surgery" : "stage_3_orthopedics",
								isCompleted: Boolean(it.isCompleted),
							});
						}

						const hydrated: TreatmentPlanStage[] = [];
						const sortedPhases = Array.from(phaseMap.keys()).sort((a, b) => a - b);
						for (const ph of sortedPhases) {
							const groupItems = phaseMap.get(ph)!;
							const sRub = groupItems.reduce((acc, it) => acc + it.priceRub * (it.quantity || 1), 0);
							const title = ph === 1
								? "Этап 1: Неотложная помощь и терапия"
								: ph === 2
								? "Этап 2: Хирургия и имплантация"
								: ph === 3
								? "Этап 3: Ортопедия и протезирование"
								: `Этап ${ph}: Клинический этап`;

							hydrated.push({
								id: `stage-${ph}-${activePlan.id || "hydrated"}`,
								stageNumber: ph,
								stageKind: ph === 1 ? "stage_1_therapy" : ph === 2 ? "stage_2_surgery" : "stage_3_orthopedics",
								title,
								subtitle: `Процедур в этапе: ${groupItems.length}`,
								clinicalGoal: "Комплексная санация полости рта",
								totalRub: sRub,
								totalKopecks: sRub * 100,
								estimatedVisits: groupItems.length,
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

				// Если планов в БД нет, проверяем сохранённый черновик в localStorage
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
						} catch {
							// ignore
						}
					}
				}

				// Если данных нет и демо-режим отключен — оставляем чистый Empty State
				if (!isDemo) {
					setStages([]);
				}
			} catch (err) {
				console.warn("[TreatmentPlanStudioModal] Ошибка реактивной гидратации планов лечения:", err);
			}
		};

		void fetchPatientPlans();

		// Реактивная подписка на события обновления планов без перезагрузки страницы F5 (Мандат 8zq)
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
		return computedTiers.find((t) => t.tierId === selectedTierId) || computedTiers.find((t) => t.tierId === "optimum") || computedTiers[0]!;
	}, [computedTiers, selectedTierId]);

	const sanitizedActiveTitle = activeTier.title.replace(/^[^a-zA-Zа-яА-Я0-9]+/, "");

	// 3. Быстрый выбор типового плана по коду диагноза МКБ-10 (Мандат 8n)
	const handleSelectDiagnosisPreset = useCallback((diagCode: string) => {
		const newStages = generateTreatmentPlanFromDiagnosis(diagCode);
		setStages(newStages);
		if (newStages.length > 0 && newStages[0]?.id) setExpandedStageId(newStages[0].id);
	}, []);

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
	}, [teeth]);

	// 3.2. Добавление кастомного клинического этапа
	const handleAddCustomStage = useCallback(() => {
		const newStageNumber = stages.length + 1;
		const newStageId = `stage-custom-${Date.now()}`;
		const defaultItem: TreatmentPlanItem = {
			id: `item-custom-${Date.now()}-1`,
			name: "Первичный клинический осмотр и диагностика",
			category: "Диагностика",
			code804n: "B01.065.001",
			serviceCode: "B01.065.001",
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

	// 4. Добавление клинического пакета в этапы плана в 1 клик
	const handleAddBundleToStages = useCallback((bundle: ClinicalBundleDefinition, toothNumber?: number) => {
		setStages((prevStages) => {
			const newItems: TreatmentPlanItem[] = bundle.items.map((it, idx) => ({
				id: `bundle-item-${Date.now()}-${idx}`,
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
				totalKopecks: newItems.reduce((acc, it) => acc + it.priceRub, 0) * 100,
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
					totalKopecks: stageTotalRub * 100,
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
					totalKopecks: stageTotalRub * 100,
				};
			})
		);
	}, []);

	// 5. Утверждение плана в 1 клик (Мандат 8e: 0 disabled блокировок)
	const handleApprove = useCallback(async () => {
		if (onApprovePlan && activeTier) onApprovePlan(activeTier);
		if (onConfirmSelection && activeTier) onConfirmSelection(activeTier);
		if (onApproveAndSign && activeTier) onApproveAndSign(activeTier);
		setApprovedSuccessMessage(`План «${activeTier?.title}» успешно утвержден и активирован в карте пациента!`);

		// Сквозная интеграция с Fastify API POST /api/v1/treatment-plans и событиями
		if (typeof window !== "undefined") {
			const detailPayload = {
				planId: "plan-approved-active",
				status: "Approved",
				selectedTier: activeTier.tierId,
				totalRub: activeTier.totalRub,
				totalKopecks: activeTier.totalRub * 100,
				patientId,
				patientName,
				doctorFullName,
			};

			window.dispatchEvent(new CustomEvent("dente:plan-status-changed", { detail: detailPayload }));
			window.dispatchEvent(new CustomEvent("dente:plan-approved", { detail: detailPayload }));

			const isValidUuid = typeof patientId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId);
			if (typeof window.fetch === "function" && isValidUuid) {
				try {
					let planIdToApprove = currentPlanId;

					// Если плана еще нет в базе — создаем его через канонический POST /api/treatment-plans (без /v1/)
					if (!planIdToApprove) {
						const createRes = await fetch("/api/treatment-plans", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								patientId,
								name: `Комплексный план: ${activeTier.title}`,
								title: `Комплексный план: ${activeTier.title}`,
								totalPriceRub: activeTier.totalRub,
								planDiscountPercent: doctorDiscountPercent,
								stages: activeTier.stages.map((stg, stgIdx) => ({
									stageOrder: stg.stageNumber || stgIdx + 1,
									stageName: stg.title || `Этап ${stgIdx + 1}`,
									completionPercentage: 0,
									items: stg.items.map((it, itIdx) => ({
										priceId: it.id || (it as any).code804n || `item-${stgIdx + 1}-${itIdx + 1}`,
										name: it.name || "Услуга",
										price: it.priceRub || 0,
										quantity: it.quantity || 1,
										discount: it.discountRub || 0,
										toothNumber: it.toothNumber ?? null,
									})),
								})),
							}),
						});
						if (createRes.ok) {
							const createdJson = await createRes.json().catch(() => ({}));
							const createdId = createdJson?.plan?.id || createdJson?.id;
							if (createdId) {
								planIdToApprove = createdId;
								setCurrentPlanId(createdId);
							}
						} else {
							const errJson = await createRes.json().catch(() => ({}));
							console.warn("[TreatmentPlanStudioModal] Ошибка сохранения плана лечения:", errJson);
						}
					}

					// Канонический вызов утверждения плана POST /api/treatment-plans/:id/approve без создания дубликата
					if (planIdToApprove) {
						const approveRes = await fetch(`/api/treatment-plans/${planIdToApprove}/approve`, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								selectedTier: activeTier.tierId,
							}),
						});
						if (!approveRes.ok) {
							const errJson = await approveRes.json().catch(() => ({}));
							console.warn("[TreatmentPlanStudioModal] Ошибка утверждения плана лечения:", errJson);
						}
					}
				} catch (networkErr) {
					console.warn("[TreatmentPlanStudioModal] Сетевой сбой при утверждении плана лечения:", networkErr);
				}
			}
		}

		setTimeout(() => {
			setApprovedSuccessMessage(null);
			onClose();
		}, 1400);
	}, [activeTier, currentPlanId, doctorDiscountPercent, onApprovePlan, onConfirmSelection, onApproveAndSign, onClose, patientId, patientName, doctorFullName]);

	// 6. Сохранение черновика (Мандат 8e: врач может сохранить план в любой момент)
	const handleSaveDraft = useCallback(() => {
		if (onSaveDraft) onSaveDraft(stages, activeTier);
		if (typeof window !== "undefined") {
			try {
				const draftStorageKey = patientId ? `dente_plan_draft_${patientId}` : "dente_plan_draft_current";
				localStorage.setItem(
					draftStorageKey,
					JSON.stringify({ stages, selectedTierId, doctorDiscountPercent, updatedAt: new Date().toISOString() })
				);
			} catch {
				// ignore
			}
			window.dispatchEvent(
				new CustomEvent("dente:plan-status-changed", {
					detail: { planId: "draft-saved", status: "Draft", selectedTier: selectedTierId, patientId },
				})
			);
		}
		setDraftSavedNotice("Черновик плана лечения успешно сохранён в карте!");
		setTimeout(() => setDraftSavedNotice(null), 3000);
	}, [onSaveDraft, stages, activeTier, patientId, selectedTierId, doctorDiscountPercent]);

	// 7. Вторичные действия: печать плана и договора
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

	if (!isOpen) return null;

	return (
		<div
			className={`tp-studio-overlay fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4 overflow-x-clip max-w-[100vw] h-full ${className}`}
			data-testid="treatment-plan-studio-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="treatment-studio-title"
		>
			<div className="tp-studio-dialog flex flex-col w-full max-w-6xl bg-[var(--paper)] text-[var(--ink)] border-t sm:border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden h-[94dvh] sm:h-auto sm:max-h-[92vh] mt-auto sm:my-auto">
				{/* 0. Тактильный Drag Handle для смартфонов по Apple HIG */}
				<div className="tp-studio-drag-handle-wrap sm:hidden flex justify-center pt-2.5 pb-1">
					<div className="tp-studio-drag-handle w-9 h-1 rounded-full bg-[var(--line-strong,#94a3b8)] opacity-60" />
				</div>

				{/* 1. ШАПКА СТУДИИ (Мандат 8am: 1 строка, скидка врача до 100%, сенсорные зоны >= 44x44px) */}
				<header className="tp-studio-header flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 min-h-[52px]">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
							<Stethoscope className="w-5 h-5" />
						</div>
						<div className="flex flex-col min-w-0">
							<h2 id="treatment-studio-title" className="text-sm sm:text-base font-bold text-[var(--ink)] truncate m-0">
								<span className="sm:hidden">План лечения</span>
								<span className="hidden sm:inline">Комплексный план лечения</span>
							</h2>
							<div className="flex items-center gap-1.5 sm:gap-2 text-xs text-[var(--muted)] truncate">
								<span className="font-semibold text-[var(--ink)] truncate">
									{patientName || "Пациент не выбран"}
								</span>
								{doctorFullName && (
									<>
										<span className="hidden sm:inline">·</span>
										<span className="hidden sm:inline truncate">{doctorFullName}</span>
									</>
								)}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						{/* Переключатель глубины: Экспресс vs Эксперт (Apple Segmented Control) */}
						<div className="tp-depth-switch flex items-center p-0.5 bg-[var(--paper-soft)] border border-[var(--line-subtle)] rounded-xl" role="tablist">
							<button
								type="button"
								role="tab"
								aria-selected={depthMode === "express"}
								onClick={() => setDepthMode("express")}
								className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
									depthMode === "express"
										? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line)] font-bold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid="depth-mode-express-btn"
								title="Режим «Экспресс»: чистый 1-экранный интерфейс сметы"
							>
								<Zap className="w-3.5 h-3.5 shrink-0" />
								<span>Экспресс</span>
							</button>

							<button
								type="button"
								role="tab"
								aria-selected={depthMode === "expert"}
								onClick={() => setDepthMode("expert")}
								className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
									depthMode === "expert"
										? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line)] font-bold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid="depth-mode-expert-btn"
								title="Режим «Клинический эксперт»: этапы, гарантийный паспорт, фотопротокол"
							>
								<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
								<span>Эксперт</span>
							</button>
						</div>

						{/* Скидка врача до 100% */}
						<button
							type="button"
							onClick={() => setIsDiscountBarOpen((prev) => !prev)}
							className={`tp-studio-header-btn inline-flex min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer ${
								doctorDiscountPercent > 0 ? "bg-[var(--teal-soft,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--line-subtle)]"
							}`}
							title="Скидка врача до 100%"
							data-testid="toggle-discount-btn"
						>
							<Percent className="w-4 h-4 shrink-0" />
							<span className="hidden sm:inline">{doctorDiscountPercent > 0 ? `Скидка ${doctorDiscountPercent}%` : "Скидка врача"}</span>
						</button>

						{/* Печать плана (Мандат 8e: ровно одна лаконичная кнопка в шапке) */}
						<button
							type="button"
							onClick={handleExportPdf}
							className="dente-btn dente-btn-secondary !hidden sm:!inline-flex min-h-[44px] px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line-subtle)] text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer"
							title="Печать плана и договора"
							data-testid="print-plan-btn"
							id="print-plan-btn"
						>
							<Printer className="w-4 h-4 text-current shrink-0" />
							<span>Печать плана</span>
						</button>

						{/* Закрытие модалки */}
						<button
							type="button"
							onClick={onClose}
							className="tp-studio-header-btn inline-flex min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] items-center justify-center transition-colors cursor-pointer"
							aria-label="Закрыть студию планов лечения"
							data-testid="close-studio-btn"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* 1.1. Вкладки студии (в режиме Эксперт — полная палитра; в Экспресс — всегда доступно) */}
				<div className="flex items-center gap-1.5 p-1 bg-[var(--paper-soft)] border-b border-[var(--line)] px-3 sm:px-6 shrink-0 overflow-x-auto no-scrollbar" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "tiers"}
						onClick={() => setActiveTab("tiers")}
						className={`min-h-[38px] px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
							activeTab === "tiers"
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-tiers-stages"
					>
						<BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
						<span>Тарифы и этапы</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "installment"}
						onClick={() => setActiveTab("installment")}
						className={`min-h-[38px] px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
							activeTab === "installment"
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-installment-calculator"
					>
						<CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
						<span>Рассрочка 0% и вычет</span>
					</button>

					{depthMode === "expert" && (
						<>
							<button
								type="button"
								role="tab"
								aria-selected={activeTab === "warranty"}
								onClick={() => setActiveTab("warranty")}
								className={`min-h-[38px] px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
									activeTab === "warranty"
										? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line)]"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid="tab-warranty-passport"
							>
								<ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
								<span>Гарантийный паспорт</span>
							</button>

							<button
								type="button"
								role="tab"
								aria-selected={activeTab === "photo"}
								onClick={() => setActiveTab("photo")}
								className={`min-h-[38px] px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
									activeTab === "photo"
										? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line)]"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid="tab-photo-protocol"
							>
								<Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
								<span>Фотопротокол До/После</span>
							</button>
						</>
					)}

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "bundles"}
						onClick={() => setActiveTab("bundles")}
						className={`min-h-[38px] px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
							activeTab === "bundles"
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-clinical-bundles"
					>
						<Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
						<span>Клинические пакеты</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "curator"}
						onClick={() => setActiveTab("curator")}
						className={`min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
							activeTab === "curator"
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-curator-assignment"
					>
						<UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
						<span className="hidden sm:inline">Куратор плана</span>
						<span className="sm:hidden">Куратор</span>
					</button>
				</div>

				{/* 1.2. Панель скидки врача: свобода скидки до 100% без паролей */}
				{isDiscountBarOpen && (
					<div className="px-4 sm:px-6 py-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center gap-3 flex-wrap text-xs" data-testid="doctor-discount-bar">
						<span className="font-bold text-[var(--ink)]">Скидка врача:</span>
						<div className="flex items-center gap-1.5 flex-wrap">
							{DISCOUNT_PRESETS.map((pct) => (
								<button
									key={pct}
									type="button"
									onClick={() => setDoctorDiscountPercent(pct)}
									className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
										doctorDiscountPercent === pct ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line-subtle)]"
									}`}
								>
									{pct === 100 ? "100% (Гарантия)" : `${pct}%`}
								</button>
							))}
						</div>
						{doctorDiscountPercent > 0 && <span className="text-[var(--teal,#0d9488)] font-semibold ml-auto">Применена скидка {doctorDiscountPercent}% на все варианты</span>}
					</div>
				)}

				{/* 2. ОСНОВНОЕ ТЕЛО СТУДИИ */}
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 sm:pb-6 space-y-6">
					{/* Индикатор успеха утверждения */}
					{approvedSuccessMessage && (
						<div className="p-3 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.15))] border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] text-xs font-bold flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 shrink-0" />
							<span>{approvedSuccessMessage}</span>
						</div>
					)}

					{/* Индикатор сохранения черновика */}
					{draftSavedNotice && (
						<div className="p-3 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.12))] border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] text-xs font-bold flex items-center gap-2">
							<Save className="w-4 h-4 shrink-0" />
							<span>{draftSavedNotice}</span>
						</div>
					)}

					{/* Индикатор экспорта в PDF */}
					{exportSuccessNotice && (
						<div className="p-3 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.15))] border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] text-xs font-bold flex items-center gap-2">
							<FileText className="w-4 h-4 shrink-0" />
							<span>{exportSuccessNotice}</span>
						</div>
					)}

					{/* Вкладка 1: Тарифы и клинические этапы */}
					{activeTab === "tiers" && (
						<StudioTiersAndStagesTab
							computedTiers={computedTiers}
							activeTier={activeTier}
							selectedTierId={selectedTierId}
							onSelectTierId={setSelectedTierId}
							expandedStageId={expandedStageId}
							onToggleExpandStage={(id) => setExpandedStageId(expandedStageId === id ? null : id)}
							onSelectDiagnosisPreset={handleSelectDiagnosisPreset}
							onResetToCanonical={() => setStages(CANONICAL_CLINICAL_STAGES)}
							isExpressMode={depthMode === "express"}
							onAddItemToStage={handleAddItemToStage}
							onRemoveItemFromStage={handleRemoveItemFromStage}
							onGenerateFromTeeth={handleGenerateFromTeeth}
							onAddCustomStage={handleAddCustomStage}
						/>
					)}

					{/* Вкладка 2: Рассрочка 0% и налоговый вычет 13% НДФЛ */}
					{activeTab === "installment" && (
						<StudioInstallmentTab
							activeTier={activeTier}
							patientName={patientName || undefined}
						/>
					)}

					{/* Вкладка: Гарантийный паспорт (в режиме Эксперт) */}
					{activeTab === "warranty" && (
						<StudioWarrantyPassportTab
							activeTier={activeTier}
							patientName={patientName || undefined}
							doctorFullName={doctorFullName || undefined}
						/>
					)}

					{/* Вкладка: Фотопротокол До/После (в режиме Эксперт) */}
					{activeTab === "photo" && (
						<StudioPhotoProtocolTab activeTier={activeTier} patientId={patientId} />
					)}

					{/* Вкладка: Клинические пакеты */}
					{activeTab === "bundles" && (
						<StudioClinicalBundlesTab onAddBundleToStages={handleAddBundleToStages} />
					)}

					{/* Вкладка: Куратор плана */}
					{activeTab === "curator" && (
						<StudioCuratorAssignmentTab doctorFullName={doctorFullName || undefined} />
					)}
				</main>

				{/* 3. ПОДВАЛ СТУДИИ (Мандат 8am: РОВНО ОДНА Primary CTA КНОПКА #0d9488, ВСЕГДА КЛИКАБЕЛЬНАЯ ПО МАНДАТУ 8e) */}
				<footer className="tp-studio-footer sticky bottom-0 z-10 flex items-center justify-between flex-wrap gap-3 px-4 sm:px-6 py-3 pb-[max(14px,env(safe-area-inset-bottom))] bg-[var(--paper)] text-[var(--ink)] border-t border-[var(--line)] shrink-0">
					<div className="flex flex-col min-w-0">
						<span className="text-[11px] font-semibold text-[var(--muted)] block">Выбранный вариант:</span>
						<span className="text-sm sm:text-lg font-black text-[var(--ink)] truncate">«{sanitizedActiveTitle}» — {formatRubles(activeTier.totalRub)}</span>
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto">
						{/* Сохранить черновик в любой момент без блокировок (Мандат 8e) */}
						<button
							type="button"
							onClick={handleSaveDraft}
							className="dente-btn dente-btn-secondary min-h-[44px] px-2.5 sm:px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-[var(--ink)] text-xs font-bold items-center gap-1.5 transition-colors cursor-pointer inline-flex shrink-0"
							title="Сохранить черновик плана в карту пациента"
							data-testid="save-draft-btn"
						>
							<Save className="w-4 h-4 text-[var(--muted)] shrink-0" />
							<span className="hidden sm:inline">Сохранить черновик</span>
							<span className="sm:hidden">Черновик</span>
						</button>


						{/* ЕДИНСТВЕННЫЙ PRIMARY CTA КНОПКА ПО МАНДАТУ 8am (ВСЕГДА АКТИВНА, ДИЗАБЛИТЬ ЗАПРЕЩЕНО) */}
						<button
							type="button"
							onClick={handleApprove}
							className="tp-primary-cta-btn min-h-[52px] sm:min-h-[48px] flex-1 sm:flex-initial w-full sm:w-auto px-3 sm:px-8 py-2.5 text-xs sm:text-sm font-black rounded-xl inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] text-white whitespace-nowrap overflow-hidden"
							data-testid="approve-treatment-plan-btn"
						>
							<CheckCircle2 className="w-5 h-5 shrink-0" />
							<span className="hidden sm:inline">{`Утвердить выбранный план («${sanitizedActiveTitle}»)`}</span>
							<span className="sm:hidden whitespace-nowrap">{`Утвердить · ${formatRubles(activeTier.totalRub)}`}</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export type TreatmentPlanPresenterModalProps = TreatmentPlanStudioModalProps;
export const TreatmentPlanPresenterModal = TreatmentPlanStudioModal;

export default TreatmentPlanStudioModal;
