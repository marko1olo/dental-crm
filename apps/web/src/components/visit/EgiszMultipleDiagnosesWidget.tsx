import { AlertCircle, RefreshCw, Stethoscope } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";

export interface EgiszMultipleDiagnosisItem {
	id: string;
	patientId: string;
	icdCode: string;
	icdName: string;
	diagnosisType: "main" | "accompanying" | "complication";
	createdAt: string;
}

export function EgiszMultipleDiagnosesWidget() {
	const appLogic = useAppLogicContext();
	const [loading, setLoading] = useState(false);
	const [items, setItems] = useState<EgiszMultipleDiagnosisItem[]>([]);
	const [error, setError] = useState<string | null>(null);

	const fetchDiagnoses = useCallback(
		async function fetchDiagnoses() {
			setLoading(true);
			setError(null);
			try {
				const headers = appLogic.auth?.denteClinicalReadHeaders?.() ?? {};
				const res = await fetch("/api/egisz/multiple-diagnoses", { headers });
				if (!res.ok) {
					const errJson = await res.json();
					throw new Error(
						errJson?.message || errJson?.error || `HTTP ${res.status}`,
					);
				}
				const data = await res.json();
				setItems(Array.isArray(data) ? data : []);
			} catch (err: any) {
				showToast(
					actionFailureToast(
						"Загрузка диагнозов ЕГИСЗ",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				setError(err?.message || "Ошибка загрузки сопутствующих диагнозов");
			} finally {
				setLoading(false);
			}
		},
		[appLogic.auth],
	);

	useEffect(() => {
		fetchDiagnoses();
	}, [fetchDiagnoses]);

	return (
		<div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50 space-y-2 text-xs">
			<div className="flex items-center justify-between">
				<span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
					<Stethoscope className="w-3.5 h-3.5 text-blue-500" />
					Сопутствующие диагнозы ЕГИСЗ (СЭМД CDA R2)
				</span>
				<button
					type="button"
					disabled={loading}
					onClick={fetchDiagnoses}
					className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
					title="Обновить сопутствующие диагнозы"
				>
					<RefreshCw
						className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
					/>
				</button>
			</div>

			{loading ? (
				<p className="text-slate-500 dark:text-slate-400 italic text-[11px]">
					Загрузка реестра диагнозов ЕГИСЗ...
				</p>
			) : error ? (
				<div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200 dark:border-rose-800 text-[11px]">
					<AlertCircle className="w-3.5 h-3.5 shrink-0" />
					<span>{error}</span>
				</div>
			) : items.length === 0 ? (
				<div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
					Нет зарегистрированных сопутствующих диагнозов в ЕГИСЗ для клиники.
					Основной диагноз приёма будет экспортирован в CDA R2.
				</div>
			) : (
				<ul className="space-y-1 max-h-36 overflow-y-auto pr-1">
					{items.map((item) => (
						<li
							key={item.id}
							className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px]"
						>
							<div className="flex items-center gap-2">
								<span className="font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
									{item.icdCode}
								</span>
								<span className="text-slate-800 dark:text-slate-200 font-medium">
									{item.icdName}
								</span>
							</div>
							<span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">
								{item.diagnosisType === "main"
									? "Основной"
									: item.diagnosisType === "complication"
										? "Осложнение"
										: "Сопутствующий"}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
