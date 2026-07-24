import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";
import { Lock, ShieldCheck } from "lucide-react";

interface LockTokenItem {
	id: string;
	organizationId: string;
	treatmentPlanId: string;
	lockedByDoctorName: string;
	lockToken: string;
	autoSaveDraftJson: string;
	isActiveLock: boolean;
	lockedAt: string;
}

export const TreatmentPlanLockTokensWidget: React.FC = () => {
	const [locks, setLocks] = useState<LockTokenItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/documents/treatment-plan-lock-tokens", {
			headers: auth.denteClinicalReadHeaders(),
		})
			.then((res) => res.json())
			.then((data) => {
				setLocks(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[TreatmentPlanLockTokensWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="treatment-plan-lock-tokens-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<Lock className="w-5 h-5 text-sky-500" />
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Планы лечения 2.0: Блокировки редактирования и авточерновики
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800 font-medium">
					Параллельное редактирование
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загрузка токенов блокировки...
				</div>
			) : locks.length === 0 ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Активных блокировок редактирования планов лечения нет.
				</div>
			) : (
				<div className="space-y-3">
					{locks.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div>
								<div className="text-sm font-bold">
									План лечения: <span className="font-mono text-sky-600 dark:text-sky-300">#{item.treatmentPlanId.slice(0, 8)}</span>
								</div>
								<div className="text-xs mt-1 text-slate-600 dark:text-slate-400">
									Врач: <span className="font-semibold text-slate-900 dark:text-slate-200">{item.lockedByDoctorName}</span>
								</div>
							</div>
							<div className="flex items-center space-x-3 text-xs">
								<span className="px-2.5 py-1 rounded border font-mono bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
									Токен: {item.lockToken}
								</span>
								<span className="px-2 py-1 rounded border font-bold uppercase bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									{item.isActiveLock ? "Заблокирован" : "Свободен"}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
