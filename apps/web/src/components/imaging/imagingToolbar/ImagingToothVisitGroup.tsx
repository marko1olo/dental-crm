import React from "react";
import { Check } from "lucide-react";
import type { ImagingStudy } from "../types.js";

export interface ImagingToothVisitGroupProps {
	readonly selectedImagingStudy?: ImagingStudy | null | undefined;
	readonly activeAppointment?: { id: string; date?: string; patientName?: string } | null | undefined;
	readonly onAttachToTooth?: ((toothCode: string) => Promise<void> | void) | undefined;
	readonly onAttachToVisit?: ((visitId: string) => Promise<void> | void) | undefined;
}

export const ImagingToothVisitGroup: React.FC<ImagingToothVisitGroupProps> = ({
	selectedImagingStudy,
	activeAppointment,
	onAttachToTooth,
	onAttachToVisit,
}) => {
	const isAttachedToCurrentVisit = selectedImagingStudy?.visitId === activeAppointment?.id;

	return (
		<div className="flex items-center gap-1.5 shrink-0 flex-wrap">
			<div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-2.5 h-8 shadow-2xs text-xs shrink-0">
				<span className="text-xs font-medium text-[var(--ink-muted)] shrink-0">Зуб:</span>
				<select
					data-testid="study-tooth-selector"
					aria-label="Привязать снимок к зубу FDI"
					className="bg-transparent font-bold text-xs text-[var(--teal)] cursor-pointer focus:outline-none"
					style={{
						border: "none",
						background: "transparent",
						width: "auto",
						minWidth: "44px",
						height: "26px",
						minHeight: "26px",
						padding: "0 18px 0 2px",
						boxShadow: "none",
					}}
					value={selectedImagingStudy?.toothCode ?? ""}
					onChange={(e) => onAttachToTooth?.(e.target.value)}
				>
					<option value="">Все</option>
					<optgroup label="Верхняя челюсть (Q1/Q2)">
						{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
							<option key={t} value={String(t)}>#{t}</option>
						))}
					</optgroup>
					<optgroup label="Нижняя челюсть (Q4/Q3)">
						{[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
							<option key={t} value={String(t)}>#{t}</option>
						))}
					</optgroup>
				</select>
			</div>

			{activeAppointment?.id && (
				<button
					data-testid="study-attach-visit-btn"
					type="button"
					className={`h-8 px-3 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
						isAttachedToCurrentVisit
							? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
					title={isAttachedToCurrentVisit ? "Снимок прикреплен к текущему приёму" : "Привязать снимок к приёму в 1 клик"}
					onClick={() => onAttachToVisit?.(activeAppointment.id)}
				>
					<Check size={14} className={isAttachedToCurrentVisit ? "text-emerald-500" : "text-[var(--ink-muted)]"} />
					<span>{isAttachedToCurrentVisit ? "В приёме" : "В приём"}</span>
				</button>
			)}
		</div>
	);
};
