import React from "react";
import { Check } from "lucide-react";
import type { VisitSoapNoteValues } from "./types";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export const NORM_COMPLAINT_TEXT =
	"Жалоб на момент осмотра активно не предъявляет. Обратился(лась) для планового профилактического осмотра и санации полости рта.";
export const NORM_ANAMNESIS_TEXT =
	"Соматически здоров. Аллергологический анамнез не отягощен. Хронические и инфекционные заболевания со слов отрицает.";
export const NORM_OBJECTIVE_TEXT =
	"Слизистая оболочка полости рта бледно-розовая, влажная, без видимых патологических элементов. Прикус физиологический. Зондирование и перкуссия безболезненны, подвижность зубов отсутствует.";

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
				<div className="flex items-center justify-between flex-wrap gap-1.5">
					<label htmlFor="soap-complaints" className="text-xs font-bold text-[var(--ink)]">
						Жалобы
					</label>
					<div className="flex items-center gap-1.5">
						<SmartMicrophoneButton
							context="visit"
							title="Голосовая диктовка жалоб"
							onResult={(text) => onFieldChange("complaint", values.complaint ? `${values.complaint} ${text}` : text)}
						/>
						<button
							type="button"
							onClick={() => onFieldChange("complaint", NORM_COMPLAINT_TEXT)}
							data-testid="btn-soap-complaints-norm"
							className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
								values.complaint === NORM_COMPLAINT_TEXT
									? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
									: "bg-[var(--paper)] text-[var(--teal)] border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
							}`}
							title="Зафиксировать норму в 1 клик: жалоб нет"
						>
							<Check className="w-3 h-3 text-[var(--teal)]" />
							<span>Жалоб нет</span>
						</button>
					</div>
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
				<div className="flex items-center justify-between flex-wrap gap-1.5">
					<label htmlFor="soap-anamnesis" className="text-xs font-bold text-[var(--ink)]">
						Анамнез и противопоказания
					</label>
					<div className="flex items-center gap-1.5">
						<SmartMicrophoneButton
							context="visit"
							title="Голосовая диктовка анамнеза"
							onResult={(text) => onFieldChange("anamnesis", values.anamnesis ? `${values.anamnesis} ${text}` : text)}
						/>
						<button
							type="button"
							onClick={() => onFieldChange("anamnesis", NORM_ANAMNESIS_TEXT)}
							data-testid="btn-soap-anamnesis-norm"
							className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
								values.anamnesis === NORM_ANAMNESIS_TEXT
									? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
									: "bg-[var(--paper)] text-[var(--teal)] border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
							}`}
							title="Зафиксировать норму в 1 клик: соматически здоров"
						>
							<Check className="w-3 h-3 text-[var(--teal)]" />
							<span>Соматически здоров</span>
						</button>
					</div>
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
				<div className="flex items-center justify-between flex-wrap gap-1.5">
					<label htmlFor="soap-objective" className="text-xs font-bold text-[var(--ink)]">
						Осмотр и зубная формула
					</label>
					<div className="flex items-center gap-1.5">
						<SmartMicrophoneButton
							context="visit"
							title="Голосовая диктовка осмотра"
							onResult={(text) => onFieldChange("objectiveStatus", values.objectiveStatus ? `${values.objectiveStatus} ${text}` : text)}
						/>
						<button
							type="button"
							onClick={() => onFieldChange("objectiveStatus", NORM_OBJECTIVE_TEXT)}
							data-testid="btn-soap-objective-norm"
							className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
								values.objectiveStatus === NORM_OBJECTIVE_TEXT
									? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
									: "bg-[var(--paper)] text-[var(--teal)] border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
							}`}
							title="Зафиксировать норму в 1 клик: слизистая бледно-розовая, в норме"
						>
							<Check className="w-3 h-3 text-[var(--teal)]" />
							<span>Слизистая в норме</span>
						</button>
					</div>
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
