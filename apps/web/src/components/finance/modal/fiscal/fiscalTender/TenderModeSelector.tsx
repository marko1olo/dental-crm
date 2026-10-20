import React from "react";
import {
	Banknote,
	Coins,
	CreditCard,
	Layers,
	QrCode,
} from "lucide-react";
import { formatMoneyRu } from "../fiscalModalRefundLogic";
import type { TenderModeSelectorProps } from "./types";

export const TenderModeSelector: React.FC<TenderModeSelectorProps> = ({
	paymentMode,
	setPaymentMode,
	selectSingleMethod,
	totalSumRub,
}) => {
	return (
		<div className="space-y-2.5">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
					Способ оплаты:
				</span>
				<span className="font-mono text-xs font-bold text-[var(--ink,#0f172a)]">
					К оплате: {formatMoneyRu(totalSumRub)}
				</span>
			</div>

			<div
				className="dente-segmented-bar w-full flex"
				data-testid="fiscal-segmented-control"
				role="tablist"
				aria-label="Способ оплаты"
			>
				<button
					type="button"
					role="tab"
					aria-selected={paymentMode === "cash"}
					onClick={() => {
						setPaymentMode("cash");
						selectSingleMethod("cash");
					}}
					className={`dente-segmented-item flex-1 ${
						paymentMode === "cash" ? "active" : ""
					}`}
					data-testid="segment-cash"
				>
					<Banknote size={14} className="shrink-0" />
					<span>Наличные</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={paymentMode === "card"}
					onClick={() => {
						setPaymentMode("card");
						selectSingleMethod("card");
					}}
					className={`dente-segmented-item flex-1 ${
						paymentMode === "card" ? "active" : ""
					}`}
					data-testid="segment-card"
				>
					<CreditCard size={14} className="shrink-0" />
					<span>Безналичные (Карта / Терминал)</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={paymentMode === "sbp"}
					onClick={() => {
						setPaymentMode("sbp");
						selectSingleMethod("sbp");
					}}
					className={`dente-segmented-item flex-1 ${
						paymentMode === "sbp" ? "active" : ""
					}`}
					data-testid="segment-sbp"
				>
					<QrCode size={14} className="shrink-0" />
					<span>СБП (QR-код)</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={paymentMode === "deposit"}
					onClick={() => {
						setPaymentMode("deposit");
						selectSingleMethod("deposit");
					}}
					className={`dente-segmented-item flex-1 ${
						paymentMode === "deposit" ? "active" : ""
					}`}
					data-testid="segment-deposit"
				>
					<Coins size={14} className="shrink-0" />
					<span>Аванс / Семейный депозит</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={paymentMode === "split"}
					onClick={() => setPaymentMode("split")}
					className={`dente-segmented-item flex-1 ${
						paymentMode === "split" ? "active" : ""
					}`}
					data-testid="segment-split"
				>
					<Layers size={14} className="shrink-0" />
					<span>Сплит-оплата</span>
				</button>
			</div>
		</div>
	);
};
