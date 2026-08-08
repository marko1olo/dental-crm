import { useCallback, useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

export type SberbankTerminalPaymentModalProps = {
	isOpen: boolean;
	patientId: string;
	amountInRubles: number;
	onClose: () => void;
	onSuccess: () => void;
};

export function SberbankTerminalPaymentModal({
	isOpen,
	patientId,
	amountInRubles,
	onClose,
	onSuccess,
}: SberbankTerminalPaymentModalProps) {
	const [status, setStatus] = useState<
		"idle" | "initiating" | "polling" | "success" | "error"
	>("idle");
	const [orderId, setOrderId] = useState<string | null>(null);
	const [errorMsg, setErrorMsg] = useState("");
	const { auth } = useAppLogicContext();

	/*
	 * СИНХРОННЫЙ ЗАМОК, А НЕ ФЛАГ СОСТОЯНИЯ. Состояние в React обновляется
	 * асинхронно: между щелчком и перерисовкой с `disabled` есть окно, куда
	 * проходит второй щелчок. Для кнопки, запускающей списание с карты, этого
	 * окна достаточно, чтобы уйти двум запросам. `useRef` меняется синхронно и
	 * закрывает окно; `status` остаётся для отрисовки.
	 *
	 * Клиентская защита — только удобство, а не гарантия. Настоящая защита от
	 * повтора — ключ идемпотентности на стороне сервера; здесь его нет, потому
	 * что нет и самой интеграции (см. ниже).
	 */
	const inFlight = useRef(false);

	const initiatePayment = useCallback(async () => {
		if (!patientId || !amountInRubles) return;
		if (inFlight.current) return;
		inFlight.current = true;
		setStatus("initiating");
		setErrorMsg("");
		try {
			/*
			 * АДРЕС ИСПРАВЛЕН. Здесь стоял `/api/sberbank/initiate` — маршрута с
			 * таким путём НЕ СУЩЕСТВУЕТ во всём API (проверено поиском по
			 * apps/api: объявлены только `/api/sberbank/pay` и
			 * `/api/sberbank/status/:orderId`). Кнопка оплаты всегда получала
			 * 404, а кнопка «Повторить» повторяла тот же 404.
			 *
			 * Настоящий маршрут отвечает 501: интеграции со Сбербанком в сборке
			 * нет (ни одного обращения к API банка, ни переменных окружения, ни
			 * тестов). Прежде он отвечал выдуманным успехом и помечал счёт
			 * оплаченным без денег — это убрано. Здесь показываем врачу честную
			 * причину вместо безымянного отказа.
			 */
			const res = await fetch("/api/sberbank/pay", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(auth && typeof auth.denteClinicalReadHeaders === "function"
						? auth.denteClinicalReadHeaders()
						: {}),
				},
				body: JSON.stringify({
					amount: Math.round(amountInRubles * 100),
					patientId,
					description: `Оплата по пациенту ${patientId}`,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(
					data.message || data.error || "Не удалось запустить оплату",
				);
			}

			setOrderId(data.orderId);
			setStatus("polling");
		} catch (err) {
			setStatus("error");
			setErrorMsg(
				err instanceof Error ? err.message : "Не удалось запустить терминал",
			);
		} finally {
			// Снимать замок обязательно и на отказе, иначе «Повторить» мертва.
			inFlight.current = false;
		}
	}, [amountInRubles, patientId, auth]);

	useEffect(() => {
		if (isOpen && status === "idle") {
			initiatePayment();
		}
	}, [isOpen, status, initiatePayment]);

	useEffect(() => {
		if (!isOpen) {
			setStatus("idle");
			setOrderId(null);
			setErrorMsg("");
		}
	}, [isOpen]);

	useEffect(() => {
		if (status !== "polling" || !orderId) return;

		const interval = setInterval(async () => {
			try {
				/*
				 * ЗАГОЛОВКИ ЗДЕСЬ ОБЯЗАТЕЛЬНЫ. Запрос уходил голым, тогда как
				 * маршрут закрыт `requirePermission(..., "finance.write")`, а
				 * соседний вызов в этом же файле заголовки подставляет. Итог —
				 * 403 на каждом опросе, и окно висело в «ожидании оплаты», пока
				 * врач не закроет его вручную.
				 *
				 * `res.ok` проверяется отдельно: промис `fetch` на 403 и 500 не
				 * отклоняется, поэтому без проверки тело отказа разбиралось как
				 * состояние платежа, а `data.status` оказывался undefined —
				 * ни ветка успеха, ни ветка отказа не срабатывали, и опрос шёл
				 * вечно.
				 */
				const res = await fetch(`/api/sberbank/status/${orderId}`, {
					headers:
						auth && typeof auth.denteClinicalReadHeaders === "function"
							? auth.denteClinicalReadHeaders()
							: {},
				});
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
				if (data.status === "success") {
					setStatus("success");
					clearInterval(interval);
					showToast("Оплата успешно завершена на терминале", "success");
					setTimeout(() => {
						onSuccess();
						onClose();
					}, 1500);
				} else if (data.status === "failed") {
					setStatus("error");
					setErrorMsg("Оплата отклонена терминалом");
					clearInterval(interval);
				}
			} catch (err) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				logger.error("Polling error", err);
				setStatus("error");
				setErrorMsg("Ошибка связи с терминалом");
				clearInterval(interval);
			}
		}, 3000);

		return () => clearInterval(interval);
	}, [status, orderId, onSuccess, onClose, auth]);

	const handleClose = () => {
		if (
			status === "polling" &&
			!window.confirm("Оплата в процессе. Вы уверены, что хотите закрыть?")
		) {
			return;
		}
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
			<div
				className="w-full max-w-md p-6 rounded-xl shadow-xl"
				style={{
					background: "var(--paper)",
					color: "var(--ink)",
				}}
			>
				<h2 style={{ marginTop: 0, marginBottom: "16px", fontSize: "20px" }}>
					Оплата через терминал Сбербанка
				</h2>
				<div style={{ fontSize: "16px", marginBottom: "20px" }}>
					Сумма к оплате: <strong>{amountInRubles} ₽</strong>
				</div>

				{status === "initiating" && (
					<div style={{ color: "var(--brand-600)" }}>
						Отправка запроса на терминал...
					</div>
				)}

				{status === "polling" && (
					<div style={{ marginBottom: "16px" }}>
						<div style={{ color: "var(--brand-600)", fontWeight: "bold" }}>
							Ожидание оплаты клиентом на терминале...
						</div>
						<div
							style={{
								color: "var(--rust, #c53030)",
								fontSize: "13px",
								marginTop: "6px",
							}}
						>
							Внимание: при закрытии окна во время оплаты транзакция на
							терминале не отменяется.
						</div>
					</div>
				)}

				{status === "success" && (
					<div style={{ color: "var(--success-600)", fontWeight: "bold" }}>
						Оплата успешно проведена!
					</div>
				)}

				{status === "error" && (
					<div style={{ color: "var(--rust)", marginBottom: "16px" }}>
						Ошибка: {errorMsg}
					</div>
				)}

				<div
					style={{
						display: "flex",
						justifyContent: "flex-end",
						gap: "12px",
						marginTop: "24px",
					}}
				>
					{status === "error" && (
						<button
							type="button"
							className="primary-button"
							onClick={initiatePayment}
							disabled={status !== "error"}
						>
							Повторить
						</button>
					)}
					<button
						type="button"
						className="secondary-button"
						onClick={handleClose}
						disabled={status === "initiating" || status === "success"}
					>
						Отмена
					</button>
				</div>
			</div>
		</div>
	);
}
