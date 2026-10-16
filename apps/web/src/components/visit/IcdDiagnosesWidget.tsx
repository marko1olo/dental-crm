import { AlertCircle, RefreshCw, Stethoscope } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";

export interface IcdDiagnosisItem {
	id: string;
	patientId: string;
	icdCode: string;
	icdName: string;
	diagnosisType: "main" | "accompanying" | "complication";
	createdAt: string;
}

// Для обратной совместимости типов
export type EgiszMultipleDiagnosisItem = IcdDiagnosisItem;

/**
 * Виджет диагнозов МКБ-10 (основные и сопутствующие диагнозы пациента в электронной медкарте).
 * Чистый клинический русский язык без бюрократических сокращений.
 */
export function IcdDiagnosesWidget({ patientId }: { patientId?: string }) {
	const appLogic = useOptionalAppLogicContext();
	const [loading, setLoading] = useState(false);
	const [items, setItems] = useState<IcdDiagnosisItem[]>([]);
	const [error, setError] = useState<string | null>(null);

	const loadDiagnoses = useCallback(async () => {
		if (!patientId) {
			setItems([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const headers = appLogic?.auth?.denteClinicalReadHeaders?.() ?? {};
			const res = await fetch(`/api/egisz/multiple-diagnoses?patientId=${encodeURIComponent(patientId)}`, { headers });
			if (!res.ok) {
				const errJson = await res.json().catch(() => ({}));
				throw new Error(
					errJson?.message || errJson?.error || `HTTP ${res.status}`,
				);
			}
			const data = await res.json();
			setItems(Array.isArray(data) ? data : []);
		} catch {
			setItems([]);
			setError(null);
		} finally {
			setLoading(false);
		}
	}, [appLogic?.auth, patientId]);

	useEffect(() => {
		loadDiagnoses();
	}, [loadDiagnoses]);

	return (
		<div className="pt-2.5 mt-2.5 border-t border-[var(--line)] space-y-2 text-xs" data-testid="icd-diagnoses-widget">
			<div className="flex items-center justify-between">
				<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
					<Stethoscope className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
					Диагнозы МКБ-10 (Медицинская карта)
				</span>
				<button
					type="button"
					disabled={loading}
					onClick={loadDiagnoses}
					className="secondary-button p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
					title="Обновить реестр диагнозов МКБ-10"
					aria-label="Обновить реестр диагнозов"
				>
					<RefreshCw
						className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
					/>
				</button>
			</div>

			{loading ? (
				<p className="text-[var(--muted)] italic text-xs py-1">
					Загрузка реестра диагнозов МКБ-10...
				</p>
			) : error ? (
				<div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-800 text-xs">
					<AlertCircle className="w-4 h-4 shrink-0" />
					<span>{error}</span>
				</div>
			) : items.length === 0 ? (
				<p className="text-[var(--muted)] text-xs py-1">
					Нет зарегистрированных сопутствующих диагнозов. Основной диагноз приёма будет внесён в медицинскую карту.
				</p>
			) : (
				<ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
					{items.map((item) => (
						<li
							key={item.id}
							className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs"
						>
							<div className="flex items-center gap-2">
								<span className="font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)]">
									{item.icdCode}
								</span>
								<span className="text-[var(--ink)] font-medium">
									{item.icdName}
								</span>
							</div>
							<span className="text-[10px] text-[var(--muted)] shrink-0">
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

export const EgiszMultipleDiagnosesWidget = IcdDiagnosesWidget;
