/**
 * TreatmentPlanStudioModal.tsx — Интерактивная студия планов лечения и кресельный презентер (SSOT).
 * Мандаты 8b, 8zi: Целевой размер 250–350 строк (Sweet Spot). Консолидированный монолит без микро-шредера.
 * Мандат 8e: Автономия врача — свобода скидок до 100%, автосейв, кнопки НИКОГДА не блокируются (disabled=false).
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal) (#0d9488) на видимый экран, вторичные кнопки в нейтрале.
 * Мандат 8n: Простота для соло-врача и клиники у кресла — выбор из 3 вариантов, генератор по МКБ-10.
 * Мандат 8x & 8ap: Человеческий клинический язык без советского канцелярита в прод-UI.
 * Режимы глубины: Экспресс-смета (чистый 1-экранный интерфейс) и Клинический эксперт (этапы, гарантийный паспорт, фотопротокол).
 * Apple HIG: Сенсорная зона >= 44x44px, Drag Handle 36x5px, нативный Segmented Switcher на смартфонах (390x844).
 */

import React, { useRef } from "react";
import {
	BarChart3, Package, UserCheck,
	ShieldCheck, Camera, Save, CreditCard, AlertCircle,
	CheckCircle2, FileText,
} from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId, TreatmentPlanStage } from "./treatmentPlanTypes";
import type { ToothData } from "./types";
import { CANONICAL_CLINICAL_STAGES } from "./treatmentPlanCatalogData";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { StudioTiersAndStagesTab } from "./studioTabs/StudioTiersAndStagesTab";
import { StudioInstallmentTab } from "./studioTabs/StudioInstallmentTab";
import { StudioClinicalBundlesTab } from "./studioTabs/StudioClinicalBundlesTab";
import { StudioCuratorAssignmentTab } from "./studioTabs/StudioCuratorAssignmentTab";
import { StudioWarrantyPassportTab } from "./studioTabs/StudioWarrantyPassportTab";
import { StudioPhotoProtocolTab } from "./studioTabs/StudioPhotoProtocolTab";
import {
	useStudioPlanLifecycle,
	type StudioDepthMode,
	type StudioTab,
} from "./studioModules/useStudioPlanLifecycle";
import { StudioModalHeader } from "./studioModules/StudioModalHeader";
import { StudioModalFooter } from "./studioModules/StudioModalFooter";

if (typeof window !== "undefined") {
	void import("./styles/treatmentPlanStudio.css");
}

export type { StudioDepthMode, StudioTab };

export interface TreatmentPlanStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | null | undefined;
	readonly patientId?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly initialSelectedTierId?: TreatmentPlanTierId | undefined;
	readonly initialDepthMode?: StudioDepthMode | undefined;
	readonly initialStages?: readonly TreatmentPlanStage[] | undefined;
	readonly initialTiers?: readonly TreatmentPlanTier[] | undefined;
	readonly tiers?: readonly TreatmentPlanTier[] | undefined;
	readonly contractNumber?: string | undefined;
	readonly onSelectPlan?: ((plan: TreatmentPlanTier) => void) | undefined;
	readonly onPrintContract?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onApprovePlan?: ((selectedTier: TreatmentPlanTier) => void) | undefined;
	readonly onConfirmSelection?: ((selectedTier: TreatmentPlanTier) => void) | undefined;
	readonly onApproveAndSign?: ((selectedTier: TreatmentPlanTier) => void) | undefined;
	readonly onSaveDraft?: ((stages: readonly TreatmentPlanStage[], selectedTier: TreatmentPlanTier) => void) | undefined;
	readonly className?: string | undefined;
	readonly teeth?: readonly ToothData[] | undefined;
	readonly isDemoMode?: boolean | undefined;
	readonly initialActiveTab?: StudioTab | undefined;
	readonly planId?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
}

