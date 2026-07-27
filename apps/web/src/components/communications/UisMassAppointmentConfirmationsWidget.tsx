import React, { useEffect, useState } from "react";

interface MassConfirmItem {
	id: string;
	organizationId: string;
	targetDate: string;
	totalAppointmentsCount: number;
	confirmedViaSmsCount: number;
	dispatchChannel: string;
	createdAt: string;
}

export const UisMassAppointmentConfirmationsWidget: React.FC = () => {
	const [confirmations, setConfirmations] = useState<MassConfirmItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/communications/uis-mass-appointment-confirmations", {
					})
			.then((res) => res.json())
			.then((data) => {
				setConfirmations(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[UisMassAppointmentConfirmationsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="uis-mass-appointment-confirmations-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">📩</span>
					<h3 className="font-semibold text-violet-600 dark:text-violet-400">
						Массовое Подтверждение Приёмов в 1 клик (СМС UIS / WhatsApp)
					</h3>
				</div>
				<span className="text-xs bg-violet-100 text-violet-800 border border-violet-300 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800 px-2 py-0.5 rounded font-medium">
					Mass SMS Confirm
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка данных массовых рассылок...</div>
			) : (
				<div className="space-y-3">
					{confirmations.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-white">
									Дата приема: <span className="text-violet-600 dark:text-violet-300 font-semibold">{item.targetDate}</span>
								</div>
								<div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
									Подтверждено: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{item.confirmedViaSmsCount}</span> из <span className="font-mono text-slate-900 dark:text-white">{item.totalAppointmentsCount} записей</span> · Канал: {item.dispatchChannel}
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="bg-violet-950 text-violet-300 px-2.5 py-1 rounded border border-violet-800 font-mono">
									✓ Рассылка завершена
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
