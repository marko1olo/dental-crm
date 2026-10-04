/**
 * apps/web/src/components/odontogram/MobileQuadrantTabs.tsx
 *
 * DENTE Dental CRM — Apple HIG Mobile Quadrant Selector (Mandate 8c, MOBILE_DESIGN_APPLE_HIG §3.3)
 *
 * Replaces the cramped 16-tooth squeezed dual-arch with an ergonomic 2x2 anatomical
 * quadrant matrix tailored specifically for chairside smartphone thumb zones.
 *
 * Layout:
 * [ Q1 Верх-Пр (18–11) | Q2 Верх-Лев (21–28) ]
 * [ Q4 Низ-Пр  (48–41) | Q3 Низ-Лев  (31–38) ]
 * + Optional "Все зубы" pill for overview.
 */

import React, { memo } from "react";
import type { OdontogramQuadrantId } from "./chart/toothChartTypes";
import { triggerHaptic } from "../../native/mobileBridge";

export interface MobileQuadrantTabsProps {
	readonly currentQuadrant: OdontogramQuadrantId;
	readonly onSelectQuadrant: (q: OdontogramQuadrantId) => void;
	readonly isPediatricEffective: boolean;
	readonly isMixedEffective?: boolean | undefined;
	readonly showAllOption?: boolean | undefined;
	readonly className?: string | undefined;
}

