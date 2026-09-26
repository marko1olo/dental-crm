import React from "react";
import { Check, X, Zap } from "lucide-react";
import { generateQrCodeSvg } from "@dental/shared";
import { showToast } from "../../GlobalToast";

export interface EmkSbpQrModalProps {
	isOpen: boolean;
	onClose: () => void;
	totalNetRub: number;
	receiptNumber: string;
	patientName: string;
}

export function EmkSbpQrModal({
	isOpen,
	onClose,
	totalNetRub,
	receiptNumber,
	patientName,
}: EmkSbpQrModalProps) {
	if (!isOpen) return null;

	const sbpPayloadUrl = `https://qr.nspk.ru/AD1000${receiptNumber || "00000000"}?type=02&bank=100000000001&sum=${Math.round(totalNetRub * 100)}&cur=RUB&crc=8128`;
	const sbpQrSvg = generateQrCodeSvg(sbpPayloadUrl, { size: 200 });

	return (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="sbp-qr-modal-title"
		>
			<div className="bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-center">
				<div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
					<div className="flex items-center gap-2 text-[var(--ok-fg)] font-extrabold text-sm sm:text-base">
						<Zap className="w-4 h-4" />
						<h3 id="sbp-qr-modal-title" className="m-0 text-base font-extrabold text-[var(--ink)]">
							Оплата через СБП (QR-код)
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer"
						aria-label="Закрыть окно оплаты СБП"
					>
						<X size={18} />
					</button>
				</div>

				<div className="p-3 rounded-xl bg-[var(--ok-bg)] border border-[var(--ok-fg)]/30 text-xs text-[var(--ok-fg)] font-medium">
					Пациент сканирует QR-код камерой смартфона или в приложении любого банка РФ (0% комиссии)
				</div>

				<div className="flex flex-col items-center justify-center gap-2.5">
					<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--ok-bg)] border border-[var(--ok-fg)]/30 text-xs font-bold text-[var(--ok-fg)]">
						<Zap className="w-3.5 h-3.5 shrink-0" />
						<span>СБП • НСПК ГОСТ Р 56042</span>
					</div>

					<div
						className="flex items-center justify-center p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-inner w-56 h-56 mx-auto"
						data-testid="sbp-qr-svg-container"
						dangerouslySetInnerHTML={{ __html: sbpQrSvg }}
					/>
				</div>

				<div className="space-y-1">
					<div className="text-xs text-[var(--muted)]">Сумма к оплате:</div>
					<div className="text-2xl font-black text-[var(--ok-fg)] font-mono">
						{totalNetRub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[11px] text-[var(--muted)]">
						{receiptNumber} • {patientName}
					</div>
				</div>

				<div className="pt-3 border-t border-[var(--line)] flex gap-2">
					<button
						type="button"
						onClick={() => {
							showToast("Оплата по СБП успешно подтверждена!", "success", 4000);
							onClose();
						}}
						className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-extrabold bg-[var(--ok-fg)] hover:opacity-90 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
						data-testid="btn-confirm-sbp-paid"
					>
						<Check size={16} className="shrink-0" />
						<span>Подтвердить оплату</span>
					</button>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--ink)] transition-colors cursor-pointer"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
}
