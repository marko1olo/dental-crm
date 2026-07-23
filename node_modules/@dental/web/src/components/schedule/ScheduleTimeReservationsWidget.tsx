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
			.catch(() => setLoading(false));
	}, []);

	return (
		<div className="time-reservations-widget p-3 border rounded-md bg-card text-card-foreground shadow-sm my-2">
			<h4 className="text-sm font-semibold mb-2">Бронирование времени и штриховка</h4>
			{loading ? (
				<p className="text-xs text-muted-foreground">Загрузка броней...</p>
			) : reservations.length === 0 ? (
				<p className="text-xs text-muted-foreground">Нет активных броней</p>
			) : (
				<ul className="space-y-1 max-h-32 overflow-y-auto text-xs">
					{reservations.map((res) => (
						<li key={res.id} className="flex justify-between border-b pb-1">
							<span>{res.chairName}: {res.reservationType} ({res.startTime}-{res.endTime})</span>
							<span className="text-muted-foreground">{res.note}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