export const MobileQuadrantTabs: React.FC<MobileQuadrantTabsProps> = memo(({
	currentQuadrant,
	onSelectQuadrant,
	isPediatricEffective,
	isMixedEffective = false,
	showAllOption = true,
	className = "",
}) => {
	const allTeethCount = isMixedEffective
		? "24"
		: isPediatricEffective
			? "20"
			: "32";

	const handleSelect = (q: OdontogramQuadrantId) => {
		triggerHaptic("selection");
		onSelectQuadrant(q);
	};

	const q1Id: OdontogramQuadrantId = isPediatricEffective ? "Q5" : "Q1";
	const q2Id: OdontogramQuadrantId = isPediatricEffective ? "Q6" : "Q2";
	const q4Id: OdontogramQuadrantId = isPediatricEffective ? "Q8" : "Q4";
	const q3Id: OdontogramQuadrantId = isPediatricEffective ? "Q7" : "Q3";

	const quadrants = [
		{
			id: q1Id,
			label: isPediatricEffective ? "Q5" : "Q1",
			teethRange: isPediatricEffective ? "55–51" : "18–11",
			jawName: "Верх-Пр",
			badge: "ВЧ·П",
			title: isPediatricEffective ? "Q5 (Верхняя челюсть, Правый, 55–51)" : "Q1 (Верхняя челюсть, Правый, 18–11)",
			testId: `mobile-quadrant-btn-${q1Id}`,
		},
		{
			id: q2Id,
			label: isPediatricEffective ? "Q6" : "Q2",
			teethRange: isPediatricEffective ? "61–65" : "21–28",
			jawName: "Верх-Лев",
			badge: "ВЧ·Л",
			title: isPediatricEffective ? "Q6 (Верхняя челюсть, Левый, 61–65)" : "Q2 (Верхняя челюсть, Левый, 21–28)",
			testId: `mobile-quadrant-btn-${q2Id}`,
		},
		{
			id: q4Id,
			label: isPediatricEffective ? "Q8" : "Q4",
			teethRange: isPediatricEffective ? "85–81" : "48–41",
			jawName: "Низ-Пр",
			badge: "НЧ·П",
			title: isPediatricEffective ? "Q8 (Нижняя челюсть, Правый, 85–81)" : "Q4 (Нижняя челюсть, Правый, 48–41)",
			testId: `mobile-quadrant-btn-${q4Id}`,
		},
		{
			id: q3Id,
			label: isPediatricEffective ? "Q7" : "Q3",
			teethRange: isPediatricEffective ? "71–75" : "31–38",
			jawName: "Низ-Лев",
			badge: "НЧ·Л",
			title: isPediatricEffective ? "Q7 (Нижняя челюсть, Левый, 71–75)" : "Q3 (Нижняя челюсть, Левый, 31–38)",
			testId: `mobile-quadrant-btn-${q3Id}`,
		},
	];

	return (
		<div
			className={`mobile-quadrant-tabs-container w-full flex flex-col gap-1.5 p-1.5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft))] border border-[var(--odontogram-border-subtle,var(--line))] shadow-2xs select-none ${className}`.trim()}
			data-testid="mobile-quadrant-tabs"
		>
			{/* Top Bar with All Teeth Toggle and Indicator */}
			<div className="flex items-center justify-between px-1 gap-2">
				<div className="flex items-center gap-1.5">
					<span className="w-2 h-2 rounded-full bg-[var(--teal,#0d9488)] animate-pulse" />
					<span className="text-[11px] font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted))]">
						Квадранты FDI (8 зубов)
					</span>
				</div>
				{showAllOption && (
					<button
						type="button"
						onClick={() => handleSelect("all")}
						className={`mobile-quadrant-all-btn min-h-[28px] h-7 px-2.5 rounded-lg text-[11px] font-black border transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
							currentQuadrant === "all"
								? "active bg-teal-600 text-white border-teal-700 shadow-xs"
								: "bg-[var(--odontogram-paper,var(--paper))] text-[var(--odontogram-ink-muted,var(--muted))] hover:text-[var(--odontogram-ink,var(--ink))] border-[var(--odontogram-border,var(--line))]"
						}`}
						style={currentQuadrant === "all" ? { backgroundColor: "#0d9488", color: "#ffffff", borderColor: "#0f766e" } : undefined}
						title="Показать полную зубную дугу"
						data-testid="mobile-quadrant-btn-all"
					>
						<span>Все ({allTeethCount})</span>
					</button>
				)}
			</div>

			{/* 2x2 Anatomical Quadrant Segmented Grid */}
			<div className="grid grid-cols-2 gap-1.5 w-full">
				{quadrants.map((quad) => {
					const isActive = currentQuadrant === quad.id;
					return (
						<button
							key={quad.id}
							type="button"
							onClick={() => handleSelect(quad.id)}
							title={quad.title}
							data-testid={quad.testId}
							style={isActive ? { backgroundColor: "#0d9488", color: "#ffffff", borderColor: "#0f766e" } : undefined}
							className={`mobile-quadrant-btn min-h-[44px] h-[44px] px-2.5 py-1.5 rounded-xl font-bold flex items-center justify-between gap-1.5 border transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
								isActive
									? "active bg-teal-600 text-white border-teal-700 shadow-sm font-black ring-2 ring-teal-500/40"
									: "bg-[var(--odontogram-paper,var(--paper))] text-[var(--odontogram-ink,var(--ink))] border-[var(--odontogram-border,var(--line))] hover:border-teal-500 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong))]"
							}`}
						>
							<div className="flex items-center gap-1.5 min-w-0">
								<span className={`text-[14px] font-black font-mono leading-none ${isActive ? "text-white" : "text-[var(--odontogram-ink,var(--ink))]"}`}>
									{quad.label}
								</span>
								<span className={`text-[12px] font-extrabold font-mono truncate leading-none ${isActive ? "text-white/95" : "text-[var(--odontogram-ink-muted,var(--muted))]"}`}>
									{quad.teethRange}
								</span>
							</div>

							<span
								className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded-md uppercase tracking-tight shrink-0 ${
									isActive
										? "bg-black/30 text-white"
										: "bg-[var(--odontogram-surface,var(--paper-soft))] text-[var(--odontogram-ink-muted,var(--muted))] border border-[var(--odontogram-border-subtle,var(--line))]"
								}`}
							>
								{quad.badge}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
});

MobileQuadrantTabs.displayName = "MobileQuadrantTabs";
