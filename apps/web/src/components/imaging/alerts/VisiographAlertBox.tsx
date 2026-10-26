/**
 * VisiographAlertBox.tsx — Карточка предупреждения/ошибки визиографа
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface Props {
	type: "bad" | "warn";
	title?: string;
	message: string;
	onClose?: () => void;
	role?: string;
	testId?: string;
	marginTop?: string;
}

export const VisiographAlertBox: React.FC<Props> = ({
	type,
	title,
	message,
	onClose,
	role,
	testId,
	marginTop,
}) => {
	const isBad = type === "bad";
	return (
		<div
			role={role}
			data-testid={testId}
			style={{
				padding: isBad ? "12px 16px" : "10px 14px",
				background: isBad ? "var(--bad-bg)" : "var(--warn-bg)",
				color: isBad ? "var(--bad-fg)" : "var(--warn-fg)",
				borderRadius: "10px",
				display: "flex",
				alignItems: "flex-start",
				gap: "10px",
				fontSize: isBad ? "0.88rem" : "0.85rem",
				marginTop: marginTop ?? "0",
			}}
		>
			<AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
			<div>
				{title && <strong>{title}</strong>}
				<div style={{ marginTop: title ? "4px" : "0" }}>{message}</div>
			</div>
			{onClose && (
				<button
					type="button"
					onClick={onClose}
					style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}
					aria-label="Скрыть сообщение"
				>
					<X size={14} />
				</button>
			)}
		</div>
	);
};
