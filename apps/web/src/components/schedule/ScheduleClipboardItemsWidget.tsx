import React, { useEffect, useState } from "react";
import { Clipboard, Scissors } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

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
	const [items, setItems] = useState<ClipboardItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/schedule/clipboard-items", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, [auth]);

	return (
		<div
			data-testid="schedule-clipboard-widget"
			className="p-3 border rounded-xl shadow-sm my-3"
			style={{ background: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
		>
			<div className="flex items-center space-x-2 mb-2 pb-1 border-b" style={{ borderColor: "var(--line)" }}>
				<Scissors className="w-4 h-4 text-sky-500" />
				<h4 className="text-sm font-semibold">Буфер обмена переноса записей расписания</h4>
			</div>
			{loading ? (
				<p className="text-xs" style={{ color: "var(--muted)" }}>Загрузка элемента буфера...</p>
			) : items.length === 0 ? (
				<div className="p-3 text-center rounded-lg border border-dashed text-xs" style={{ background: "var(--surface-50)", borderColor: "var(--line)", color: "var(--muted)" }}>
					Буфер переноса визитов пуст. Из клика по визиту вы можете скопировать запись для быстрого вклеивания.
				</div>
			) : (
				<ul className="space-y-1.5 max-h-36 overflow-y-auto text-xs">
					{items.map((it) => (
						<li
							key={it.id}
							className="flex justify-between items-center p-2 rounded border"
							style={{ background: "var(--surface-50)", borderColor: "var(--line)" }}
						>
							<span className="font-semibold">{it.patientName} — {it.serviceTitle}</span>
							<span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{it.durationMinutes} мин</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
