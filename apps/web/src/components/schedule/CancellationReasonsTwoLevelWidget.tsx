import React, { useEffect, useState } from "react";

interface CancellationReasonItem {
	id: string;
	organizationId: string;
	category: string;
	reasonCode: string;
	reasonTitle: string;
	requiresNote: boolean;
	isActive: boolean;
	createdAt: string;
}

export const CancellationReasonsTwoLevelWidget: React.FC = () => {
	const [reasons, setReasons] = useState<CancellationReasonItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/schedule/cancellation-reasons-two-level", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setReasons(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[CancellationReasonsTwoLevelWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="cancellation-reasons-two-level-widget"
			className="p-4 bg-slate-900 border border-red-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🚫</span>
					<h3 className="font-semibold text-red-400">
						Двухуровневые Причины Отмены Приёмов (Клиника vs Пациент)
					</h3>
				</div>
				<span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/40">
					Cancellation Classification
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка причин отмен...</div>
			) : (
				<div className="space-y-3">
					{reasons.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
						>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-xs uppercase font-mono font-bold bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-800">
										{item.category}
									</span>
									<span className="text-sm font-bold text-slate-200">{item.reasonTitle}</span>
								</div>
								<div className="text-xs text-slate-400 mt-1">Код причины: {item.reasonCode}</div>
							</div>
							<div className="flex items-center space-x-2">
								{item.requiresNote && (
									<span className="text-xs bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800">
										Требуется комментарий
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
