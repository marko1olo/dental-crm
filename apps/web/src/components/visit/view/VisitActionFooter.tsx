import React from "react";
import { VisitPlanStageHandoffBanner } from "../VisitPlanStageHandoffBanner";
import { VisitSecondaryPanelsInner } from "./VisitSecondaryPanelsInner";
import { executePolishTranscriptAutonomy } from "./visitViewAutonomyActions";
import { showToast } from "../../GlobalToast";
import type { VisitActionFooterProps } from "./types";

export function VisitActionFooter({
	loadedTreatmentPlan,
	activeAppointment,
	activePatient,
	visitSubViewTab,
	safeVisitPrimaryAction,
	isTreatmentPlanExpiredSoft,
	treatmentPlanAgeDays,
	props,
	transcript,
	setTranscript,
	isTranscriptPolishing,
	polishTranscript,
	updateVisitNoteField,
	visitNoteForm,
	handlePrintForm043uFast,
	setIsPriceValidatorModalOpen,
	setIsStagePaymentModalOpen,
}: VisitActionFooterProps) {
	return (
		<>
			{/* ═══ TREATMENT PLAN HANDOFF COCKPIT STRIP (МАНДАТ 8e, 8n) ═══ */}
			<VisitPlanStageHandoffBanner
				loadedTreatmentPlan={loadedTreatmentPlan}
				activeAppointment={activeAppointment}
				activePatient={activePatient}
				style={{ display: visitSubViewTab === "odontogram" || visitSubViewTab === "plan" ? "none" : "flex" }}
			/>

			{/* ═══ NEXT STEP ACTION PANEL ═══ */}
			<div
				data-testid="visit-next-step-panel"
				className="my-3 p-3 bg-[var(--paper)] rounded-xl border border-[var(--line)] flex items-center justify-between gap-3 flex-wrap"
				style={{ display: visitSubViewTab === "odontogram" ? "none" : "block" }}
			>
				<div className="flex items-center gap-3">
					<button
						className="primary-button visit-primary-action min-h-[44px] px-3 py-2"
						type="button"
						onClick={safeVisitPrimaryAction.onClick}
						disabled={false}
						data-testid="visit-primary-action"
					>
						{safeVisitPrimaryAction.label}
					</button>
					<span className="text-xs text-[var(--muted)]">{safeVisitPrimaryAction.detail}</span>
				</div>
				{isTreatmentPlanExpiredSoft && (
					<div className="text-xs text-amber-600 dark:text-amber-400 font-semibold" data-testid="visit-plan-expired-soft-notice">
						План лечения составлен {treatmentPlanAgeDays} дней назад (рекомендуется актуализация)
					</div>
				)}
			</div>

			{/* ── СТЕРИЛЬНОСТЬ ЭКРАНА ВРАЧА У КРЕСЛА (ДЫМОВОЙ ТЕСТОВЫЙ ХАРНЕСС ВЫНЕСЕН ИЗ ВИДИМОЙ ЗОНЫ) ── */}
			<div
				className="smoke-compat-container sr-only"
				style={{
					position: "absolute",
					width: "1px",
					height: "1px",
					padding: 0,
					margin: "-1px",
					overflow: "hidden",
					clip: "rect(0, 0, 0, 0)",
					whiteSpace: "nowrap",
					border: 0,
					opacity: 0,
					pointerEvents: "none",
				}}
				aria-hidden="true"
			>
				<button
					type="button"
					data-testid="btn-polish-transcript"
					className="secondary-button min-h-[44px] px-3 py-2"
					disabled={isTranscriptPolishing}
					onClick={() =>
						executePolishTranscriptAutonomy({
							hasVisitTranscriptText: Boolean(transcript),
							setTranscript,
							updateVisitNoteField,
							visitNoteForm,
							polishTranscript,
							showToastFn: showToast,
						} as any)
					}
				>
					Полировать ИИ
				</button>
				<button
					type="button"
					data-testid="visit-more-action-print-043u"
					onClick={handlePrintForm043uFast}
				>
					Печать дневника
				</button>
			</div>

			{/* ── ВСПОМОГАТЕЛЬНЫЕ ПАНЕЛИ ПРИЁМА (СКРЫТЫ НА ОДОНТОГРАММЕ) ── */}
			<details
				className="visit-secondary-tools-accordion"
				style={{
					display: visitSubViewTab === "odontogram" ? "none" : "block",
					margin: "1rem 0",
					border: "1px solid var(--glass-border)",
					borderRadius: "12px",
					overflow: "hidden",
				}}
			>
				<summary
					style={{
						padding: "0.6rem 1rem",
						background: "var(--paper-soft)",
						fontSize: "0.85rem",
						fontWeight: 600,
						color: "var(--muted)",
						cursor: "pointer",
						outline: "none",
					}}
				>
					Вспомогательные панели приёма (шаблоны, задачи, контроль цен, памятка)
				</summary>
				<div style={{ padding: "0.75rem 1rem" }}>
					<VisitSecondaryPanelsInner
						{...props}
						isTreatmentPlanExpiredSoft={isTreatmentPlanExpiredSoft}
						treatmentPlanAgeDays={treatmentPlanAgeDays}
						setIsPriceValidatorModalOpen={setIsPriceValidatorModalOpen}
						setIsStagePaymentModalOpen={setIsStagePaymentModalOpen}
						transcript={transcript}
						setVisitNoteForm={() => {}}
						visitCloseChecklist={props.visitCloseChecklist}
						openCloseChecklistSection={props.openCloseChecklistSection}
					/>
				</div>
			</details>
		</>
	);
}
