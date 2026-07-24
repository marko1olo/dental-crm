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
			className="p-3 border rounded-xl shadow-sm my-3"
			style={{ background: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
		>
			<div className="flex items-center space-x-2 mb-2 pb-1 border-b" style={{ borderColor: "var(--line)" }}>
				<Bookmark className="w-4 h-4 text-amber-500" />
				<h4 className="text-sm font-semibold">Бронирование времени и штриховка сетки</h4>
			</div>
			{loading ? (
				<p className="text-xs" style={{ color: "var(--muted)" }}>Загрузка броней...</p>
			) : reservations.length === 0 ? (
				<div className="p-3 text-center rounded-lg border border-dashed text-xs" style={{ background: "var(--surface-50)", borderColor: "var(--line)", color: "var(--muted)" }}>
					Активные технические брони кресел отсутствуют.
				</div>
			) : (
				<ul className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
					{reservations.map((res) => (
						<li
							key={res.id}
							className="flex justify-between items-center p-2 rounded border"
							style={{ background: "var(--surface-50)", borderColor: "var(--line)" }}
						>
							<span className="font-semibold">{res.chairName}: {res.reservationType} ({res.startTime}-{res.endTime})</span>
							<span className="text-xs" style={{ color: "var(--muted)" }}>{res.note}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
