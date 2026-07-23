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
			.catch(() => setLoading(false));
	}, []);

	return (
		<div className="urgent-requests-widget p-3 border rounded-md bg-card text-card-foreground shadow-sm my-2">
			<h4 className="text-sm font-semibold mb-2">Острая боль / Срочные записи</h4>
			{loading ? (
				<p className="text-xs text-muted-foreground">Загрузка срочных заявок...</p>
			) : requests.length === 0 ? (
				<p className="text-xs text-muted-foreground">Нет срочных заявок</p>
			) : (
				<ul className="space-y-1 max-h-32 overflow-y-auto text-xs">
					{requests.map((req) => (
						<li key={req.id} className="flex justify-between border-b pb-1">
							<span>{req.patientName} — {req.requestType} ({req.urgencyLevel})</span>
							<span className="text-muted-foreground">{req.preferredSlotTime}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
