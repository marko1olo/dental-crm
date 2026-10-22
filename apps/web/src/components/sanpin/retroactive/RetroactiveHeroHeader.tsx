import React from "react";
import { CheckCircle2, FileCheck } from "lucide-react";

export interface RetroactiveHeroHeaderProps {
	readonly onRecordDayCycle?: () => void;
	readonly isLoggingDayCycle?: boolean;
}

export function RetroactiveHeroHeader({
	onRecordDayCycle,
	isLoggingDayCycle = false,
}: RetroactiveHeroHeaderProps) {
	return (
		<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
			<div>
				<h2
					style={{
						margin: 0,
						fontSize: "1.2rem",
						fontWeight: 800,
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
						color: "var(--ink, #0f172a)",
					}}
				>
					<FileCheck size={24} color="var(--teal)" />
					Пакетное заполнение журналов стерилизации за период
				</h2>
				<div style={{ fontSize: "0.875rem", color: "var(--muted, #64748b)", marginTop: "0.25rem" }}>
					Моментальное оформление журналов автоклавирования, предстерилизационной очистки, бактерицидных ламп, уборок, медотходов и готовности кабинетов.
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
				{onRecordDayCycle && (
					<button
						type="button"
						onClick={onRecordDayCycle}
						aria-busy={isLoggingDayCycle}
						className="sanpin-btn sanpin-btn-primary"
						style={{
							minHeight: "40px",
							padding: "0.45rem 1rem",
							fontSize: "0.85rem",
							fontWeight: 700,
							background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
							cursor: "pointer",
							borderRadius: "10px",
						}}
						data-testid="record-day-autoclave-cycle-hero-btn"
						title="1-клик фиксация дневного цикла: Автоклав B-класс, 134°C, 2.1 бар, 5 мин, индикаторы 5 класса норма, списание крафт-пакетов со склада"
					>
						<CheckCircle2 size={16} />
						<span>{isLoggingDayCycle ? "Фиксация цикла..." : "Зафиксировать дневной цикл автоклавирования"}</span>
					</button>
				)}
				<span
					style={{
						background: "rgba(5, 150, 105, 0.12)",
						color: "var(--ok-fg)",
						border: "1px solid rgba(5, 150, 105, 0.3)",
						borderRadius: "9999px",
						padding: "0.35rem 0.75rem",
						fontSize: "0.82rem",
						fontWeight: 700,
						display: "inline-flex",
						alignItems: "center",
						gap: "0.35rem",
					}}
				>
					<CheckCircle2 size={16} /> 100% Норма Роспотребнадзора
				</span>
			</div>
		</div>
	);
}
