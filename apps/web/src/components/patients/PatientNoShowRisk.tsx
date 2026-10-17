import { CalendarClock } from "lucide-react";
import React, { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { logger } from "../../utils/logger";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { NO_SHOW_SUBJECT } from "./noShowRisk/patientNoShowTypes";
import { PatientNoShowRiskStats } from "./noShowRisk/PatientNoShowRiskStats";

export type PatientNoShowRiskProps = {
	readonly patientId: string | null;
};

export const PatientNoShowRisk: React.FC<PatientNoShowRiskProps> = ({ patientId }) => {
	const [loading, setLoading] = useState(false);
	const [riskData, setRiskData] = useState<any>(null);
	const [reloadToken, setReloadToken] = useState(0);
	const [failure, setFailure] = useState<{ status: number | null } | null>(null);

	useEffect(() => {
		if (!patientId) {
			setRiskData(null);
			setFailure(null);
			setLoading(false);
			return;
		}
		setRiskData(null);
		setFailure(null);
		setLoading(true);

		const controller = new AbortController();
		let cancelled = false;

		(async () => {
			try {
				const res = await fetch("/api/ai/predict-no-show", {
					method: "POST",
					headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
					body: JSON.stringify({ patientId }),
					signal: controller.signal,
				});
				if (cancelled) return;
				if (res.ok) {
					const data = await res.json().catch((err: any) => {
						logger.error(err);
						return null;
					});
					if (cancelled) return;
					if (data) setRiskData(data);
					else setFailure({ status: res.status });
				} else {
					setFailure({ status: res.status });
				}
			} catch (e) {
				if (cancelled || (e as Error)?.name === "AbortError") return;
				logger.error("Failed to fetch AI no-show risk", e);
				setFailure({ status: null });
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [patientId, reloadToken]);

	if (!patientId) return null;

	return (
		<div
			data-testid="patient-no-show-risk"
			className="panel p-3.5 rounded-xl border bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] shadow-2xs"
		>
			<h3
				className="panel-heading compact-heading flex items-center gap-2 mb-3 pb-2 border-b border-[var(--line)]"
				title="Дисциплина визитов и статистика неявок пациента"
			>
				<CalendarClock size={16} className="text-emerald-600 dark:text-emerald-400" />
				<span className="text-sm font-semibold">Дисциплина посещений и неявки</span>
			</h3>

			{loading ? (
				<div className="text-xs text-[var(--muted)] py-3">Анализируем журнал посещений пациента…</div>
			) : failure ? (
				<PanelLoadFailure
					subject={NO_SHOW_SUBJECT}
					status={failure.status}
					onRetry={() => setReloadToken((token) => token + 1)}
				/>
			) : riskData ? (
				<PatientNoShowRiskStats riskData={riskData} />
			) : (
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 py-2">
					<span className="text-xs text-[var(--muted)]">Статистика посещаемости по журналу приёмов</span>
					<button
						type="button"
						onClick={() => setReloadToken((token) => token + 1)}
						disabled={loading}
						className="px-3.5 py-1.5 min-h-[34px] text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors shadow-2xs cursor-pointer"
					>
						{loading ? "Анализируем…" : "Проверить историю"}
					</button>
				</div>
			)}
		</div>
	);
};
