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
						Проверка качества очистки инструментов (азопирам и фенолфталеин)
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
					className="secondary-button h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] px-3 text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
					data-testid="pso-print-journal-btn"
					title="Печать журнала проверки качества очистки"
				>
					<Printer size={14} />
					<span>Печать журнала</span>
				</button>

				<button
					type="button"
					onClick={onQuickMarkNorm}
					aria-busy={submitting}
					className="primary-button h-9 min-h-[36px] rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-xs px-3.5 text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
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
