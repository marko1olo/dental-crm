import React, { useEffect, useState } from "react";
import { Scissors, Trash2 } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useScheduleBufferStore } from "../../stores/useScheduleBufferStore";

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
	const { auth } = useAppLogicContext();
	const [serverItems, setServerItems] = useState<ClipboardItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const { bufferedItems, clearBuffer, removeFromBuffer } = useScheduleBufferStore();

	useEffect(() => {
		fetch("/api/schedule/clipboard-items", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setServerItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, [auth]);

	const combinedItems = [
		...bufferedItems.map((b) => ({
			id: b.appointmentId,
			appointmentId: b.appointmentId,
			patientName: b.patientName,
			doctorName: b.doctorName,
			serviceTitle: b.serviceTitle,
			durationMinutes: b.durationMinutes,
			clipboardStatus: b.mode === "cut" ? "cut" : "copied",
			copiedAt: b.copiedAt,
			isLocal: true,
		})),
		...serverItems.map((s) => ({
			id: s.id,
			appointmentId: s.appointmentId,
			patientName: s.patientName,
			doctorName: s.doctorName,
			serviceTitle: s.serviceTitle,
			durationMinutes: s.durationMinutes,
			clipboardStatus: s.clipboardStatus,
			copiedAt: s.copiedAt,
			isLocal: false,
		})),
	];

	return (
		<div
			data-testid="schedule-clipboard-widget"
			className="p-3 border rounded-xl shadow-sm my-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2" title="Временный буфер для переноса записей между креслами и днями сетки расписания">
					<Scissors className="w-4 h-4 text-sky-500" />
					<h4 className="text-sm font-semibold">Буфер обмена переноса записей расписания</h4>
				</div>
				{combinedItems.length > 0 && (
					<button
						type="button"
						onClick={clearBuffer}
						className="text-xs text-rose-500 hover:underline flex items-center space-x-1"
					>
						<Trash2 className="w-3 h-3" />
						<span>Очистить</span>
					</button>
				)}
			</div>
			{loading && combinedItems.length === 0 ? (
				<p className="text-xs text-slate-500 dark:text-slate-400">Загрузка элемента буфера...</p>
			) : combinedItems.length === 0 ? (
				<div className="p-3 text-center rounded-lg border border-dashed text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
					Буфер переноса визитов пуст. Из клика по визиту вы можете скопировать запись для быстрого вклеивания.
				</div>
			) : (
				<ul className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
					{combinedItems.map((it) => (
						<li
							key={it.id}
							className="flex justify-between items-center p-2 rounded border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
						>
							<span className="font-semibold">{it.patientName} — {it.serviceTitle}</span>
							<div className="flex items-center space-x-2">
								<span className="text-xs font-mono text-slate-500 dark:text-slate-400">{it.durationMinutes} мин</span>
								{it.isLocal && (
									<button
										type="button"
										onClick={() => removeFromBuffer(it.appointmentId)}
										className="text-slate-400 hover:text-rose-500"
									>
										×
									</button>
								)}
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

