import React, { useEffect, useState } from "react";

interface TimelineItem {
	id: string;
	organizationId: string;
	patientName: string;
	eventType: string;
	statusColor: string;
	audioRecordingUrl: string | null;
	comment: string;
	createdAt: string;
}

export const PatientCommunicationTimelinesWidget: React.FC = () => {
	const [timelines, setTimelines] = useState<TimelineItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/crm/patient-communication-timelines", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setTimelines(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[PatientCommunicationTimelinesWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="patient-communication-timelines-widget"
			className="p-4 bg-slate-900 border border-teal-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📞</span>
					<h3 className="font-semibold text-teal-400">
						Хронологическая Лента Коммуникаций с Цветовой Индикацией и Записями Звонков
					</h3>
				</div>
				<span className="text-xs bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded border border-teal-500/40">
					Communication Timeline
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка хронологии звонков и чатов...</div>
			) : (
				<div className="space-y-3">
					{timelines.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">
									{item.patientName} <span className="text-xs text-teal-300 font-normal">({item.eventType})</span>
								</div>
								<div className="text-xs text-slate-300 mt-1">"{item.comment}"</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								{item.audioRecordingUrl && (
									<span className="bg-teal-950 text-teal-300 px-2.5 py-1 rounded border border-teal-800 font-mono">
										▶ Запись АТС
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
