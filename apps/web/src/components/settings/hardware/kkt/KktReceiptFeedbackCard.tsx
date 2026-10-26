import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { TestReceiptResult } from "./kktTypes.js";

interface Props {
	lastReceipt: TestReceiptResult | null;
}

export const KktReceiptFeedbackCard: React.FC<Props> = ({ lastReceipt }) => {
	if (!lastReceipt) {
		return null;
	}

	return (
		<div
			data-testid="kkt-last-receipt-card"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "6px",
				padding: "12px",
				background: "var(--paper-soft)",
				border: "1px solid rgba(16, 185, 129, 0.3)",
				borderRadius: "8px",
				fontSize: "12px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--success, green)", fontWeight: 600 }}>
				<CheckCircle2 size={14} />
				<span>Тестовый фискальный чек успешно сформирован ({lastReceipt.timestamp})</span>
			</div>
			<div style={{ display: "flex", flexWrap: "wrap", gap: "16px", color: "var(--ink)" }}>
				<span>Номер ФД: <strong>{lastReceipt.docNum}</strong></span>
				<span>ФПД (фискальный признак): <strong>{lastReceipt.fpd}</strong></span>
				<span>Сумма: <strong>{lastReceipt.totalRub.toFixed(2)} ₽</strong></span>
			</div>
			<div style={{ fontSize: "11px", color: "var(--muted)", wordBreak: "break-all" }}>
				Строка QR-кода ФНС: <code>{lastReceipt.qrString}</code>
			</div>
		</div>
	);
};
