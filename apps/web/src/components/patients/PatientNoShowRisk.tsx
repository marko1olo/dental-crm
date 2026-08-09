import {
	AlertTriangle,
	BrainCircuit,
	CheckCircle,
	ShieldAlert,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import type { PanelSubject } from "../../lib/panelStateText";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";

export type PatientNoShowRiskProps = {
	patientId: string | null;
};

/**
 * Тексты отказа расчёта. Берём общий вид отказа панелей, чтобы на одном экране
 * карточки не появилось второго языка ошибок: рядом стоят рекламации, задачи и
 * блокировка записи, и все они сообщают о непрочитанных данных одинаково.
 */
const NO_SHOW_SUBJECT: PanelSubject = {
	notLoadedTitle: "Риск неявки не рассчитан",
	accusative: "оценку риска неявки",
	emptyTitle: "Риск неявки не рассчитан",
	emptyHint:
		"Расчёт опирается на историю записей пациента: сколько раз приходил, сколько отменял.",
	failureConsequence:
		"Расчёт не выполнен, поэтому пациента нельзя считать ни надёжным, ни рискованным. Позвоните и подтвердите запись обычным порядком.",
};

export const PatientNoShowRisk: React.FC<PatientNoShowRiskProps> = ({
	patientId,
}) => {
	const [loading, setLoading] = useState(false);
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const [riskData, setRiskData] = useState<any>(null);
	// Кнопка «Рассчитать AI-риск» перезапускает тот же эффект, а не отдельную
	// функцию: иначе ручной запрос остался бы без отмены и снова мог бы
	// показать чужой прогноз.
	const [_reloadToken, setReloadToken] = useState(0);
	/*
	 * БЫЛО: отказ сервера не сохранялся нигде. Ветка `if (res.ok)` без `else` и
	 * `catch` с одним logger.error оставляли riskData равным null, а на null
	 * виджет рисует приглашение «Рассчитать риск» с кнопкой. Администратор жал
	 * кнопку, видел «Считаем…», через секунду возвращался тот же экран — и так
	 * сколько угодно раз: кнопка не делала ничего и не объясняла, почему. Ни
	 * одного слова о том, что расчёт не выполнен, на экране не было.
	 */
	const [failure, setFailure] = useState<{ status: number | null } | null>(
		null,
	);

	// Прогноз запрашивается через POST, поэтому общий хук usePatientResource
	// (он делает GET) здесь не подходит — отмена сделана вручную.
	// БЫЛО: состояние сбрасывалось, но устаревший ответ не отбрасывался.
	// Ответ по ранее выбранному пациенту, пришедший позже, показывал его
	// риск неявки на карточке текущего.
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
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({ patientId }),
					signal: controller.signal,
				});
				if (cancelled) return;
				if (res.ok) {
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					const data = await res.json().catch((err: any) => {
						logger.error(err);
						showToast(
							actionFailureToast(
								"Ошибка чтения ответа",
								(err as { status?: number })?.status ?? null,
							),
							"error",
						);
						return null;
					});
					if (cancelled) return;
					// Ответ 200 без разбираемого тела — тоже не расчёт.
					if (data) setRiskData(data);
					else setFailure({ status: res.status });
				} else {
					setFailure({ status: res.status });
				}
			} catch (e) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(e as { status?: number })?.status ?? null,
					),
					"error",
				);
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
	}, [patientId]);

	if (!patientId) return null;

	const getRiskClass = (level: string) => {
		switch (level) {
			case "high":
				return "text-red-600 dark:text-red-400";
			case "medium":
				return "text-amber-600 dark:text-amber-400";
			case "low":
				return "text-emerald-600 dark:text-emerald-400";
			default:
				return "text-slate-600 dark:text-slate-400";
		}
	};

	/*
	 * БЫЛО: «Высокий риск (High)», «Средний риск (Medium)», «Низкий риск (Low)» —
	 * английское слово в скобках рядом с русским. Оно ничего не добавляет тому,
	 * кто сидит за стойкой, и превращает подпись в надпись для разработчика.
	 */
	const getRiskLabel = (level: string) => {
		switch (level) {
			case "high":
				return "Высокий риск";
			case "medium":
				return "Средний риск";
			case "low":
				return "Низкий риск";
			default:
				return "Риск не определён";
		}
	};

	const getRiskIcon = (level: string) => {
		switch (level) {
			case "high":
				return <ShieldAlert size={16} className="text-red-500" />;
			case "medium":
				return <AlertTriangle size={16} className="text-amber-500" />;
			case "low":
				return <CheckCircle size={16} className="text-emerald-500" />;
			default:
				return <BrainCircuit size={16} className="text-slate-400" />;
		}
	};

	/*
	 * Здесь лежала своя формула денег: `n.toLocaleString("ru-RU") + " ₽"`. Она
	 * ничего не форматировала в этом файле — ни одного вызова — и при этом теряла
	 * копейки и расходилась с общей money() из AppHelpers. Второй владелец
	 * денежного формата, ждущий первого использования, удалён.
	 */

	return (
		<div
			data-testid="patient-no-show-risk"
			className="panel p-4 rounded-xl border mb-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<h3
				className="panel-heading compact-heading flex items-center gap-2 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800"
				title="Машинный расчет риска отмены записи пациента"
			>
				<BrainCircuit
					size={18}
					className="text-emerald-600 dark:text-emerald-400"
				/>
				{/* БЫЛО: «AI-Прогноз неявки на приём». Латиница в заголовке того,
				    что читает администратор у стойки. */}
				<span className="text-sm font-semibold">
					Придёт ли пациент на приём
				</span>
			</h3>

			{loading ? (
				<div className="text-xs text-slate-500 dark:text-slate-400 py-3">
					Считаем по истории пациента…
				</div>
			) : failure ? (
				/*
					Отказ расчёта ВМЕСТО приглашения посчитать: иначе кнопка выглядит
					неработающей, а экран не сообщает, что расчёт не выполнен.
				*/
				<PanelLoadFailure
					subject={NO_SHOW_SUBJECT}
					status={failure.status}
					onRetry={() => setReloadToken((token) => token + 1)}
				/>
			) : riskData ? (
				<div>
					<div className="flex justify-between items-center mb-3 p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
						<div className="flex items-center gap-2">
							{getRiskIcon(riskData?.riskLevel ?? "")}
							<span
								className={`text-sm font-semibold ${getRiskClass(riskData?.riskLevel ?? "")}`}
							>
								{getRiskLabel(riskData?.riskLevel ?? "")}
							</span>
						</div>
						<div className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
							Вероятность неявки:{" "}
							{Math.round((riskData?.noShowProbability || 0) * 100)}%
						</div>
					</div>

					{(riskData?.factors ?? []).length > 0 && (
						<div className="mt-3">
							<span className="text-xs font-bold text-slate-700 dark:text-slate-300">
								Факторы риска:
							</span>
							<ul className="mt-1 space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-4 list-disc">
								{(riskData?.factors ?? []).map((factor: string) => (
									<li key={factor}>{factor}</li>
								))}
							</ul>
						</div>
					)}

					{riskData?.recommendedAction && (
						<div className="mt-3 p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-800 dark:text-emerald-200">
							<strong>Рекомендуемое действие:</strong>{" "}
							{riskData.recommendedAction}
						</div>
					)}
				</div>
			) : (
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 py-2">
					<span className="text-xs text-slate-500 dark:text-slate-400">
						Прогноз риска отмены на основе истории и поведения пациента
					</span>
					<button
						type="button"
						onClick={() => setReloadToken((token) => token + 1)}
						disabled={loading}
						className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
					>
						{loading ? "Считаем…" : "Посчитать риск"}
					</button>
				</div>
			)}
		</div>
	);
};
