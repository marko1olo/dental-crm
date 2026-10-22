import { CheckCircle2, Info, Zap } from "lucide-react";
import React from "react";

export interface CabinetReadinessVerdictCardProps {
	readonly isFullyReady: boolean;
	readonly statusMessageRu: string;
	readonly missingItems: readonly string[];
	readonly onStartAppointmentPaperLogNorm: () => void;
	readonly onQuickFillAllReady: () => void;
}

export function CabinetReadinessVerdictCard({
	isFullyReady,
	statusMessageRu,
	missingItems,
	onStartAppointmentPaperLogNorm,
	onQuickFillAllReady,
}: CabinetReadinessVerdictCardProps) {
	return (
		<div
			style={{
				padding: "0.75rem 1rem",
				borderRadius: "0.5rem",
				background: isFullyReady ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
				border: isFullyReady ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)",
				marginBottom: "0.75rem",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.5rem",
					fontSize: "0.95rem",
					fontWeight: 800,
					color: isFullyReady ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)",
				}}
			>
				{isFullyReady ? <CheckCircle2 size={18} /> : <Info size={18} />}
				<span>{statusMessageRu}</span>
			</div>

			{missingItems.length > 0 && (
				<div style={{ marginTop: "0.5rem" }}>
					<p style={{ margin: "0 0 0.3rem 0", fontSize: "0.82rem", fontWeight: 700, color: "var(--warn-fg, #b45309)" }}>
						Не заполнены пункты экспресс-проверки (при использовании бумажных журналов приём разрешён):
					</p>
					<ul style={{ margin: "0 0 0.5rem 1.25rem", padding: 0, fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
						{missingItems.map((item, idx) => (
							<li key={idx} style={{ marginBottom: "0.2rem" }}>
								{item}
							</li>
						))}
					</ul>
					<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
						<button
							type="button"
							onClick={onStartAppointmentPaperLogNorm}
							className="sanpin-btn sanpin-btn-primary"
							style={{
								flex: 1,
								minHeight: "44px",
								padding: "0.5rem 1rem",
								fontSize: "0.88rem",
								background: "var(--teal, #0d9488)",
								color: "var(--on-teal, #ffffff)",
								fontWeight: 800,
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "0.4rem",
								borderRadius: "0.5rem",
							}}
							title="Начать приём в штатном режиме (бумажный журнал)"
						>
							<CheckCircle2 size={16} /> <span>Начать приём (норма)</span>
						</button>
						<button
							type="button"
							onClick={onQuickFillAllReady}
							className="sanpin-btn sanpin-btn-secondary"
							style={{
								flex: 1,
								minHeight: "44px",
								padding: "0.5rem 1rem",
								fontSize: "0.88rem",
								fontWeight: 700,
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "0.4rem",
								borderRadius: "0.5rem",
							}}
							title="Отметить все недостающие пункты чек-листа как готовые"
						>
							<Zap size={16} /> <span>Заполнить чек-лист по норме</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
