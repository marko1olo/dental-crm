import { ClipboardCheck, CheckCircle2 } from "lucide-react";
import React from "react";
import { ClinicalRulePanel } from "../../ClinicalRulePanel";
import { LabOrdersPanel } from "../schedule/LabOrdersPanel";
import { GnathologyForm } from "./GnathologyForm";
import { VisitPrimaryActions } from "./VisitPrimaryActions";
import { VisitSafetyStrip } from "./VisitSafetyStrip";

export function VisitConclusionTab({
	isSignDialogOpen,
	setIsSignDialogOpen,
	isSigned,
	workspaceFlags,
	dashboard,
	activePatient,
	selectedProtocolTemplate,
	specialtyLabels,
	specialtiesWithTemplates,
	selectedSpecialty,
	setSelectedSpecialty,
	setSelectedProtocolId,
	imagingKindLabels,
	specialtyProtocolTemplates,
	applyProtocolTemplate,
	activeVisitClinicalRuleEvaluations,
	clinicalRuleActionLabels,
	serviceTitle,
	clinicalRuleSeverityLabels,
	staffRoleLabels,
	activeVisitClinicalRuleSummary,
	visitCloseChecklist,
	primaryVisitWarning,
	setActiveVisitTab,
}: any) {
	return (
		<div className="visit-conclusion-tab">
			<VisitPrimaryActions
				isSignDialogOpen={isSignDialogOpen}
				setIsSignDialogOpen={setIsSignDialogOpen}
				isSigned={isSigned}
			/>

			{workspaceFlags.hasEngineeringStatus && <VisitSafetyStrip />}

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
							? specialtyLabels[selectedProtocolTemplate.specialty]
							: dashboard.protocolTemplates?.length || 0}
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
					<span>{dashboard.protocolTemplates?.length || 0}</span>
				</div>
				<div className="specialty-strip">
					{specialtiesWithTemplates.map((specialty: any) => (
						<button
							className={selectedSpecialty === specialty ? "active" : ""}
							key={specialty}
							type="button"
							aria-pressed={selectedSpecialty === specialty}
							onClick={() => {
								setSelectedSpecialty(specialty);
								setSelectedProtocolId(null);
							}}
						>
							{specialtyLabels[specialty]}
						</button>
					))}
				</div>
				{selectedProtocolTemplate ? (
					<article className="protocol-card">
						<div>
							<strong>{selectedProtocolTemplate.title}</strong>
							<p>
								{selectedProtocolTemplate.defaultDurationMinutes} мин · снимки{" "}
								{selectedProtocolTemplate.suggestedImaging
									.map((kind: any) => imagingKindLabels[kind])
									.join(", ")}
							</p>
						</div>
						<div className="protocol-template-list">
							{specialtyProtocolTemplates.map((template: any) => (
								<button
									className={
										selectedProtocolTemplate.id === template.id ? "active" : ""
									}
									key={template.id}
									type="button"
									aria-pressed={selectedProtocolTemplate.id === template.id}
									onClick={() => setSelectedProtocolId(template.id)}
								>
									{template.visitReason}
								</button>
							))}
						</div>
						<ul>
							{selectedProtocolTemplate.safetyWarnings.map((warning: any) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
						<button
							className="secondary-button"
							type="button"
							onClick={() => applyProtocolTemplate(selectedProtocolTemplate)}
						>
							<ClipboardCheck aria-hidden="true" /> Заполнить диктовку
						</button>
					</article>
				) : null}
			</details>

			{workspaceFlags.hasClinicalRules && (
				<details className="clinical-rules-toggle">
					<summary>
						📋 Клинические рекомендации
						{activeVisitClinicalRuleEvaluations?.length
							? ` (${activeVisitClinicalRuleEvaluations.length})`
							: ""}
					</summary>
					<div style={{ marginTop: "1rem" }}>
						<ClinicalRulePanel
							actionLabels={clinicalRuleActionLabels}
							context="visit"
							evaluations={
								dashboard?.clinicSettings?.profile?.mode === "solo_doctor"
									? activeVisitClinicalRuleEvaluations.filter(
											(e: any) => e.ownerRole !== "assistant",
										)
									: activeVisitClinicalRuleEvaluations
							}
							serviceTitle={serviceTitle}
							severityLabels={clinicalRuleSeverityLabels}
							staffRoleLabels={staffRoleLabels}
							summary={activeVisitClinicalRuleSummary}
						/>
					</div>
				</details>
			)}

			{activePatient?.id && workspaceFlags.hasDentalLab && (
				<LabOrdersPanel patientId={activePatient.id} />
			)}

			{workspaceFlags.hasGnathology && (
				<GnathologyForm
					visitId={dashboard?.activeVisit?.id ?? null}
					patientId={activePatient?.id ?? null}
				/>
			)}

			{visitCloseChecklist ? (
				<div
					className="close-checklist"
					aria-label="Предупреждения перед закрытием приема"
				>
					<div className="close-checklist-head">
						<div>
							<h3>Закрытие приема</h3>
							<p>
								{primaryVisitWarning?.actionLabel ??
									visitCloseChecklist.nextAction}
							</p>
						</div>
						<span className={visitCloseChecklist.readyToSign ? "ready" : ""}>
							{visitCloseChecklist.readyToSign
								? "готово"
								: `${visitCloseChecklist.score}%`}
						</span>
					</div>
					{visitCloseChecklist.items
						.filter((task: any) =>
							dashboard?.clinicSettings?.profile?.mode === "solo_doctor"
								? task.ownerRole !== "assistant"
								: true,
						)
						.map((task: any) => (
							<button
								className={`close-task ${task.ready ? "done" : ""} ${task.blocking && !task.ready ? "blocking" : ""}`}
								key={task.id}
								type="button"
								onClick={() => {
									const section = task.section.replace("#", "");
									if (
										["diary", "odontogram", "diagnostics", "conclusion"].includes(
											section,
										)
									) {
										setActiveVisitTab(section);
									} else if (
										section === "dictation" ||
										section === "emk" ||
										section === "smart-preview"
									) {
										setActiveVisitTab("diary");
									}
									setTimeout(() => {
										const el = document.getElementById(section);
										if (el)
											el.scrollIntoView({
												behavior: "smooth",
												block: "start",
											});
									}, 50);
								}}
							>
								<CheckCircle2 aria-hidden="true" />
								<div>
									<strong>{task.title}</strong>
									<p>{task.detail}</p>
									<small>
										{staffRoleLabels[task.ownerRole]} · {task.actionLabel}
									</small>
								</div>
							</button>
						))}
				</div>
			) : null}
		</div>
	);
}
