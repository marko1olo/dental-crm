/**
 * Tooth Quadrants View in Telegram Mini App (Apple HIG 56px touch ergonomics)
 * (DOMAIN: TELEGRAM MINI APP - LAYER 4 SUBCOMPONENT)
 */

import React, { useMemo } from "react";
import {
	DECIDUOUS_TEETH_QUADRANT_5,
	DECIDUOUS_TEETH_QUADRANT_6,
	DECIDUOUS_TEETH_QUADRANT_7,
	DECIDUOUS_TEETH_QUADRANT_8,
	PERMANENT_TEETH_QUADRANT_1,
	PERMANENT_TEETH_QUADRANT_2,
	PERMANENT_TEETH_QUADRANT_3,
	PERMANENT_TEETH_QUADRANT_4,
} from "@dental/shared";
import { TelegramToothButton } from "./TelegramToothButton.js";
import type { ToothComplaint } from "./toothPickerTypes.js";

export interface TelegramToothQuadrantViewProps {
	dentitionMode: "adult" | "pediatric";
	activeQuadrant: number;
	sheetTooth: number | null;
	findComplaint: (num: number) => ToothComplaint | undefined;
	onSelectQuadrant: (quad: number) => void;
	onOpenToothSheet: (num: number) => void;
}

export const TelegramToothQuadrantView: React.FC<TelegramToothQuadrantViewProps> = ({
	dentitionMode,
	activeQuadrant,
	sheetTooth,
	findComplaint,
	onSelectQuadrant,
	onOpenToothSheet,
}) => {
	const currentQuadrantTeeth = useMemo(() => {
		if (dentitionMode === "adult") {
			if (activeQuadrant === 1) return { title: "Верхний правый (18–11)", teeth: PERMANENT_TEETH_QUADRANT_1 };
			if (activeQuadrant === 2) return { title: "Верхний левый (21–28)", teeth: PERMANENT_TEETH_QUADRANT_2 };
			if (activeQuadrant === 3) return { title: "Нижний левый (31–38)", teeth: PERMANENT_TEETH_QUADRANT_3 };
			return { title: "Нижний правый (48–41)", teeth: PERMANENT_TEETH_QUADRANT_4 };
		}
		if (activeQuadrant === 1) return { title: "Верхний правый молочный (55–51)", teeth: DECIDUOUS_TEETH_QUADRANT_5 };
		if (activeQuadrant === 2) return { title: "Верхний левый молочный (61–65)", teeth: DECIDUOUS_TEETH_QUADRANT_6 };
		if (activeQuadrant === 3) return { title: "Нижний левый молочный (71–75)", teeth: DECIDUOUS_TEETH_QUADRANT_7 };
		return { title: "Нижний правый молочный (85–81)", teeth: DECIDUOUS_TEETH_QUADRANT_8 };
	}, [activeQuadrant, dentitionMode]);

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
				{currentQuadrantTeeth.teeth.map((toothNum) => (
					<TelegramToothButton
						key={toothNum}
						toothNum={toothNum}
						complaint={findComplaint(toothNum)}
						isActive={sheetTooth === toothNum}
						onClick={() => onOpenToothSheet(toothNum)}
					/>
				))}
			</div>
		</div>
	);
};
