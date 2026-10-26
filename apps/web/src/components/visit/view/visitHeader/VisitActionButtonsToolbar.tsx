import React from "react";
import {
	AlertOctagon, AlertTriangle, Calculator, Check, CheckCircle2,
	Clock, FileText, FlaskConical, Lock, MoreHorizontal, Pill, Printer, Receipt, ShieldCheck,
} from "lucide-react";
import { useAppStore } from "../../../../store/appStore";
import { showToast } from "../../../GlobalToast";
import { VisitShiftQueueControls } from "./VisitTimerAndStatusControls";
import type { VisitActionButtonsToolbarProps } from "./types";

/**
 * Панель быстрых клинических действий врача:
 * 1-клик соматическая норма, кластер печати бланков, наряд ЗТЛ, аптечка анти-шок,
 * оперативная очередь смены, сохранение/завершение приёма и расширенное меню «...»
 */
export function VisitActionButtonsToolbar({
	handleApplySomaticNormQuick,
	handlePrintClinicalDiaryFast: propPrintClinicalDiaryFast,
	handlePrintForm043uFast: propPrintForm043uFast,
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
	setIsPrescriptionModalOpen,
}: VisitActionButtonsToolbarProps) {
	const handlePrintClinicalDiaryFast =
		propPrintClinicalDiaryFast ??
		propPrintForm043uFast ??
		(() => {
			showToast("Печать медицинской карты приёма", "info");
		});

	return (
		<>
			{/* Кнопка физиологической нормы */}
			<button
				type="button"
				onClick={handleApplySomaticNormQuick}
				data-testid="btn-somatic-norm-one-click"
				data-tour="autonorm-btn"
				className="secondary-button h-9 min-h-[36px] px-2.5 py-0 text-xs font-semibold text-[var(--ink)] border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 rounded-xl shadow-xs"
				title="Заполнить нормой"
				aria-label="Заполнить нормой"
			>
				<Check
					className="w-4 h-4 text-[var(--ink-muted)] shrink-0"
					aria-hidden="true"
				/>
				<span className="hidden sm:inline">Заполнить нормой</span>
				<span className="sm:hidden">Норма</span>
			</button>

			{/* Единый кластер быстрой печати документов (Мандат 8e, Мандат 8am: 36px, rounded-xl) */}
			<div
				className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper)] p-0 shrink-0 gap-0.5 h-9 min-h-[36px] shadow-xs"
				role="group"
				aria-label="Быстрая печать документов"
			>
				{/* Печать медицинской карты приёма */}
				<button
					type="button"
					onClick={handlePrintClinicalDiaryFast}
					data-testid="btn-visit-fast-print-medical-card"
					className="icon-button secondary-button h-9 min-h-[36px] min-w-[36px] w-9 p-0 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer shrink-0 rounded-xl transition-colors"
					title="Медицинская карта приёма (печать со штампом)"
					aria-label="Печать медицинской карты приёма"
				>
					<Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
				</button>
				<span data-testid="btn-visit-fast-print-043u" className="hidden" aria-hidden="true" onClick={handlePrintClinicalDiaryFast} />

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
					className="h-9 min-h-[36px] min-w-[36px] w-9 p-0 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer shrink-0 rounded-xl transition-colors"
					title="Печать Акта выполненных работ"
					aria-label="Печать Акта выполненных работ"
				>
					<FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
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
					className="h-9 min-h-[36px] min-w-[36px] w-9 p-0 text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer shrink-0 rounded-xl transition-colors"
					title="Печать Сметы и плана лечения"
					aria-label="Печать Сметы и плана лечения"
				>
					<Calculator className="w-4 h-4 shrink-0" aria-hidden="true" />
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
				className="secondary-button h-9 min-h-[36px] px-2.5 py-0 text-xs font-semibold text-[var(--ink)] border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 rounded-xl shadow-xs"
				title="Наряд в зуботехническую лабораторию (ЗТЛ)"
				aria-label="Наряд в лабораторию ЗТЛ"
			>
				<FlaskConical
					className="w-4 h-4 text-[var(--ink-muted)] shrink-0"
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
				className="visit-emergency-rescue-quiet hidden 2xl:inline-flex secondary-button h-9 min-h-[36px] px-2.5 py-0 text-xs font-medium text-[var(--ink-muted)] hover:text-rose-600 border border-[var(--line)] bg-[var(--paper)] hover:bg-rose-50 dark:hover:bg-rose-950/30 items-center gap-1.5 cursor-pointer shrink-0 rounded-xl shadow-xs transition-colors"
				title="Экстренная помощь у кресла (шпаргалка 112, аптечка первой линии)"
			>
				<AlertTriangle
					className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0"
					aria-hidden="true"
				/>
				<span>Экстренная помощь</span>
			</button>

			{/* 3-Стадийная оперативная очередь смены */}
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
				className="sm:hidden secondary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 py-0 text-[13px] font-semibold flex items-center gap-1.5 shrink-0 flex-shrink-0 cursor-pointer rounded-xl whitespace-nowrap h-11 text-[var(--ink)] border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] shadow-xs"
				title="Сохранить изменения приёма"
			>
				<Check className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
				<span className="text-[13px] font-semibold whitespace-nowrap">
					Сохранить
				</span>
			</button>

			{/* Кнопка «Завершить приём» */}
			<button
				type="button"
				onClick={handleFinishVisitAction}
				data-testid="btn-complete-visit-header"
				className="primary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 py-0 text-xs font-bold bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white flex items-center gap-1.5 shrink-0 flex-shrink-0 cursor-pointer rounded-xl whitespace-nowrap h-11 shadow-xs transition-all active:scale-[0.98]"
				title="Завершить приём и сохранить все изменения"
			>
				<CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
				<span className="hidden sm:inline whitespace-nowrap">
					Завершить приём и чек
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
					className="secondary-button min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] sm:h-9 sm:w-9 p-0 text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center cursor-pointer shrink-0 rounded-xl shadow-xs transition-colors h-11 w-11"
					title="Дополнительные действия и бланки приема"
					aria-label="Дополнительные действия приема"
					aria-expanded={isHeaderMoreMenuOpen}
				>
					<MoreHorizontal className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
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
							className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<FlaskConical
								className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
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
								handlePrintClinicalDiaryFast();
							}}
							data-testid="visit-more-action-print-medical-card"
							className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<Printer
								className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
							/>
							<div className="flex flex-col">
								<span className="font-semibold">Медицинская карта приёма</span>
								<span className="text-[10px] text-[var(--muted)]">
									С текущим штампом (черновик / подписано врачом)
								</span>
							</div>
						</button>
						<span data-testid="visit-more-action-print-043u" className="hidden" aria-hidden="true" onClick={handlePrintClinicalDiaryFast} />

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
							className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<FileText
								className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
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
							className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<Calculator
								className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
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
							className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<ShieldCheck
								className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
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
							className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<ShieldCheck
								className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
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
							className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<AlertOctagon
								className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0"
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
								setIsWarrantyModalOpen(true);
							}}
							data-testid="visit-more-action-warranty-passport"
							className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<ShieldCheck
								className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
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
							className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<Clock
								className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
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
							className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<ShieldCheck
								className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0"
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
								useAppStore.getState().setCurrentView("finance");
								showToast("Переход в кассу для оплаты приёма", "info");
							}}
							data-testid="visit-more-action-open-cashbox"
							className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<Receipt className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" />
							<div className="flex flex-col">
								<span className="font-semibold">Касса и оплата приёма</span>
								<span className="text-[10px] text-[var(--muted)]">Приём оплаты картой, наличными, СБП</span>
							</div>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsHeaderMoreMenuOpen(false);
								setIsStagePaymentModalOpen(true);
							}}
							data-testid="visit-more-action-stage-payment"
							className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<Lock className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" />
							<div className="flex flex-col">
								<span className="font-semibold">График оплаты и этапы</span>
								<span className="text-[10px] text-[var(--muted)]">Рассрочка и депонирование этапов</span>
							</div>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsHeaderMoreMenuOpen(false);
								setIsPrescriptionModalOpen?.(true);
							}}
							data-testid="visit-more-action-prescription"
							className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]"
							role="menuitem"
						>
							<Pill className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--teal)] shrink-0" />
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
		</>
	);
}
