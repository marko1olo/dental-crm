import type React from "react";
import type { ToothComplaint } from "./toothPickerTypes.js";
import { TOOTH_COMPLAINT_CATALOG } from "./toothPickerTypes.js";

export interface ToothPickerQuadrantViewProps {
	readonly dentitionMode: "adult" | "pediatric";
	readonly activeQuadrant: number;
	readonly onSelectQuadrant: (q: number) => void;
	readonly currentQuadrantTeeth: { title: string; teeth: readonly number[] };
	readonly selectedComplaints: readonly ToothComplaint[];
	readonly activeSheetTooth: number | null;
	readonly onOpenTooth: (toothNum: number) => void;
}

export function ToothPickerQuadrantView({
	dentitionMode,
	activeQuadrant,
	onSelectQuadrant,
	currentQuadrantTeeth,
	selectedComplaints,
	activeSheetTooth,
	onOpenTooth,
}: ToothPickerQuadrantViewProps): React.JSX.Element {
	const quadrantTabs = [
		{ id: 1, label: dentitionMode === "adult" ? "1 Вверх Пр" : "5 Вверх Пр", sub: "18-11" },
		{ id: 2, label: dentitionMode === "adult" ? "2 Вверх Лв" : "6 Вверх Лв", sub: "21-28" },
		{ id: 3, label: dentitionMode === "adult" ? "3 Низ Лв" : "7 Низ Лв", sub: "31-38" },
		{ id: 4, label: dentitionMode === "adult" ? "4 Низ Пр" : "8 Низ Пр", sub: "48-41" },
	];

	return (
		<div className="tg-quadrant-card">
			<div className="grid grid-cols-4 gap-1.5 mb-3">
				{quadrantTabs.map((q) => (
					<button
						key={q.id}
						type="button"
						className={`tg-quadrant-tab ${activeQuadrant === q.id ? "active" : ""}`}
						onClick={() => onSelectQuadrant(q.id)}
					>
						<span className="text-[11px] font-bold">{q.label}</span>
					</button>
				))}
			</div>

			<div className="text-center text-xs text-[var(--tg-text-muted)] mb-2">
				{currentQuadrantTeeth.title} • <span className="text-[var(--tg-accent)]">Нажмите на зуб для выбора симптома</span>
			</div>

			<div className="grid grid-cols-4 gap-2 py-1">
				{currentQuadrantTeeth.teeth.map((toothNum) => {
					const complaint = selectedComplaints.find((c) => c.toothNumber === toothNum);
					const isSheetOpen = activeSheetTooth === toothNum;
					const catalogItem = complaint ? TOOTH_COMPLAINT_CATALOG.find((c) => c.id === complaint.complaintType) : null;

					return (
						<button
							key={toothNum}
							type="button"
							className={`tg-tooth-cell ${complaint ? "has-complaint" : ""} ${isSheetOpen ? "is-active" : ""} ${catalogItem?.badgeClass || ""}`}
							onClick={() => onOpenTooth(toothNum)}
							aria-label={`Зуб ${toothNum}${complaint ? `, жалоба: ${complaint.symptomLabel}` : ""}`}
						>
							<span className="tg-tooth-num">{toothNum}</span>
							{complaint && (
								<span className="tg-tooth-indicator">
									{complaint.complaintType === "acute_throbbing" && "⚡"}
									{complaint.complaintType === "fracture_filling" && "🦷"}
									{complaint.complaintType === "food_impaction_caries" && "🕳️"}
									{complaint.complaintType === "temperature_sensitivity" && "❄️"}
									{complaint.complaintType === "crown_implant" && "👑"}
								</span>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
