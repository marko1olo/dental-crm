import React from "react";
import type { EndoCanalData } from "@dental/shared";
import {
	CURATED_ISO_MAF_OPTIONS,
	EXTENDED_MAF_ISO_OPTIONS,
	TAPER_OPTIONS,
} from "../endoCanalConstants";

interface MobileMafTaperSelectsProps {
	readonly canal: EndoCanalData;
	readonly onChange: (id: string, field: keyof EndoCanalData, value: any) => void;
	readonly renderIsoColorBadge?: ((mafOption: string) => React.ReactNode) | undefined;
}

export const MobileMafTaperSelects: React.FC<MobileMafTaperSelectsProps> = ({
	canal,
	onChange,
}) => (
	<>
		<div>
			<label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
				Мастер-файл (MAF):
			</label>
			<div className="flex items-center gap-2">
				<select
					aria-label={`MAF моб ${canal.canalName}`}
					value={canal.masterApicalFile}
					onChange={(e) => onChange(canal.id, "masterApicalFile", e.target.value)}
					className="w-full min-h-[44px] px-3 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500 outline-none"
				>
					<optgroup label="Основные размеры MAF">
						{CURATED_ISO_MAF_OPTIONS.map((opt) => (
							<option key={opt} value={opt}>
								{opt}
							</option>
						))}
					</optgroup>
					<optgroup label="Дополнительные размеры">
						{EXTENDED_MAF_ISO_OPTIONS.map((opt) => (
							<option key={opt} value={opt}>
								{opt}
							</option>
						))}
					</optgroup>
				</select>
			</div>
		</div>

		<div>
			<label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
				Конусность:
			</label>
			<select
				aria-label={`Конусность моб ${canal.canalName}`}
				value={canal.taper}
				onChange={(e) => onChange(canal.id, "taper", e.target.value)}
				className="w-full min-h-[44px] px-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs font-mono focus:ring-2 focus:ring-rose-500 outline-none"
			>
				{TAPER_OPTIONS.map((opt) => (
					<option key={opt} value={opt}>
						{opt}
					</option>
				))}
			</select>
		</div>
	</>
);
