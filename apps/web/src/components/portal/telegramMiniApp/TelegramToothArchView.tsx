/**
 * Continuous Arch View of Dental Formula in Telegram Mini App
 * (DOMAIN: TELEGRAM MINI APP - LAYER 4 SUBCOMPONENT)
 */

import React from "react";
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

export interface TelegramToothArchViewProps {
	dentitionMode: "adult" | "pediatric";
	sheetTooth: number | null;
	findComplaint: (num: number) => ToothComplaint | undefined;
	onOpenToothSheet: (num: number) => void;
}

export const TelegramToothArchView: React.FC<TelegramToothArchViewProps> = ({
	dentitionMode,
	sheetTooth,
	findComplaint,
	onOpenToothSheet,
}) => {
	const renderButton = (t: number) => (
		<TelegramToothButton
			key={t}
			toothNum={t}
			complaint={findComplaint(t)}
			isActive={sheetTooth === t}
			onClick={() => onOpenToothSheet(t)}
		/>
	);

	return (
		<div className="tg-arch-card">
			<div className="mb-3">
				<div className="text-[10px] uppercase font-bold text-[var(--tg-text-muted)] tracking-wider text-center mb-1.5">
					Верхняя челюсть
				</div>
				<div className="flex gap-1 justify-center overflow-x-auto py-1 scrollbar-none">
					{dentitionMode === "adult" ? (
						<>
							<div className="flex gap-1">{PERMANENT_TEETH_QUADRANT_1.map(renderButton)}</div>
							<div className="w-[1px] bg-[var(--tg-border)] mx-1 flex-shrink-0" />
							<div className="flex gap-1">{PERMANENT_TEETH_QUADRANT_2.map(renderButton)}</div>
						</>
					) : (
						<>
							<div className="flex gap-1">{DECIDUOUS_TEETH_QUADRANT_5.map(renderButton)}</div>
							<div className="w-[1px] bg-[var(--tg-border)] mx-1 flex-shrink-0" />
							<div className="flex gap-1">{DECIDUOUS_TEETH_QUADRANT_6.map(renderButton)}</div>
						</>
					)}
				</div>
			</div>

			<div>
				<div className="text-[10px] uppercase font-bold text-[var(--tg-text-muted)] tracking-wider text-center mb-1.5">
					Нижняя челюсть
				</div>
				<div className="flex gap-1 justify-center overflow-x-auto py-1 scrollbar-none">
					{dentitionMode === "adult" ? (
						<>
							<div className="flex gap-1">{PERMANENT_TEETH_QUADRANT_4.map(renderButton)}</div>
							<div className="w-[1px] bg-slate-700/80 mx-1 flex-shrink-0" />
							<div className="flex gap-1">{PERMANENT_TEETH_QUADRANT_3.map(renderButton)}</div>
						</>
					) : (
						<>
							<div className="flex gap-1">{DECIDUOUS_TEETH_QUADRANT_8.map(renderButton)}</div>
							<div className="w-[1px] bg-slate-700/80 mx-1 flex-shrink-0" />
							<div className="flex gap-1">{DECIDUOUS_TEETH_QUADRANT_7.map(renderButton)}</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};
