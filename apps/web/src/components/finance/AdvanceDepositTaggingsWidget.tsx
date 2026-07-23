import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

interface DepositTaggingItem {
	id: string;
	organizationId: string;
	patientName: string;
	depositAmountRub: string;
	taggedTargetType: string;
	taggedTargetName: string;
	allocationStatus: string;
	createdAt: string;
}

export const AdvanceDepositTaggingsWidget: React.FC = () => {
	const [taggings, setTaggings] = useState<DepositTaggingItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/finance/advance-deposit-taggings", {
			headers: auth.denteClinicalReadHeaders(),
		})
			.then((res) => res.json())
			.then((data) => {
				setTaggings(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[AdvanceDepositTaggingsWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="advance-deposit-taggings-widget"
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">💰</span>
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Принудительное Закрепление Авансов за Врачами или Услугами
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					Targeted Deposit Allocation
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка целевых авансов...
				</div>
			) : taggings.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Нет авансовых платежей с привязкой.
				</div>
			) : (
				<div className="space-y-3">
					{taggings.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold">{item.patientName}</span>
									<span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-300">
										+{Number(item.depositAmountRub).toLocaleString("ru-RU")} ₽
									</span>
								</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted, #64748b)" }}>
									Закреплено за ({item.taggedTargetType}): <strong style={{ color: "var(--ink, #0f172a)" }}>{item.taggedTargetName}</strong>
								</div>
							</div>
							<div className="flex items-center space-x-2 text-xs">
								<span className="px-2 py-0.5 rounded border font-bold uppercase bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
									✓ {item.allocationStatus}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
