/**
 * apps/web/src/components/perio/PerioPrintFooter.tsx
 *
 * Профессиональный печатный футер A4 пародонтологического протокола (Мандат 8e / 8x).
 * Подпись врача и штамп клиники при выводе на печать (@media print).
 * Mandate 8b: File <= 50 lines.
 */

import React from "react";

export interface PerioPrintFooterProps {
	readonly patientName: string;
}

export const PerioPrintFooter: React.FC<PerioPrintFooterProps> = React.memo(({ patientName }) => {
	const formattedDate = new Date().toLocaleDateString("ru-RU");

	return (
		<div className="hidden print:flex flex-col gap-4 pt-6 mt-4 border-t-2 border-black text-xs text-black perio-print-footer">
			<div className="flex justify-between items-center">
				<span>Дата обследования: {formattedDate}</span>
				<span>Пациент: {patientName}</span>
			</div>
			<div className="flex justify-between items-center pt-4">
				<span>Врач-стоматолог: ____________________ / ____________________</span>
				<span>Подпись: ____________________ (М.П.)</span>
			</div>
		</div>
	);
});

PerioPrintFooter.displayName = "PerioPrintFooter";
