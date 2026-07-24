import React, { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

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
	const { auth } = useAppLogicContext();
	const [requests, setRequests] = useState<UrgentRequestItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/schedule/urgent-schedule-requests", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setRequests(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, [auth]);

	return (
		<div
			data-testid="urgent-schedule-requests-widget"
			className="p-3 border rounded-xl shadow-sm my-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center space-x-2 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800">
				<AlertCircle className="w-4 h-4 text-red-500" />
				<h4 className="text-sm font-semibold">Срочные обращения и забор окон «Острая боль»</h4>
			</div>
			{loading ? (
				<p className="text-xs text-slate-500 dark:text-slate-400">Загрузка срочных заявок...</p>
			) : requests.length === 0 ? (
				<div className="p-3 text-center rounded-lg border border-dashed text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
					Срочные обращения острой боли отсутствуют. Окна резерва готовы для планового приёма.
				</div>
			) : (
				<ul className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
					{requests.map((req) => (
						<li
							key={req.id}
							className="flex justify-between items-center p-2 rounded border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
						>
							<span className="font-semibold">{req.patientName} — {req.requestType} ({req.urgencyLevel})</span>
							<span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{req.preferredSlotTime}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
