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
					className="p-3.5 rounded-2xl bg-blue-500/15 border-2 border-blue-500/40 flex items-center justify-between gap-3 flex-wrap"
					data-testid="banner-payment-zero-warranty"
				>
					<div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-100">
						<ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
						<div>
							<h4 className="font-extrabold text-sm m-0">
								Гарантийный прием / 100% скидка (к оплате 0 ₽)
							</h4>
							<p className="text-xs text-blue-700 dark:text-blue-300 m-0">
								Стоимость услуг полностью покрыта гарантией клиники. Кассовый чек не требуется.
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onExecutePayment}
						data-testid="btn-payment-close-warranty-zero"
						className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm cursor-pointer shadow-sm active:scale-95 transition-all"
					>
						Закрыть визит: 100% Гарантия / Скидка (0 ₽)
					</button>
				</div>
			)}
			<div className="sm:hidden p-3.5 rounded-2xl bg-gradient-to-b from-teal-500/15 to-teal-500/5 border border-teal-500/30 text-center shadow-xs space-y-1">
				<span className="text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 block">
					Итого к оплате
				</span>
				<div className="text-[36px] font-black font-mono tracking-tight text-[var(--ink,#0f172a)] leading-tight">
					{(effectiveBillKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
				</div>
				<div className="text-xs text-[var(--muted,#64748b)] truncate flex items-center justify-center gap-1.5 pt-0.5">
					<span className="font-semibold text-[var(--ink,#0f172a)] truncate">{patientName || "Пациент"}</span>
					{orderId && <span>• Заказ #{orderId}</span>}
					{discountRub > 0 && (
						<span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200">
							Скидка -{discountRub.toLocaleString("ru-RU")} ₽
						</span>
					)}
				</div>
			</div>
		</>
	);
};
