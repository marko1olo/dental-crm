import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";
import { Wallet, CheckCircle2 } from "lucide-react";

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
			style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--line)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
				<div className="flex items-center space-x-2">
					<Wallet className="w-5 h-5 text-emerald-500" />
					<h3 className="font-semibold text-emerald-600 dark:text-emerald-400">
						Принудительное маркирование авансов и привязка к врачам/услугам
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
					Целевой авансовый баланс
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted)" }}>
					Загрузка целевых авансов...
				</div>
			) : taggings.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted)" }}>
					Авансовые платежи с привязкой к целевым услугам отсутствуют.
				</div>
			) : (
				<div className="space-y-3">
					{taggings.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
							style={{ background: "var(--glass-panel)", borderColor: "var(--line)" }}
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-bold">{item.patientName}</span>
									<span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-300">
										+{Number(item.depositAmountRub).toLocaleString("ru-RU")} ₽
									</span>
								</div>
								<div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
									Цель: <strong>{item.taggedTargetName}</strong> ({item.taggedTargetType})
								</div>
							</div>
							<span className="px-2 py-1 text-xs rounded border font-bold uppercase bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
								{item.allocationStatus}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
