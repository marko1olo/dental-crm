import React, { useEffect, useState } from "react";

interface ClipboardItem {
	id: string;
	organizationId: string;
	appointmentId: string;
	patientName: string;
	doctorName: string;
	serviceTitle: string;
	durationMinutes: number;
	clipboardStatus: string;
	copiedAt: string;
}

export const ScheduleClipboardItemsWidget: React.FC = () => {
	const [items, setItems] = useState<ClipboardItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/schedule/clipboard-items", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[ScheduleClipboardItemsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="schedule-clipboard-items-widget"
			className="p-4 bg-slate-900 border border-violet-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📋</span>
					<h3 className="font-semibold text-violet-400">
						Плавающий Буфер Расписания (Быстрый Перенос Записей 1 Кликом)
					</h3>
				</div>
				<span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded border border-violet-500/40">
					Appointment Clipboard
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка буфера переноса...</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{item.patientName}</div>
								<div className="text-xs text-slate-400 mt-0.5">
									Врач: <span className="text-violet-300">{item.doctorName}</span> | Услуга: {item.serviceTitle} ({item.durationMinutes} мин)
								</div>
							</div>
							<div className="flex items-center space-x-2">
								<span className="text-xs bg-violet-950 text-violet-300 px-2 py-0.5 rounded border border-violet-800 font-bold uppercase">
									{item.clipboardStatus}
								</span>
								<button className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1 rounded font-semibold transition">
									Вставить в слот
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
