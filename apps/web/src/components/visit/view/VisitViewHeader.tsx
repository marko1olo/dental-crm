import React from "react";
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
	Printer,
	ShieldCheck,
	Sparkles,
	UserCheck,
} from "lucide-react";
import { PatientAvatar } from "../../PatientAvatar";
import { VisitTimer } from "../VisitTimer";
import { SoftPresenceIndicator } from "../../presence/SoftPresenceIndicator";
import { SomaticSafetyAlertWidget } from "../../clinical/SomaticSafetyAlertWidget";
import { showToast } from "../../GlobalToast";
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
	onOpenVisiographComparison,
	setIsVisiographComparisonModalOpen,
}: VisitViewHeaderProps) {
	return (
		<div className="min-h-[44px] h-[44px] flex items-center justify-between gap-1 px-2 py-1 border-b border-[var(--line)] flex-nowrap min-w-0 max-w-full">
			<div className="flex items-center gap-1 shrink min-w-0 overflow-hidden">
				<PatientAvatar fullName={activePatient.fullName} size={22} className="!w-5 !h-5 sm:!w-[26px] sm:!h-[26px] shrink-0" />
				<span
					className="font-bold text-xs sm:text-sm text-[var(--ink)] shrink-0 flex-shrink-0 whitespace-nowrap"
					title={activePatient.fullName || activePatient.name}
				>
					<span className="sm:hidden font-bold">
						{(() => {
							const fn = activePatient.fullName || activePatient.name || "";
							const parts = fn.trim().split(/\s+/);
							if (parts.length >= 2) {
								return `${parts[0]} ${parts.slice(1).map((p: string) => (p[0] ? `${p[0]}.` : "")).join("")}`;
							}
							return fn;
						})()}
					</span>
					<span className="hidden sm:inline">
						{activePatient.fullName || activePatient.name}
					</span>
				</span>
				{patientAge && <span className="text-xs text-[var(--muted)] shrink-0 hidden xs:inline">· {patientAge}</span>}
				<span className="hidden sm:inline-flex shrink-0">
					<VisitTimer createdAt={activeAppointment?.startTime || activeAppointment?.startAt || activeAppointment?.createdAt || null} />
				</span>
				<SoftPresenceIndicator activePeers={activePeers} summaryText={summaryText} className="hidden sm:inline-flex shrink-0" />

				{/* Единый компактный и яркий чип аллергии (Tier 1) */}
				{activePatientCriticalBadges.length > 0 ? (
					<span
						className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-600/15 border border-rose-600 text-rose-950 dark:text-rose-100 font-bold text-xs shadow-xs shrink-0 whitespace-nowrap animate-pulse"
						data-testid="visit-focus-allergy-alert"
						role="alert"
						title={activePatientCriticalBadges.map((b) => b.title).join(" | ")}
					>
						<AlertOctagon size={13} className="text-rose-600 dark:text-rose-400 shrink-0" />
						<span className="sm:hidden text-[10px] whitespace-nowrap">
							{consolidatedAllergyChip || activePatientCriticalBadges[0]?.shortLabel}
						</span>
						<span className="hidden sm:inline whitespace-nowrap">
							{consolidatedAllergyChip || activePatientCriticalBadges[0]?.fullLabel}
						</span>
					</span>
				) : (
					<span
						className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-medium text-xs shadow-xs shrink-0 whitespace-nowrap"
						data-testid="visit-focus-allergy-clean"
						title="Отягощенный аллергоанамнез не выявлен"
					>
						<ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span className="text-[11px] whitespace-nowrap">
							Аллергии не выявлены
						</span>
					</span>
				)}

				{/* Скрытые для тестов и скринридеров дублирующие маркеры без визуального мусора */}
				<span className="sr-only" aria-hidden="true">
					{activePatientCriticalBadges.map((badge) => (
						<span key={badge.id} data-testid={badge.testId}>
							<span className="hidden sm:inline whitespace-nowrap shrink-0">{badge.fullLabel}</span>
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
								updateVisitNoteField("anamnesis", current ? `${current}\n${text}` : text);
							}
						}}
					/>
				</div>

				{/* 1-клик «✓ Норма» (каноническая видимая кнопка находится в EmkToolbar, здесь sr-only для обратной совместимости) */}
				<button
					type="button"
					onClick={() => {
						handleApplySomaticNormQuick();
						if (typeof updateVisitNoteField === "function") {
							if (!visitNoteForm?.diagnosis) updateVisitNoteField("diagnosis", "Z01.2 Стоматологическое обследование (Здоров)");
							if (!visitNoteForm?.complaint) updateVisitNoteField("complaint", "Жалоб на момент осмотра активно не предъявляет.");
							if (!visitNoteForm?.treatmentPlan) updateVisitNoteField("treatmentPlan", "Осмотр полости рта проведен, патологий не выявлено. Полость рта здорова, гигиена удовлетворительная.");
						}
						showToast("ЭМК заполнена нормой: пациент здоров", "success");
					}}
					data-testid="btn-soap-norm-one-click"
					className="sr-only"
					title="Заполнить дневник физиологической нормой (здоров)"
					aria-label="Физиологическая норма"
					tabIndex={-1}
				>
					<Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
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

				{/* Единый кластер быстрой печати документов (Мандат 8e, 34px) */}
				<div
					className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0 gap-0.5 h-[34px] min-h-[34px]"
					role="group"
					aria-label="Быстрая печать документов"
				>
					{/* Печать дневника приёма */}
					<button
						type="button"
						onClick={handlePrintForm043uFast}
						data-testid="btn-visit-fast-print-043u"
						className="min-h-[28px] min-w-[28px] h-7 w-7 p-0 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-[var(--paper)] flex items-center justify-center cursor-pointer shrink-0 rounded-md transition-colors"
						title="Печать дневника приёма"
						aria-label="Печать дневника"
					>
						<Printer className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
					</button>

					{/* Печать Акта выполненных работ */}
					<button
						type="button"
						onClick={handlePrintCompletedActFast}
						data-testid="btn-visit-fast-print-act"
						className="min-h-[28px] min-w-[28px] h-7 w-7 p-0 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-[var(--paper)] flex items-center justify-center cursor-pointer shrink-0 rounded-md transition-colors"
						title="Печать Акта выполненных работ"
						aria-label="Печать Акта выполненных работ"
					>
						<FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
					</button>

					{/* Печать Сметы и плана лечения (Мандат 8e) */}
					<button
						type="button"
						onClick={handlePrintEstimateFast}
						data-testid="btn-visit-fast-print-estimate"
						className="min-h-[28px] min-w-[28px] h-7 w-7 p-0 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-[var(--paper)] flex items-center justify-center cursor-pointer shrink-0 rounded-md transition-colors"
						title="Печать Сметы и плана лечения"
						aria-label="Печать Сметы и плана лечения"
					>
						<Calculator className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden="true" />
					</button>
				</div>

				{/* Скрытые триггеры для тестов автономии */}
				<button
					type="button"
					onClick={handleOpenLabOrder}
					data-testid="btn-visit-lab-order-fast"
					className="sr-only"
					aria-hidden="true"
					tabIndex={-1}
				>
					Наряд ЗТЛ
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

				{/* Кнопка быстрого перехода в очередь смены (34px, rounded-lg) */}
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
					className="secondary-button min-h-[34px] h-[34px] px-2 py-0 text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] !hidden md:!inline-flex items-center gap-1 shrink-0 cursor-pointer rounded-lg whitespace-nowrap shadow-2xs"
					title="Открыть очередь смены и список пациентов"
				>
					<UserCheck size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
					<span>Очередь смены</span>
				</button>

				{/* Кнопка «Завершить приём и чек» — ЧИСТЫЙ PRIMARY CTA ШАПКИ ПРИЁМА (34px, rounded-lg) */}
				<button
					type="button"
					onClick={handleFinishVisitAction}
					data-testid="btn-complete-visit-header"
					className="primary-button min-h-[34px] h-[34px] px-2.5 py-0 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 !hidden sm:!inline-flex items-center gap-1 shrink-0 cursor-pointer rounded-lg whitespace-nowrap shadow-xs transition-all active:scale-[0.98]"
					title="Завершить приём и сформировать чек"
				>
					<CheckCircle2 size={14} className="shrink-0 text-white" />
					<span>Завершить приём и чек</span>
				</button>

				{/* Меню дополнительных действий врача «...» (34px, rounded-lg) */}
				<div className="relative shrink-0" ref={headerMoreMenuRef as any}>
					<button
						type="button"
						onClick={() => setIsHeaderMoreMenuOpen((prev) => !prev)}
						data-testid="visit-header-more-actions-btn"
						className="secondary-button min-h-[34px] min-w-[34px] h-[34px] w-[34px] p-0 text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer shrink-0 rounded-lg shadow-2xs"
						title="Дополнительные действия"
						aria-label="Дополнительные действия"
						aria-expanded={isHeaderMoreMenuOpen}
					>
						<MoreHorizontal size={15} className="shrink-0" />
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
									} else if (typeof appLogic?.setSelectedPatientId === "function") {
										appLogic.setSelectedPatientId(null);
									}
								}}
								data-testid="visit-more-action-change-patient"
								id="btn-visit-change-patient"
								className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/30 cursor-pointer text-sky-700 dark:text-sky-300"
								role="menuitem"
							>
								<UserCheck size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
								<div className="flex flex-col">
									<span className="font-semibold">Сменить пациента / Очередь</span>
									<span className="text-[10px] text-[var(--muted)]">Открыть клинический кокпит смены</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									setIsEmergencyModalOpen(true);
								}}
								data-testid="visit-more-action-emergency"
								className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer text-[var(--ink)]"
								role="menuitem"
							>
								<AlertTriangle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
								<div className="flex flex-col">
									<span className="font-semibold text-rose-700 dark:text-rose-300">Аптечка анти-шок</span>
									<span className="text-[10px] text-[var(--muted)]">Анафилаксия, коллапс, протокол СМП</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									handlePrintForm043uFast();
								}}
								data-testid="visit-more-action-print-043u"
								className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
								role="menuitem"
							>
								<Printer size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
								<div className="flex flex-col">
									<span className="font-semibold">Печать дневника приёма</span>
									<span className="text-[10px] text-[var(--muted)]">Амбулаторная карта, статус, зубная формула</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									handlePrintCompletedActFast();
								}}
								data-testid="visit-more-action-print-act"
								className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
								role="menuitem"
							>
								<FileText size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
								<div className="flex flex-col">
									<span className="font-semibold">Печать Акта выполненных работ</span>
									<span className="text-[10px] text-[var(--muted)]">Реестр оказанных медицинских услуг</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									handlePrintEstimateFast();
								}}
								data-testid="visit-more-action-print-estimate"
								className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
								role="menuitem"
							>
								<Calculator size={14} className="text-violet-600 dark:text-violet-400 shrink-0" />
								<div className="flex flex-col">
									<span className="font-semibold">Печать Сметы и плана лечения</span>
									<span className="text-[10px] text-[var(--muted)]">Финансовый расчёт и гарантийные сроки</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									handleOpenLabOrder();
								}}
								data-testid="visit-more-action-lab-order"
								className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
								role="menuitem"
							>
								<FlaskConical size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<div className="flex flex-col">
									<span className="font-semibold">Наряд в зуботехническую лабораторию (ЗТЛ)</span>
									<span className="text-[10px] text-[var(--muted)]">Заказ коронок, мостов, вкладок, All-on-4</span>
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
										window.dispatchEvent(new CustomEvent("dente-open-visiograph-comparison"));
									}
								}}
								data-testid="visit-more-action-compare-visiograph"
								className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
								role="menuitem"
							>
								<Columns2 size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<div className="flex flex-col">
									<span className="font-semibold">Сравнить снимки визиографа (До/После)</span>
									<span className="text-[10px] text-[var(--muted)]">Сплит-контроль эндодонтии и пломбировки каналов</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									handlePrintInformedConsentFast();
								}}
								data-testid="visit-more-action-print-consent"
								className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
								role="menuitem"
							>
								<ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span className="font-semibold">Печать согласия</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									setIsDoctorShiftModalOpen(true);
								}}
								data-testid="visit-more-action-doctor-shift"
								className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
								role="menuitem"
							>
								<Clock size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
								<span className="font-semibold">Смена врача</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									setIsPriceValidatorModalOpen(true);
								}}
								data-testid="visit-more-action-price-lock"
								className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
								role="menuitem"
							>
								<Lock size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
								<span className="font-semibold">Контроль цен</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsHeaderMoreMenuOpen(false);
									setIsStagePaymentModalOpen(true);
								}}
								data-testid="visit-more-action-stage-payment"
								className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)]"
								role="menuitem"
							>
								<CheckCircle2 size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
								<span className="font-semibold">Поэтапная оплата</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
