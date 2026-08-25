import { AlertCircle, RefreshCw, Stethoscope } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";

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
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			} catch (err: any) {
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
		<div className="rounded-xl border border-[var(--line)] p-3.5 bg-[var(--paper-soft)] space-y-2 text-xs">
			<div className="flex items-center justify-between">
				<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
					<Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					Сопутствующие диагнозы ЕГИСЗ (СЭМД CDA R2)
				</span>
				<button
					type="button"
					disabled={loading}
					onClick={fetchDiagnoses}
					className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
					title="Обновить сопутствующие диагнозы"
				>
					<RefreshCw
						className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
					/>
				</button>
			</div>

			{loading ? (
				<p className="text-[var(--muted)] italic text-xs">
					Загрузка реестра диагнозов ЕГИСЗ...
				</p>
			) : error ? (
				<div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-800 text-xs">
					<AlertCircle className="w-4 h-4 shrink-0" />
					<span>{error}</span>
				</div>
			) : items.length === 0 ? (
				<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] text-xs">
					Нет зарегистрированных сопутствующих диагнозов в ЕГИСЗ для клиники.
					Основной диагноз приёма будет экспортирован в CDA R2.
				</div>
			) : (
				<ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
					{items.map((item) => (
						<li
							key={item.id}
							className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs"
						>
							<div className="flex items-center gap-2">
								<span className="font-mono font-bold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300">
									{item.icdCode}
								</span>
								<span className="text-[var(--ink)] font-medium">
									{item.icdName}
								</span>
							</div>
							<span className="text-xs text-[var(--muted)] uppercase font-semibold">
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
