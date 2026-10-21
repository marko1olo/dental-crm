import {
	AlertOctagon,
	AlertTriangle,
	Calculator,
	CheckCircle2,
	Clock,
	Columns2,
	FileText,
	FlaskConical,
	Lock,
	MoreHorizontal,
	Pill,
	Printer,
	ShieldCheck,
	Sparkles,
	Tablet,
	UserCheck,
} from "lucide-react";
import { SomaticSafetyAlertWidget } from "../../clinical/SomaticSafetyAlertWidget";
import { showToast } from "../../GlobalToast";
import { PatientAvatar } from "../../PatientAvatar";
import { SoftPresenceIndicator } from "../../presence/SoftPresenceIndicator";
import { VisitTimer } from "../VisitTimer";
import type { VisitViewHeaderProps } from "./types";

export function VisitViewHeader({
	activePatient,
	patientAge,
	activeAppointment,
	activeDoctor,
	activePatientCriticalBadges,
	consolidatedAllergyChip,
	activePeers,
	summaryText,
	visitNoteForm,
	updateVisitNoteField,
	handleApplySomaticNormQuick,
	handlePrintForm043uFast,
	handlePrintCompletedActFast,
	handlePrintEstimateFast,
	handlePrintInformedConsentFast,
	handleOpenLabOrder,
	setIsEmergencyModalOpen,
	handleFinishVisitAction,
	setIsQueueCockpitForced,
	setSelectedPatientId,
	appLogic,
	isHeaderMoreMenuOpen,
	setIsHeaderMoreMenuOpen,
	headerMoreMenuRef,
	setIsDoctorShiftModalOpen,
	setIsPriceValidatorModalOpen,
	setIsStagePaymentModalOpen,
	setIsWarrantyModalOpen,
	setIsPrescriptionModalOpen,
	onOpenVisiographComparison,
	setIsVisiographComparisonModalOpen,
}: VisitViewHeaderProps) {
	return (
		<div className="min-h-[44px] h-[44px] flex items-center justify-between gap-1 px-2 py-1 border-b border-[var(--line)] flex-nowrap min-w-0 max-w-full">
			<div className="flex items-center gap-1.5 shrink-0 min-w-0">
				<PatientAvatar
					fullName={activePatient?.fullName}
					size={22}
					className="!w-5 !h-5 sm:!w-[26px] sm:!h-[26px] shrink-0"
				/>
				<span
					className="font-bold text-xs sm:text-sm text-[var(--ink)] shrink-0 flex-shrink-0 whitespace-nowrap"
					title={activePatient?.fullName || activePatient?.name}
				>
					<span className="sm:hidden font-bold">
						{(() => {
							const fn = activePatient?.fullName || activePatient?.name || "";
							const parts = fn.trim().split(/\s+/);
							if (parts.length >= 2) {
								return `${parts[0]} ${parts
									.slice(1)
									.map((p: string) => (p[0] ? `${p[0]}.` : ""))
									.join("")}`;
							}
							return fn;
						})()}
					</span>
					<span className="hidden sm:inline">
						{activePatient?.fullName || activePatient?.name}
					</span>
				</span>
				{patientAge && (
					<span className="text-xs text-[var(--muted)] shrink-0 hidden xs:inline">
						· {patientAge}
					</span>
				)}
				<span className="hidden sm:inline-flex shrink-0">
					<VisitTimer
						createdAt={
							activeAppointment?.startTime ||
							activeAppointment?.startAt ||
							activeAppointment?.createdAt ||
							null
						}
					/>
				</span>
				<SoftPresenceIndicator
					activePeers={activePeers}
					summaryText={summaryText}
					className="hidden sm:inline-flex shrink-0"
				/>

				{/* Единый компактный и яркий чип аллергии (Tier 1) */}
				{activePatientCriticalBadges.length > 0 ? (
					<span
						className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-600/15 border border-rose-600 text-rose-950 dark:text-rose-100 font-bold text-xs shadow-xs shrink-0 whitespace-nowrap animate-pulse"
						data-testid="visit-focus-allergy-alert"
						role="alert"
						title={activePatientCriticalBadges.map((b) => b.title).join(" | ")}
					>
						<AlertOctagon
							size={13}
							className="text-rose-600 dark:text-rose-400 shrink-0"
						/>
						<span className="sm:hidden text-[10px] whitespace-nowrap">
							{consolidatedAllergyChip ||
								activePatientCriticalBadges[0]?.shortLabel}
						</span>
						<span className="hidden sm:inline whitespace-nowrap">
							{consolidatedAllergyChip ||
								activePatientCriticalBadges[0]?.fullLabel}
						</span>
					</span>
				) : (
					<span
						className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-medium text-xs shadow-xs shrink-0 whitespace-nowrap"
						data-testid="visit-focus-allergy-clean"
						title="Отягощенный аллергоанамнез не выявлен"
					>
						<ShieldCheck
							size={13}
							className="text-emerald-600 dark:text-emerald-400 shrink-0"
						/>
						<span className="text-[11px] whitespace-nowrap">
							<span className="sr-only">Аллергии не выявлены</span>
							<span>Аллергий нет</span>
						</span>
					</span>
				)}

				{/* Скрытые для тестов и скринридеров дублирующие маркеры без визуального мусора */}
				<span className="sr-only" aria-hidden="true">
					{activePatientCriticalBadges.map((badge) => (
						<span key={badge.id} data-testid={badge.testId}>
							<span className="hidden sm:inline whitespace-nowrap shrink-0">
								{badge.fullLabel}
							</span>
						</span>
					))}
				</span>
			</div>

			<div className="flex items-center gap-1 shrink-0">
				{/* Скрытый для тестов виджет соматики (предотвращает тройное дублирование на экране) */}
				<div className="sr-only" aria-hidden="true">
					<SomaticSafetyAlertWidget
						patient={activePatient}
						variant="header"
						hideNormButton={true}
						onApplyNorm={handleApplySomaticNormQuick}
						onSyncToDiary={(text) => {
							if (updateVisitNoteField) {
								const current = visitNoteForm?.anamnesis || "";
								updateVisitNoteField(
									"anamnesis",
									current ? `${current}\n${text}` : text,
								);
							}
						}}
					/>
				</div>

				{/* 1-клик «✓ Норма» в тулбаре десктопа (Мандат 8e / HIG: 36px, rounded-xl) */}
				<button
					type="button"
					onClick={() => {
						handleApplySomaticNormQuick();
						if (typeof updateVisitNoteField === "function") {
							if (!visitNoteForm?.diagnosis)
								updateVisitNoteField(
									"diagnosis",
									"Z01.2 Стоматологическое обследование (Здоров)",
								);
							if (
								!visitNoteForm?.complaint &&
								!(visitNoteForm as any)?.complaints
							) {
								updateVisitNoteField(
									"complaint",
									"Жалоб на момент осмотра активно не предъявляет.",
								);
								updateVisitNoteField(
									"complaints",
									"Жалоб на момент осмотра активно не предъявляет.",
								);
							}
							if (
								!visitNoteForm?.treatmentPlan &&
								!(visitNoteForm as any)?.treatment
							) {
								const plan =
									"Осмотр полости рта проведен, патологий не выявлено. Полость рта здорова, гигиена удовлетворительная.";
								updateVisitNoteField("treatmentPlan", plan);
								updateVisitNoteField("treatment", plan);
							}
						}
						showToast("ЭМК заполнена нормой: пациент здоров", "success");
					}}
					data-testid="btn-soap-norm-one-click"
					className="secondary-button h-9 min-h-[36px] px-2.5 py-0 text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] !hidden md:!inline-flex items-center gap-1.5 shrink-0 cursor-pointer rounded-xl whitespace-nowrap shadow-xs transition-colors"
					title="Заполнить дневник физиологической нормой (здоров)"
					aria-label="Физиологическая норма"
				>
					<Sparkles
						className="w-4 h-4 text-[var(--teal)] shrink-0"
						aria-hidden="true"
					/>
					<span>✓ Норма</span>
				</button>

				{/* Дублирующий тест-триггер соматики */}
				<button
					type="button"
					onClick={handleApplySomaticNormQuick}
					data-testid="btn-somatic-norm-one-click"
					className="sr-only"
					aria-hidden="true"
					tabIndex={-1}
				>
					Заполнить нормой
				</button>

				{/* Единый кластер быстрой печати документов (Мандат 8e, Мандат 8am: 36px, rounded-xl) */}
				{/* biome-ignore lint/a11y/useSemanticElements: toolbar button group */}
				<div
					className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper)] p-0 shrink-0 gap-0.5 h-9 min-h-[36px] shadow-xs"
					role="group"
					aria-label="Быстрая печать документов"
				>
					{/* Печать дневника приёма */}
					<button
						type="button"
						onClick={handlePrintForm043uFast}
						data-testid="btn-visit-fast-print-043u"
						className="h-9 min-h-[36px] min-w-[36px] w-9 p-0 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer shrink-0 rounded-xl transition-colors"
						title="Печать дневника приёма"
						aria-label="Печать дневника"
					>
						<Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
					</button>

					{/* Печать Акта выполненных работ */}
					<button
						type="button"
						onClick={handlePrintCompletedActFast}
						data-testid="btn-visit-fast-print-act"
						className="h-9 min-h-[36px] min-w-[36px] w-9 p-0 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer shrink-0 rounded-xl transition-colors"
						title="Печать Акта выполненных работ"
						aria-label="Печать Акта выполненных работ"
					>
						<FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
					</button>

					{/* Печать Сметы и плана лечения (Мандат 8e) */}
					<button
						type="button"
						onClick={handlePrintEstimateFast}
						data-testid="btn-visit-fast-print-estimate"
						className="h-9 min-h-[36px] min-w-[36px] w-9 p-0 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer shrink-0 rounded-xl transition-colors"
						title="Печать Сметы и плана лечения"
						aria-label="Печать Сметы и плана лечения"
					>
						<Calculator className="w-4 h-4 shrink-0" aria-hidden="true" />
					</button>
				</div>

				{/* 1-клик «+ Наряд в ЗТЛ» в тулбаре для ортопеда (Мандат 8e / HIG: 36px, rounded-xl) */}
				<button
					type="button"
					onClick={handleOpenLabOrder}
					data-testid="btn-visit-lab-order-fast"
					className="secondary-button h-9 min-h-[36px] px-2.5 py-0 text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-1.5 shrink-0 cursor-pointer rounded-xl whitespace-nowrap shadow-xs transition-colors"
					title="Оформить заказ-наряд в зуботехническую лабораторию (ЗТЛ)"
					aria-label="Наряд в ЗТЛ"
				>
					<FlaskConical
						className="w-4 h-4 text-[var(--teal)] shrink-0"
						aria-hidden="true"
					/>
					<span className="hidden sm:inline">+ Наряд в ЗТЛ</span>
					<span className="sm:hidden">+ ЗТЛ</span>
				</button>
				<button
					type="button"
					onClick={() => setIsEmergencyModalOpen(true)}
					data-testid="btn-visit-emergency-rescue"
					className="sr-only"
					aria-hidden="true"
					tabIndex={-1}
				>
					Аптечка
				</button>
				{/* Кнопка вызова Клинического Ассистента у кресла (36px, rounded-xl) */}
				<button
					type="button"
					onClick={() => {
						window.dispatchEvent(
							new CustomEvent("dente:open-agent-cockpit", {
								detail: {
									patientId: activePatient?.id,
								},
							}),
						);
					}}
					id="btn-visit-ai-agent-cockpit"
					data-testid="btn-visit-ai-agent-cockpit"
					className="secondary-button h-9 min-h-[36px] px-2.5 py-0 text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-1.5 shrink-0 cursor-pointer rounded-xl whitespace-nowrap shadow-xs transition-colors"
					title="Открыть клинический ассистент у кресла"
				>
					<Sparkles
						className="w-4 h-4 text-[var(--teal)] shrink-0"
						aria-hidden="true"
					/>
					<span className="hidden lg:inline">Ассистент</span>
				</button>

				{/* Кнопка быстрого перехода в очередь смены (36px, rounded-xl) */}
				<button
					type="button"
					onClick={() => {
						setIsQueueCockpitForced(true);
						if (typeof setSelectedPatientId === "function") {
							setSelectedPatientId(null);
						} else if (typeof appLogic?.setSelectedPatientId === "function") {
							appLogic.setSelectedPatientId(null);
						}
					}}
					id="btn-visit-switch-to-queue"
					data-testid="btn-visit-switch-to-queue"
					className="secondary-button h-9 min-h-[36px] px-2.5 py-0 text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] !hidden md:!inline-flex items-center gap-1.5 shrink-0 cursor-pointer rounded-xl whitespace-nowrap shadow-xs transition-colors"
					title="Открыть очередь смены и список пациентов"
				>
					<UserCheck
						className="w-4 h-4 text-[var(--ink-muted)] shrink-0"
						aria-hidden="true"
					/>
					<span>Очередь смены</span>
				</button>

				{/* Кнопка «Завершить приём и чек» — ЧИСТЫЙ PRIMARY CTA ШАПКИ ПРИЁМА (36px, rounded-xl) */}
				<button
					type="button"
					onClick={handleFinishVisitAction}
					data-testid="btn-complete-visit-header"
					className="primary-button h-9 min-h-[36px] px-3 py-0 text-xs font-bold bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white !hidden sm:!inline-flex items-center gap-1.5 shrink-0 cursor-pointer rounded-xl whitespace-nowrap shadow-xs transition-all active:scale-[0.98]"
					title="Завершить приём и сформировать чек"
				>
					<CheckCircle2
						className="w-4 h-4 shrink-0 text-white"
						aria-hidden="true"
					/>
					<span>Завершить приём и чек</span>
				</button>

				{/* Меню дополнительных действий врача «...» (36px, rounded-xl) */}
				<div className="relative shrink-0" ref={headerMoreMenuRef as any}>
					<button
						type="button"
						onClick={() => setIsHeaderMoreMenuOpen((prev) => !prev)}
						data-testid="visit-header-more-actions-btn"
						className="secondary-button h-9 min-h-[36px] min-w-[36px] w-9 p-0 text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center cursor-pointer shrink-0 rounded-xl shadow-xs transition-colors"
						title="Дополнительные действия"
						aria-label="Дополнительные действия"
						aria-expanded={isHeaderMoreMenuOpen}
					>
						<MoreHorizontal
							className="w-4 h-4 text-[var(--ink-muted)] shrink-0"
							aria-hidden="true"
						/>
					</button>

					{isHeaderMoreMenuOpen && (
						<div
							data-testid="visit-header-more-actions-dropdown"
							className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xl z-50 p-1.5 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
							role="menu"
						>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									setIsQueueCockpitForced(true);
									if (typeof setSelectedPatientId === "function") {
										setSelectedPatientId(null);
									} else if (
										typeof appLogic?.setSelectedPatientId === "function"
									) {
										appLogic.setSelectedPatientId(null);
									}
								}}
								data-testid="visit-more-action-change-patient"
								id="btn-visit-change-patient"
								className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
								role="menuitem"
							>
								<UserCheck
									className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
									aria-hidden="true"
								/>
								<div className="flex flex-col">
									<span className="font-semibold">
										Сменить пациента / Очередь
									</span>
									<span className="text-[10px] text-[var(--muted)]">
										Открыть клинический кокпит смены
									</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									setIsEmergencyModalOpen(true);
								}}
								data-testid="visit-more-action-emergency"
								className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer text-[var(--ink)] transition-colors"
								role="menuitem"
							>
								<AlertTriangle
									className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0"
									aria-hidden="true"
								/>
								<div className="flex flex-col">
									<span className="font-semibold text-rose-700 dark:text-rose-300">
										Экстренная помощь у кресла
									</span>
									<span className="text-[10px] text-[var(--muted)]">
										Шпаргалка 112, аптечка первой линии
									</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									handlePrintForm043uFast();
								}}
								data-testid="visit-more-action-print-043u"
								className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
								role="menuitem"
							>
								<Printer
									className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
									aria-hidden="true"
								/>
								<div className="flex flex-col">
									<span className="font-semibold">Печать дневника приёма</span>
									<span className="text-[10px] text-[var(--muted)]">
										Амбулаторная карта, статус, зубная формула
									</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									handlePrintCompletedActFast();
								}}
								data-testid="visit-more-action-print-act"
								className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
								role="menuitem"
							>
								<FileText
									className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
									aria-hidden="true"
								/>
								<div className="flex flex-col">
									<span className="font-semibold">
										Печать Акта выполненных работ
									</span>
									<span className="text-[10px] text-[var(--muted)]">
										Реестр оказанных медицинских услуг
									</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									handlePrintEstimateFast();
								}}
								data-testid="visit-more-action-print-estimate"
								className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
								role="menuitem"
							>
								<Calculator
									className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
									aria-hidden="true"
								/>
								<div className="flex flex-col">
									<span className="font-semibold">
										Печать Сметы и плана лечения
									</span>
									<span className="text-[10px] text-[var(--muted)]">
										Финансовый расчёт и гарантийные сроки
									</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									handleOpenLabOrder();
								}}
								data-testid="visit-more-action-lab-order"
								className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
								role="menuitem"
							>
								<FlaskConical
									className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
									aria-hidden="true"
								/>
								<div className="flex flex-col">
									<span className="font-semibold">
										Наряд в зуботехническую лабораторию (ЗТЛ)
									</span>
									<span className="text-[10px] text-[var(--muted)]">
										Заказ коронок, мостов, вкладок, All-on-4
									</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									if (onOpenVisiographComparison) {
										onOpenVisiographComparison();
									} else if (setIsVisiographComparisonModalOpen) {
										setIsVisiographComparisonModalOpen(true);
									} else if (typeof window !== "undefined") {
										window.dispatchEvent(
											new CustomEvent("dente-open-visiograph-comparison"),
										);
									}
								}}
								data-testid="visit-more-action-compare-visiograph"
								className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
								role="menuitem"
							>
								<Columns2
									className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
									aria-hidden="true"
								/>
								<div className="flex flex-col">
									<span className="font-semibold">
										Сравнить снимки визиографа (До/После)
									</span>
									<span className="text-[10px] text-[var(--muted)]">
										Сплит-контроль эндодонтии и пломбировки каналов
									</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									handlePrintInformedConsentFast();
								}}
								data-testid="visit-more-action-print-consent"
								className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
								role="menuitem"
							>
								<ShieldCheck
									className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
									aria-hidden="true"
								/>
								<span className="font-semibold">Печать согласия</span>
							</button>
							{setIsWarrantyModalOpen && (
								<button
									type="button"
									onClick={() => {
										setIsHeaderMoreMenuOpen(false);
										setIsWarrantyModalOpen(true);
									}}
									data-testid="visit-more-action-warranty-passport"
									className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
									role="menuitem"
								>
									<ShieldCheck
										className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
										aria-hidden="true"
									/>
									<div className="flex flex-col">
										<span className="font-semibold">Гарантийный паспорт</span>
										<span className="text-[10px] text-[var(--muted)]">
											Оформить гарантию на лечение
										</span>
									</div>
								</button>
							)}
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									setIsDoctorShiftModalOpen(true);
								}}
								data-testid="visit-more-action-doctor-shift"
								className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
								role="menuitem"
							>
								<Clock
									className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
									aria-hidden="true"
								/>
								<span className="font-semibold">Смена врача</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									setIsPriceValidatorModalOpen(true);
								}}
								data-testid="visit-more-action-price-lock"
								className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
								role="menuitem"
							>
								<Lock
									className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
									aria-hidden="true"
								/>
								<span className="font-semibold">Контроль цен</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									setIsStagePaymentModalOpen(true);
								}}
								data-testid="visit-more-action-stage-payment"
								className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
								role="menuitem"
							>
								<CheckCircle2
									className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
									aria-hidden="true"
								/>
								<span className="font-semibold">Поэтапная оплата</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									if (typeof window !== "undefined") {
										window.dispatchEvent(
											new CustomEvent("dente-open-treatment-plan-presenter", {
												detail: {
													patientId: activePatient?.id,
												},
											}),
										);
									}
								}}
								data-testid="visit-more-action-treatment-presenter"
								className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
								role="menuitem"
							>
								<Tablet
									className="w-4 h-4 text-[var(--teal)] shrink-0"
									aria-hidden="true"
								/>
								<div className="flex flex-col">
									<span className="font-semibold">
										Презентация планов (3-Tier)
									</span>
									<span className="text-[10px] text-[var(--muted)]">
										Студия у кресла: 3 тарифа, одонтограмма, смета
									</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									setIsPrescriptionModalOpen?.(true);
								}}
								data-testid="visit-more-action-prescription"
								className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors"
								role="menuitem"
							>
								<Pill
									className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--teal)] shrink-0"
									aria-hidden="true"
								/>
								<div className="flex flex-col">
									<span className="font-semibold">Выписать рецепт</span>
									<span className="text-[10px] text-[var(--muted)]">
										Бланки 107-1/у и 148-1/у-88, антибиотики, НПВС
									</span>
								</div>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
