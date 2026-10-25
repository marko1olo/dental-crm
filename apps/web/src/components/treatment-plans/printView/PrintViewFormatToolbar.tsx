/**
 * PrintViewFormatToolbar.tsx — переключатель формата печатного документа плана лечения
 * (пациентский / официальное приложение) + микрорасходники + быстрая печать.
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import React from "react";
import { Printer } from "lucide-react";

export interface PrintViewFormatToolbarProps {
	readonly printDocFormat: "patient_friendly" | "official_appendix";
	readonly setPrintDocFormat: (format: "patient_friendly" | "official_appendix") => void;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables: (val: boolean) => void;
	readonly onOpenFastPrint: () => void;
}

export const PrintViewFormatToolbar: React.FC<PrintViewFormatToolbarProps> = ({
	printDocFormat,
	setPrintDocFormat,
	showMicroConsumables,
	setShowMicroConsumables,
	onOpenFastPrint,
}) => {
	const formatButton = (
		format: "patient_friendly" | "official_appendix",
		label: string,
	) => (
		<button
			type="button"
			onClick={() => setPrintDocFormat(format)}
			className={`h-9 min-h-[36px] px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
				printDocFormat === format
					? "bg-teal-600 text-white border-teal-600 shadow-xs"
					: "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
			}`}
			aria-pressed={printDocFormat === format}
		>
			{label}
		</button>
	);

	return (
		<div className="flex items-center justify-between gap-3 px-6 py-3.5 bg-slate-50 border-b border-slate-200 print:hidden">
			<div className="flex items-center gap-2">
				<span className="text-sm font-bold text-slate-800">Документ плана лечения</span>
				{formatButton("patient_friendly", "Пациентский формат")}
				{formatButton("official_appendix", "Официальное приложение")}
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => setShowMicroConsumables(!showMicroConsumables)}
					className={`h-9 min-h-[36px] px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
						showMicroConsumables
							? "bg-slate-800 text-white border-slate-800"
							: "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
					}`}
					aria-pressed={showMicroConsumables}
					title="Показывать микрорасходники (перчатки, анестетик, салфетки) в приложении"
				>
					Микрорасходники
				</button>
				<button
					type="button"
					onClick={onOpenFastPrint}
					className="primary-button h-9 min-h-[36px] px-4 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
					data-testid="print-view-format-fast-print-btn"
				>
					<Printer size={14} />
					<span>Быстрая печать</span>
				</button>
			</div>
		</div>
	);
};
