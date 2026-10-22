import React from "react";
import type { VisitSoapNoteValues } from "./types";

export interface SoapAnamnesisSectionProps {
	readonly values: VisitSoapNoteValues;
	readonly onFieldChange: (field: keyof VisitSoapNoteValues, val: string) => void;
	readonly onInputFocus: (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
	readonly onInputBlur: () => void;
}

export const SoapAnamnesisSection: React.FC<SoapAnamnesisSectionProps> = ({
	values,
	onFieldChange,
	onInputFocus,
	onInputBlur,
}) => {
	const flushDraft = onInputBlur;
	return (
		<>
			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<label htmlFor="soap-complaints" className="text-xs font-bold text-[var(--ink)]">
						Жалобы
					</label>
					<span className="text-[10px] text-[var(--muted)]">Дневник</span>
				</div>
				<textarea
					id="soap-complaints"
					rows={3}
					value={values.complaint || ""}
					onChange={(e) => onFieldChange("complaint", e.target.value)}
					onFocus={onInputFocus}
					onBlur={flushDraft}
					placeholder="Боль при приеме пищи, ночные боли, выпадение пломбы..."
					className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
					style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
				/>
			</div>

			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<label htmlFor="soap-anamnesis" className="text-xs font-bold text-[var(--ink)]">
						Анамнез и противопоказания
					</label>
					<span className="text-[10px] text-[var(--muted)]">Аллергоанамнез</span>
				</div>
				<textarea
					id="soap-anamnesis"
					rows={3}
					value={values.anamnesis || ""}
					onChange={(e) => onFieldChange("anamnesis", e.target.value)}
					onFocus={onInputFocus}
					onBlur={flushDraft}
					placeholder="Зуб ранее лечен, боли возникли 2 дня назад. Соматически здоров..."
					className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
					style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
				/>
			</div>

			<div className="flex flex-col gap-1 md:col-span-2">
				<div className="flex items-center justify-between">
					<label htmlFor="soap-objective" className="text-xs font-bold text-[var(--ink)]">
						Осмотр и зубная формула
					</label>
					<span className="text-[10px] text-[var(--muted)]">
						Зондирование, перкуссия, ЭОД, КЛКТ
					</span>
				</div>
				<textarea
					id="soap-objective"
					rows={3}
					value={values.objectiveStatus || ""}
					onChange={(e) => onFieldChange("objectiveStatus", e.target.value)}
					onFocus={onInputFocus}
					onBlur={onInputBlur}
					placeholder="Кариозная полость средней глубины на окклюзионной поверхности, зондирование слабо болезненно..."
					className="w-full p-2 text-xs bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg focus:ring-1 focus:ring-[var(--teal)] focus:outline-none resize-y touch-manipulation"
					style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
				/>
			</div>
		</>
	);
};
