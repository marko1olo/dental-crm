import React from "react";
import { CheckCircle2, FlaskConical, Printer } from "lucide-react";

export interface PsoQualityBannerProps {
	readonly submitting: boolean;
	readonly onQuickMarkNorm: () => void;
	readonly onPrintJournal: () => void;
}

export const PsoQualityBanner: React.FC<PsoQualityBannerProps> = ({
	submitting,
	onQuickMarkNorm,
	onPrintJournal,
}) => {
	return (
		<div
			className="pso-banner-responsive"
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "10px 16px",
				background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: 12,
				marginBottom: 12,
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
				<CheckCircle2 size={18} color="var(--teal, #0d9488)" className="shrink-0" />
				<div>
					<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
						Ежедневный контроль предстерилизационной очистки
					</div>
					<div style={{ fontSize: "0.775rem", color: "var(--muted, #64748b)" }}>
						Азопирамовая проба (скрытая кровь) и фенолфталеиновая (остатки моющих средств): <strong>Отрицательно, 100% норма</strong>
					</div>
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
				<button
					type="button"
					onClick={onPrintJournal}
					className="sanpin-btn sanpin-btn-secondary touch-manipulation"
					style={{ height: 36, fontSize: "0.825rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}
					data-testid="pso-print-journal-btn"
					title="Печать журнала контроля очистки"
				>
					<Printer size={14} />
					<span>Печать журнала</span>
				</button>

				<button
					type="button"
					onClick={onQuickMarkNorm}
					aria-busy={submitting}
					className="sanpin-btn sanpin-btn-primary touch-manipulation"
					style={{ height: 36, fontSize: "0.825rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
					data-testid="pso-quick-mark-shift-btn"
					title="Зафиксировать нормативные результаты проб смены в 1 клик"
				>
					<FlaskConical size={14} />
					<span>{submitting ? "Фиксация..." : "Отметка смены в 1 клик"}</span>
				</button>
			</div>
		</div>
	);
};
