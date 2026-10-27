import React from "react";
import { AlertOctagon, Calculator, Clock, FileText, FlaskConical, Lock, Pill, Printer, Receipt, ShieldCheck } from "lucide-react";
import { useAppStore } from "../../../../../store/appStore";
import { showToast } from "../../../../GlobalToast";
import type { VisitActionButtonsToolbarProps } from "../types";

export interface VisitToolbarMoreMenuItemsProps extends VisitActionButtonsToolbarProps {
	readonly handlePrintClinicalDiaryFast: () => void;
	readonly onClose: () => void;
}

export function VisitToolbarMoreMenuItems({
	handlePrintClinicalDiaryFast, handlePrintCompletedActFast, handlePrintEstimateFast,
	handlePrintInformedConsentFast, onOpenLabOrderModal, setIsEmergencyModalOpen,
	setIsInformedConsentModalOpen, setIsWarrantyModalOpen, setIsDoctorShiftModalOpen,
	setIsPriceValidatorModalOpen, setIsStagePaymentModalOpen, setIsPrescriptionModalOpen, onClose,
}: VisitToolbarMoreMenuItemsProps) {
	return (
		<div data-testid="visit-header-more-actions-dropdown" className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-[var(--line)] bg-[var(--paper-strong,var(--paper))] text-[var(--ink)] shadow-xl z-50 p-1.5 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100" role="menu">
			<button type="button" onClick={() => { onClose(); if (typeof onOpenLabOrderModal === "function") onOpenLabOrderModal(); else { useAppStore.getState().setCurrentView("lab"); showToast("Открыт журнал ЗТЛ", "info"); } }} data-testid="visit-more-action-lab-order" className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]" role="menuitem">
				<FlaskConical className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" />
				<div className="flex flex-col"><span className="font-semibold">Наряд в зуботехническую лабораторию (ЗТЛ)</span><span className="text-[10px] text-[var(--muted)]">Заказ коронок, мостов, вкладок, All-on-4</span></div>
			</button>
			<button type="button" onClick={() => { onClose(); handlePrintClinicalDiaryFast(); }} data-testid="visit-more-action-print-medical-card" className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]" role="menuitem">
				<Printer className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" />
				<div className="flex flex-col"><span className="font-semibold">Медицинская карта приёма</span><span className="text-[10px] text-[var(--muted)]">С текущим штампом (черновик / подписано врачом)</span></div>
			</button>
			<span data-testid="visit-more-action-print-043u" className="hidden" aria-hidden="true" onClick={handlePrintClinicalDiaryFast} />
			<button type="button" onClick={() => { onClose(); if (typeof handlePrintCompletedActFast === "function") handlePrintCompletedActFast(); else showToast("Печать Акта выполненных работ", "info"); }} data-testid="visit-more-action-print-act" className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]" role="menuitem">
				<FileText className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" />
				<div className="flex flex-col"><span className="font-semibold">Печать Акта выполненных работ</span><span className="text-[10px] text-[var(--muted)]">Реестр оказанных медицинских услуг</span></div>
			</button>
			<button type="button" onClick={() => { onClose(); if (typeof handlePrintEstimateFast === "function") handlePrintEstimateFast(); else showToast("Печать Сметы и плана лечения", "info"); }} data-testid="visit-more-action-print-estimate" className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]" role="menuitem">
				<Calculator className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" />
				<div className="flex flex-col"><span className="font-semibold">Печать Сметы и плана лечения</span><span className="text-[10px] text-[var(--muted)]">Финансовый расчёт и гарантийные сроки</span></div>
			</button>
			<button type="button" onClick={() => { onClose(); handlePrintInformedConsentFast(); }} data-testid="visit-more-action-print-consent" className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]" role="menuitem">
				<ShieldCheck className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" />
				<div className="flex flex-col"><span className="font-semibold">Печать согласия (ИДС)</span><span className="text-[10px] text-[var(--muted)]">С текущим штампом (черновик/подписано)</span></div>
			</button>
			<button type="button" onClick={() => { onClose(); setIsInformedConsentModalOpen(true); }} data-testid="visit-more-action-consent-modal" className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]" role="menuitem">
				<ShieldCheck className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" />
				<div className="flex flex-col"><span className="font-semibold">Выбрать бланк ИДС</span><span className="text-[10px] text-[var(--muted)]">Терапия, хирургия, ортопедия, КТ</span></div>
			</button>
			<button type="button" onClick={() => { onClose(); setIsEmergencyModalOpen(true); }} data-testid="visit-more-action-emergency" className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]" role="menuitem">
				<AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
				<div className="flex flex-col"><span className="font-semibold text-rose-700 dark:text-rose-300">Экстренная помощь у кресла</span><span className="text-[10px] text-[var(--muted)]">Шпаргалка 112, аптечка первой линии</span></div>
			</button>
			<button type="button" onClick={() => { onClose(); setIsWarrantyModalOpen(true); }} data-testid="visit-more-action-warranty-passport" className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]" role="menuitem">
				<ShieldCheck className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" />
				<div className="flex flex-col"><span className="font-semibold">Гарантийный паспорт</span><span className="text-[10px] text-[var(--muted)]">Оформить гарантию на лечение</span></div>
			</button>
			<button type="button" onClick={() => { onClose(); setIsDoctorShiftModalOpen(true); }} data-testid="visit-more-action-doctor-shift" className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]" role="menuitem">
				<Clock className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" />
				<div className="flex flex-col"><span className="font-semibold">Смена врача</span><span className="text-[10px] text-[var(--muted)]">Мобильный пульт, пациенты и тайминг</span></div>
			</button>
			<button type="button" onClick={() => { onClose(); setIsPriceValidatorModalOpen(true); }} data-testid="visit-more-action-price-lock" className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]" role="menuitem">
				<ShieldCheck className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" />
				<div className="flex flex-col"><span className="font-semibold">Контроль цен (Price Lock)</span><span className="text-[10px] text-[var(--muted)]">Сверка сметы, фиксация и наряды ЗТЛ</span></div>
			</button>
			<button type="button" onClick={() => { onClose(); useAppStore.getState().setCurrentView("finance"); showToast("Переход в кассу для оплаты приёма", "info"); }} data-testid="visit-more-action-open-cashbox" className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]" role="menuitem">
				<Receipt className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" />
				<div className="flex flex-col"><span className="font-semibold">Касса и оплата приёма</span><span className="text-[10px] text-[var(--muted)]">Приём оплаты картой, наличными, СБП</span></div>
			</button>
			<button type="button" onClick={() => { onClose(); setIsStagePaymentModalOpen(true); }} data-testid="visit-more-action-stage-payment" className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]" role="menuitem">
				<Lock className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--ink)] shrink-0" />
				<div className="flex flex-col"><span className="font-semibold">График оплаты и этапы</span><span className="text-[10px] text-[var(--muted)]">Рассрочка и депонирование этапов</span></div>
			</button>
			<button type="button" onClick={() => { onClose(); setIsPrescriptionModalOpen?.(true); }} data-testid="visit-more-action-prescription" className="group w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] cursor-pointer text-[var(--ink)] transition-colors min-h-[44px] sm:min-h-[38px]" role="menuitem">
				<Pill className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--teal)] shrink-0" />
				<div className="flex flex-col"><span className="font-semibold">Выписать рецепт</span><span className="text-[10px] text-[var(--muted)]">Рецепты на лекарства, антибиотики, НПВС</span></div>
			</button>
		</div>
	);
}
