import React from "react";
import { CheckCircle2, Circle, FileCheck2, RotateCw } from "lucide-react";
import type { VisitNoteForm } from "../../../utils/draftDefaults";
import {
	type LastVisitSoapSnapshot,
	getUnfinishedEndoSnapshot,
} from "../../../lib/clinicalProtocols043";

export interface EmkSoapVisibilityTrackerProps {
	readonly visitNoteForm?: VisitNoteForm | Record<string, any> | null | undefined;
	readonly activeTooth?: number | null | undefined;
	readonly endoSnapshot?: LastVisitSoapSnapshot | null | undefined;
	readonly onContinueEndoStage?: ((snapshot: LastVisitSoapSnapshot) => void) | undefined;
}

function extractDiagnosisLabel(text: string | undefined | null): string {
	if (!text) return "нет";
	const icdMatch = text.match(/K\d{2}\.\d/);
	if (icdMatch) {
		const code = icdMatch[0];
		if (code === "K02.1") return "K02.1 Кариес дентина";
		if (code === "K02.0") return "K02.0 Кариес эмали";
		if (code === "K04.0") return "K04.0 Пульпит";
		if (code === "K04.5") return "K04.5 Периодонтит";
		if (code === "K03.1") return "K03.1 Клиновидный дефект";
		if (code === "K03.8") return "K03.8 Гиперестезия";
		return `${code} Установлен`;
	}
	return "Установлен";
}

function extractTreatmentLabel(text: string | undefined | null): string {
	if (!text) return "нет";
	const lower = text.toLowerCase();
	if (lower.includes("estelite") || lower.includes("пломб") || lower.includes("реставрац")) {
		return "Анестезия + Световая пломба";
	}
	if (lower.includes("гуттаперч") || lower.includes("канал") || lower.includes("экстирпац")) {
		return "Эндодонтический протокол";
	}
	if (lower.includes("удален") || lower.includes("экстракц")) {
		return "Хирургический протокол";
	}
	return "Протокол заполнен";
}

export const EmkSoapVisibilityTracker: React.FC<
	EmkSoapVisibilityTrackerProps
