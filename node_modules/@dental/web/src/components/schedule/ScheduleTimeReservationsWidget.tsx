import React, { useEffect, useState } from "react";
import { Clock, Bookmark } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

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
	const { auth } = useAppLogicContext();
	const [reservations, setReservations] = useState<ReservationItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/schedule/time-reservations", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setReservations(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, [auth]);

	return (
		<div
			data-testid="schedule-time-reservations-widget"
			className="p-3 border rounded-xl shadow-sm my-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center space-x-2 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800" title="Технические блокировки времени (обед, проветривание, санобработка) в сетке расписания">
				<Bookmark className="w-4 h-4 text-amber-500" />
				<h4 className="text-sm font-semibold">Бронирование времени и штриховка сетки</h4>
			</div>
			{loading ? (
				<p className="text-xs text-slate-500 dark:text-slate-400">Загрузка броней...</p>
			) : reservations.length === 0 ? (
				<div className="p-3 text-center rounded-lg border border-dashed text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
					Активные технические брони кресел отсутствуют.
				</div>
			) : (
				<ul className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
					{reservations.map((res) => (
						<li
							key={res.id}
							className="flex justify-between items-center p-2 rounded border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
						>
							<span className="font-semibold">{res.chairName}: {res.reservationType} ({res.startTime}-{res.endTime})</span>
							<span className="text-xs text-slate-500 dark:text-slate-400">{res.note}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
