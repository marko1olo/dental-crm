import React from "react";

export interface DentalLabCharacterizationCheckboxesProps {
	readonly mamelons?: boolean | undefined;
	readonly onMamelonsChange?: ((m: boolean) => void) | undefined;
	readonly calcifications?: boolean | undefined;
	readonly onCalcificationsChange?: ((c: boolean) => void) | undefined;
	readonly opalescence?: boolean | undefined;
	readonly onOpalescenceChange?: ((o: boolean) => void) | undefined;
}

export function DentalLabCharacterizationCheckboxes({
	mamelons,
	onMamelonsChange,
	calcifications,
	onCalcificationsChange,
	opalescence,
	onOpalescenceChange,
}: DentalLabCharacterizationCheckboxesProps): React.JSX.Element {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
			<label className="min-h-[44px] inline-flex items-center gap-2 p-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] cursor-pointer">
				<input
					type="checkbox"
					checked={Boolean(mamelons)}
					onChange={(e) => onMamelonsChange?.(e.target.checked)}
					className="w-4 h-4 accent-teal-600 rounded"
					data-testid="mamelons-checkbox"
				/>
				<span className="font-semibold text-[11px]">Мамелоны края</span>
			</label>
			<label className="min-h-[44px] inline-flex items-center gap-2 p-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] cursor-pointer">
				<input
					type="checkbox"
					checked={Boolean(calcifications)}
					onChange={(e) => onCalcificationsChange?.(e.target.checked)}
					className="w-4 h-4 accent-teal-600 rounded"
					data-testid="calcifications-checkbox"
				/>
				<span className="font-semibold text-[11px]">Кальцификаты</span>
			</label>
			{onOpalescenceChange && (
				<label className="min-h-[44px] inline-flex items-center gap-2 p-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] cursor-pointer">
					<input
						type="checkbox"
						checked={Boolean(opalescence)}
						onChange={(e) => onOpalescenceChange(e.target.checked)}
						className="w-4 h-4 accent-teal-600 rounded"
						data-testid="opalescence-checkbox"
					/>
					<span className="font-semibold text-[11px]">Опалесценция</span>
				</label>
			)}
		</div>
	);
}
