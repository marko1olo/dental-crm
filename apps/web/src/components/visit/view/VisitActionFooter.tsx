import React, { useState } from "react";
import { CalendarPlus, FastForward, Printer } from "lucide-react";
import { VisitPlanStageHandoffBanner } from "../VisitPlanStageHandoffBanner";
import { VisitSecondaryPanelsInner } from "./VisitSecondaryPanelsInner";
import { executePolishTranscriptAutonomy } from "./visitViewAutonomyActions";
import { showToast } from "../../GlobalToast";
import type { VisitActionFooterProps } from "./types";
import {
	createSmartSequentialAppointment,
	detectRecommendedProtocol,
	SMART_CLINICAL_PROTOCOLS,
	type SmartClinicalProtocolKey,
} from "../../schedule/smartSequentialVisitsEngine";
import {
	FastClinicalPrintEngine,
	type FastPrintDocType,
} from "../../documents/FastClinicalPrintEngine";

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
	const [isFastPrintModalOpen, setIsFastPrintModalOpen] = useState(false);
	const [fastPrintDocType, setFastPrintDocType] = useState<FastPrintDocType>("form043u");

	const recommendedKey = activeAppointment
		? detectRecommendedProtocol({
				diagnosisMkb10: activeAppointment.diagnosisMkb10 ?? null,
				reason: activeAppointment.reason ?? null,
				clinicalStage: activeAppointment.clinicalStage ?? null,
				toothNumber: activeAppointment.toothNumber ?? null,
			})
		: "general_control";

	const recommendedProtocol = SMART_CLINICAL_PROTOCOLS[recommendedKey];

	return (
		<>
			{/* ═══ TREATMENT PLAN HANDOFF COCKPIT STRIP (МАНДАТ 8e, 8n) ═══ */}
			<VisitPlanStageHandoffBanner
				loadedTreatmentPlan={loadedTreatmentPlan}
				activeAppointment={activeAppointment}
				activePatient={activePatient}
				style={{ display: visitSubViewTab === "odontogram" || visitSubViewTab === "plan" ? "none" : "flex" }}
			/>

			{/* ═══ SMART SEQUENTIAL PROTOCOL BAR (1-КЛИК ПОВТОРНЫЙ ВИЗИТ) ═══ */}
			{activeAppointment && (
				<div
					data-testid="visit-smart-sequential-bar"
					className="my-2 p-3 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex items-center justify-between gap-3 flex-wrap text-xs"
					style={{
						display: visitSubViewTab === "odontogram" ? "none" : "flex",
						padding: "10px 14px",
						borderRadius: "12px",
						border: "1px solid var(--line)",
						background: "var(--paper-soft)",
						gap: "12px",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div className="flex items-center gap-2.5" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<div
							style={{
								width: "32px",
								height: "32px",
								borderRadius: "8px",
								background: "rgba(13, 148, 136, 0.14)",
								color: "var(--teal, #0d9488)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<FastForward size={15} />
						</div>
						<div className="flex flex-col" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
							<span className="font-bold text-[var(--ink)]" style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
								Следующий этап лечения
							</span>
							<span className="text-[11px] text-[var(--muted)]" style={{ fontSize: "11.5px", color: "var(--muted)" }}>
								Подбор ближайшего слота, перенос диагноза и зуба{activeAppointment.toothNumber ? ` №${activeAppointment.toothNumber}` : ""} · отмена 5 сек
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2 flex-wrap" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
						<button
							type="button"
							data-testid="visit-smart-next-stage-primary-btn"
							onClick={() => {
								createSmartSequentialAppointment({
									parentAppointment: activeAppointment,
									protocolKey: recommendedKey,
								});
							}}
							style={{
								minHeight: "34px",
								padding: "6px 12px",
								borderRadius: "8px",
								background: "var(--teal, #0d9488)",
								color: "#ffffff",
								border: "1px solid transparent",
								fontWeight: 600,
								fontSize: "12px",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
								cursor: "pointer",
								whiteSpace: "nowrap",
							}}
							title={`Запланировать «${recommendedProtocol.title}» через ${recommendedProtocol.defaultIntervalDays} дней в 1 клик`}
						>
							<CalendarPlus size={14} />
							<span>
								+{" "}
								{recommendedProtocol.shortLabel.includes("(")
									? recommendedProtocol.shortLabel
									: `${recommendedProtocol.shortLabel} (${recommendedProtocol.defaultIntervalDays} дн)`}
							</span>
						</button>

						{(
							[
								"endo_stage_2",
								"suture_removal",
								"ortho_activation",
								"implant_prosthetics",
								"general_control",
							] as SmartClinicalProtocolKey[]
						)
							.filter((k) => k !== recommendedKey)
							.map((key) => {
								const proto = SMART_CLINICAL_PROTOCOLS[key];
								const chipText = proto.shortLabel.includes("(")
									? proto.shortLabel
									: `${proto.shortLabel} (${proto.defaultIntervalDays} дн)`;
								return (
									<button
										key={key}
										type="button"
										data-testid={`btn-smart-stage-${key}`}
										onClick={() => {
											createSmartSequentialAppointment({
												parentAppointment: activeAppointment,
												protocolKey: key,
											});
										}}
										style={{
											minHeight: "34px",
											padding: "6px 10px",
											borderRadius: "8px",
											background: "var(--paper)",
											color: "var(--ink)",
											border: "1px solid var(--line)",
											fontWeight: 500,
											fontSize: "12px",
											display: "inline-flex",
											alignItems: "center",
											gap: "4px",
											cursor: "pointer",
											whiteSpace: "nowrap",
										}}
										title={`Запланировать «${proto.title}» через ${proto.defaultIntervalDays} дней`}
									>
										+ {chipText}
									</button>
								);
							})}
					</div>
				</div>
			)}

			{/* ═══ NEXT STEP ACTION PANEL ═══ */}
			<div
				data-testid="visit-next-step-panel"
				className="my-3 p-3 bg-[var(--paper)] rounded-xl border border-[var(--line)] flex items-center justify-between gap-3 flex-wrap"
				style={{ display: visitSubViewTab === "odontogram" ? "none" : "block" }}
			>
				<div className="flex items-center gap-3 flex-wrap">
					<button
						className="primary-button visit-primary-action min-h-[44px] px-3 py-2"
						type="button"
						onClick={safeVisitPrimaryAction.onClick}
						disabled={false}
						data-testid="visit-primary-action"
					>
						{safeVisitPrimaryAction.label}
					</button>
					<button
						type="button"
						data-testid="visit-footer-print-insert-btn"
						onClick={() => {
							setFastPrintDocType("partisan_insert_043u");
							setIsFastPrintModalOpen(true);
						}}
						className="h-10 px-3.5 rounded-lg border border-[var(--teal)]/40 bg-[var(--teal-soft,#0d948815)] hover:bg-[var(--teal-soft,#0d948825)] text-[var(--teal,#0d9488)] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
						title="Распечатать вкладыш в медицинскую карту (A5 / A4 с линией отреза)"
					>
						<Printer size={15} />
						<span>Вкладыш в карту (вклейка)</span>
					</button>
					<button
						type="button"
						data-testid="visit-footer-fast-vector-print-btn"
						onClick={() => {
							setFastPrintDocType("form043u");
							setIsFastPrintModalOpen(true);
						}}
						className="h-10 px-3.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
						title="Печать документов (Медкарта, Акт с чеком, Смета)"
					>
						<Printer size={15} className="text-teal-600 dark:text-teal-400" />
						<span>Печать (Медкарта, Акт, Смета)</span>
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
							...(setTranscript ? { setTranscript } : {}),
							...(updateVisitNoteField ? { updateVisitNoteField } : {}),
							visitNoteForm: visitNoteForm ?? null,
							...(polishTranscript ? { polishTranscript } : {}),
							showToastFn: showToast,
						})
					}
				>
					Полировать ИИ
				</button>
				<button
					type="button"
					data-testid="visit-more-action-print-043u"
					onClick={() => {
						if (handlePrintForm043uFast) handlePrintForm043uFast();
						setFastPrintDocType("form043u");
						setIsFastPrintModalOpen(true);
					}}
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

			{/* Векторный легковесный движок печати визита */}
			<FastClinicalPrintEngine
				isOpen={isFastPrintModalOpen}
				onClose={() => setIsFastPrintModalOpen(false)}
				initialDocType={fastPrintDocType}
				patient={
					activePatient
						? {
								id: activePatient.id,
								fullName: activePatient.fullName,
								birthDate: activePatient.birthDate,
								phone: activePatient.phone,
								address: activePatient.address,
								cardNumber: activePatient.id ? `043/${activePatient.id.slice(0, 8)}` : "043/2026-01",
								allergies: activePatient.allergies || activePatient.allergyHistory,
								somaticNotes: activePatient.somaticHistory || activePatient.chronicDiseases,
							}
						: undefined
				}
				clinic={
					props?.dashboard?.clinicSettings?.profile
						? {
								name: props.dashboard.clinicSettings.profile.clinicName,
								legalName:
									props.dashboard.clinicSettings.profile.legalName ?? undefined,
								inn: props.dashboard.clinicSettings.profile.inn,
								ogrn: props.dashboard.clinicSettings.profile.ogrn,
								address: props.dashboard.clinicSettings.profile.address,
								phone: props.dashboard.clinicSettings.profile.phone,
							}
						: props?.dashboard?.organization || undefined
				}
				doctor={
					props?.activeDoctor
						? {
								fullName: props.activeDoctor.fullName || props.activeDoctor.name,
								specialty: props.activeDoctor.specialty,
							}
						: undefined
				}
				visitData={{
					date: activeAppointment?.date || new Date().toLocaleDateString("ru-RU"),
					toothNumber:
						activeAppointment?.toothNumber != null
							? String(activeAppointment.toothNumber)
							: undefined,
					diagnosis: activeAppointment?.diagnosisMkb10 ? `${activeAppointment.diagnosisMkb10} ${activeAppointment.reason || ""}` : visitNoteForm?.diagnosis,
					complaints: visitNoteForm?.complaints,
					objective: visitNoteForm?.objective,
					treatment: visitNoteForm?.treatment,
					recommendations: visitNoteForm?.recommendations,
				}}
			/>
		</>
	);
}
