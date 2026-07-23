import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";

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
			headers: auth.denteClinicalReadHeaders(),
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
			className="p-4 rounded-xl border my-4 shadow-sm"
			style={{ background: "var(--paper, #ffffff)", color: "var(--ink, #0f172a)", borderColor: "var(--line, #e2e8f0)" }}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: "var(--line, #e2e8f0)" }}>
				<div className="flex items-center space-x-2">
					<span className="text-xl">🦷</span>
					<h3 className="font-semibold text-purple-600 dark:text-purple-400">
						Печать Зубной Формулы в Планах Лечения (Одонтограмма)
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
					Печатная Форма PDF / Договор
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4" style={{ color: "var(--muted, #64748b)" }}>
					Загрузка печатных планов лечения...
				</div>
			) : items.length === 0 ? (
				<div className="text-sm py-3 text-center" style={{ color: "var(--muted, #64748b)" }}>
					Нет сформированных планов печати одонтограммы.
				</div>
			) : (
				<div className="space-y-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
							style={{ background: "var(--surface-50, #f8fafc)", borderColor: "var(--line, #e2e8f0)" }}
						>
							<div>
								<div className="text-sm font-bold">{item.patientName}</div>
								<div className="text-xs text-purple-600 dark:text-purple-300 mt-0.5">{item.planTitle}</div>
								<div className="text-xs font-mono px-2 py-1 rounded border mt-2 bg-slate-100 border-slate-300 dark:bg-slate-950 dark:border-slate-800" style={{ color: "var(--ink, #0f172a)" }}>
									Формула: {item.toothFormulaSnippet}
								</div>
							</div>
							<div className="flex flex-col items-end gap-1">
								{item.odontogramIncluded && (
									<span className="text-xs px-2 py-0.5 rounded border bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
										✓ Одонтограмма включена
									</span>
								)}
								{item.printLayoutReady && (
									<span className="text-xs" style={{ color: "var(--muted, #64748b)" }}>Макет печати готов</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
