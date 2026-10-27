import React from "react";
import { CheckCircle2, FileSignature, Printer, Zap } from "lucide-react";
import { PrimaryIntakeMoreDropdown } from "./PrimaryIntakeMoreDropdown";

interface PrimaryIntakeFooterActionsProps {
	missingCount: number;
	onBatchCreate: () => void;
	onBatchPrint: () => void;
	onOpenSignatureTablet: () => void;
	isMoreMenuOpen: boolean;
	setIsMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	isNormApplied: boolean;
	onFillSomaticNorm: () => void;
	onPrintBlankPackage: () => void;
	onClose: () => void;
}

export function PrimaryIntakeFooterActions({
	missingCount,
	onBatchCreate,
	onBatchPrint,
	onOpenSignatureTablet,
	isMoreMenuOpen,
	setIsMoreMenuOpen,
	isNormApplied,
	onFillSomaticNorm,
	onPrintBlankPackage,
	onClose,
}: PrimaryIntakeFooterActionsProps) {
	return (
		<div className="document-package-modal-footer">
			<div className="flex flex-col sm:flex-row gap-2 w-full items-stretch sm:items-center">
				<button
					type="button"
					className="primary-button h-11 sm:h-[34px] min-h-[44px] sm:min-h-[34px] px-3.5 rounded-xl sm:rounded-lg bg-[var(--teal,#0d9488)] text-white text-xs sm:text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-xs w-full sm:w-auto order-1 sm:order-2"
					data-testid="print-primary-intake-package-btn"
					onClick={onBatchPrint}
					title="Печать всего комплекта (Договор + Согласие ИДС + Персональные данные + Анкета здоровья) под ручную подпись"
				>
					<Printer size={15} aria-hidden="true" />
					<span>Распечатать весь пакет (4 бланка)</span>
				</button>

				{missingCount > 0 ? (
					<button
						type="button"
						className="secondary-button h-11 sm:h-[34px] min-h-[44px] sm:min-h-[34px] px-3 rounded-xl sm:rounded-lg inline-flex items-center justify-center gap-1.5 text-xs sm:text-[12.5px] font-semibold w-full sm:w-auto order-2 sm:order-1"
						onClick={onBatchCreate}
						title="Сформировать недостающие документы первичного пакета в базе данных"
					>
						<Zap size={14} aria-hidden="true" />
						<span>Сформировать в базе ({missingCount})</span>
					</button>
				) : (
					<span className="inline-flex items-center gap-1.5 text-xs sm:text-[12.5px] text-[var(--success-fg,#10b981)] font-semibold order-2 sm:order-1">
						<CheckCircle2 size={14} aria-hidden="true" />
						Все 4 документа созданы в базе
					</span>
				)}

				<button
					type="button"
					className="secondary-button h-11 sm:h-[34px] min-h-[44px] sm:min-h-[34px] px-3 rounded-xl sm:rounded-lg inline-flex items-center justify-center gap-1.5 text-xs sm:text-[12.5px] font-semibold border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--teal-surface,rgba(13,148,136,0.08))] cursor-pointer w-full sm:w-auto order-3"
					data-testid="sign-primary-intake-package-btn"
					onClick={onOpenSignatureTablet}
					title="Подписание первичного пакета пациентом на экране (Digital Signature Canvas) или через СМС (ПЭП)"
				>
					<FileSignature size={15} aria-hidden="true" />
					<span>Подписать на планшете (ПЭП)</span>
				</button>
			</div>

			<PrimaryIntakeMoreDropdown
				isMoreMenuOpen={isMoreMenuOpen}
				setIsMoreMenuOpen={setIsMoreMenuOpen}
				isNormApplied={isNormApplied}
				onFillSomaticNorm={onFillSomaticNorm}
				onPrintBlankPackage={onPrintBlankPackage}
				onClose={onClose}
			/>
		</div>
	);
}
