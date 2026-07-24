import React, { useEffect, useState } from "react";

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
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
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
			className="p-4 bg-slate-900 border border-sky-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🔒</span>
					<h3 className="font-semibold text-sky-400">
						Конструктор Планов Лечения 2.0: Lock-токены редактирования и Авто-черновик
					</h3>
				</div>
				<span className="text-xs bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/40">
					Concurrent Edit Lock
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка токенов блокировки...</div>
			) : (
				<div className="space-y-3">
					{locks.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">
									План лечения: <span className="font-mono text-sky-300">#{item.treatmentPlanId.slice(0, 8)}</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">
									Редактирует: <span className="text-slate-200 font-semibold">{item.lockedByDoctorName}</span>
								</div>
							</div>
							<div className="flex items-center space-x-3 text-xs">
								<span className="bg-sky-950 text-sky-300 px-2.5 py-1 rounded border border-sky-800 font-mono">
									Токен: {item.lockToken}
								</span>
								<span className="bg-emerald-950 text-emerald-300 px-2 py-1 rounded border border-emerald-800 font-bold uppercase">
									✓ Заблокировано
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
