import React from "react";
import { Smartphone, X } from "lucide-react";
import { generateQrCodeSvg } from "../portal/patientCabinet/patientCabinetEngine";

export interface PatientBillingQrPopoverProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly actNumber: string;
	readonly totalAmountRub: number;
	readonly totalAmountRubFormatted: string;
	readonly patientFullName: string;
}

export const PatientBillingQrPopover: React.FC<PatientBillingQrPopoverProps> = ({
	isOpen,
	onClose,
	actNumber,
	totalAmountRub,
	totalAmountRubFormatted,
	patientFullName,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in rounded-3xl"
			onClick={onClose}
			role="region"
			aria-label="Сохранить счет на телефон"
			data-testid="billing-phone-qr-modal"
		>
			<div
				className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] p-6 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between w-full">
					<div className="flex items-center gap-2 text-[var(--teal,#0d9488)] font-bold text-sm">
						<Smartphone className="w-4 h-4" />
						<span>Сохранить счет на телефон</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-hover)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer border border-[var(--line)]"
						aria-label="Закрыть окно"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div
					className="p-3 bg-white dark:bg-slate-900 border-2 border-[var(--line-strong)] rounded-2xl shadow-md"
					dangerouslySetInnerHTML={{
						__html: generateQrCodeSvg(
							`https://dente.ru/bill/${actNumber}?sum=${totalAmountRub}&patient=${encodeURIComponent(patientFullName)}`,
							{ size: 200 },
						),
					}}
				/>

				<div>
					<div className="text-xs text-[var(--muted)] font-medium">Сумма к оплате:</div>
					<div className="text-xl font-black text-[var(--teal,#0d9488)] font-mono">
						{totalAmountRubFormatted}
					</div>
				</div>

				<p className="text-xs text-[var(--muted)] leading-snug m-0">
					Наведите камеру смартфона для мгновенного сохранения детализации и оплаты через СБП без комиссии.
				</p>

				<button
					type="button"
					onClick={onClose}
					className="w-full py-2.5 rounded-xl font-bold bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-md hover:opacity-90 cursor-pointer min-h-[44px]"
				>
					Готово
				</button>
			</div>
		</div>
	);
};
