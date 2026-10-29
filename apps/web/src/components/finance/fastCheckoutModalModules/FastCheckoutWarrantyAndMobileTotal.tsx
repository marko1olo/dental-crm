import React from "react";
import { ShieldCheck } from "lucide-react";

export interface FastCheckoutWarrantyAndMobileTotalProps {
	readonly isWarranty100: boolean;
	readonly effectiveBillKop: number;
	readonly patientName: string;
	readonly orderId: string;
	readonly discountRub: number;
	readonly onExecutePayment: () => void;
}

export const FastCheckoutWarrantyAndMobileTotal: React.FC<FastCheckoutWarrantyAndMobileTotalProps> = ({
	isWarranty100,
	effectiveBillKop,
	patientName,
	orderId,
	discountRub,
	onExecutePayment,
}) => {
	return (
		<>
			{isWarranty100 && (
				<div
					className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] flex items-center justify-between gap-3 flex-wrap"
					data-testid="banner-payment-zero-warranty"
				>
					<div className="flex items-center gap-2.5 text-[var(--ink,#0f172a)]">
						<ShieldCheck className="w-5 h-5 text-[var(--teal,#0d9488)] shrink-0" />
						<div>
							<h4 className="font-bold text-xs sm:text-sm m-0">
								Гарантийный прием / 100% скидка (к оплате 0 ₽)
							</h4>
							<p className="text-xs text-[var(--muted,#64748b)] m-0">
								Стоимость услуг полностью покрыта гарантией клиники. Кассовый чек не требуется.
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onExecutePayment}
						data-testid="btn-payment-close-warranty-zero"
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white font-bold text-xs sm:text-sm cursor-pointer shadow-xs active:scale-95 transition-all"
					>
						<span>Закрыть визит: 100% Гарантия / Скидка (0 ₽)</span>
						<span className="sr-only">Закрыть визит (0 ₽)</span>
					</button>
				</div>
			)}
			<div className="sm:hidden p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] text-center shadow-xs space-y-1">
				<span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)] block">
					Итого к оплате
				</span>
				<div className="text-[36px] font-black font-mono tracking-tight text-[var(--ink,#0f172a)] leading-tight">
					{(effectiveBillKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</div>
				<div className="text-xs text-[var(--muted,#64748b)] truncate flex items-center justify-center gap-1.5 pt-0.5">
					<span className="font-semibold text-[var(--ink,#0f172a)] truncate">{patientName || "Пациент"}</span>
					{orderId && <span>• Заказ #{orderId}</span>}
					{discountRub > 0 && (
						<span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)]">
							Скидка -{discountRub.toLocaleString("ru-RU")} ₽
						</span>
					)}
				</div>
			</div>
		</>
	);
};
