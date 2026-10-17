import React from "react";
import { TrendingUp } from "lucide-react";

export interface ImplantIsqControlsProps {
	readonly isqValue: number;
	readonly setIsqValue: (val: number) => void;
	readonly isIsqEnabled: boolean;
	readonly setIsIsqEnabled: (val: boolean) => void;
}

export const ImplantIsqControls: React.FC<ImplantIsqControlsProps> = ({
	isqValue,
	setIsqValue,
	isIsqEnabled,
	setIsIsqEnabled,
}) => {
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<span className="text-xs font-black uppercase text-[var(--muted)] tracking-wider flex items-center gap-1.5">
					<TrendingUp size={15} className="text-[var(--teal,#0d9488)]" />
					<span>Показатель стабилометрии ISQ День 0 (Osstell / Penguin RFA):</span>
				</span>
				<span className="text-sm font-mono font-black text-[var(--teal,#0d9488)]">
					{isqValue} ISQ
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
				<div className="flex flex-col gap-1">
					<label htmlFor="input-isq-day0" className="text-xs font-bold text-[var(--ink)]">
						Числовое значение ISQ (шкала 35–85):
					</label>
					<input
						id="input-isq-day0"
						type="number"
						min="35"
						max="85"
						value={isqValue}
						onChange={(e) => {
							const val = Number(e.target.value);
							if (!isNaN(val)) setIsqValue(val);
						}}
						className="min-h-[48px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-mono font-bold text-[var(--ink)]"
						data-testid="input-isq-day0"
						aria-label="Числовое значение ISQ День 0"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label htmlFor="slider-isq-day0" className="text-xs font-bold text-[var(--ink)]">
						Ползунок стабилометрии:
					</label>
					<input
						id="slider-isq-day0"
						type="range"
						min="35"
						max="85"
						step="1"
						value={isqValue}
						onChange={(e) => setIsqValue(Number(e.target.value))}
						className="w-full h-3 bg-[var(--line)] rounded-lg appearance-none cursor-pointer accent-[var(--teal,#0d9488)] mt-2"
						data-testid="slider-isq-day0"
						aria-label="Ползунок шкалы ISQ"
					/>
				</div>
			</div>

			<div className="flex flex-wrap gap-2 pt-1">
				<button
					type="button"
					onClick={() => {
						setIsqValue(55);
						setIsIsqEnabled(true);
					}}
					className={`secondary-button text-xs ${isqValue === 55 && isIsqEnabled ? "active" : ""}`}
					data-testid="btn-isq-preset-55"
				>
					ISQ 55 (&lt; 60: Низкая)
				</button>
				<button
					type="button"
					onClick={() => {
						setIsqValue(68);
						setIsIsqEnabled(true);
					}}
					className={`secondary-button text-xs ${isqValue === 68 && isIsqEnabled ? "active" : ""}`}
					data-testid="btn-isq-preset-68"
				>
					ISQ 68 (60–70: Стандарт)
				</button>
				<button
					type="button"
					onClick={() => {
						setIsqValue(75);
						setIsIsqEnabled(true);
					}}
					className={`secondary-button text-xs ${isqValue === 75 && isIsqEnabled ? "active" : ""}`}
					data-testid="btn-isq-preset-75"
				>
					ISQ 75 (&gt; 70: Высокая)
				</button>
			</div>
		</div>
	);
};