> = ({ visitNoteForm, activeTooth, endoSnapshot, onContinueEndoStage }) => {
	const effectiveSnapshot =
		endoSnapshot !== undefined
			? endoSnapshot
			: activeTooth
			? getUnfinishedEndoSnapshot(null, activeTooth)
			: null;

	const handleContinueClick = () => {
		if (!effectiveSnapshot) return;
		if (onContinueEndoStage) {
			onContinueEndoStage(effectiveSnapshot);
		} else {
			window.dispatchEvent(
				new CustomEvent("dente-continue-endo-stage", {
					detail: { snapshot: effectiveSnapshot },
				}),
			);
		}
	};

	// Если во 2-м этапе лечение уже заполнено (в плане есть обтурация или 2-й этап), скрываем кнопку повтора
	const isAlreadyContinued = Boolean(
		visitNoteForm?.treatmentPlan &&
			(visitNoteForm.treatmentPlan.includes("2-й этап") ||
				visitNoteForm.treatmentPlan.includes("обтурация") ||
				visitNoteForm.treatmentPlan.includes("AH Plus")),
	);

	const showContinueButton = Boolean(effectiveSnapshot && !isAlreadyContinued);

	const hasComplaint = Boolean(visitNoteForm?.complaint?.trim());
	const hasObjective = Boolean(visitNoteForm?.objectiveStatus?.trim());
	const hasDiagnosis = Boolean(visitNoteForm?.diagnosis?.trim());
	const hasTreatment = Boolean(
		visitNoteForm?.treatmentPlan?.trim() ||
			(visitNoteForm as any)?.treatmentDescription?.trim(),
	);

	const filledCount =
		(hasComplaint ? 1 : 0) +
		(hasObjective ? 1 : 0) +
		(hasDiagnosis ? 1 : 0) +
		(hasTreatment ? 1 : 0);

	const isComplete = filledCount === 4;

	const scrollToSection = (testId: string) => {
		const target = document.querySelector(`[data-testid="${testId}"]`);
		if (target) {
			target.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	const diagnosisText = extractDiagnosisLabel(visitNoteForm?.diagnosis);
	const treatmentText = extractTreatmentLabel(
		(visitNoteForm as any)?.treatmentDescription || visitNoteForm?.treatmentPlan,
	);

	return (
		<div
			className="emk-soap-visibility-tracker flex items-center justify-between gap-2 flex-nowrap overflow-x-auto no-scrollbar px-2.5 py-1 min-h-[32px] rounded-lg border border-[var(--line-subtle)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] transition-all"
			data-testid="emk-soap-visibility-tracker"
		>
			{/* Левая группа: 4 чипа статуса SOAP секций строго в 1 строку без многоточий */}
			<div className="flex items-center gap-1.5 flex-nowrap shrink-0">
				<span className="text-[11px] font-semibold text-[var(--muted)] flex items-center gap-1 mr-0.5 shrink-0">
					<FileCheck2 size={13} className="text-[var(--teal)] shrink-0" />
					<span className="hidden lg:inline">Дневник визита:</span>
				</span>

				{/* 1. Жалобы (S) */}
				<button
					type="button"
					onClick={() => scrollToSection("emk-complaints-section")}
					className={`soap-status-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer border whitespace-nowrap ${
						hasComplaint
							? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"
					}`}
					title={visitNoteForm?.complaint || "Жалобы не заполнены"}
					data-testid="chip-soap-status-complaint"
				>
					{hasComplaint ? (
						<CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					) : (
						<Circle size={11} className="text-[var(--muted)] shrink-0 opacity-60" />
					)}
					<span className="font-semibold">
						{hasComplaint ? "Жалобы заполнены" : "Жалобы: нет"}
					</span>
				</button>

				{/* 2. Осмотр (O) */}
				<button
					type="button"
					onClick={() => scrollToSection("emk-objective-status-section")}
					className={`soap-status-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer border whitespace-nowrap ${
						hasObjective
							? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"
					}`}
					title={visitNoteForm?.objectiveStatus || "Объективный статус не заполнен"}
					data-testid="chip-soap-status-objective"
				>
					{hasObjective ? (
						<CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					) : (
						<Circle size={11} className="text-[var(--muted)] shrink-0 opacity-60" />
					)}
					<span className="font-semibold">
						{hasObjective ? "Осмотр заполнен" : "Осмотр: нет"}
					</span>
				</button>

				{/* 3. Диагноз (A) */}
				<button
					type="button"
					onClick={() => scrollToSection("emk-diagnosis-protocol-section")}
					className={`soap-status-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer border whitespace-nowrap ${
						hasDiagnosis
							? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"
					}`}
					title={visitNoteForm?.diagnosis || "Диагноз не указан"}
					data-testid="chip-soap-status-diagnosis"
				>
					{hasDiagnosis ? (
						<CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					) : (
						<Circle size={11} className="text-[var(--muted)] shrink-0 opacity-60" />
					)}
					<span className="font-semibold">Диагноз: {diagnosisText}</span>
				</button>

				{/* 4. Лечение (P) */}
				<button
					type="button"
					onClick={() => scrollToSection("emk-treatment-section")}
					className={`soap-status-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer border whitespace-nowrap ${
						hasTreatment
							? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20"
							: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"
					}`}
					title={
						(visitNoteForm as any)?.treatmentDescription ||
						visitNoteForm?.treatmentPlan ||
						"Лечение не заполнено"
					}
					data-testid="chip-soap-status-treatment"
				>
					{hasTreatment ? (
						<CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					) : (
						<Circle size={11} className="text-[var(--muted)] shrink-0 opacity-60" />
					)}
					<span className="font-semibold">Лечение: {treatmentText}</span>
				</button>
			</div>

			{/* Правая часть: Кнопка продолжения эндодонтии + Сводный бейдж готовности Формы 043/у */}
			<div className="flex items-center gap-2 shrink-0 ml-auto">
				{showContinueButton && effectiveSnapshot && (
					<button
						type="button"
						onClick={handleContinueClick}
						data-testid="continue-endo-btn"
						className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors cursor-pointer whitespace-nowrap active:scale-95"
						title={`Продолжить 2-й этап эндодонтического лечения зуба ${effectiveSnapshot.toothNumber} с визита от ${effectiveSnapshot.date}`}
					>
						<RotateCw size={12} className="shrink-0" />
						<span>🔁 Продолжить лечение зуба {effectiveSnapshot.toothNumber} с визита от {effectiveSnapshot.date}</span>
					</button>
				)}
				{activeTooth && (
					<span className="text-[11px] font-mono text-[var(--muted)] shrink-0 hidden xl:inline">
						Зуб {activeTooth}
					</span>
				)}
				<span
					className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 whitespace-nowrap ${
						isComplete
							? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
							: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
					}`}
					data-testid="badge-soap-completion-status"
				>
					{isComplete ? "✓ Готов к подписи" : `${filledCount}/4 заполнено`}
				</span>
			</div>
		</div>
	);
};
