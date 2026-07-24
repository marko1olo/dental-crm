import React, { useEffect, useState } from "react";
import { MessageSquare, PhoneCall, Mail, Send } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

export interface CommunicationEventItem {
	id: string;
	organizationId: string;
	patientId: string;
	channelType: "CALL" | "SMS" | "WHATSAPP" | "TELEGRAM" | "EMAIL";
	direction: "INBOUND" | "OUTBOUND";
	summary: string;
	staffName: string;
	timestamp: string;
}

export const PatientCommunicationTimelineWidget: React.FC<{ patientId: string }> = ({ patientId }) => {
	const { auth } = useAppLogicContext();
	const [events, setEvents] = useState<CommunicationEventItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		if (!patientId) return;
		fetch(`/api/patients/${patientId}/communications`, {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				const list = Array.isArray(data) ? data : [];
				setEvents(list);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[PatientCommunicationTimelineWidget fetch error]:", err);
				setLoading(false);
			});
	}, [patientId, auth]);

	return (
		<div
			data-testid="patient-communication-timeline-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<MessageSquare className="w-5 h-5 text-sky-500" />
					<h3 className="font-semibold text-sm">
						Хронологическая история коммуникаций
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800 font-medium">
					IDENT Parity #4
				</span>
			</div>

			{loading ? (
				<div className="text-xs py-3 text-slate-500 dark:text-slate-400">
					Загрузка истории коммуникаций...
				</div>
			) : events.length === 0 ? (
				<div className="p-4 text-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400">
					Записи звонков и сообщений с пациентом отсутствуют.
				</div>
			) : (
				<div className="space-y-2">
					{events.map((ev) => (
						<div
							key={ev.id}
							className="p-3 rounded-lg border flex items-center justify-between gap-2 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div className="flex items-center space-x-2">
								{ev.channelType === "CALL" ? (
									<PhoneCall className="w-4 h-4 text-emerald-500" />
								) : ev.channelType === "EMAIL" ? (
									<Mail className="w-4 h-4 text-purple-500" />
								) : (
									<Send className="w-4 h-4 text-sky-500" />
								)}
								<div>
									<div className="font-bold text-slate-900 dark:text-white">{ev.summary}</div>
									<div className="text-slate-500 dark:text-slate-400">Сотрудник: {ev.staffName}</div>
								</div>
							</div>
							<span className="font-mono text-slate-400">{ev.timestamp}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
