import React, { useEffect, useState } from "react";

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
	const [items, setItems] = useState<DepositTaggingItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/finance/advance-deposit-taggings", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
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
			className="p-4 bg-slate-900 border border-emerald-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">💳</span>
					<h3 className="font-semibold text-emerald-400">
						Принудительное Закрепление Авансов за Врачами и Услугами (Учёт ЗП)
					</h3>
				</div>
				<span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
					Advance Deposit Pinning
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка закрепленных авансов...</div>
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
									Закреплено за: <span className="text-emerald-300 font-semibold">{item.taggedTargetName}</span> ({item.taggedTargetType})
								</div>
							</div>
							<div className="flex items-center space-x-3 text-xs">
								<div className="bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded border border-emerald-800 font-bold">
									Сумма аванса: {Number(item.depositAmountRub).toLocaleString()} ₽
								</div>
								<span className="bg-slate-950 text-slate-300 px-2 py-1 rounded border border-slate-800 uppercase font-mono">
									🔒 {item.allocationStatus}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
