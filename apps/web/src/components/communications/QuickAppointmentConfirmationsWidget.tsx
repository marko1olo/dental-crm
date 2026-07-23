import React, { useEffect, useState } from "react";

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
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
			className="p-4 bg-slate-900 border border-emerald-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📞</span>
					<h3 className="font-semibold text-emerald-400">
						Быстрое Подтверждение Приёма при Обработке Обращения (из модального окна звонка/чата)
					</h3>
				</div>
				<span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
					Quick Confirm Call
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка подтверждений...</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{item.patientName}</div>
								<div className="text-xs text-slate-400 mt-1">
									Подтвердил: <span className="text-emerald-300 font-semibold">{item.confirmedByStaffName}</span> · Канал: {item.channelUsed}
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded border border-emerald-800 font-bold">
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
