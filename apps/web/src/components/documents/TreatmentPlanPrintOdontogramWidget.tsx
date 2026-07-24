import React, { useEffect, useState } from "react";
import { auth } from "../../AppHelpers";
import { Printer, CheckCircle2 } from "lucide-react";

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
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<Printer className="w-5 h-5 text-indigo-500" />
					<h3 className="font-semibold text-indigo-600 dark:text-indigo-400">
						Печатная форма плана лечения с Зубной Формулой
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800 font-medium">
					Печать для пациента
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">
					Загрузка печатных форм планов лечения...
				</div>
			) : items.length === 0 ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">
					Печатные формы планов лечения с одонтограммой отсутствуют.
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{items.map((item) => (
						<div
							key={item.id}
							className="p-3 rounded-lg border space-y-2 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div className="flex justify-between items-start">
								<span className="text-xs font-bold px-2 py-0.5 rounded border bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
									{item.planTitle}
								</span>
								{item.printLayoutReady && (
									<span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
										<CheckCircle2 className="w-3 h-3 inline" /> Готов к печати
									</span>
								)}
							</div>
							<p className="text-xs text-slate-600 dark:text-slate-400">
								Пациент: <strong className="text-slate-900 dark:text-slate-200">{item.patientName}</strong>
							</p>
							{item.toothFormulaSnippet && (
								<p className="text-xs font-mono text-slate-500 dark:text-slate-400">
									Формула: {item.toothFormulaSnippet}
								</p>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};
