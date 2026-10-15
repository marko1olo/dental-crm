import React from "react";
import {
	BarChart3,
	ChevronDown,
	ChevronUp,
	Clock,
	Copy,
	Download,
	Sliders,
	X,
} from "lucide-react";
import {
	FUNNEL_PERIOD_OPTIONS,
	type FunnelTimePeriod,
} from "./types";

export interface FunnelModalHeaderBarProps {
	readonly period: FunnelTimePeriod;
	readonly onSelectPeriod: (period: FunnelTimePeriod) => void;
	readonly isBudgetDrawerOpen: boolean;
	readonly onToggleBudgetDrawer: () => void;
	readonly onCopySummary: () => void;
	readonly onExportCsv: () => void;
	readonly onClose: () => void;
	readonly onOpenLeakDetector?: (() => void) | undefined;
}

export function FunnelModalHeaderBar({
	period,
	onSelectPeriod,
	isBudgetDrawerOpen,
	onToggleBudgetDrawer,
	onCopySummary,
	onExportCsv,
	onClose,
	onOpenLeakDetector,
}: FunnelModalHeaderBarProps) {
	return (
		<>
			{/* 1. HEADER & ACTIONS */}
			<header
				style={{
					padding: "18px 24px",
					borderBottom: "1px solid var(--line)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "12px",
					background: "var(--paper-soft)",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					<div
						style={{
							width: 40,
							height: 40,
							borderRadius: 10,
							background: "rgba(15, 118, 110, 0.15)",
							color: "var(--teal)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<BarChart3 size={22} />
					</div>
					<div>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<h2
								style={{
									margin: 0,
									fontSize: 18,
									fontWeight: 700,
									color: "var(--ink)",
									letterSpacing: "-0.01em",
								}}
							>
								Сквозная Воронка & Маркетинг
							</h2>
							<span
								style={{
									fontSize: 10,
									fontWeight: 700,
									padding: "2px 8px",
									borderRadius: 12,
									background: "var(--teal)",
									color: "var(--on-teal, var(--paper))",
									textTransform: "uppercase",
									letterSpacing: "0.05em",
								}}
							>
								CRM Intelligence
							</span>
						</div>
						<p
							style={{
								margin: "2px 0 0",
								fontSize: 12,
								color: "var(--muted)",
							}}
						>
							Конверсии от лида до оплаты в кассу • Юнит-экономика CAC/LTV • Маркетинговые каналы
						</p>
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					{onOpenLeakDetector && (
						<button
							type="button"
							onClick={onOpenLeakDetector}
							className="secondary-button"
							data-testid="btn-analytics-open-leak-detector"
							style={{
								height: 34,
								padding: "0 12px",
								fontSize: 12,
								display: "flex",
								alignItems: "center",
								gap: 6,
								color: "var(--teal)",
								borderColor: "var(--teal)",
							}}
							title="Детектор клинических утечек CRM (210+ дней)"
							aria-label="Детектор утечек"
						>
							<Clock size={14} /> Детектор утечек
						</button>
					)}

					<button
						type="button"
						onClick={onCopySummary}
						className="secondary-button"
						style={{
							height: 34,
							padding: "0 12px",
							fontSize: 12,
							display: "flex",
							alignItems: "center",
							gap: 6,
						}}
						title="Скопировать текстовую сводку для руководителя / Telegram"
						aria-label="Скопировать сводку"
					>
						<Copy size={14} /> Скопировать дайджест
					</button>

					<button
						type="button"
						onClick={onExportCsv}
						className="secondary-button"
						style={{
							height: 34,
							padding: "0 12px",
							fontSize: 12,
							display: "flex",
							alignItems: "center",
							gap: 6,
						}}
						title="Выгрузить полный отчет в формате CSV (Excel)"
						aria-label="Экспорт в CSV"
					>
						<Download size={14} /> Экспорт CSV
					</button>

					<button
						type="button"
						onClick={onClose}
						style={{
							background: "none",
							border: "none",
							color: "var(--muted)",
							cursor: "pointer",
							padding: 6,
							borderRadius: 8,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
						aria-label="Закрыть окно"
					>
						<X size={20} />
					</button>
				</div>
			</header>

			{/* 2. 0-CLICK PERIOD SELECTOR & QUICK STATS */}
			<div
				style={{
					padding: "12px 24px",
					background: "var(--paper)",
					borderBottom: "1px solid var(--line)",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "12px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<span
						style={{
							fontSize: 12,
							fontWeight: 600,
							color: "var(--muted)",
							marginRight: 4,
						}}
					>
						Период:
					</span>
					{FUNNEL_PERIOD_OPTIONS.map((opt) => (
						<button
							key={opt.id}
							type="button"
							onClick={() => onSelectPeriod(opt.id)}
							style={{
								padding: "6px 12px",
								fontSize: 12,
								fontWeight: period === opt.id ? 600 : 500,
								borderRadius: 8,
								border:
									period === opt.id
										? "1px solid var(--teal)"
										: "1px solid var(--line)",
								background:
									period === opt.id
										? "rgba(15, 118, 110, 0.12)"
										: "var(--paper-soft)",
								color:
									period === opt.id
										? "var(--teal)"
										: "var(--ink)",
								cursor: "pointer",
								transition: "all 0.15s ease",
							}}
						>
							{opt.label}
						</button>
					))}
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					<button
						type="button"
						onClick={onToggleBudgetDrawer}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							fontSize: 12,
							fontWeight: 600,
							padding: "6px 12px",
							borderRadius: 8,
							border: "1px solid var(--line)",
							background: isBudgetDrawerOpen
								? "rgba(59, 130, 246, 0.1)"
								: "var(--paper-soft)",
							color: isBudgetDrawerOpen
								? "var(--accent)"
								: "var(--ink)",
							cursor: "pointer",
						}}
					>
						<Sliders size={14} />
						Настроить рекламные бюджеты
						{isBudgetDrawerOpen ? (
							<ChevronUp size={14} />
						) : (
							<ChevronDown size={14} />
						)}
					</button>
				</div>
			</div>
		</>
	);
}
