import { formatKopecksRu, parseKopecks } from "@dental/shared";
import { AlertTriangle, Calculator, FileText, Sparkles, User } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { actionFailureToast } from "../../lib/panelStateText";
import { useAppLogic } from "../../useAppLogic";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

export function NdflCalculatorModal({
	onClose,
	initialPatientId,
}: {
	onClose: () => void;
	initialPatientId?: string;
}) {
	const { patientId: contextPatientId, auth, dashboard } = useAppLogic();
	const [targetPatientId, setTargetPatientId] = useState<string>(
		initialPatientId || contextPatientId || dashboard?.patients?.[0]?.id || "",
	);
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
		if (!targetPatientId) {
			showToast("Выберите пациента для расчёта справки НДФЛ", "warning");
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(
				`/api/documents/ndfl-calculator?patientId=${encodeURIComponent(targetPatientId)}&startDate=${encodeURIComponent(`${startDate}T00:00:00.000Z`)}&endDate=${encodeURIComponent(`${endDate}T23:59:59.999Z`)}`,
				{
					headers:
						auth && typeof auth.denteClinicalMutationHeaders === "function"
							? auth.denteClinicalMutationHeaders()
							: {},
				},
			);
			const data = await res.json().catch(() => null);

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

	const modalContent = (
		<div className="modal-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div
				className="modal-content w-full max-w-lg p-6 rounded-3xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 shadow-2xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-slate-100 space-y-4"
			>
				<div className="flex items-center justify-between pb-2 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
					<h2 className="text-lg font-bold flex items-center gap-2 m-0 text-[var(--ink,#0f172a)] dark:text-white">
						<Calculator size={20} className="text-teal-600 dark:text-teal-400" />
						Справка об оплате мед. услуг (НДФЛ 13%)
					</h2>
					<span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2.5 py-0.5 rounded-full border border-teal-500/30">
						КНД 1151156
					</span>
				</div>

				{/* Patient Selector if not locked */}
				{dashboard?.patients && dashboard.patients.length > 0 && (
					<label className="flex flex-col text-xs font-semibold text-[var(--muted,#64748b)] dark:text-slate-400">
						Пациент (Налогоплательщик)
						<select
							value={targetPatientId}
							onChange={(e) => {
								setTargetPatientId(e.target.value);
								setResult(null);
							}}
							className="mt-1 p-2.5 min-h-[44px] rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:outline-none focus:border-teal-500"
						>
							{dashboard.patients.map((p) => (
								<option key={p.id} value={p.id}>
									{p.fullName} ({p.phone || "без телефона"})
								</option>
							))}
						</select>
					</label>
				)}

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
					<label className="flex flex-col text-xs font-semibold text-[var(--muted,#64748b)] dark:text-slate-400">
						Начало налогового периода
						<input
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							className="mt-1 p-2 min-h-[44px] rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:outline-none focus:border-teal-500"
						/>
					</label>
					<label className="flex flex-col text-xs font-semibold text-[var(--muted,#64748b)] dark:text-slate-400">
						Конец периода
						<input
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
							className="mt-1 p-2 min-h-[44px] rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white text-xs focus:outline-none focus:border-teal-500"
						/>
					</label>
				</div>

				<button
					type="button"
					onClick={handleCalculate}
					disabled={loading}
					className="w-full min-h-[44px] bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 cursor-pointer active:scale-95 transition-all"
				>
					{loading ? "Вычисление фискальных сумм..." : "Рассчитать суммы по чекам 54-ФЗ"}
				</button>

				{result && (
					<div className="mt-4">
						{result.isBlocked ? (
							<div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs space-y-1.5 shadow-sm">
								<div className="flex items-center gap-2 font-bold text-sm text-rose-900 dark:text-rose-200">
									<AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
									Формирование заблокировано
								</div>
								<div className="leading-relaxed">
									У пациента есть непогашенный долг:{" "}
									<strong className="font-bold">{formatKopecksRu(parseKopecks(result.debtRub))}</strong>. Для получения справки
									НДФЛ по ст. 219 НК РФ необходимо полностью закрыть задолженность.
								</div>
							</div>
						) : (
							<div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-xs space-y-3 shadow-sm">
								<div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/50 dark:border-emerald-800/50">
									<h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 m-0">
										Суммы расходов (Приказ ФНС ЕА-7-11/824@):
									</h3>
									<span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
										13% возврат
									</span>
								</div>

								<div className="flex justify-between items-center py-1 border-b border-emerald-200/40 dark:border-emerald-800/40">
									<div>
										<div className="font-semibold text-slate-800 dark:text-slate-200">Код 1 (Обычное лечение):</div>
										<div className="text-[10px] text-slate-500 dark:text-slate-400">Лимит базы вычета: 150 000 ₽ / год</div>
									</div>
									<strong className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
										{formatKopecksRu(parseKopecks(result.code1TotalRub))}
									</strong>
								</div>

								<div className="flex justify-between items-center py-1">
									<div>
										<div className="font-semibold text-slate-800 dark:text-slate-200">Код 2 (Дорогостоящее лечение):</div>
										<div className="text-[10px] text-slate-500 dark:text-slate-400">Имплантация, костная пластика (без лимита)</div>
									</div>
									<strong className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
										{formatKopecksRu(parseKopecks(result.code2TotalRub))}
									</strong>
								</div>
							</div>
						)}
					</div>
				)}

				<div className="mt-4 flex items-center justify-between gap-3 pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800">
					<div className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400">
						XML ФНС формируется по форме КНД 1151156
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-white font-bold text-xs cursor-pointer transition-all"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}
