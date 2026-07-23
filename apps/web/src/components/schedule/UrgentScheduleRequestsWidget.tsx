import React, { useEffect, useState } from "react";

interface UrgentRequestItem {
	id: string;
	organizationId: string;
	patientName: string;
	requestType: string;
	urgencyLevel: string;
	doctorName: string;
	preferredSlotTime: string;
	isResolved: boolean;
	createdAt: string;
}

export const UrgentScheduleRequestsWidget: React.FC = () => {
	const [requests, setRequests] = useState<UrgentRequestItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/schedule/urgent-schedule-requests", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setRequests(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[UrgentScheduleRequestsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="urgent-schedule-requests-widget"
			className="p-4 bg-slate-900 border border-rose-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🚨</span>
					<h3 className="font-semibold text-rose-400">
						Виджет «Срочные Обращения» Под Календарём Расписания (острая боль / срочные переносы)
					</h3>
				</div>
				<span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40">
					Urgent Requests Strip
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка срочных обращений...</div>
			) : (
				<div className="space-y-3">
					{requests.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold text-slate-200">{item.patientName}</span>
									<span className="text-xs bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800 font-bold uppercase">
										{item.requestType}
									</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">
									Врач: <span className="text-slate-200 font-semibold">{item.doctorName}</span> · Желаемое время: <span className="text-rose-300 font-bold">{item.preferredSlotTime}</span>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-rose-950 text-rose-300 px-2.5 py-1 rounded border border-rose-800 font-bold">
									🔥 ТРЕБУЕТ РЕАКЦИИ
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
