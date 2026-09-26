import React from "react";
import { CheckCircle2, Clock, Lock, ShieldCheck } from "lucide-react";
import { ClinicalAiPersonalizePanel } from "../../../ClinicalAiPersonalizePanel";
import { ClinicalTasksPanel } from "../../../ClinicalTasksPanel";
import { ClinicalRulePanel as DefaultClinicalRulePanel } from "../../../ClinicalRulePanel";
import { VisitNoteDraftPanel } from "../../../VisitNoteDraftPanel";

export interface VisitSecondaryPanelsInnerProps {
	// biome-ignore lint/suspicious/noExplicitAny: props
	selectedProtocolTemplate: any;
	safeSpecialtyLabels?: Record<string, string> | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: props
	dashboard: any;
	specialtiesWithTemplates?: string[] | undefined;
	selectedSpecialty?: string | undefined;
	setSelectedSpecialty?: ((s: string) => void) | undefined;
	setSelectedProtocolId?: ((id: string | null) => void) | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: props
	specialtyProtocolTemplates?: any[] | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: props
	applyProtocolTemplate?: ((t: any) => void) | undefined;
	activeWorkspaceRole?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: props
	activeVisitClinicalRuleEvaluations?: any[] | undefined;
	clinicalRuleActionLabels?: Record<string, string> | undefined;
	clinicalRuleSeverityLabels?: Record<string, string> | undefined;
	staffRoleLabels?: Record<string, string> | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: props
	activeVisitClinicalRuleSummary?: any | undefined;
	serviceTitle?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: props
	activePatient: any;
	// biome-ignore lint/suspicious/noExplicitAny: props
	activeDoctor: any;
	// biome-ignore lint/suspicious/noExplicitAny: props
	activeAppointment: any;
	// biome-ignore lint/suspicious/noExplicitAny: props
	visitNoteForm: any;
	// biome-ignore lint/suspicious/noExplicitAny: props
	draft: any;
	isTreatmentPlanExpiredSoft: boolean;
	treatmentPlanAgeDays: number;
	setIsPriceValidatorModalOpen: (v: boolean) => void;
	setIsStagePaymentModalOpen: (v: boolean) => void;
	transcript: string;
	setVisitNoteForm: React.Dispatch<React.SetStateAction<any>>;
	// biome-ignore lint/suspicious/noExplicitAny: props
	visitCloseChecklist?: any[] | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: props
	openCloseChecklistSection?: ((task: any) => void) | undefined;
}

