import React from "react";
import {
	TOOTH_STATE_LABELS,
	type ToothData,
	type ToothState,
} from "../ToothChart";
import {
	getToothAnatomicalNameRu,
	getToothFolkAndAnatomicalNameRu,
} from "../../../lib/clinicalProtocols";

export interface OdontogramPrintTableProps {
	teethData: ToothData[];
}

const LEGEND_ITEMS = [
	{ color: "bg-red-600", label: "Кариес (Caries)" },
	{ color: "bg-rose-600", label: "Пульпит (Pulpitis)" },
	{ color: "bg-orange-500", label: "Периодонтит (Periodontitis)" },
	{ color: "bg-teal-600", label: "Пломба (Filled)" },
	{ color: "bg-blue-600", label: "Коронка (Crown)" },
	{ color: "bg-purple-600", label: "Имплантат (Implant)" },
	{ color: "bg-indigo-600", label: "Имплантат в плане" },
	{ color: "bg-slate-400", label: "Отсутствует (Missing)" },
	{ color: "bg-emerald-600", label: "Здоров (Healthy)" },
];

export const OdontogramPrintTable: React.FC<OdontogramPrintTableProps> = ({ teethData }) => {
	const pathologyTeeth = teethData.filter((t) => t.state && t.state !== "Healthy");

	return (
		<div className="mt-4 pt-3 border-t border-slate-200 text-xs" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
			<div className="mb-3">
				<h3 className="font-bold text-slate-900 mb-1.5 uppercase text-[11px] tracking-wide">
					Условные обозначения патологий и состояний зубов:
				</h3>
				<div className="flex flex-wrap items-center gap-3 text-[11px]">
					{LEGEND_ITEMS.map((item) => (
						<div key={item.label} className="flex items-center gap-1.5">
							<span className={`w-3 h-3 rounded-full ${item.color} inline-block shrink-0 border border-slate-400`} />
							<span>{item.label}</span>
						</div>
					))}
				</div>
			</div>

			<div>
				<h3 className="font-bold text-slate-900 mb-1.5 uppercase text-[11px] tracking-wide">
					Таблица выявленных патологий и анатомический статус:
				</h3>
				{pathologyTeeth.length === 0 ? (
					<div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-xs italic">
						Все зубы зубного ряда интактны (клинически здоровы, патологий не выявлено).
					</div>
				) : (
					<table className="w-full border-collapse text-left text-xs border border-slate-300">
						<thead>
							<tr className="bg-slate-100 border-b border-slate-300 text-slate-900 font-bold">
								<th className="py-1.5 px-2 border-r border-slate-300 w-16 text-center">Зуб</th>
								<th className="py-1.5 px-2 border-r border-slate-300">Народное / Обиходное название</th>
								<th className="py-1.5 px-2 border-r border-slate-300">Анатомическое название</th>
								<th className="py-1.5 px-2 border-r border-slate-300">Поверхности</th>
								<th className="py-1.5 px-2">Клинический статус / Диагноз</th>
							</tr>
						</thead>
						<tbody>
							{pathologyTeeth.map((t) => {
								const folkAndAnat = getToothFolkAndAnatomicalNameRu(t.toothNumber);
								const anatName = getToothAnatomicalNameRu(t.toothNumber);
								const surfacesStr = t.surfaces && t.surfaces.length > 0 ? t.surfaces.join(", ") : "—";
								return (
									<tr key={t.toothNumber} className="border-b border-slate-200 even:bg-slate-50">
										<td className="py-1.5 px-2 font-mono font-bold text-center border-r border-slate-200">{t.toothNumber}</td>
										<td className="py-1.5 px-2 font-medium border-r border-slate-200">{folkAndAnat}</td>
										<td className="py-1.5 px-2 text-slate-700 border-r border-slate-200">{anatName}</td>
										<td className="py-1.5 px-2 text-slate-600 border-r border-slate-200">{surfacesStr}</td>
										<td className="py-1.5 px-2 font-bold text-slate-900">
											{TOOTH_STATE_LABELS[t.state as ToothState] || t.state}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
};
