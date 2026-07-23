import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";
import { CheckCircle, PhoneCall } from "lucide-react";

interface QuickConfirmItem {
	id: string;
	organizationId: string;
	patientName: string;
	appointmentId: string;
	confirmedByStaffName: string;
	channelUsed: string;
	confirmedAt: string;
}

export const QuickAppointmentConfirmationsWidget: React.FC = () => {
	const [items, setItems] = useState<QuickConfirmItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/communications/quick-appointment-confirmations", {
			headers: auth.denteClinicalReadHeaders(),
		})
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[QuickAppointmentConfirmationsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="quick-appointment-confirmations-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<CheckCircle className="w-5 h-5 text-emerald-500" />
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Быстрое подтверждение визитов администратором
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					Подтверждения 1-Click
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка быстрых подтверждений...
				</div>
			) : items.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Быстрых подтверждений записей пока нет.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border space-y-2"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div className="flex justify-between items-start">
								<span className="text-xs font-bold px-2 py-0.5 rounded border bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									Канал: {item.channelUsed}
								</span>
								<span className="text-xs text-slate-500 dark:text-slate-400">
									Запись #{item.appointmentId.slice(0, 6)}
								</span>
							</div>
							<h4 className="text-sm font-medium leading-snug">{item.patientName}</h4>
							<p className="text-xs" style={{ color: "var(--muted)" }}>
								Подтвердил: <strong style={{ color: "var(--ink)" }}>{item.confirmedByStaffName}</strong>
							</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
