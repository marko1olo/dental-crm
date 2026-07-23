import React, { useEffect, useState } from "react";

interface ReservationItem {
	id: string;
	organizationId: string;
	chairName: string;
	reservationType: string;
	startTime: string;
	endTime: string;
	bookingLocked: boolean;
	hatchingStyle: string;
	note: string;
	createdAt: string;
}

export const ScheduleTimeReservationsWidget: React.FC = () => {
	const [reservations, setReservations] = useState<ReservationItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/schedule/time-reservations", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setReservations(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[ScheduleTimeReservationsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="schedule-time-reservations-widget"
			className="p-4 bg-slate-900 border border-rose-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">⏱️</span>
					<h3 className="font-semibold text-rose-400">
						Резервирование Времени в Сетке Расписания (Обед / Тех. Перерыв)
					</h3>
				</div>
				<span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40">
					Штриховка и Блокировка Слотов
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка технологических резервов...</div>
			) : (
				<div className="space-y-3">
					{reservations.map((res) => (
						<div
							key={res.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold text-rose-300">{res.chairName}</span>
									<span className="text-xs bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800 font-mono">
										{res.startTime} - {res.endTime}
									</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">{res.note}</div>
							</div>
							<div className="flex items-center space-x-2">
								{res.bookingLocked && (
									<span className="text-xs bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-800 font-semibold">
										🔒 Блокировка записи
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
