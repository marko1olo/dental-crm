/**
 * PieceRatePresetsBar.tsx
 *
 * Карточки быстрых пресетов моделей оплаты труда врачей.
 * Соответствует Apple HIG и правилам эргономики клиники (ноль эмодзи).
 */

import React from "react";
import { PIECE_RATE_PRESETS, type PieceRatePreset } from "./pieceRateTypes";

export interface PieceRatePresetsBarProps {
	readonly activePresetId: string;
	readonly onApplyPreset: (preset: PieceRatePreset) => void;
}

export const PieceRatePresetsBar: React.FC<PieceRatePresetsBarProps> = ({
	activePresetId,
	onApplyPreset,
}) => {
	return (
		<div
			className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] mb-4 space-y-2.5"
			style={{
				border: "1px solid var(--line)",
				borderRadius: "12px",
				background: "var(--paper-soft, rgba(148, 163, 184, 0.05))",
			}}
		>
			<span className="text-xs font-bold text-[var(--ink)] block">
				Типовые отраслевые модели оплаты труда:
			</span>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
				{PIECE_RATE_PRESETS.map((preset) => {
					const isActive = activePresetId === preset.id;
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onApplyPreset(preset)}
							className="p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between min-h-[44px]"
							style={{
								border: isActive
									? "1.5px solid var(--teal)"
									: "1px solid var(--line)",
								background: isActive
									? "var(--teal-soft, rgba(20, 184, 166, 0.1))"
									: "var(--paper)",
								borderRadius: "10px",
								padding: "10px 12px",
							}}
							data-testid={`piece-rate-preset-${preset.id}`}
						>
							<div>
								<span className="text-xs font-bold text-[var(--ink)] block">
									{preset.title}
								</span>
								<span className="text-[11px] text-[var(--muted)] block mt-1 line-clamp-2">
									{preset.description}
								</span>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};
