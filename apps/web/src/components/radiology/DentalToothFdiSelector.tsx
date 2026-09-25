import React from "react";
import {
	FDI_QUADRANTS,
	TOOTH_ANATOMICAL_NAMES,
} from "./dentalViewerMath";

export interface DentalToothFdiSelectorProps {
	readonly selectedToothFdi: string | null;
	readonly onSelectTooth: (toothFdi: string) => void;
	readonly onClearTooth?: () => void;
	readonly isCompact?: boolean;
}

export const DentalToothFdiSelector: React.FC<DentalToothFdiSelectorProps> = ({
	selectedToothFdi,
	onSelectTooth,
	onClearTooth,
	isCompact = false,
}) => {
	const renderToothBtn = (code: string) => {
		const isSelected = selectedToothFdi === code;
		const anatomicalName = TOOTH_ANATOMICAL_NAMES[code] || `Зуб ${code}`;

		return (
			<button
				key={code}
				type="button"
				data-testid={`btn-fdi-tooth-${code}`}
				onClick={() => onSelectTooth(code)}
				title={`${code} — ${anatomicalName}`}
				style={{
					minWidth: isCompact ? "24px" : "28px",
					height: isCompact ? "26px" : "30px",
					padding: "0 2px",
					fontSize: isCompact ? "11px" : "12px",
					fontFamily: "monospace, sans-serif",
					fontWeight: isSelected ? 800 : 600,
					borderRadius: "5px",
					border: isSelected
						? "1.5px solid var(--primary, #0d9488)"
						: "1px solid var(--line)",
					backgroundColor: isSelected
						? "var(--primary-hover, #0f766e)"
						: "var(--paper)",
					color: isSelected ? "var(--paper-contrast, #ffffff)" : "var(--ink)",
					cursor: "pointer",
					transition: "all 0.12s ease",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					boxShadow: isSelected ? "0 0 8px var(--shadow-primary, rgba(13, 148, 136, 0.35))" : "none",
				}}
			>
				{code}
			</button>
		);
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "6px",
				backgroundColor: "var(--paper-strong)",
				border: "1px solid var(--line)",
				borderRadius: "8px",
				padding: "8px 10px",
				userSelect: "none",
			}}
		>
			{/* Header / Active status */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					fontSize: "11px",
					color: "var(--muted)",
					gap: "8px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<span style={{ fontWeight: 700, color: "var(--ink)" }}>
						ФОРМУЛА FDI (11..48):
					</span>
					{selectedToothFdi ? (
						<span
							style={{
								padding: "1px 6px",
								borderRadius: "4px",
								backgroundColor: "var(--primary, #0d9488)",
								color: "var(--paper-contrast, #ffffff)",
								fontWeight: 700,
								fontFamily: "monospace",
								fontSize: "11px",
							}}
						>
							Зуб #{selectedToothFdi}
						</span>
					) : (
						<span style={{ color: "var(--muted)" }}>
							(снимок не привязан)
						</span>
					)}
				</div>

				<div style={{ display: "flex", gap: "6px" }}>
					<button
						type="button"
						onClick={() => onSelectTooth("OPG")}
						style={{
							height: "22px",
							padding: "0 6px",
							fontSize: "10px",
							fontWeight: 700,
							borderRadius: "4px",
							border: selectedToothFdi === "OPG" ? "1px solid var(--primary, #0d9488)" : "1px solid var(--line)",
							backgroundColor: selectedToothFdi === "OPG" ? "var(--teal-surface, var(--paper-soft))" : "var(--paper)",
							color: selectedToothFdi === "OPG" ? "var(--primary, #0d9488)" : "var(--muted)",
							cursor: "pointer",
						}}
						title="Привязать снимок ко всей челюсти (ОПТГ)"
					>
						ОПТГ / Панорама
					</button>
					{selectedToothFdi && onClearTooth && (
						<button
							type="button"
							onClick={onClearTooth}
							style={{
								height: "22px",
								padding: "0 6px",
								fontSize: "10px",
								borderRadius: "4px",
								border: "1px solid var(--line)",
								background: "transparent",
								color: "var(--muted)",
								cursor: "pointer",
							}}
							title="Сбросить привязку зуба"
						>
							Сброс
						</button>
					)}
				</div>
			</div>

			{/* Upper Arch (ВЧ: 18..11 | 21..28) */}
			<div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
				{/* Q1 Upper Right */}
				<div style={{ display: "flex", gap: "2px" }}>
					{FDI_QUADRANTS.q1_upper_right.map(renderToothBtn)}
				</div>
				<div
					style={{
						width: "1px",
						backgroundColor: "var(--line)",
						margin: "0 2px",
					}}
				/>
				{/* Q2 Upper Left */}
				<div style={{ display: "flex", gap: "2px" }}>
					{FDI_QUADRANTS.q2_upper_left.map(renderToothBtn)}
				</div>
			</div>

			{/* Lower Arch (НЧ: 48..41 | 31..38) */}
			<div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
				{/* Q4 Lower Right (arranged 48..41 to match anatomical right) */}
				<div style={{ display: "flex", gap: "2px" }}>
					{[...FDI_QUADRANTS.q4_lower_right].reverse().map(renderToothBtn)}
				</div>
				<div
					style={{
						width: "1px",
						backgroundColor: "var(--line)",
						margin: "0 2px",
					}}
				/>
				{/* Q3 Lower Left (arranged 31..38) */}
				<div style={{ display: "flex", gap: "2px" }}>
					{[...FDI_QUADRANTS.q3_lower_left].reverse().map(renderToothBtn)}
				</div>
			</div>
		</div>
	);
};
