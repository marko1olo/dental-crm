/**
 * ExportComplianceBanner.tsx — Индикатор соответствия требованиям 152-ФЗ РФ (Мандат 8b <= 120 строк).
 */

import React from "react";
import { ShieldCheck } from "lucide-react";

interface ExportComplianceBannerProps {
	isAnonymized: boolean;
	onToggleAnonymized: (val: boolean) => void;
}

export const ExportComplianceBanner: React.FC<ExportComplianceBannerProps> = ({
	isAnonymized,
	onToggleAnonymized,
}) => {
	return (
		<div
			className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
				isAnonymized
					? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
					: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
			}`}
		>
			<div className="flex items-start gap-2 min-w-0">
				<ShieldCheck size={18} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
				<div className="flex flex-col min-w-0 text-xs">
					<strong className="font-semibold">
						{isAnonymized ? "Защита 152-ФЗ активна: ПДн обезличены" : "Экспорт с персональными данными"}
					</strong>
					<span className="text-[11px] opacity-85">
						{isAnonymized
							? "ФИО, дата рождения и паспортные данные скрыты из графического бланка"
							: "Внимание: передача третьим лицам требует согласия субъекта ПДн"}
					</span>
				</div>
			</div>
			<label className="flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[44px] select-none text-xs font-semibold">
				<input
					type="checkbox"
					checked={isAnonymized}
					onChange={(e) => onToggleAnonymized(e.target.checked)}
					data-testid="checkbox-152fz-anonymize"
					className="w-4 h-4 rounded accent-[var(--teal,#0d9488)] cursor-pointer"
				/>
				<span>152-ФЗ</span>
			</label>
		</div>
	);
};
