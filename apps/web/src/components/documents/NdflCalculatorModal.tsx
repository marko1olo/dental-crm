import { AlertTriangle, Calculator } from "lucide-react";
import { useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { useAppLogic } from "../../useAppLogic";
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
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="modal-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
			<div
				className="modal-content w-full max-w-md p-6 rounded-lg"
				style={{
					background: "var(--paper)",
					color: "var(--ink)",
				}}
			>
				<h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Calculator size={20} />
					Калькулятор НДФЛ
				</h2>

				<div style={{ display: "flex", gap: "16px", margin: "16px 0" }}>
					<label style={{ display: "flex", flexDirection: "column", flex: 1 }}>
						Начало периода
						<input
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							style={{ padding: "8px", marginTop: "4px" }}
						/>
					</label>
					<label style={{ display: "flex", flexDirection: "column", flex: 1 }}>
						Конец периода
						<input
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
							style={{ padding: "8px", marginTop: "4px" }}
						/>
					</label>
				</div>

				<button
					type="button"
					onClick={handleCalculate}
					disabled={loading}
					className="primary-button w-full"
				>
					{loading ? "Вычисление..." : "Рассчитать"}
				</button>

				{result && (
					<div style={{ marginTop: "24px" }}>
						{result.isBlocked ? (
							<div
								style={{
									background: "var(--red-soft)",
									borderColor: "var(--red-light)",
									borderWidth: "1px",
									borderStyle: "solid",
									padding: "16px",
									borderRadius: "4px",
									color: "var(--red-dark)",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										fontWeight: "bold",
									}}
								>
									<AlertTriangle size={18} />
									Формирование заблокировано
								</div>
								<div style={{ marginTop: "8px" }}>
									У пациента есть неоплаченный долг:{" "}
									<strong>{result.debtRub} ₽</strong>. Для получения справки
									НДФЛ необходимо полностью погасить задолженность.
								</div>
							</div>
						) : (
							<div
								style={{
									background: "var(--success-soft)",
									borderColor: "var(--success-light)",
									borderWidth: "1px",
									borderStyle: "solid",
									padding: "16px",
									borderRadius: "4px",
									color: "var(--success-dark)",
								}}
							>
								<h3 style={{ margin: "0 0 12px 0" }}>Суммы для справки:</h3>
								<div
									style={{ display: "flex", justifyContent: "space-between" }}
								>
									<span>Код 1 (Обычное лечение):</span>
									<strong>{result.code1TotalRub} ₽</strong>
								</div>
								<div
									style={{ display: "flex", justifyContent: "space-between" }}
								>
									<span>Код 2 (Дорогостоящее):</span>
									<strong>{result.code2TotalRub} ₽</strong>
								</div>
							</div>
						)}
					</div>
				)}

				<div style={{ marginTop: "24px", textAlign: "right" }}>
					<button type="button" onClick={onClose} className="secondary-button">
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
}
