import React from "react";
import { Check } from "lucide-react";
import { showToast } from "../../../GlobalToast";
import {
	EmkSoapVisibilityTracker,
	EmkObjectiveStatusSection,
	EmkEndoSection,
	EmkPerioSection,
	EmkDiaryProtocolSection,
	appendClinicalText,
} from "../../emk";
import { EmkComplaintsAndAnamnesisSection } from "../../emkTabModules/EmkComplaintsAndAnamnesisSection";
import { EmkDiagnosisAndProtocolSection } from "../../emkTabModules/EmkDiagnosisAndProtocolSection";
import { ClinicalQuickPresetsBar } from "../../ClinicalQuickPresetsBar";
import { VisitDiaryAnesthesiaBar } from "../../diary/VisitDiaryAnesthesiaBar";
import { postQuickCarpuleWriteoff } from "../../../anesthesia/anesthesiaQuickBar/anesthesiaApiPersistence";
import { OrthopedicsChairsidePanel } from "../../../orthopedics/OrthopedicsChairsidePanel";
import { VisitEmkServicesBilling } from "../VisitEmkServicesBilling";
import type { VisitEmkInteractiveStageProps } from "./visitEmkCanvasTypes";

export function VisitEmkInteractiveStage({
	activeEmkTab,
	visitNoteForm,
	updateVisitNoteField,
	isLocked,
	effectiveActiveTooth,
	activePatient,
	dashboard,
	openVisitId,
	setIsSoapTemplatesModalOpen,
	onApplySoapPreset,
	activeToothEndoSnapshot,
	handleContinueEndoStage,
}: VisitEmkInteractiveStageProps) {
	if (activeEmkTab === "all") {
		return (
			<div className="space-y-2.5 w-full min-w-0">
				{/* Экспресс-панель клинических категорий и протоколов СтАР */}
				<ClinicalQuickPresetsBar
					onSelectPreset={(preset, targetTooth) => {
						if (onApplySoapPreset) {
							onApplySoapPreset(preset, targetTooth);
						}
					}}
					isLocked={isLocked}
					activeTooth={effectiveActiveTooth}
					onOpenTemplatesModal={() => setIsSoapTemplatesModalOpen(true)}
				/>

				{/* Компактный трекер статуса Form 043/u (SOAP Visibility Tracker) */}
				<EmkSoapVisibilityTracker
					visitNoteForm={visitNoteForm}
					activeTooth={effectiveActiveTooth}
					endoSnapshot={activeToothEndoSnapshot}
					onContinueEndoStage={handleContinueEndoStage}
				/>

				<EmkComplaintsAndAnamnesisSection
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					isLocked={isLocked}
				/>

				<EmkObjectiveStatusSection
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					isLocked={isLocked}
					activeTooth={effectiveActiveTooth}
				/>

				<EmkDiagnosisAndProtocolSection
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					isLocked={isLocked}
					activeTooth={effectiveActiveTooth}
					onOpenTemplatesModal={() => setIsSoapTemplatesModalOpen(true)}
				/>

				<VisitDiaryAnesthesiaBar
					fieldsDisabled={isLocked}
					activePatient={activePatient}
					diary={visitNoteForm as any}
					doctorName={dashboard?.activeDoctor?.fullName || "Лечащий врач"}
					isLocked={isLocked}
					isRevising={Boolean(visitNoteForm?.isRevising)}
					beginRevise={() => {
						updateVisitNoteField("isRevising", true);
					}}
					applyAnesthesiaPreset={(preset) => {
						const curr = visitNoteForm?.treatmentPlan || "";
						updateVisitNoteField(
							"treatmentPlan",
							appendClinicalText(curr, preset, "\n\n"),
						);
					}}
					onDisposalCarpules={(count, drugId) => {
						void postQuickCarpuleWriteoff({
							visitId: openVisitId,
							patientId: activePatient?.id,
							count,
							drugId: typeof drugId === "string" ? drugId : undefined,
						});
					}}
					patientId={activePatient?.id}
					visitId={openVisitId}
				/>

				<EmkEndoSection
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					isLocked={isLocked}
					activeTooth={effectiveActiveTooth}
				/>

				<EmkPerioSection
					visitNoteForm={visitNoteForm as any}
					updateVisitNoteField={updateVisitNoteField}
					isLocked={isLocked}
					activeTooth={effectiveActiveTooth}
					patientId={activePatient?.id}
					patientName={activePatient?.fullName}
				/>

				<VisitEmkServicesBilling
					openVisitId={openVisitId}
					visitNoteForm={visitNoteForm}
					updateVisitNoteField={updateVisitNoteField}
					isLocked={isLocked}
					activePatient={activePatient}
					dashboard={dashboard}
					effectiveActiveTooth={effectiveActiveTooth}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 w-full min-w-0">
			{/* Фокусный режим: Жалобы & Анамнез */}
			{(activeEmkTab === "complaints" ||
				activeEmkTab === "complaint" ||
				activeEmkTab === "anamnesis") && (
				<div className="space-y-3 w-full min-w-0">
					<div className="sm:hidden mobile-protocol-card">
						<div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
							<div className="text-xs font-bold text-[var(--ink)]">Шаг 1 из 4: Жалобы и анамнез</div>
							<span className="text-[10px] text-[var(--muted)] font-medium">SOAP: Subjective</span>
						</div>
						<button
							type="button"
							onClick={() => {
								updateVisitNoteField("complaint", "Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).");
								updateVisitNoteField("anamnesis", "Соматически здоров. Аллергоанамнез не отягощен.");
								showToast("Норма жалоб и анамнеза заполнена", "success", 2000);
							}}
							className="mobile-norm-action-btn mb-2"
							data-testid="btn-mobile-norm-step1"
						>
							<Check size={16} />
							<span>Норма: Жалоб нет, соматически здоров</span>
						</button>
						<div className="horizontal-chip-scroller mb-1">
							{[
								"Острая зубная боль",
								"Реакция на холодное/горячее",
								"Ноющая ночная боль",
								"Выпала пломба",
								"Скол зуба",
								"Кровоточивость дёсен",
								"Плановый осмотр",
							].map((phrase) => (
								<button
									key={phrase}
									type="button"
									onClick={() => {
										updateVisitNoteField("complaint", appendClinicalText(visitNoteForm?.complaint || "", phrase, ", "));
									}}
									className="mobile-phrase-chip"
								>
									+ {phrase}
								</button>
							))}
						</div>
					</div>
					<EmkComplaintsAndAnamnesisSection
						visitNoteForm={visitNoteForm}
						updateVisitNoteField={updateVisitNoteField}
						isLocked={isLocked}
					/>
				</div>
			)}

			{/* Фокусный режим: Осмотр & Зубная формула */}
			{(activeEmkTab === "objectiveStatus" ||
				activeEmkTab === "status" ||
				activeEmkTab === "objective") && (
				<div className="space-y-4 w-full min-w-0">
					<div className="sm:hidden mobile-protocol-card">
						<div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
							<div className="text-xs font-bold text-[var(--ink)]">Шаг 2 из 4: Осмотр и статус</div>
							<span className="text-[10px] text-[var(--muted)] font-medium">SOAP: Objective</span>
						</div>
						<button
							type="button"
							onClick={() => {
								updateVisitNoteField("objectiveStatus", "Слизистая оболочка полости рта бледно-розовая, влажная. Зондирование безболезненно. Зубной ряд интактен.");
								showToast("Норма осмотра заполнена", "success", 2000);
							}}
							className="mobile-norm-action-btn mb-2"
							data-testid="btn-mobile-norm-step2"
						>
							<Check size={16} />
							<span>Норма: Слизистая розовая, КПУ норма</span>
						</button>
						<div className="horizontal-chip-scroller mb-1">
							{[
								"Слизистая б/о, розовая",
								"Кариозная полость",
								"Зондирование болезненно",
								"Перкуссия отрицательна",
								"Зубной налёт и камень",
								"Десна гиперемирована",
							].map((phrase) => (
								<button
									key={phrase}
									type="button"
									onClick={() => {
										updateVisitNoteField("objectiveStatus", appendClinicalText(visitNoteForm?.objectiveStatus || "", phrase, ", "));
									}}
									className="mobile-phrase-chip"
								>
									+ {phrase}
								</button>
							))}
						</div>
					</div>
					<EmkObjectiveStatusSection
						visitNoteForm={visitNoteForm}
						updateVisitNoteField={updateVisitNoteField}
						isLocked={isLocked}
						activeTooth={effectiveActiveTooth}
					/>
					<EmkEndoSection
						visitNoteForm={visitNoteForm}
						updateVisitNoteField={updateVisitNoteField}
						isLocked={isLocked}
						activeTooth={effectiveActiveTooth}
					/>
					<EmkPerioSection
						visitNoteForm={visitNoteForm as any}
						updateVisitNoteField={updateVisitNoteField}
						isLocked={isLocked}
						activeTooth={effectiveActiveTooth}
						patientId={activePatient?.id}
						patientName={activePatient?.fullName}
					/>
				</div>
			)}

			{/* Фокусный режим: Пародонтология и гигиена */}
			{(activeEmkTab === "perio" ||
				activeEmkTab === "hygiene" ||
				activeEmkTab === "periodontics") && (
				<div className="space-y-4 w-full min-w-0">
					<EmkPerioSection
						visitNoteForm={visitNoteForm as any}
						updateVisitNoteField={updateVisitNoteField}
						isLocked={isLocked}
						activeTooth={effectiveActiveTooth}
						patientId={activePatient?.id}
						patientName={activePatient?.fullName}
					/>
				</div>
			)}

			{/* Фокусный режим: Диагноз & Протокол */}
			{(activeEmkTab === "diary" ||
				activeEmkTab === "diagnosis" ||
				activeEmkTab === "treatmentPlan" ||
				activeEmkTab === "protocol") && (
				<div className="space-y-4 w-full min-w-0">
					{activeEmkTab === "diagnosis" && (
						<div className="sm:hidden mobile-protocol-card">
							<div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
								<div className="text-xs font-bold text-[var(--ink)]">Шаг 3 из 4: Клинический диагноз</div>
								<span className="text-[10px] text-[var(--muted)] font-medium">SOAP: Assessment</span>
							</div>
							<button
								type="button"
								onClick={() => {
									updateVisitNoteField("diagnosis", "Z01.2 Стоматологическое обследование (Здоров)");
									showToast("Диагноз нормы установлен", "success", 2000);
								}}
								className="mobile-norm-action-btn mb-2"
								data-testid="btn-mobile-norm-step3"
							>
								<Check size={16} />
								<span>Норма: Стоматологический осмотр</span>
							</button>
							<div className="horizontal-chip-scroller mb-1">
								{[
									"K02.1 Кариес дентина",
									"K02.0 Кариес эмали",
									"K04.0 Пульпит",
									"K04.4 Периодонтит",
									"K05.1 Гингивит",
									"K05.3 Пародонтит",
									"Z01.2 Здоров",
								].map((diag) => (
									<button
										key={diag}
										type="button"
										onClick={() => {
											updateVisitNoteField("diagnosis", diag);
										}}
										className="mobile-phrase-chip"
									>
										{diag}
									</button>
								))}
							</div>
						</div>
					)}

					{(activeEmkTab === "treatmentPlan" || activeEmkTab === "protocol" || activeEmkTab === "diary") && (
						<div className="sm:hidden mobile-protocol-card">
							<div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
								<div className="text-xs font-bold text-[var(--ink)]">Шаг 4 из 4: Лечение и протокол</div>
								<span className="text-[10px] text-[var(--muted)] font-medium">SOAP: Plan</span>
							</div>
							<button
								type="button"
								onClick={() => {
									updateVisitNoteField("treatmentPlan", "Проведена профессиональная гигиена и профилактика полости рта. Обучение гигиене.");
									updateVisitNoteField("recommendations", "Плановый профилактический осмотр через 6 месяцев.");
									showToast("Норма лечения и рекомендаций заполнена", "success", 2000);
								}}
								className="mobile-norm-action-btn mb-2"
								data-testid="btn-mobile-norm-step4"
							>
								<Check size={16} />
								<span>Норма: Профосмотр, профгигиена</span>
							</button>
							<div className="horizontal-chip-scroller mb-1">
								{[
									"Анестезия Артикаин 1.8 мл",
									"Препарирование полости",
									"Изоляция коффердамом",
									"Пломба световой композит",
									"Шлифовка и полировка",
									"Щадящая диета 24 ч",
								].map((item) => (
									<button
										key={item}
										type="button"
										onClick={() => {
											updateVisitNoteField("treatmentPlan", appendClinicalText(visitNoteForm?.treatmentPlan || "", item, ", "));
										}}
										className="mobile-phrase-chip"
									>
										+ {item}
									</button>
								))}
							</div>
						</div>
					)}
					<EmkDiagnosisAndProtocolSection
						visitNoteForm={visitNoteForm}
						updateVisitNoteField={updateVisitNoteField}
						isLocked={isLocked}
						activeTooth={effectiveActiveTooth}
						onOpenTemplatesModal={() => setIsSoapTemplatesModalOpen(true)}
					/>
					{activeEmkTab === "treatmentPlan" && (
						<>
							<VisitDiaryAnesthesiaBar
								fieldsDisabled={isLocked}
								activePatient={activePatient}
								diary={visitNoteForm as any}
								doctorName={dashboard?.activeDoctor?.fullName || "Лечащий врач"}
								isLocked={isLocked}
								isRevising={Boolean(visitNoteForm?.isRevising)}
								beginRevise={() => {
									updateVisitNoteField("isRevising", true);
								}}
								applyAnesthesiaPreset={(preset) => {
									const curr = visitNoteForm?.treatmentPlan || "";
									updateVisitNoteField(
										"treatmentPlan",
										appendClinicalText(curr, preset, "\n\n"),
									);
								}}
								onDisposalCarpules={(count, drugId) => {
									void postQuickCarpuleWriteoff({
										visitId: openVisitId,
										patientId: activePatient?.id,
										count,
										drugId: typeof drugId === "string" ? drugId : undefined,
									});
								}}
								patientId={activePatient?.id}
								visitId={openVisitId}
							/>
							<VisitEmkServicesBilling
								openVisitId={openVisitId}
								visitNoteForm={visitNoteForm}
								updateVisitNoteField={updateVisitNoteField}
								isLocked={isLocked}
								activePatient={activePatient}
								dashboard={dashboard}
								effectiveActiveTooth={effectiveActiveTooth}
							/>
						</>
					)}
				</div>
			)}

			{/* Фокусный режим: Ортопедия и ЗТЛ наряд у кресла */}
			{(activeEmkTab === "ortho" || activeEmkTab === "orthopedics") && (
				<div className="space-y-4 w-full min-w-0">
					<OrthopedicsChairsidePanel
						activeToothFdi={effectiveActiveTooth || 16}
						selectedTeeth={[effectiveActiveTooth || 16]}
						patientId={activePatient?.id}
						isLocked={isLocked}
					/>
				</div>
			)}

			{/* Фокусный режим: Рекомендации */}
			{activeEmkTab === "recommendations" && (
				<div className="space-y-4 w-full min-w-0">
					<EmkDiaryProtocolSection
						visitNoteForm={visitNoteForm}
						updateVisitNoteField={updateVisitNoteField}
						isLocked={isLocked}
						activeTooth={effectiveActiveTooth}
						onOpenTemplatesModal={() => setIsSoapTemplatesModalOpen(true)}
					/>
				</div>
			)}
		</div>
	);
}
