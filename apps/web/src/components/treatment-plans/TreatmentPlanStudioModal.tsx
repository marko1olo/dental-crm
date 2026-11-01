/**
 * TreatmentPlanStudioModal.tsx — Интерактивная студия планов лечения и кресельный презентер (SSOT).
 * Мандаты 8b, 8zi: Целевой размер 220–290 строк (Sweet Spot). Декомпозирован на модули studio/.
 * Мандат 8e: Автономия врача — свобода скидок до 100%, автосейв, кнопки НИКОГДА не блокируются (disabled=false).
 * Мандат 8am: Ровно 1 Primary CTA кнопка var(--teal) (#0d9488) на видимый экран.
 * Мандат 8n: Простота для соло-врача и клиники у кресла — выбор из 3 вариантов в 1 клик.
 * Мандат 8x & 8ap: Человеческий клинический язык без советского канцелярита в прод-UI.
 * Apple HIG: Сенсорная зона >= 44x44px, сегментный свитчер на смартфонах (390x844), 0px горизонтального дрифта.
 */

import React, { useState, useMemo, useCallback } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import type {
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanStage,
} from "./treatmentPlanTypes";
import {
	CANONICAL_CLINICAL_STAGES,
	buildCanonical3TierPlans,
	applyDoctorDiscountToTiers,
	generateTreatmentPlanFromDiagnosis,
} from "./treatmentPlanCatalogData";
import {
	TreatmentPlanStudioHeader,
	TreatmentPlanScenarioSelector,
	TreatmentPlanStageEditor,
	TreatmentPlanStudioFooter,
} from "./studio/index";

if (typeof window !== "undefined") {
	void import("./styles/treatmentPlanStudio.css");
}

export interface TreatmentPlanStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly doctorFullName?: string;
	readonly initialSelectedTierId?: TreatmentPlanTierId;
	readonly onApprovePlan?: (selectedTier: TreatmentPlanTier) => void;
	readonly className?: string;
}

