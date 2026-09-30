import React from "react";
import {
	ToothChart,
	TOOTH_STATE_LABELS,
	type ToothData,
	type ToothState,
} from "./ToothChart";
import {
	getToothAnatomicalNameRu,
	getToothFolkAndAnatomicalNameRu,
} from "../../lib/clinicalProtocols043";

export interface OdontogramPrintA4Props {
	patientId: string;
	teethData: ToothData[];
	isPediatricMode: boolean;
	odontogramUseSurfaces?: boolean;
	activePatient?: any;
	activeDoctor?: any;
	auth?: any;
}

export const OdontogramPrintA4: React.FC<OdontogramPrintA4Props> = ({
	patientId,
	teethData,
	isPediatricMode,
	odontogramUseSurfaces,
	activePatient,
	activeDoctor,
	auth,
}) => {
	return (
		<div id="odontogram-print-a4" className="hidden print:block font-sans text-slate-900 bg-white p-6">
			{/* Шапка клиники */}
			<div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between gap-4">
				<div>
					<div className="text-base font-black text-slate-900 uppercase tracking-tight">
						Стоматологическая клиника «DENTE»
					</div>
					<div className="text-xs font-semibold text-slate-700">
						ООО «ДЕНТЕ МЕДИКАЛ ГРУПП» • Лицензия № ЛО41-01137-77/00368421 от 14.02.2023 г.
					</div>
					<div className="text-[11px] text-slate-500">
						119048, г. Москва, ул. Стоматологическая, д. 24, корп. 1 • Тел: +7 (495) 777-88-99 • dente-clinic.ru
					</div>
					<h1 className="text-lg font-black tracking-tight text-slate-950 uppercase mt-2">
						Клиническая зубная формула (Форма № 043/у)
					</h1>
					<p className="text-xs font-semibold text-slate-600">
						Приказ Минздрава России от 15.12.2014 № 834н • Прикус: {isPediatricMode ? "Детский / сменный (зубы 51–85)" : "Постоянный взрослый (зубы 11–48)"}
					</p>
				</div>
				<div className="text-right text-xs shrink-0">
					<div className="font-bold text-slate-900">
						Пациент: {activePatient?.fullName || "—"}
					</div>
					<div className="text-slate-600">
						Дата рожд.: {activePatient?.birthDate || "—"}
					</div>
					<div className="text-slate-600">
						№ Медкарты: {activePatient?.cardNumber || activePatient?.medicalCardNumber || activePatient?.id?.slice(0, 8) || "СТ-2026-0843"}
					</div>
					<div className="font-semibold text-slate-800 mt-1">
						Дата печати: {new Date().toLocaleDateString("ru-RU")}
					</div>
				</div>
			</div>

			{/* Графическая схема зубов */}
			<div className="my-4 flex justify-center scale-95 origin-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
				<ToothChart
					patientId={patientId}
					teethData={teethData}
					pediatricMode={isPediatricMode}
					selectedTeeth={[]}
					onToothClick={() => {}}
					useSurfaces={odontogramUseSurfaces}
				/>
			</div>

			{/* Легенда патологий и таблица выявленных диагнозов */}
			<div className="mt-4 pt-3 border-t border-slate-200 text-xs" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
				<div className="mb-3">
					<h3 className="font-bold text-slate-900 mb-1.5 uppercase text-[11px] tracking-wide">
						Условные обозначения патологий и состояний зубов:
					</h3>
					<div className="flex flex-wrap items-center gap-3 text-[11px]">
						<div className="flex items-center gap-1.5">
							<span className="w-3 h-3 rounded-full bg-red-600 inline-block shrink-0 border border-slate-400" />
							<span>Кариес (Caries)</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="w-3 h-3 rounded-full bg-rose-600 inline-block shrink-0 border border-slate-400" />
							<span>Пульпит (Pulpitis)</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="w-3 h-3 rounded-full bg-orange-500 inline-block shrink-0 border border-slate-400" />
							<span>Периодонтит (Periodontitis)</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="w-3 h-3 rounded-full bg-teal-600 inline-block shrink-0 border border-slate-400" />
							<span>Пломба (Filled)</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="w-3 h-3 rounded-full bg-blue-600 inline-block shrink-0 border border-slate-400" />
							<span>Коронка (Crown)</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="w-3 h-3 rounded-full bg-purple-600 inline-block shrink-0 border border-slate-400" />
							<span>Имплантат (Implant)</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="w-3 h-3 rounded-full bg-indigo-600 inline-block shrink-0 border border-slate-400" />
							<span>Имплантат в плане</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="w-3 h-3 rounded-full bg-slate-400 inline-block shrink-0 border border-slate-500" />
							<span>Отсутствует (Missing)</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="w-3 h-3 rounded-full bg-emerald-600 inline-block shrink-0 border border-slate-400" />
							<span>Здоров (Healthy)</span>
						</div>
					</div>
				</div>

				<div>
					<h3 className="font-bold text-slate-900 mb-1.5 uppercase text-[11px] tracking-wide">
						Таблица выявленных патологий и анатомический статус:
					</h3>
					{teethData.filter((t) => t.state && t.state !== "Healthy").length === 0 ? (
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
								{teethData
									.filter((t) => t.state && t.state !== "Healthy")
									.map((t) => {
										const folkAndAnat = getToothFolkAndAnatomicalNameRu(t.toothNumber);
										const anatName = getToothAnatomicalNameRu(t.toothNumber);
										return (
											<tr key={t.toothNumber} className="border-b border-slate-200 even:bg-slate-50">
												<td className="py-1.5 px-2 font-mono font-bold text-center border-r border-slate-200">{t.toothNumber}</td>
												<td className="py-1.5 px-2 font-medium border-r border-slate-200">{folkAndAnat}</td>
												<td className="py-1.5 px-2 text-slate-700 border-r border-slate-200">{anatName}</td>
												<td className="py-1.5 px-2 text-slate-600 border-r border-slate-200">
													{t.surfaces && t.surfaces.length > 0 ? t.surfaces.join(", ") : "—"}
												</td>
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

			{/* Блок подписи врача и печати */}
			<div className="mt-8 pt-4 border-t-2 border-slate-300 flex items-end justify-between text-xs text-slate-800" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
				<div className="space-y-1">
					<div>
						Врач-стоматолог: _________________________ /{" "}
						<strong>{activeDoctor?.fullName || auth?.currentUser?.name || "_________________________"}</strong>
					</div>
					<div className="text-[10px] text-slate-500">(подпись и личная печать врача)</div>
				</div>

				{/* Круглая печать («М.П. Клиники») */}
				<div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
					<span>М.П.</span>
					<span className="text-[8px] font-normal">Клиники</span>
				</div>

				<div className="space-y-1 text-right">
					<div>
						Пациент: _________________________ /{" "}
						<strong>{activePatient?.fullName || "_________________________"}</strong>
					</div>
					<div className="text-[10px] text-slate-500">(с состоянием зубной формулы ознакомлен)</div>
				</div>
			</div>
		</div>
	);
};
