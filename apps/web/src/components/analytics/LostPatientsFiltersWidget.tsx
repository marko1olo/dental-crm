import React, { useEffect, useState } from "react";

interface LostPatientItem {
	id: string;
	organizationId: string;
	patientName: string;
	phone: string;
	daysSinceLastVisit: number;
	hasFutureAppointment: boolean;
	hasActiveCrmTask: boolean;
	createdAt: string;
}

export const LostPatientsFiltersWidget: React.FC = () => {
	const [patients, setPatients] = useState<LostPatientItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/analytics/lost-patients-filters", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setPatients(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[LostPatientsFiltersWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="lost-patients-filters-widget"
			className="p-4 bg-slate-900 border border-amber-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">⚠️</span>
					<h3 className="font-semibold text-amber-400">
						Маркетинговый Фильтр «Потерянные Пациенты» (без визитов, листа ожидания и задач)
					</h3>
				</div>
				<span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
					Lost Patient Filter
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка списка потерянных пациентов...</div>
			) : (
				<div className="space-y-3">
					{patients.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{item.patientName}</div>
								<div className="text-xs text-slate-400 mt-1">
									Телефон: <span className="font-mono text-slate-200">{item.phone}</span> · Нет визитов: <span className="text-amber-300 font-bold">{item.daysSinceLastVisit} дней</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-amber-950 text-amber-300 px-2.5 py-1 rounded border border-amber-800 font-mono">
									⚠️ Задач нет / Будущей записи нет
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
