import React from "react";

export interface DentalLabPrintSpecBoxProps {
	shadeCervical: string;
	shadeBody: string;
	shadeIncisal: string;
	translucency: string;
	mamelons: boolean;
	opalescence?: boolean | undefined;
	calcifications: boolean;
	frameworkTrialDate?: string | null | undefined;
	ceramicTrialDate?: string | null | undefined;
	dueDate?: string | null | undefined;
	deliveryTimeSlot: string;
	clinicalNotes?: string | null | undefined;
}

export function DentalLabPrintSpecBox({
	shadeCervical,
	shadeBody,
	shadeIncisal,
	translucency,
	mamelons,
	opalescence,
	calcifications,
	frameworkTrialDate,
	ceramicTrialDate,
	dueDate,
	deliveryTimeSlot,
	clinicalNotes,
}: DentalLabPrintSpecBoxProps): React.JSX.Element {
	return (
		<div
			className="p-3.5 bg-slate-50 border border-slate-300 rounded-lg text-xs space-y-2 break-inside-avoid print:break-inside-avoid print:bg-transparent print:border-black"
			style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
		>
			<div className="font-bold border-b border-slate-200 pb-1 uppercase tracking-wider text-[11px] text-slate-700 print:border-black print:text-black">
				Техническое задание зубному технику:
			</div>
			<div className="grid grid-cols-2 gap-2 text-xs">
				<div>
					• <strong>3-Зонная стратификация:</strong> Пришейка {shadeCervical} / Тело {shadeBody} / Край {shadeIncisal}
				</div>
				<div>
					• <strong>Оптические свойства:</strong> {translucency} {mamelons ? "(Мамелоны)" : ""}{" "}
					{opalescence ? "(Опалесценция)" : ""} {calcifications ? "(Кальцификаты)" : ""}
				</div>
				<div>
					• <strong>Прикус / Окклюзия:</strong> В привычной окклюзии (по регистрату / шаблону)
				</div>
				<div>
					• <strong>Анатомия и контакты:</strong> Естественная форма, физиологический контакт
				</div>
			</div>

			{/* Fitting and Due Dates */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200 print:border-black text-xs">
				<div>
					<strong>Примерка каркаса:</strong>{" "}
					{frameworkTrialDate
						? new Date(frameworkTrialDate).toLocaleDateString("ru-RU")
						: "По готовности"}
				</div>
				<div>
					<strong>Примерка керамики:</strong>{" "}
					{ceramicTrialDate
						? new Date(ceramicTrialDate).toLocaleDateString("ru-RU")
						: "По готовности"}
				</div>
				<div>
					<strong>Сдача готовой работы:</strong>{" "}
					{dueDate ? new Date(dueDate).toLocaleDateString("ru-RU") : "Не назначена"}{" "}
					<span className="font-semibold text-slate-600 print:text-black">({deliveryTimeSlot})</span>
				</div>
			</div>

			{clinicalNotes && (
				<div className="pt-1.5 text-xs italic text-slate-800 print:text-black">
					<strong>Клинические указания:</strong> {clinicalNotes}
				</div>
			)}
		</div>
	);
}
