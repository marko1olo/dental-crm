import { actionFailureToast } from "../../lib/panelStateText";
import { useEffect, useState } from "react";
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

	const initiatePayment = async () => {
		if (!patientId || !amountInRubles) return;
		setStatus("initiating");
		setErrorMsg("");
		try {
			const res = await fetch("/api/sberbank/pay", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					patientId,
					amount: Math.round(amountInRubles * 100), // Enforce integer kopecks
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to initiate payment");

			setOrderId(data.orderId);
			setStatus("polling");
		} catch (err: any) {
			setStatus("error");
			setErrorMsg(err.message || "Не удалось запустить терминал");
		}
	};

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
				const res = await fetch(`/api/sberbank/status/${orderId}`);
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
			showToast(actionFailureToast("Ошибка выполнения операции", (err as { status?: number })?.status ?? null), "error");
				console.error("Polling error", err);
				setStatus("error");
				setErrorMsg("Ошибка связи с терминалом");
				clearInterval(interval);
			}
		}, 3000);

		return () => clearInterval(interval);
	}, [status, orderId, onSuccess, onClose]);

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
