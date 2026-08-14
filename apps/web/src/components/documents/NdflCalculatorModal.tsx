import { AlertTriangle, Calculator } from "lucide-react";
import { useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { useAppLogic } from "../../useAppLogic";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

export function NdflCalculatorModal({ onClose }: { onClose: () => void }) {
	const { patientId, auth } = useAppLogic();
	const [startDate, setStartDate] = useState(
		new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
	);
	const [endDate, setEndDate] = useState(
		new Date().toISOString().split("T")[0],
	);

	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<{
		isBlocked: boolean;
		debtRub: number;
		code1TotalRub: number;
		code2TotalRub: number;
	} | null>(null);

	const handleCalculate = async () => {
		if (!patientId) return;
		setLoading(true);
		try {
			// Маршрут закрыт requireClinicalMutationAccess (routes/documents/
			// ndflCalculator.ts:23). Без заголовка сеанса настоящая клиника
			// отвечает 403, и раздел выглядит пустым: локально этого не видно,
			// потому что в .env секрет закомментирован и лазейка открыта.
			const res = await fetch(
				`/api/documents/ndfl-calculator?patientId=${encodeURIComponent(patientId)}&startDate=${encodeURIComponent(`${startDate}T00:00:00.000Z`)}&endDate=${encodeURIComponent(`${endDate}T23:59:59.999Z`)}`,
				{
					headers:
						auth && typeof auth.denteClinicalMutationHeaders === "function"
							? auth.denteClinicalMutationHeaders()
							: {},
				},
			);
			const data = await res.json().catch(() => null);
			/*
			 * ОТВЕТ ПРОВЕРЯЕТСЯ ДО ПОКАЗА. Комментарий выше предупреждает, что
			 * настоящая клиника получает 403, — а следующая строка клала тело
			 * этого 403 прямо в `result`. Промис `fetch` на 403 и 500 не
			 * отклоняется, поэтому `catch` ниже не срабатывал: отрисовка
			 * (:149, :155) читала `result.code1TotalRub` и `result.code2TotalRub`
			 * из объекта ошибки и показывала пустые суммы. Врач видел «налог
			 * посчитан, суммы нулевые» вместо «нет доступа».
			 *
			 * Проверка формы нужна отдельно от `res.ok`: маршрут может ответить
			 * 200 с другим телом, и в справку 2-НДФЛ уйдут пустые поля.
			 */
			if (!res.ok) {
				throw new Error(
					(data && typeof data === "object" && "message" in data
						? String((data as { message?: unknown }).message)
						: null) ?? `HTTP ${res.status}`,
				);
			}
			if (
				!data ||
				typeof data !== "object" ||
				typeof (data as { code1TotalRub?: unknown }).code1TotalRub !== "number"
			) {
				throw new Error("Сервер вернул расчёт в неизвестном формате");
			}
			setResult(data);
		} catch (error) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(error as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.error(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="modal-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div
				className="modal-content w-full max-w-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 space-y-4"
			>
				<h2 className="text-lg font-bold flex items-center gap-2 m-0 text-slate-900 dark:text-slate-100">
					<Calculator size={20} className="text-teal-600 dark:text-teal-400" />
					Калькулятор НДФЛ
				</h2>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
					<label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-slate-400">
						Начало периода
						<input
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							className="mt-1 p-2 min-h-[44px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-teal-500"
						/>
					</label>
					<label className="flex flex-col text-xs font-semibold text-slate-600 dark:text-slate-400">
						Конец периода
						<input
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
							className="mt-1 p-2 min-h-[44px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-teal-500"
						/>
					</label>
				</div>

				<button
					type="button"
					onClick={handleCalculate}
					disabled={loading}
					className="primary-button w-full min-h-[44px] text-sm font-semibold"
				>
					{loading ? "Вычисление..." : "Рассчитать"}
				</button>

				{result && (
					<div className="mt-4">
						{result.isBlocked ? (
							<div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs space-y-1.5">
								<div className="flex items-center gap-2 font-bold text-sm text-rose-900 dark:text-rose-200">
									<AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
									Формирование заблокировано
								</div>
								<div className="leading-relaxed">
									У пациента есть неоплаченный долг:{" "}
									<strong className="font-bold">{result.debtRub} ₽</strong>. Для получения справки
									НДФЛ необходимо полностью погасить задолженность.
								</div>
							</div>
						) : (
							<div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-xs space-y-2">
								<h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 m-0">
									Суммы для справки (КНД 1151156):
								</h3>
								<div className="flex justify-between items-center py-0.5 border-b border-emerald-200/50 dark:border-emerald-800/50">
									<span className="text-slate-700 dark:text-slate-300">Код 1 (Обычное лечение):</span>
									<strong className="font-bold text-sm text-emerald-700 dark:text-emerald-300">{result.code1TotalRub} ₽</strong>
								</div>
								<div className="flex justify-between items-center py-0.5">
									<span className="text-slate-700 dark:text-slate-300">Код 2 (Дорогостоящее):</span>
									<strong className="font-bold text-sm text-emerald-700 dark:text-emerald-300">{result.code2TotalRub} ₽</strong>
								</div>
							</div>
						)}
					</div>
				)}

				<div className="mt-4 text-right">
					<button type="button" onClick={onClose} className="secondary-button min-h-[44px]">
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
}
