import React from "react";
import {
	AlertOctagon,
	AlertTriangle,
	Calculator,
	Check,
	CheckCircle2,
	Clock,
	FileText,
	FlaskConical,
	Lock,
	MoreHorizontal,
	Printer,
	ShieldCheck,
} from "lucide-react";
import { useAppStore } from "../../../../store/appStore";
import { showToast } from "../../../GlobalToast";
import { VisitShiftQueueControls } from "./VisitTimerAndStatusControls";
import type { VisitActionButtonsToolbarProps } from "./types";

/**
 * Панель быстрых клинических действий врача:
 * 1-клик соматическая норма, кластер печати бланков, наряд ЗТЛ, аптечка анти-шок,
 * оперативная очередь смены StomX, сохранение/завершение приёма и расширенное меню «...»
 */
export function VisitActionButtonsToolbar({
	handleApplySomaticNormQuick,
	handlePrintForm043uFast,
	handlePrintCompletedActFast,
	handlePrintEstimateFast,
	onOpenLabOrderModal,
	setIsEmergencyModalOpen,
	shiftDayQueue,
	isQueueLobbyDropdownOpen,
	setIsQueueLobbyDropdownOpen,
	queueLobbyDropdownRef,
	flushPendingVisitSaves,
	handleFinishVisitAction,
	isHeaderMoreMenuOpen,
	setIsHeaderMoreMenuOpen,
	headerMoreMenuRef,
	handlePrintInformedConsentFast,
	setIsInformedConsentModalOpen,
	setIsWarrantyModalOpen,
	setIsDoctorShiftModalOpen,
	setIsPriceValidatorModalOpen,
	setIsStagePaymentModalOpen,
}: VisitActionButtonsToolbarProps) {
	return (
		<>
			{/* Кнопка физиологической нормы */}
			<button
				type="button"
				onClick={handleApplySomaticNormQuick}
				data-testid="btn-somatic-norm-one-click"
				data-tour="autonorm-btn"
				className="secondary-button h-7.5 min-h-[30px] sm:min-h-0 sm:h-7.5 px-2.5 py-0 text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-1 cursor-pointer transition-all shrink-0 rounded-lg shadow-2xs"
				title="Заполнить нормой"
				aria-label="Заполнить нормой"
			>
				<Check
					className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
					aria-hidden="true"
				/>
				<span className="hidden sm:inline">Заполнить нормой</span>
				<span className="sm:hidden">Норма</span>
			</button>

			{/* Единый кластер быстрой печати документов (Мандат 8e, Apple HIG) */}
			<div
				className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0 gap-0.5"
				role="group"
				aria-label="Быстрая печать документов"
			>
				{/* Печать дневника приёма */}
				<button
					type="button"
					onClick={handlePrintForm043uFast}
					data-testid="btn-visit-fast-print-043u"
					className="min-h-[28px] sm:min-h-[30px] h-7 sm:h-7.5 w-7 sm:w-7.5 p-0 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-[var(--paper-strong)] flex items-center justify-center cursor-pointer shrink-0 rounded-md transition-colors"
					title="Печать дневника приёма"
					aria-label="Печать дневника"
				>
					<Printer className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
				</button>

				{/* Печать Акта выполненных работ */}
				<button
					type="button"
					onClick={() => {
						if (typeof handlePrintCompletedActFast === "function") {
							handlePrintCompletedActFast();
						} else {
							showToast("Печать Акта выполненных работ", "info");
						}
					}}
					data-testid="btn-visit-fast-print-act"
					className="min-h-[28px] sm:min-h-[30px] h-7 sm:h-7.5 w-7 sm:w-7.5 p-0 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-[var(--paper-strong)] flex items-center justify-center cursor-pointer shrink-0 rounded-md transition-colors"
					title="Печать Акта выполненных работ"
					aria-label="Печать Акта выполненных работ"
				>
					<FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
				</button>

				{/* Печать Сметы и плана лечения (Мандат 8e) */}
				<button
					type="button"
					onClick={() => {
						if (typeof handlePrintEstimateFast === "function") {
							handlePrintEstimateFast();
						} else {
							showToast("Печать Сметы и плана лечения", "info");
						}
					}}
					data-testid="btn-visit-fast-print-estimate"
					className="min-h-[28px] sm:min-h-[30px] h-7 sm:h-7.5 w-7 sm:w-7.5 p-0 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-[var(--paper-strong)] flex items-center justify-center cursor-pointer shrink-0 rounded-md transition-colors"
					title="Печать Сметы и плана лечения"
					aria-label="Печать Сметы и плана лечения"
				>
					<Calculator className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden="true" />
				</button>
			</div>

			{/* Наряд ЗТЛ для ортопеда у кресла */}
			<button
				type="button"
				onClick={() => {
					if (typeof onOpenLabOrderModal === "function") {
						onOpenLabOrderModal();
					} else {
						useAppStore.getState().setCurrentView("lab");
						showToast("Открыт журнал ЗТЛ", "info");
					}
				}}
				data-testid="btn-visit-lab-order-fast"
				className="secondary-button h-7.5 min-h-[30px] sm:min-h-0 sm:h-7.5 px-2.5 py-0 text-[12.5px] font-semibold text-teal-700 dark:text-teal-300 border-teal-500/40 hover:bg-teal-50 dark:hover:bg-teal-950/30 flex items-center gap-1 cursor-pointer transition-all shrink-0 rounded-lg shadow-2xs"
				title="Наряд в зуботехническую лабораторию (ЗТЛ)"
				aria-label="Наряд в лабораторию ЗТЛ"
			>
				<FlaskConical
					className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0"
					aria-hidden="true"
				/>
				<span className="hidden sm:inline">Наряд ЗТЛ</span>
				<span className="sm:hidden">ЗТЛ</span>
			</button>

			{/* Экстренная помощь / Аптечка анти-шок (тихий служебный доступ) */}
			<button
				type="button"
				onClick={() => setIsEmergencyModalOpen(true)}
				data-testid="btn-visit-emergency-rescue"
				className="visit-emergency-rescue-quiet hidden 2xl:inline-flex secondary-button h-7.5 min-h-0 px-2.5 py-0 text-[12.5px] font-medium text-[var(--muted)] hover:text-rose-600 border-[var(--line-subtle)] hover:border-rose-300 items-center gap-1 cursor-pointer shrink-0 rounded-lg shadow-2xs"
				title="Экстренная помощь / Аптечка анти-шок (анафилаксия, коллапс, гипертонический криз)"
			>
				<AlertTriangle
					className="w-3.5 h-3.5 text-amber-500 shrink-0"
					aria-hidden="true"
				/>
				<span>Аптечка</span>
			</button>

			{/* 3-Стадийная оперативная очередь смены StomX */}
			<VisitShiftQueueControls
				shiftDayQueue={shiftDayQueue}
				isQueueLobbyDropdownOpen={isQueueLobbyDropdownOpen}
				setIsQueueLobbyDropdownOpen={setIsQueueLobbyDropdownOpen}
				queueLobbyDropdownRef={queueLobbyDropdownRef}
			/>

			{/* Кнопка «Сохранить» на мобильном в шапке */}
			<button
				type="button"
				onClick={async () => {
					if (typeof flushPendingVisitSaves === "function") {
						await flushPendingVisitSaves();
					}
					showToast("Изменения приёма сохранены", "success", 2000);
				}}
				data-testid="btn-save-visit-header-mobile"
				className="sm:hidden secondary-button min-h-[44px] sm:min-h-0 sm:h-7.5 px-3 py-0 text-[13px] font-semibold flex items-center gap-1 shrink-0 flex-shrink-0 cursor-pointer rounded-lg whitespace-nowrap h-11 sm:h-7.5 text-[var(--teal)] border-[var(--teal)]/40 hover:bg-[var(--teal-soft)] shadow-2xs"
				title="Сохранить изменения приёма"
			>
				<Check size={14} className="stroke-[3] shrink-0" />
				<span className="text-[13px] font-semibold whitespace-nowrap">
					Сохранить
				</span>
			</button>

			{/* Кнопка «Завершить приём» */}
			<button
				type="button"
				onClick={handleFinishVisitAction}
				data-testid="btn-complete-visit-header"
				className="primary-button min-h-[44px] sm:min-h-0 sm:h-7.5 px-3 sm:px-3.5 py-0 text-[13px] font-bold flex items-center gap-1 sm:gap-1.5 shrink-0 flex-shrink-0 cursor-pointer rounded-lg whitespace-nowrap h-11 sm:h-7.5 shadow-2xs"
				title="Завершить приём и сохранить все изменения"
			>
				<CheckCircle2 size={15} className="shrink-0" />
				<span className="hidden sm:inline whitespace-nowrap">
					Завершить приём
				</span>
				<span className="sm:hidden text-[13px] font-bold whitespace-nowrap">
					Завершить
				</span>
			</button>

			{/* Меню дополнительных действий врача «...» */}
			<div
				className="relative shrink-0"
				ref={headerMoreMenuRef as any}
			>
				<button
					type="button"
					onClick={() => setIsHeaderMoreMenuOpen((prev) => !prev)}
					data-testid="visit-header-more-actions-btn"
					className="secondary-button min-h-[44px] min-w-[44px] sm:min-h-7 sm:min-w-0 sm:h-7 px-2 sm:px-2 py-0 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer shrink-0 rounded-lg text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors h-11 sm:h-7 w-11 sm:w-auto"
					title="Дополнительные действия и бланки приема"
					aria-label="Дополнительные действия приема"
					aria-expanded={isHeaderMoreMenuOpen}
				>
					<MoreHorizontal size={16} className="shrink-0" />
				</button>

				{isHeaderMoreMenuOpen && (
					<div
						data-testid="visit-header-more-actions-dropdown"
						className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-[var(--line)] bg-[var(--paper-strong,var(--paper))] text-[var(--ink)] shadow-xl z-50 p-1.5 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
						role="menu"
					>
						<button
							type="button"
							onClick={() => {
								setIsHeaderMoreMenuOpen(false);
								if (typeof onOpenLabOrderModal === "function") {
									onOpenLabOrderModal();
								} else {
									useAppStore.getState().setCurrentView("lab");
									showToast("Открыт журнал ЗТЛ", "info");
								}
							}}
							data-testid="visit-more-action-lab-order"
							className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<FlaskConical
								size={14}
								className="text-teal-600 dark:text-teal-400 shrink-0"
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
								handlePrintForm043uFast();
							}}
							data-testid="visit-more-action-print-043u"
							className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<Printer
								size={14}
								className="text-sky-600 dark:text-sky-400 shrink-0"
							/>
							<div className="flex flex-col">
								<span className="font-semibold">Печать дневника</span>
								<span className="text-[10px] text-[var(--muted)]">
									С текущим штампом (черновик/подписано)
								</span>
							</div>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsHeaderMoreMenuOpen(false);
								if (typeof handlePrintCompletedActFast === "function") {
									handlePrintCompletedActFast();
								} else {
									showToast("Печать Акта выполненных работ", "info");
								}
							}}
							data-testid="visit-more-action-print-act"
							className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<FileText
								size={14}
								className="text-blue-600 dark:text-blue-400 shrink-0"
							/>
							<div className="flex flex-col">
								<span className="font-semibold">Печать Акта выполненных работ</span>
								<span className="text-[10px] text-[var(--muted)]">
									Реестр оказанных медицинских услуг
								</span>
							</div>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsHeaderMoreMenuOpen(false);
								if (typeof handlePrintEstimateFast === "function") {
									handlePrintEstimateFast();
								} else {
									showToast("Печать Сметы и плана лечения", "info");
								}
							}}
							data-testid="visit-more-action-print-estimate"
							className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<Calculator
								size={14}
								className="text-violet-600 dark:text-violet-400 shrink-0"
							/>
							<div className="flex flex-col">
								<span className="font-semibold">Печать Сметы и плана лечения</span>
								<span className="text-[10px] text-[var(--muted)]">
									Финансовый расчёт и гарантийные сроки
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
							className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<ShieldCheck
								size={14}
								className="text-emerald-600 dark:text-emerald-400 shrink-0"
							/>
							<div className="flex flex-col">
								<span className="font-semibold">
									Печать согласия (ИДС)
								</span>
								<span className="text-[10px] text-[var(--muted)]">
									С текущим штампом (черновик/подписано)
								</span>
							</div>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsHeaderMoreMenuOpen(false);
								setIsInformedConsentModalOpen(true);
							}}
							data-testid="visit-more-action-consent-modal"
							className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<ShieldCheck
								size={14}
								className="text-emerald-600 dark:text-emerald-400 shrink-0"
							/>
							<div className="flex flex-col">
								<span className="font-semibold">Выбрать бланк ИДС</span>
								<span className="text-[10px] text-[var(--muted)]">
									Терапия, хирургия, ортопедия, КТ
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
							className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<AlertOctagon
								size={14}
								className="text-rose-600 dark:text-rose-400 shrink-0"
							/>
							<div className="flex flex-col">
								<span className="font-semibold text-rose-700 dark:text-rose-300">
									Аптечка анти-шок
								</span>
								<span className="text-[10px] text-[var(--muted)]">
									Анафилаксия, коллапс, протокол СМП
								</span>
							</div>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsHeaderMoreMenuOpen(false);
								setIsWarrantyModalOpen(true);
							}}
							data-testid="visit-more-action-warranty-passport"
							className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<ShieldCheck
								size={14}
								className="text-emerald-600 dark:text-emerald-400 shrink-0"
							/>
							<div className="flex flex-col">
								<span className="font-semibold">Гарантийный паспорт</span>
								<span className="text-[10px] text-[var(--muted)]">
									Оформить гарантию на лечение
								</span>
							</div>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsHeaderMoreMenuOpen(false);
								setIsDoctorShiftModalOpen(true);
							}}
							data-testid="visit-more-action-doctor-shift"
							className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<Clock
								size={14}
								className="text-indigo-600 dark:text-indigo-400 shrink-0"
							/>
							<div className="flex flex-col">
								<span className="font-semibold">Смена врача</span>
								<span className="text-[10px] text-[var(--muted)]">
									Мобильный пульт, пациенты и тайминг
								</span>
							</div>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsHeaderMoreMenuOpen(false);
								setIsPriceValidatorModalOpen(true);
							}}
							data-testid="visit-more-action-price-lock"
							className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<ShieldCheck
								size={14}
								className="text-amber-600 dark:text-amber-400 shrink-0"
							/>
							<div className="flex flex-col">
								<span className="font-semibold">
									Контроль цен (Price Lock)
								</span>
								<span className="text-[10px] text-[var(--muted)]">
									Сверка сметы, фиксация и наряды ЗТЛ
								</span>
							</div>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsHeaderMoreMenuOpen(false);
								setIsStagePaymentModalOpen(true);
							}}
							data-testid="visit-more-action-stage-payment"
							className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<Lock
								size={14}
								className="text-emerald-600 dark:text-emerald-400 shrink-0"
							/>
							<div className="flex flex-col">
								<span className="font-semibold">
									График оплаты и этапы
								</span>
								<span className="text-[10px] text-[var(--muted)]">
									Рассрочка и депонирование этапов
								</span>
							</div>
						</button>
					</div>
				)}
			</div>
		</>
	);
}
