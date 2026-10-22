import React from "react";
import { Moon, Sun } from "lucide-react";

interface BactericidalAirPrepBannerProps {
	submitting: boolean;
	onOpenMorningShift: () => void;
	onCloseEveningShift: () => void;
}

export function BactericidalAirPrepBanner({
	submitting,
	onOpenMorningShift,
	onCloseEveningShift,
}: BactericidalAirPrepBannerProps) {
	return (
		<div
			style={{
				background: "linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(13, 148, 136, 0.06) 100%)",
				border: "2px solid var(--teal, #0d9488)",
				borderRadius: "0.85rem",
				padding: "1rem 1.25rem",
				marginTop: "0.5rem",
				marginBottom: "0.75rem",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "1.25rem",
				flexWrap: "wrap",
			}}
		>
			<div style={{ flex: "1 1 320px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
					<span
						style={{
							padding: "0.2rem 0.5rem",
							borderRadius: "0.4rem",
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							fontSize: "0.75rem",
							fontWeight: 800,
							textTransform: "uppercase",
							letterSpacing: "0.05em",
						}}
					>
						Чистый воздух
					</span>
					<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>
						Подготовка воздуха перед началом рабочей смены
					</span>
				</div>
				<h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.05rem", fontWeight: 800, color: "var(--ink)" }}>
					Дезинфекция воздуха кабинетов и учет наработки ламп
				</h3>
				<p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
					Автоматическая фиксация утреннего обеззараживания и закрытия смены в соответствии с санитарным регламентом.
				</p>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
				<button
					type="button"
					onClick={onOpenMorningShift}
					aria-busy={submitting}
					className="sanpin-btn touch-manipulation"
					style={{
						minHeight: "44px",
						padding: "0.55rem 1.15rem",
						fontSize: "0.875rem",
						fontWeight: 800,
						cursor: "pointer",
						whiteSpace: "nowrap",
						display: "inline-flex",
						alignItems: "center",
						gap: "0.45rem",
						borderRadius: "8px",
						background: "var(--teal, #0d9488)",
						color: "#ffffff",
						border: "none",
						boxShadow: "0 2px 8px rgba(13, 148, 136, 0.3)",
						opacity: submitting ? 0.7 : 1,
					}}
					data-testid="bactericidal-open-morning-shift-btn"
					title="Открыть утреннюю смену: зафиксировать предсменное обеззараживание воздуха для всех аппаратов"
				>
					<Sun size={17} />
					<span>Открыть утреннюю смену (кварцевание 30 мин + норма)</span>
				</button>

				<button
					type="button"
					onClick={onCloseEveningShift}
					aria-busy={submitting}
					className="sanpin-btn touch-manipulation"
					style={{
						minHeight: "44px",
						padding: "0.55rem 1.15rem",
						fontSize: "0.875rem",
						fontWeight: 800,
						cursor: "pointer",
						whiteSpace: "nowrap",
						display: "inline-flex",
						alignItems: "center",
						gap: "0.45rem",
						borderRadius: "8px",
						background: "var(--brand-primary, #0284c7)",
						color: "#ffffff",
						border: "none",
						boxShadow: "0 2px 8px rgba(2, 132, 199, 0.3)",
						opacity: submitting ? 0.7 : 1,
					}}
					data-testid="bactericidal-close-evening-shift-btn"
					title="Закрыть вечернюю смену (финальная дезинфекция): фиксирует дневную смену 6 ч + заключительное обеззараживание 30 мин без ручного счета"
				>
					<Moon size={17} />
					<span>Закрыть вечернюю смену (финальная дезинфекция)</span>
				</button>
			</div>
		</div>
	);
}
