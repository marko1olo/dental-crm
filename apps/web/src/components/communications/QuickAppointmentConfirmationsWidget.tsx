import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">📞</span>
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Быстрое Подтверждение Приёма при Обработке Обращения (из модального окна звонка/чата)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					Quick Confirm Call
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка подтверждений...
				</div>
			) : items.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Нет оперативных подтверждений приёмов.
				</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="text-sm font-bold">{item.patientName}</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted, #64748b)" }}>
									Подтвердил: <span className="text-emerald-600 dark:text-emerald-300 font-semibold">{item.confirmedByStaffName}</span> · Канал: {item.channelUsed}
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="px-2.5 py-1 rounded border font-bold bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									✓ Подтверждено из окна звонка
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
