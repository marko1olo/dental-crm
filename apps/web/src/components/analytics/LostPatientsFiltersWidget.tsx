import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
			headers: auth.denteClinicalReadHeaders(),
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
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">⚠️</span>
					<h3 className="font-semibold text-amber-600 dark:text-amber-400">
						Маркетинговый Фильтр «Потерянные Пациенты» (без визитов, листа ожидания и задач)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
					Lost Patient Filter
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка списка потерянных пациентов...
				</div>
			) : patients.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Потерянных пациентов не обнаружено.
				</div>
			) : (
				<div className="space-y-3">
					{patients.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="text-sm font-bold">{item.patientName}</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted, #64748b)" }}>
									Телефон: <span className="font-mono font-bold">{item.phone}</span> · Нет визитов: <span className="text-amber-600 dark:text-amber-400 font-bold">{item.daysSinceLastVisit} дней</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="px-2.5 py-1 rounded border font-mono bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
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