export const TreatmentPlanStudioModal: React.FC<TreatmentPlanStudioModalProps> = ({
	isOpen,
	onClose,
	patientName: propPatientName,
	patientId: propPatientId,
	doctorFullName: propDoctorFullName,
	initialSelectedTierId = "optimum",
	initialDepthMode = "express",
	initialActiveTab = "tiers",
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
}) => {
	const isDemo = explicitDemoMode ?? isDemoShowcaseMode();
	const patientName = propPatientName ?? (isDemo ? "Демо-пациент" : "");
	const patientId = propPatientId ?? undefined;
	const doctorFullName = propDoctorFullName ?? (isDemo ? "Дежурный врач" : "");
	const mainRef = useRef<HTMLElement | null>(null);

	const {
		depthMode,
		setDepthMode,
		activeTab,
		setActiveTab,
		selectedTierId,
		setSelectedTierId,
		setStages,
		doctorDiscountPercent,
		setDoctorDiscountPercent,
		isDiscountBarOpen,
		setIsDiscountBarOpen,
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
		handleExportPdf,
		handleCloseWithReset,
	} = useStudioPlanLifecycle({
		isOpen,
		onClose,
		patientName,
		patientId,
		doctorFullName,
		initialSelectedTierId,
		initialDepthMode,
		initialActiveTab,
		initialStages,
		teeth,
		isDemo,
		planId: propPlanId,
		onApprovePlan,
		onConfirmSelection,
		onApproveAndSign,
		onSaveDraft,
		mainRef,
	});

	if (!isOpen) return null;

	return (
		<div
			className={`tp-studio-overlay fixed inset-0 z-[100] flex flex-col justify-end sm:items-center sm:justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4 overflow-x-clip max-w-[100vw] h-full ${className}`}
			data-testid="treatment-plan-studio-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="treatment-studio-title"
		>
			<div className="tp-studio-dialog flex flex-col w-full max-w-[1260px] bg-[var(--paper)] text-[var(--ink)] border-t sm:border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden h-[94dvh] sm:h-auto sm:max-h-[92vh] mt-auto sm:my-auto">
				{/* 0. Тактильный Drag Handle для смартфонов по Apple HIG */}
				<div className="tp-studio-drag-handle-wrap sm:hidden flex justify-center pt-2.5 pb-1">
					<div className="tp-studio-drag-handle w-9 h-1 rounded-full bg-[var(--line-strong,#94a3b8)] opacity-60" />
				</div>

				{/* 1. ШАПКА СТУДИИ (Мандат 8am: 1 строка, скидка врача до 100%, сенсорные зоны >= 44x44px) */}
				<StudioModalHeader
					patientName={patientName}
					doctorFullName={doctorFullName}
					depthMode={depthMode}
					setDepthMode={setDepthMode}
					doctorDiscountPercent={doctorDiscountPercent}
					setDoctorDiscountPercent={setDoctorDiscountPercent}
					isDiscountBarOpen={isDiscountBarOpen}
					setIsDiscountBarOpen={setIsDiscountBarOpen}
					handleExportPdf={handleExportPdf}
					onClose={handleCloseWithReset}
				/>

				{/* 1.1. Вкладки студии (в режиме Эксперт — полная палитра; в Экспресс — всегда доступно) */}
				<div className="flex items-center gap-1 p-1.5 bg-[var(--paper-soft)] border-b border-[var(--line)] px-3 sm:px-6 shrink-0 overflow-x-auto no-scrollbar" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "tiers"}
						onClick={() => setActiveTab("tiers")}
						className={`min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap border ${
							activeTab === "tiers"
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border-[var(--line)]"
								: "bg-transparent border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
						}`}
						data-testid="tab-tiers-stages"
					>
						<BarChart3 className="w-3.5 h-3.5 shrink-0" />
						<span>Тарифы и этапы</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "installment"}
						onClick={() => setActiveTab("installment")}
						className={`min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap border ${
							activeTab === "installment"
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border-[var(--line)]"
								: "bg-transparent border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
						}`}
						data-testid="tab-installment-calculator"
					>
						<CreditCard className="w-3.5 h-3.5 shrink-0" />
						<span>Рассрочка 0% и вычет</span>
					</button>

					{depthMode === "expert" && (
						<>
							<button
								type="button"
								role="tab"
								aria-selected={activeTab === "warranty"}
								onClick={() => setActiveTab("warranty")}
								className={`min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap border ${
									activeTab === "warranty"
										? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border-[var(--line)]"
										: "bg-transparent border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
								}`}
								data-testid="tab-warranty-passport"
							>
								<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
								<span>Гарантийный паспорт</span>
							</button>

							<button
								type="button"
								role="tab"
								aria-selected={activeTab === "photo"}
								onClick={() => setActiveTab("photo")}
								className={`min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap border ${
									activeTab === "photo"
										? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border-[var(--line)]"
										: "bg-transparent border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
								}`}
								data-testid="tab-photo-protocol"
							>
								<Camera className="w-3.5 h-3.5 shrink-0" />
								<span>Фотопротокол До/После</span>
							</button>
						</>
					)}

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "bundles"}
						onClick={() => setActiveTab("bundles")}
						className={`min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap border ${
							activeTab === "bundles"
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border-[var(--line)]"
								: "bg-transparent border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
						}`}
						data-testid="tab-clinical-bundles"
					>
						<Package className="w-3.5 h-3.5 shrink-0" />
						<span>Клинические пакеты</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "curator"}
						onClick={() => setActiveTab("curator")}
						className={`min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap border ${
							activeTab === "curator"
								? "bg-[var(--paper)] text-[var(--teal,#0d9488)] shadow-xs border-[var(--line)]"
								: "bg-transparent border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
						}`}
						data-testid="tab-curator-assignment"
					>
						<UserCheck className="w-3.5 h-3.5 shrink-0" />
						<span className="hidden sm:inline">Куратор плана</span>
						<span className="sm:hidden">Куратор</span>
					</button>
				</div>

				{/* 2. ОСНОВНОЕ ТЕЛО СТУДИИ */}
				<main ref={mainRef} className="flex-1 overflow-y-auto p-4 sm:p-5 pb-28 sm:pb-5 space-y-4">
					{/* Индикатор успеха утверждения */}
					{approvedSuccessMessage && (
						<div className="p-3 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.15))] border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] text-xs font-bold flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 shrink-0" />
							<span>{approvedSuccessMessage}</span>
						</div>
					)}

					{/* Индикатор ошибки утверждения */}
					{approvalErrorMessage && (
						<div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2" role="alert">
							<AlertCircle className="w-4 h-4 shrink-0" />
							<span>{approvalErrorMessage}</span>
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
							onResetToCanonical={() => {
								setStages(CANONICAL_CLINICAL_STAGES);
								resetScrollTop();
							}}
							isExpressMode={depthMode === "express"}
							hideMicroConsumablesForPatient={true}
							onAddItemToStage={handleAddItemToStage}
							onRemoveItemFromStage={handleRemoveItemFromStage}
							onGenerateStageInvoice={handleGenerateStageInvoice}
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
							patientId={patientId || undefined}
							clinicName={propClinicName || undefined}
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
						<StudioCuratorAssignmentTab
							planId={propPlanId}
							doctorFullName={doctorFullName || undefined}
						/>
					)}
				</main>

				{/* 3. ПОДВАЛ СТУДИИ (Мандат 8am: РОВНО ОДНА Primary CTA КНОПКА #0d9488, ВСЕГДА КЛИКАБЕЛЬНАЯ ПО МАНДАТУ 8e) */}
				<StudioModalFooter
					sanitizedActiveTitle={sanitizedActiveTitle}
					activeTierTotalRub={activeTier.totalRub}
					handleSaveDraft={handleSaveDraft}
					handleApprove={handleApprove}
				/>
			</div>
		</div>
	);
};

export default TreatmentPlanStudioModal;