export function VisitSecondaryPanelsInner({
	selectedProtocolTemplate,
	safeSpecialtyLabels = {},
	dashboard,
	specialtiesWithTemplates,
	selectedSpecialty,
	setSelectedSpecialty,
	setSelectedProtocolId,
	specialtyProtocolTemplates,
	applyProtocolTemplate,
	activeWorkspaceRole,
	activeVisitClinicalRuleEvaluations,
	clinicalRuleActionLabels,
	clinicalRuleSeverityLabels,
	staffRoleLabels,
	activeVisitClinicalRuleSummary,
	serviceTitle,
	activePatient,
	activeDoctor,
	activeAppointment,
	visitNoteForm,
	draft,
	isTreatmentPlanExpiredSoft,
	treatmentPlanAgeDays,
	setIsPriceValidatorModalOpen,
	setIsStagePaymentModalOpen,
	transcript,
	setVisitNoteForm,
	visitCloseChecklist,
	openCloseChecklistSection = () => {},
}: VisitSecondaryPanelsInnerProps) {
	return (
		<>
			<details
				className="protocol-library"
				aria-label="Шаблоны приема по специальности"
			>
				<summary className="protocol-summary">
					<div>
						<h3>Шаблон приема</h3>
						<p>
							{selectedProtocolTemplate?.title ??
								"Выберите специальность и шаблон"}
						</p>
					</div>
					<span>
						{selectedProtocolTemplate
							? safeSpecialtyLabels[selectedProtocolTemplate.specialty] ||
								selectedProtocolTemplate.specialty
							: dashboard?.protocolTemplates?.length ?? 0}
					</span>
				</summary>
				<div className="protocol-head">
					<div>
						<h3>Шаблон приема</h3>
						<p>
							Выбор специальности меняет протокол, снимки, документы и
							предупреждения.
						</p>
					</div>
					<span>{dashboard?.protocolTemplates?.length ?? 0}</span>
				</div>
				<div className="specialty-strip flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
					{(specialtiesWithTemplates || []).map((specialty: any) => (
						<button
							className={`min-h-[44px] px-3 py-2 shrink-0 ${selectedSpecialty === specialty ? "active" : ""}`}
							key={specialty}
							type="button"
							aria-pressed={selectedSpecialty === specialty}
							onClick={() => {
								if (setSelectedSpecialty) setSelectedSpecialty(specialty);
								if (setSelectedProtocolId) setSelectedProtocolId(null);
							}}
						>
							{safeSpecialtyLabels[specialty] || specialty}
						</button>
					))}
				</div>
				<div className="protocol-list">
					{(specialtyProtocolTemplates || []).map((template: any) => (
						<button
							className={`protocol-card min-h-[44px] px-3 py-2 ${selectedProtocolTemplate?.id === template.id ? "active" : ""}`}
							key={template.id}
							type="button"
							onClick={() => applyProtocolTemplate?.(template)}
						>
							<div className="protocol-card-head">
								<strong>{template.title}</strong>
								<span>
									{safeSpecialtyLabels[template.specialty] ||
										template.specialty}
								</span>
							</div>
							<p>{template.summary}</p>
							<div className="protocol-tags">
								<span>{template.primaryComplaint}</span>
								<span>{template.diagnosisICD}</span>
							</div>
						</button>
					))}
				</div>
			</details>

			<div className="clinical-rule-panel" aria-label="Клинические правила">
				<DefaultClinicalRulePanel
					context="visit"
					actionLabels={clinicalRuleActionLabels as any}
					evaluations={
						activeWorkspaceRole === "doctor"
							? (activeVisitClinicalRuleEvaluations || []).filter(
									(e: any) => e.ownerRole !== "assistant",
								)
							: activeVisitClinicalRuleEvaluations || []
					}
					patientId={
						(typeof activePatient?.id === "string" && activePatient.id) ||
						(typeof dashboard?.activeVisit?.patientId === "string" &&
							dashboard.activeVisit.patientId) ||
						null
					}
					serviceTitle={typeof serviceTitle === "function" ? serviceTitle : (id: string) => String(id)}
					severityLabels={clinicalRuleSeverityLabels as any}
					staffRoleLabels={staffRoleLabels as any}
					summary={activeVisitClinicalRuleSummary}
				/>
			</div>

			{activePatient?.id ? (
				<ClinicalTasksPanel
					patientId={activePatient.id}
					assignedDoctorId={
						(typeof activeDoctor?.id === "string" && activeDoctor.id) ||
						(typeof activeDoctor?.userId === "string" && activeDoctor.userId) ||
						null
					}
					treatmentPlanId={
						(typeof activePatient?.activeTreatmentPlanId === "string" &&
							activePatient.activeTreatmentPlanId) ||
						(typeof activeAppointment?.treatmentPlanId === "string" &&
							activeAppointment.treatmentPlanId) ||
						null
					}
				/>
			) : null}

			<ClinicalAiPersonalizePanel
				context="visit"
				patientId={
					(typeof activePatient?.id === "string" && activePatient.id) ||
					(typeof dashboard?.activeVisit?.patientId === "string" &&
						dashboard.activeVisit.patientId) ||
					null
				}
				doctorFullName={
					(typeof activeDoctor?.fullName === "string" &&
						activeDoctor.fullName) ||
					(typeof activeDoctor?.name === "string" && activeDoctor.name) ||
					null
				}
				complaint={
					(typeof visitNoteForm?.complaint === "string" &&
						visitNoteForm.complaint) ||
					(typeof draft?.complaint === "string" && draft.complaint) ||
					null
				}
				diagnosis={
					(typeof visitNoteForm?.diagnosis === "string" &&
						visitNoteForm.diagnosis) ||
					(typeof draft?.diagnosis === "string" && draft.diagnosis) ||
					null
				}
				treatmentPlanText={
					(typeof visitNoteForm?.treatmentPlan === "string" &&
						visitNoteForm.treatmentPlan) ||
					(typeof draft?.treatmentPlan === "string" && draft.treatmentPlan) ||
					null
				}
			/>

			{/* Финансовый аудит и валидация цен плана лечения */}
			<section
				className="treatment-plan-validation-panel"
				data-testid="treatment-plan-price-validator-section"
				aria-label="Финансовый аудит и фиксация цен плана лечения"
				style={{
					margin: "1rem 0",
					padding: "1rem",
					borderRadius: "12px",
					border: "1px solid var(--line, #e2e8f0)",
					backgroundColor: "var(--paper, #ffffff)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						flexWrap: "wrap",
						gap: "0.75rem",
					}}
				>
					<div>
						<div
							style={{
								fontSize: "0.95rem",
								fontWeight: 700,
								color: "var(--ink, #0f172a)",
							}}
						>
							План лечения & Контроль цен прайса
						</div>
						<div
							style={{
								fontSize: "0.8rem",
								color: "var(--muted, #64748b)",
							}}
						>
							Сверка позиций с каталогом услуг, фиксация гарантийной сметы и
							формирование наряда/акта
						</div>
						{isTreatmentPlanExpiredSoft && (
							<div
								className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold mt-1"
								data-testid="visit-plan-expired-soft-notice"
								title="План составлен более 30 дней назад. Оказание услуг, создание нарядов ЗТЛ и оплата разрешены без ограничений (Мандат 8e)"
							>
								<Clock
									size={13}
									className="text-amber-600 dark:text-amber-400 shrink-0"
								/>
								<span>
									План составлен более 30 дней назад ({treatmentPlanAgeDays}{" "}
									дн.). Цены могут быть скорректированы, наряды ЗТЛ и оплата не
									блокируются.
								</span>
							</div>
						)}
					</div>

					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							alignItems: "center",
							gap: "0.5rem",
						}}
					>
						<button
							type="button"
							data-testid="price-validator-trigger-btn"
							className="primary-button min-h-[44px] px-3.5 py-2 inline-flex items-center gap-2"
							style={{
								backgroundColor: "var(--teal-fill, var(--teal))",
								color: "var(--on-teal, #ffffff)",
								fontWeight: 600,
								fontSize: "0.85rem",
								borderRadius: "8px",
								cursor: "pointer",
							}}
							onClick={() => setIsPriceValidatorModalOpen(true)}
							title="Проверить актуальность цен прайса / Price Lock"
						>
							<ShieldCheck size={16} />
							<span>Проверить актуальность цен прайса / Price Lock</span>
						</button>

						<button
							type="button"
							data-testid="stage-payment-trigger-btn"
							className="secondary-button min-h-[44px] px-3 py-2 inline-flex items-center gap-2"
							style={{
								fontSize: "0.85rem",
								borderRadius: "8px",
								cursor: "pointer",
							}}
							onClick={() => setIsStagePaymentModalOpen(true)}
							title="График оплаты и этапы (Escrow / Рассрочка)"
						>
							<Lock size={15} />
							<span>График этапов</span>
						</button>
					</div>
				</div>
			</section>

			{activePatient?.id ? (
				<div className="mt-4" data-testid="visit-note-draft-mount">
					<VisitNoteDraftPanel
						patientId={activePatient.id}
						initialTranscript={transcript}
						onApply={(draft) => {
							if (draft) {
								setVisitNoteForm((prev: any) => ({
									...prev,
									complaint: draft.complaint ?? prev.complaint,
									anamnesis: draft.anamnesis ?? prev.anamnesis,
									objectiveStatus: draft.objectiveStatus ?? prev.objectiveStatus,
									diagnosis: draft.diagnosis ?? prev.diagnosis,
									treatmentPlan: draft.treatmentPlan ?? prev.treatmentPlan,
								}));
							}
						}}
					/>
				</div>
			) : null}

			{Array.isArray(visitCloseChecklist) && visitCloseChecklist.length > 0 ? (
				<section className="close-checklist" aria-label="Чек-лист закрытия приема">
					{(visitCloseChecklist || [])
						.filter((task: any) =>
							dashboard?.clinicSettings?.profile?.mode === "solo_doctor"
								? task.ownerRole !== "assistant"
								: true,
						)
						.map((task: any) => (
							<button
								className={`close-task min-h-[44px] px-3 py-2 min-w-0 ${task.ready ? "done" : ""} ${task.blocking && !task.ready ? "blocking" : ""}`}
								key={task.id}
								type="button"
								onClick={() => openCloseChecklistSection(task)}
							>
								<CheckCircle2 aria-hidden="true" className="shrink-0" />
								<div className="min-w-0">
									<strong className="break-words leading-tight">
										{task.title}
									</strong>
									<p className="break-words leading-tight">{task.detail}</p>
									<small className="break-words leading-tight">
										{staffRoleLabels?.[task.ownerRole] || "исполнитель не указан"}{" "}
										· {task.actionLabel}
									</small>
								</div>
							</button>
						))}
				</section>
			) : null}
		</>
	);
}
