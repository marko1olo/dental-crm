import React, { useEffect, useState } from "react";

interface PrintOdontogramItem {
	id: string;
	organizationId: string;
	patientName: string;
	planTitle: string;
	odontogramIncluded: boolean;
	toothFormulaSnippet: string;
	printLayoutReady: boolean;
	createdAt: string;
}

export const TreatmentPlanPrintOdontogramWidget: React.FC = () => {
	const [items, setItems] = useState<PrintOdontogramItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/documents/treatment-plan-print-odontogram", {
			headers: { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setItems(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[TreatmentPlanPrintOdontogramWidget fetch error]:", err);
				setLoading(false);
			});
	}, []);

	return (
		<div
			data-testid="treatment-plan-print-odontogram-widget"
			className="p-4 bg-slate-900 border border-purple-500/30 rounded-xl text-slate-100 shadow-xl my-4"
		>
			<div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
				<div className="flex items-center space-x-2">
					<span className="text-xl">🦷</span>
					<h3 className="font-semibold text-purple-400">
						Печать Зубной Формулы в Планах Лечения (Одонтограмма)
					</h3>
				</div>
				<span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/40">
					Печатная Форма PDF / Договор
				</span>
			</div>

			{loading ? (
				<div className="text-slate-400 text-sm py-4">Загрузка печатных планов лечения...</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 bg-slate-800/70 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
						>
							<div>
								<div className="text-sm font-bold text-slate-200">{item.patientName}</div>
								<div className="text-xs text-purple-300 mt-0.5">{item.planTitle}</div>
								<div className="text-xs font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-300 mt-2">
									Формула: {item.toothFormulaSnippet}
								</div>
							</div>
							<div className="flex flex-col items-end gap-1">
								{item.odontogramIncluded && (
									<span className="text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
										✓ Одонтограмма включена
									</span>
								)}
								{item.printLayoutReady && (
									<span className="text-xs text-slate-400">Макет печати готов</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
