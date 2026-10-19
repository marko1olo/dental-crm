import React, { useRef, useEffect } from "react";
import {
	CreditCard,
	FileText,
	MoreVertical,
	Percent,
	Receipt,
	Save,
	Send,
	ShieldCheck,
	UserCheck,
	Zap,
} from "lucide-react";

export interface TreatmentPlanOptionsMenuProps {
	readonly isOpen: boolean;
	readonly onToggle: () => void;
	readonly onClose: () => void;
	readonly onExportCashier: () => void;
	readonly onOpenInvoiceModal: () => void;
	readonly onOpenFiscalModal: () => void;
	readonly onSavePlanToDatabase: () => void;
	readonly isSaving: boolean;
	readonly onOpenStagePaymentModal?: (() => void) | undefined;
	readonly onOpenDiscountsModal: () => void;
	readonly onOpenCuratorModal: () => void;
	readonly curatorFullName?: string | undefined;
	readonly onOpenContractPrint: () => void;
	readonly onOpenPresenterModal: () => void;
	readonly onOpenComparatorModal?: (() => void) | undefined;
	readonly onResetPlan: () => void;
}

export const TreatmentPlanOptionsMenu: React.FC<TreatmentPlanOptionsMenuProps> = (props) => {
	const {
		isOpen, onToggle, onClose, onExportCashier, onOpenInvoiceModal, onOpenFiscalModal,
		onSavePlanToDatabase, isSaving, onOpenStagePaymentModal, onOpenDiscountsModal,
		onOpenCuratorModal, curatorFullName, onOpenContractPrint, onOpenPresenterModal,
		onOpenComparatorModal, onResetPlan,
	} = props;
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) onClose();
		};
		if (isOpen) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen, onClose]);

	const act = (fn?: () => void) => { onClose(); fn?.(); };

	return (
		<div className="relative inline-flex items-center" ref={ref}>
			<button
				type="button"
				onClick={onToggle}
				className="secondary-button icon-button min-h-[44px] min-w-[44px] h-[44px] w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper-strong)] cursor-pointer flex items-center justify-center shrink-0 shadow-2xs transition-colors touch-manipulation"
				title="Дополнительные студии, печать и опции"
				aria-label="Опции плана лечения"
				aria-expanded={isOpen}
				data-testid="treatment-plan-options-menu-btn"
			>
				<MoreVertical size={14} className="text-[var(--teal,var(--brand-primary))]" />
			</button>

			<div
				className={`absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl shadow-2xl min-w-[270px] text-xs ${
					isOpen ? "animate-in fade-in zoom-in-95 duration-100" : "hidden"
				}`}
				role="menu"
				aria-hidden={!isOpen}
			>
				<button type="button" onClick={() => act(onExportCashier)} className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]" role="menuitem" data-testid="options-menu-export-cashier-btn">
					<Send size={14} className="text-teal-600 dark:text-teal-400 shrink-0" /><span>Отправить счет кассиру</span>
				</button>
				<button type="button" onClick={() => act(onOpenInvoiceModal)} className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]" role="menuitem" data-testid="tp-invoice-btn" title="Сформировать наряд / счет на оплату с контролем цен и защитой сметы">
					<Receipt size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" /><span>Счет / Наряд на оплату</span>
				</button>
				<button type="button" onClick={() => act(onOpenFiscalModal)} className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--teal-dark,var(--teal))] hover:bg-[var(--teal-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]" role="menuitem" data-testid="tp-fiscal-btn" title="Принять оплату (карты, СБП QR, наличные) и пробить кассовый чек">
					<ShieldCheck size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" /><span>Кассовый чек & Оплата</span>
				</button>
				<button type="button" onClick={() => act(onSavePlanToDatabase)} className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]" role="menuitem" data-testid="treatment-plan-save-btn" title="Сохранить план лечения в базе данных">
					<Save size={14} className={`text-[var(--teal,var(--brand-primary))] shrink-0 ${isSaving ? "animate-spin" : ""}`} /><span>{isSaving ? "Сохранение..." : "Сохранить план в базу"}</span>
				</button>
				<button type="button" onClick={() => act(onOpenStagePaymentModal)} className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]" role="menuitem" data-testid="options-menu-installment-btn">
					<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" /><span>Калькулятор рассрочки 0%</span>
				</button>
				<button type="button" onClick={() => act(onOpenDiscountsModal)} className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]" role="menuitem" data-testid="options-menu-discount-btn">
					<Percent size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" /><span>Скидки и бонусы пациента</span>
				</button>
				<button type="button" onClick={() => act(onOpenCuratorModal)} className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]" role="menuitem" data-testid="options-menu-curator-btn">
					<div className="flex items-center gap-2"><UserCheck size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" /><span>Куратор лечения (воронка и комиссия)</span></div>
					{curatorFullName && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">{curatorFullName.split(" ")[0]}</span>}
				</button>
				<button type="button" onClick={() => act(onOpenPresenterModal)} className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]" role="menuitem" data-testid="options-menu-presenter-btn">
					<Zap size={14} className="text-amber-500 shrink-0" /><span>Презентация планов пациенту</span>
				</button>
				{onOpenComparatorModal && (
					<button type="button" onClick={() => act(onOpenComparatorModal)} className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]" role="menuitem" data-testid="options-menu-comparator-btn">
						<FileText size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" /><span>Сравнение 3 вариантов (Смета)</span>
					</button>
				)}
				<button type="button" onClick={() => act(onOpenContractPrint)} className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] sm:min-h-[38px]" role="menuitem" data-testid="options-menu-contract-print-btn">
					<FileText size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" /><span>Договор и смета (QR)</span>
				</button>
			</div>
		</div>
	);
};

export default TreatmentPlanOptionsMenu;
