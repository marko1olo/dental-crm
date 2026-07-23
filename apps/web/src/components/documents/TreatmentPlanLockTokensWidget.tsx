import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">🔒</span>
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Конструктор Планов Лечения 2.0: Lock-токены редактирования и Авто-черновик
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
					Concurrent Edit Lock
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка токенов блокировки...
				</div>
			) : locks.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Нет активных блокировок редактирования планов.
				</div>
			) : (
				<div className="space-y-3">
					{locks.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="text-sm font-bold">
									План лечения: <span className="font-mono text-sky-600 dark:text-sky-300">#{item.treatmentPlanId.slice(0, 8)}</span>
								</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted, #64748b)" }}>
									Редактирует: <span className="font-semibold" style={{ color: "var(--ink, #0f172a)" }}>{item.lockedByDoctorName}</span>
								</div>
							</div>
							<div className="flex items-center space-x-3 text-xs">
								<span className="px-2.5 py-1 rounded border font-mono bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
									Токен: {item.lockToken}
								</span>
								<span className="px-2 py-1 rounded border font-bold uppercase bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
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
