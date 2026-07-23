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
			.catch(() => setLoading(false));
	}, []);

	return (
		<div className="schedule-clipboard-widget p-3 border rounded-md bg-card text-card-foreground shadow-sm my-2">
			<h4 className="text-sm font-semibold mb-2">Буфер обмена расписания</h4>
			{loading ? (
				<p className="text-xs text-muted-foreground">Загрузка элементов...</p>
			) : items.length === 0 ? (
				<p className="text-xs text-muted-foreground">Буфер обмена пуст</p>
			) : (
				<ul className="space-y-1 max-h-32 overflow-y-auto text-xs">
					{items.map((it) => (
						<li key={it.id} className="flex justify-between border-b pb-1">
							<span>{it.patientName} — {it.serviceTitle}</span>
							<span className="text-muted-foreground">{it.durationMinutes} мин</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
