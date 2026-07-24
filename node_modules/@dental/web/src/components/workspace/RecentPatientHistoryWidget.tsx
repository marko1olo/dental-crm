import React, { useEffect, useState } from "react";

interface RecentPatientItem {
	id: string;
	organizationId: string;
	userId: string;
	patientId: string;
	patientName: string;
	phone: string;
	lastViewedAt: string;
}

export const RecentPatientHistoryWidget: React.FC = () => {
	const [patients, setPatients] = useState<RecentPatientItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/hr/recent-patients", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setPatients(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[RecentPatientHistoryWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="recent-patient-history-widget"
			className="p-4 bg-slate-900 border border-blue-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🕒</span>
					<h3 className="font-semibold text-blue-400">
						Быстрое Переключение: История 10 Последних Просмотренных Карточек Пациентов
					</h3>
				</div>
				<span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/40">
					Header Quick Nav
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка последних карточек...</div>
			) : (
				<div className="space-y-3">
					{patients.map((pat) => (
						<div
							key={pat.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex items-center justify-between"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{pat.patientName}</div>
								<div className="text-xs text-slate-400 mt-0.5">
									Тел: <span className="font-mono text-slate-300">{pat.phone}</span>
								</div>
							</div>
							<div className="flex items-center space-x-2">
								<span className="text-xs text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-800 font-mono">
									{new Date(pat.lastViewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
								</span>
								<button className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded font-semibold transition">
									Открыть ЭМК
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
