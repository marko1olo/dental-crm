/**
 * VisiographToolbarToothBinder.tsx
 * Tooth FDI formula binding button and full quadrant popover selector (11..48).
 */

import { ChevronDown } from "lucide-react";
import React from "react";

export interface VisiographToolbarToothBinderProps {
	effectiveTooth: string;
	isToothMenuOpen: boolean;
	setIsToothMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	onToothChange?: ((tooth: string) => void) | undefined;
}

export function VisiographToolbarToothBinder({
	effectiveTooth,
	isToothMenuOpen,
	setIsToothMenuOpen,
	onToothChange,
}: VisiographToolbarToothBinderProps) {
	const renderQuadrant = (teeth: string[]) => (
		<div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "2px" }}>
			{teeth.map((t) => (
				<button
					key={t}
					type="button"
					onClick={() => {
						onToothChange?.(t);
						setIsToothMenuOpen(false);
					}}
					className={`visiograph-popout-item ${effectiveTooth === t ? "is-active" : ""}`}
					style={{ height: "24px", justifyContent: "center", padding: "0", fontSize: "11px", fontWeight: 700 }}
				>
					{t}
				</button>
			))}
		</div>
	);

	return (
		<div className="visiograph-toolbar-cluster" style={{ position: "relative" }}>
			<button
				type="button"
				className="visiograph-tooth-badge"
				data-testid="btn-bind-tooth-formula"
				onClick={() => setIsToothMenuOpen((prev) => !prev)}
				title="Привязать снимок к зубу на зубной формуле (FDI 11..48)"
				aria-label="Привязать к зубу на формуле"
			>
				<span>Зуб #{effectiveTooth}</span>
				<ChevronDown size={11} />
			</button>

			{isToothMenuOpen && (
				<div
					className="visiograph-popout-menu"
					style={{ left: 0, width: "220px", padding: "6px" }}
					role="dialog"
					aria-label="Выбор зуба FDI"
				>
					<div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px" }}>
						Зубная формула (FDI)
					</div>
					<div style={{ marginBottom: "3px" }}>{renderQuadrant(["18", "17", "16", "15", "14", "13", "12", "11"])}</div>
					<div style={{ marginBottom: "6px" }}>{renderQuadrant(["21", "22", "23", "24", "25", "26", "27", "28"])}</div>
					<div style={{ marginBottom: "3px" }}>{renderQuadrant(["48", "47", "46", "45", "44", "43", "42", "41"])}</div>
					<div>{renderQuadrant(["31", "32", "33", "34", "35", "36", "37", "38"])}</div>
				</div>
			)}
		</div>
	);
}