export const TreatmentPlanStudioModal: React.FC<TreatmentPlanStudioModalProps> = ({
	isOpen,
	onClose,
	patientName = "Смирнова Екатерина Васильевна",
	doctorFullName = "Д-р Орлов А.В. (Главный врач)",
	initialSelectedTierId = "optimum",
	onApprovePlan,
	className = "",
}) => {
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>(initialSelectedTierId);
	const [stages, setStages] = useState<readonly TreatmentPlanStage[]>(CANONICAL_CLINICAL_STAGES);
	const [doctorDiscountPercent, setDoctorDiscountPercent] = useState<number>(0);
	const [isDiscountBarOpen, setIsDiscountBarOpen] = useState<boolean>(false);
	const [expandedStageId, setExpandedStageId] = useState<string | null>("stage-1-hygiene");
	const [approvedSuccessMessage, setApprovedSuccessMessage] = useState<string | null>(null);

	// Генерация 3 канонических тарифов с учетом текущих этапов и скидки врача
	const computedTiers = useMemo(() => {
		const baseTiers = buildCanonical3TierPlans(stages);
		return applyDoctorDiscountToTiers(baseTiers, doctorDiscountPercent);
	}, [stages, doctorDiscountPercent]);

	// Активный выбранный вариант
	const activeTier = useMemo(() => {
		return (
			computedTiers.find((t) => t.tierId === selectedTierId) ||
			computedTiers.find((t) => t.tierId === "optimum") ||
			computedTiers[0]!
		);
	}, [computedTiers, selectedTierId]);

	// Переключение типового плана по диагнозу в 1 клик (Мандат 8n)
	const handleSelectDiagnosisPreset = useCallback((diagCode: string) => {
		const newStages = generateTreatmentPlanFromDiagnosis(diagCode);
		setStages(newStages);
		if (newStages.length > 0 && newStages[0]?.id) {
			setExpandedStageId(newStages[0].id);
		}
	}, []);

	// Утверждение плана врачом / пациентом (Мандат 8e: всегда кликабельно, 0 disabled)
	const handleApprove = useCallback(() => {
		if (onApprovePlan && activeTier) {
			onApprovePlan(activeTier);
		}
		setApprovedSuccessMessage(`План «${activeTier?.title}» успешно утвержден и прикреплен к карте пациента!`);
		setTimeout(() => {
			setApprovedSuccessMessage(null);
			onClose();
		}, 1400);
	}, [activeTier, onApprovePlan, onClose]);

	if (!isOpen) return null;

	return (
		<div
			className={`tp-studio-overlay fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4 overflow-x-clip max-w-[100vw] h-full ${className}`}
			data-testid="treatment-plan-studio-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="treatment-studio-title"
		>
			<div
				className="tp-studio-dialog flex flex-col w-full max-w-5xl bg-[var(--paper)] text-[var(--ink)] border-t sm:border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl overflow-hidden h-[94dvh] sm:h-auto sm:max-h-[92vh] mt-auto sm:my-auto"
			>
				{/* 0. Тактильный Drag Handle для мобильных экранов по Apple HIG */}
				<div className="tp-studio-drag-handle-wrap sm:hidden flex justify-center pt-2.5 pb-1">
					<div className="tp-studio-drag-handle w-9 h-1 rounded-full bg-[var(--line-strong,#94a3b8)] opacity-60" />
				</div>

				{/* 1. ШАПКА СТУДИИ (Мандат 8am: 1 компактная строка, скидка врача до 100%, сенсорные кнопки >= 44x44px) */}
				<TreatmentPlanStudioHeader
					patientName={patientName}
					doctorFullName={doctorFullName}
					doctorDiscountPercent={doctorDiscountPercent}
					isDiscountBarOpen={isDiscountBarOpen}
					onToggleDiscountBar={() => setIsDiscountBarOpen((prev) => !prev)}
					onSelectDiscountPercent={setDoctorDiscountPercent}
					onClose={onClose}
				/>

				{/* 2. БЫСТРЫЕ КЛИНИЧЕСКИЕ ШАБЛОНЫ В 1 КЛИК (Мандат 8n) */}
				<div className="px-4 sm:px-6 py-2 bg-[var(--paper)] border-b border-[var(--line)] flex items-center gap-2 overflow-x-auto text-xs no-scrollbar shrink-0">
					<span className="text-[var(--muted)] font-medium shrink-0 flex items-center gap-1">
						<Sparkles className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						Типовые сметы:
					</span>
					<button
						type="button"
						onClick={() => handleSelectDiagnosisPreset("K02")}
						className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--ink)] font-medium shrink-0 cursor-pointer transition-colors"
					>
						Кариес (Терапия)
					</button>
					<button
						type="button"
						onClick={() => handleSelectDiagnosisPreset("K04")}
						className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--ink)] font-medium shrink-0 cursor-pointer transition-colors"
					>
						Пульпит (Эндодонтия)
					</button>
					<button
						type="button"
						onClick={() => handleSelectDiagnosisPreset("K08")}
						className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--ink)] font-medium shrink-0 cursor-pointer transition-colors"
					>
						Имплантация + Коронка
					</button>
					<button
						type="button"
						onClick={() => setStages(CANONICAL_CLINICAL_STAGES)}
						className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--ink)] font-medium shrink-0 cursor-pointer transition-colors"
					>
						Полный комплекс (4 этапа)
					</button>
				</div>

				{/* 3. ОСНОВНОЕ ТЕЛО СТУДИИ */}
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
					{/* Сообщение об успешном утверждении */}
					{approvedSuccessMessage && (
						<div className="p-3 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.15))] border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] text-xs font-bold flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 shrink-0" />
							<span>{approvedSuccessMessage}</span>
						</div>
					)}

					{/* 3.1. ВЫБОР СЦЕНАРИЯ (СЕГМЕНТНЫЙ СВИТЧЕР + 3-УРОВНЕВАЯ СЕТКА) */}
					<TreatmentPlanScenarioSelector
						tiers={computedTiers}
						selectedTierId={selectedTierId}
						onSelectTier={setSelectedTierId}
						activeTier={activeTier}
					/>

					{/* 3.2. РЕДАКТОР И КАРТОЧКИ КЛИНИЧЕСКИХ ЭТАПОВ С ЗУБАМИ FDI */}
					<TreatmentPlanStageEditor
						stages={activeTier.stages}
						activeTierTitle={activeTier.title}
						totalRub={activeTier.totalRub}
						expandedStageId={expandedStageId}
						onToggleStage={(stageId) => setExpandedStageId(expandedStageId === stageId ? null : stageId)}
					/>
				</main>

				{/* 4. ПОДВАЛ СТУДИИ (Мандат 8am: РОВНО ОДНА Primary CTA КНОПКА #0d9488, ВСЕГДА КЛИКАБЕЛЬНАЯ ПО МАНДАТУ 8e) */}
				<TreatmentPlanStudioFooter
					activeTier={activeTier}
					onApprove={handleApprove}
				/>
			</div>
		</div>
	);
};

export default TreatmentPlanStudioModal;
