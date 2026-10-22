/**
 * EgiszRemdModalFooter.tsx — Statutory modal action footer.
 * Mandate 8b compliant (<= 120 lines). Mandate 8e Doctor Autonomy (Natural Thumb Zone).
 */

import React from "react";
import { CheckCircle2, Clock, Printer, Send } from "lucide-react";
import type { EgiszHubActiveDocType } from "./modalTypes";

export interface EgiszRemdModalFooterProps {
	activeDocType: EgiszHubActiveDocType;
	isSending: boolean;
	onPrint: () => void;
	onValidateCdaXml: () => void;
	onQueueDeferred: () => void;
	onClose: () => void;
	onSendToRegistry: () => void;
}

export const EgiszRemdModalFooter: React.FC<EgiszRemdModalFooterProps> = ({
	activeDocType,
	isSending,
	onPrint,
	onValidateCdaXml,
	onQueueDeferred,
	onClose,
	onSendToRegistry,
}) => {
	const sendLabel = isSending
		? "Отправка в Минздрав..."
		: activeDocType === "cda_semd"
		? "Отправить в Минздрав"
		: "Сформировать и отправить в налоговую";

	return (
		<footer
			style={{
				padding: "0.875rem 1.25rem",
				background: "var(--paper-strong)",
				borderTop: "1px solid var(--line)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				flexWrap: "wrap",
				gap: "0.5rem",
			}}
		>
			<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
				<button
					type="button"
					onClick={onPrint}
					className="egisz-btn sm"
					style={{
						display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.9rem",
						fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
						border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer",
					}}
				>
					<Printer size={16} />
					Печать бланка
				</button>
				<button
					type="button"
					onClick={onValidateCdaXml}
					className="egisz-btn sm"
					style={{
						display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.45rem 0.9rem",
						fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
						border: "1px solid var(--line)", background: "var(--paper)", color: "var(--teal, #0d9488)", cursor: "pointer",
					}}
				>
					<CheckCircle2 size={16} />
					1-Клик Валидация
				</button>
			</div>

			<div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
				<button
					type="button"
					onClick={onQueueDeferred}
					className="egisz-btn sm"
					style={{
						display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.9rem",
						fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
						border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer",
					}}
				>
					<Clock size={15} />
					Отложить отправку
				</button>
				<button
					type="button"
					onClick={onClose}
					className="egisz-btn sm"
					style={{
						padding: "0.45rem 1rem", fontSize: "0.8125rem", fontWeight: 600, borderRadius: "6px",
						border: "1px solid var(--line)", background: "transparent", color: "var(--ink)", cursor: "pointer",
					}}
				>
					Закрыть
				</button>
				<button
					type="button"
					onClick={onSendToRegistry}
					className="egisz-btn egisz-btn-primary sm"
					style={{
						display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.45rem 1.25rem",
						fontSize: "0.8125rem", fontWeight: 700, borderRadius: "6px",
						background: "var(--primary, #0ea5e9)", color: "var(--paper, #ffffff)", border: "none",
						cursor: isSending ? "wait" : "pointer",
					}}
				>
					<Send size={16} />
					{sendLabel}
				</button>
			</div>
		</footer>
	);
};
