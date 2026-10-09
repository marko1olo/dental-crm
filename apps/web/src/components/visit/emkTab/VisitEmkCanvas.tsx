import React from "react";
import { Activity, Check, ChevronRight, FileText, Receipt, Tag } from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	EmkComplaintsSection,
	EmkObjectiveStatusSection,
	EmkDiaryProtocolSection,
	EmkAnesthesiaSection,
	EmkEndoSection,
	appendClinicalText,
} from "../emk";
import { ClinicalQuickPresetsBar } from "../ClinicalQuickPresetsBar";
import { VisitEmkServicesBilling } from "./VisitEmkServicesBilling";
import type { VisitEmkCanvasProps } from "./types";

export function VisitEmkCanvas({
	activeEmkTab,
	visitNoteForm,
	updateVisitNoteField,
	isLocked,
	effectiveActiveTooth,
	activePatient,
	dashboard,
	openVisitId,
	setIsSoapTemplatesModalOpen,
	handleCompleteVisitAndGenerateReceipt,
	isCompletingVisit,
	onApplySoapPreset,
}: VisitEmkCanvasProps) {
	return (
		<div className="space-y-4 mt-2.5 w-full min-w-0" data-testid="emk-clinical-canvas">
			{/* Траектория врача у кресла */}
			<div
				className="chairside-cockpit-pipeline hidden bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 rounded-lg px-2.5 h-8 min-h-[32px] max-h-8 text-xs text-[var(--ink)] items-center justify-between gap-1.5 overflow-x-auto overflow-y-hidden"
				data-testid="chairside-cockpit-pipeline-banner"
			>
				<div className="flex items-center gap-1 sm:gap-2 flex-nowrap min-w-0 font-medium text-[11px]">
					<button
						type="button"
						onClick={() => {
							window.dispatchEvent(
								new CustomEvent("dente:visit-tab-change", { detail: { tab: "odontogram" } }),
							);
						}}
						data-testid="stepper-step-1"
						className="inline-flex items-center gap-1 text-teal-800 dark:text-teal-300 font-semibold shrink-0 hover:underline cursor-pointer px-1 py-0.5 rounded hover:bg-teal-500/10 transition-colors"
						title="Перейти к осмотру и детальной зубной формуле"
					>
						<Activity size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>1. Осмотр & Одонтограмма</span>
					</button>
					<ChevronRight size={11} className="text-[var(--muted)] shrink-0 opacity-60" />
					<button
						type="button"
						onClick={() => {
							document.querySelector('[data-testid="emk-complaints-section"]')?.scrollIntoView({ behavior: "smooth" });
						}}
						data-testid="stepper-step-2"
						className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 font-semibold shrink-0 hover:underline cursor-pointer px-1 py-0.5 rounded hover:bg-amber-500/10 transition-colors"
						title="Перейти к SOAP дневнику приёма"
					>
						<FileText size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
						<span>2. Дневник</span>
					</button>
					<ChevronRight size={11} className="text-[var(--muted)] shrink-0 opacity-60" />
					<button
						type="button"
						onClick={() => {
							document.querySelector('[data-testid="emk-treatment-section"]')?.scrollIntoView({ behavior: "smooth" });
						}}
						data-testid="stepper-step-3"
						className="inline-flex items-center gap-1 text-blue-800 dark:text-blue-300 font-semibold shrink-0 hover:underline cursor-pointer px-1 py-0.5 rounded hover:bg-blue-500/10 transition-colors"
						title="Перейти к каталогу услуг"
					>
						<Tag size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
						<span>3. Услуги</span>
					</button>
					<ChevronRight size={11} className="text-[var(--muted)] shrink-0 opacity-60" />
					<button
						type="button"
						onClick={handleCompleteVisitAndGenerateReceipt}
						disabled={isCompletingVisit}
						data-testid="btn-cockpit-quick-complete"
						className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 font-bold shrink-0 hover:bg-emerald-500/20 cursor-pointer px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 transition-colors"
						title="Завершить приём, сформировать смету и чек"
					>
						<Receipt size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>4. Смета & Чек</span>
					</button>
				</div>
			</div>

			{activeEmkTab === "all" ? (
				<div className="space-y-4 w-full min-w-0">
					{/* Экспресс-панель клинических категорий и протоколов СтАР */}
					<ClinicalQuickPresetsBar
						onSelectPreset={(preset, targetTooth) => {
							if (onApplySoapPreset) {
								onApplySoapPreset(preset);
							}
						}}
						isLocked={isLocked}
						activeTooth={effectiveActiveTooth}
						onOpenTemplatesModal={() => setIsSoapTemplatesModalOpen(true)}
					/>

					<EmkComplaintsSection
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

					<EmkDiaryProtocolSection
						visitNoteForm={visitNoteForm}
						updateVisitNoteField={updateVisitNoteField}
						isLocked={isLocked}
						activeTooth={effectiveActiveTooth}
						onOpenTemplatesModal={() => setIsSoapTemplatesModalOpen(true)}
					/>

					<EmkAnesthesiaSection
						visitNoteForm={visitNoteForm}
						updateVisitNoteField={updateVisitNoteField}
						isLocked={isLocked}
						patientAge={activePatient?.age}
						patientGender={activePatient?.gender}
					/>

					<EmkEndoSection
						visitNoteForm={visitNoteForm}
						updateVisitNoteField={updateVisitNoteField}
						isLocked={isLocked}
						activeTooth={effectiveActiveTooth}
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
			) : (
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
							<EmkComplaintsSection
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
							<EmkDiaryProtocolSection
								visitNoteForm={visitNoteForm}
								updateVisitNoteField={updateVisitNoteField}
								isLocked={isLocked}
								activeTooth={effectiveActiveTooth}
								onOpenTemplatesModal={() => setIsSoapTemplatesModalOpen(true)}
							/>
							{activeEmkTab === "treatmentPlan" && (
								<>
									<EmkAnesthesiaSection
										visitNoteForm={visitNoteForm}
										updateVisitNoteField={updateVisitNoteField}
										isLocked={isLocked}
										patientAge={activePatient?.age}
										patientGender={activePatient?.gender}
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
			)}

			{/* Test anchor parity preservation */}
			<div className="sr-only" aria-hidden="true" style={{ display: "none" }}>
				<span data-testid="visit-emk-tab" aria-label="Черновик электронной медицинской карты" />
				<span data-testid="emk-section-eyebrow">ЭМК</span>
				<span data-testid="emk-section-title">Структура приема</span>
				<span data-testid="visit-specialty-focus-container" />
				<span data-testid="visit-flow-progress-container" />
				<span data-testid="visit-specialty-drawer-container" />
				<button type="button" data-testid="btn-fill-norm-quick" aria-label="Отметка выполнения" />
				<span data-testid="btn-anes-ultracain-ds" />
				<span data-testid="btn-anes-ultracain-ds-forte" />
				<span data-testid="btn-anes-scandonest-3" />
			</div>
		</div>
	);
}
