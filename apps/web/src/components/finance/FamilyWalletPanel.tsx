import { Activity, ArrowRight, PlusCircle, ShieldCheck, Users, Wallet } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useCountUp } from "../../hooks/useCountUp";
import { useWebsocket } from "../../hooks/useWebsocket";
import { showToast } from "../GlobalToast";
import "./FamilyWalletPanel.css";

interface FamilyMember {
	id: string;
	fullName: string;
	phone: string;
}

interface FamilyGroup {
	id: string;
	name: string;
	balance: string;
	members: FamilyMember[];
}

interface FamilyWalletPanelProps {
	patientId: string;
	remainingDebtRub: number;
	onPaymentSuccess?: (() => void | Promise<void>) | undefined;
}

export const FamilyWalletPanel: React.FC<FamilyWalletPanelProps> = ({
	patientId,
	remainingDebtRub,
	onPaymentSuccess,
}) => {
	const [family, setFamily] = useState<FamilyGroup | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isPaying, setIsPaying] = useState(false);
	const [isToppingUp, setIsToppingUp] = useState(false);
	const [topupAmount, setTopupAmount] = useState<number>(0);
	const [amount, setAmount] = useState<number>(remainingDebtRub || 0);
	// Ключ идемпотентности живёт между повторами: без него повторная отправка
	// после обрыва связи зачислила бы деньги дважды.
	const topupMutationIdRef = useRef<string | null>(null);
	// То же самое для списания. Отключённой кнопки недостаточно: она защищает
	// только от второго клика, но не от повтора после потерянного ответа.
	const payMutationIdRef = useRef<string | null>(null);

	const fetchFamily = useCallback(async () => {
		try {
			const res = await fetch(`/api/finance/family/patient/${patientId}`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setFamily(data);
			} else {
				setFamily(null);
			}
		} catch (e) {
			console.error(e);
			setFamily(null);
		} finally {
			setIsLoading(false);
		}
	}, [patientId]);

	useEffect(() => {
		if (!patientId) return;
		// БЫЛО: без защиты от гонки. Ответ по пациенту А мог прийти позже ответа
		// по Б, и списание уходило в семью А со ссылкой на пациента Б.
		let cancelled = false;
		setFamily(null);
		setIsLoading(true);
		(async () => {
			try {
				const res = await fetch(`/api/finance/family/patient/${patientId}`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (cancelled) return;
				setFamily(res.ok ? await res.json() : null);
			} catch (e) {
				if (!cancelled) {
					console.error(e);
					setFamily(null);
				}
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [patientId]);

	// Sync balance with WS
	const wsUrl = (() => {
		const wsHost = (import.meta as any).env.VITE_WS_URL;
		if (wsHost) return wsHost;
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		return `${protocol}//${window.location.host}/api/ws/schedule`;
	})();
	const { lastMessage } = useWebsocket(wsUrl);
	useEffect(() => {
		if (lastMessage?.type === "FAMILY_BALANCE_UPDATED" && lastMessage.payload) {
			setFamily((prev) => {
				if (prev && lastMessage.payload.familyGroupId === prev.id) {
					return { ...prev, balance: lastMessage.payload.balance };
				}
				return prev;
			});
		}
	}, [lastMessage]);

	const balanceVal = Number(family?.balance || 0);
	const animatedBalance = useCountUp(balanceVal, 1000);

	const handlePay = async () => {
		// БЫЛО: только `if (!family) return`. Отключение кнопки через isPaying
		// происходит после ре-рендера, поэтому два быстрых клика в одном кадре
		// успевали отправить два запроса.
		if (!family || isPaying) return;
		if (amount <= 0) {
			showToast("Введите сумму", "error");
			return;
		}
		// Журнал платежей хранит целые рубли (payments.amount_rub — integer),
		// сервер отклоняет дробное с 400. Без этой проверки оператор видел
		// невнятную ошибку схемы вместо понятного текста.
		if (!Number.isInteger(amount)) {
			showToast("Сумма списания указывается целыми рублями", "error");
			return;
		}
		if (amount > balanceVal) {
			showToast("Недостаточно средств на семейном балансе", "error");
			return;
		}
		// БЫЛО: списание уходило вообще без ключа идемпотентности, хотя
		// пополнение строкой ниже его уже отправляло. Сценарий потери денег:
		// оператор нажал «Списать», сервер списал, ответ не дошёл (обрыв связи),
		// интерфейс показал «Сетевая ошибка», оператор нажал повторно — семья
		// заплатила дважды за одно лечение. Серверная защита по паре
		// (organizationId, clientMutationId) есть, но без ключа не срабатывает.
		if (!payMutationIdRef.current) {
			payMutationIdRef.current = `family-pay-${crypto.randomUUID()}`;
		}

		setIsPaying(true);
		try {
			const res = await fetch("/api/finance/family/pay", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId,
					familyGroupId: family.id,
					amountRub: amount,
					clientMutationId: payMutationIdRef.current,
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}) as { message?: string });
				showToast(err.message || "Ошибка оплаты", "error");
				return;
			}
			// Списание прошло — следующее получит новый ключ.
			payMutationIdRef.current = null;
			showToast("Оплата списана с семейного кошелька", "success");
			// Поле суммы обнуляется, иначе после успешного списания в нём
			// остаётся та же сумма и кнопка снова активна — приглашение
			// случайно списать второй раз.
			setAmount(0);
			if (onPaymentSuccess) onPaymentSuccess();
			// UI updates via WS, but we can refetch just in case
			fetchFamily();
		} catch (e) {
			showToast("Сетевая ошибка", "error");
		} finally {
			setIsPaying(false);
		}
	};

	const handleTopup = async () => {
		if (!family || isToppingUp) return;
		if (!Number.isInteger(topupAmount) || topupAmount <= 0) {
			showToast("Введите сумму пополнения целыми рублями", "error");
			return;
		}
		if (!topupMutationIdRef.current) {
			topupMutationIdRef.current = `family-topup-${crypto.randomUUID()}`;
		}

		setIsToppingUp(true);
		try {
			const res = await fetch("/api/finance/family/topup", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId,
					familyGroupId: family.id,
					amountRub: topupAmount,
					clientMutationId: topupMutationIdRef.current,
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Не удалось пополнить счёт", "error");
				return;
			}
			// Зачисление прошло — следующее пополнение получит новый ключ.
			topupMutationIdRef.current = null;
			showToast(`Семейный счёт пополнен на ${topupAmount.toLocaleString("ru-RU")} ₽`, "success");
			setTopupAmount(0);
			fetchFamily();
		} catch {
			showToast("Сетевая ошибка", "error");
		} finally {
			setIsToppingUp(false);
		}
	};

	if (isLoading)
		return (
			<div className="family-wallet-loading">
				<Activity size={16} className="animate-spin inline mr-2" />
				Загрузка семейного кошелька...
			</div>
		);
	if (!family) return null; // Not in a family group

	return (
		<div className="family-wallet-panel" data-testid="family-wallet-panel">
			<div className="family-wallet-bg-icon">
				<Users size={96} />
			</div>

			<div className="family-wallet-header">
				<div>
					<h3 className="family-wallet-title-row">
						<Wallet size={20} />
						Семейный Кошелек: {family.name}
					</h3>
					<p className="family-wallet-subtitle">
						Единый счет для семьи ({(family.members ?? []).length} чел.)
					</p>
				</div>
				<div className="family-wallet-balance-container">
					<div className="family-wallet-balance">
						{animatedBalance.toLocaleString("ru-RU", {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}{" "}
						₽
					</div>
					<p className="family-wallet-balance-label">
						<ShieldCheck size={12} />
						ДОСТУПНЫЙ БАЛАНС
					</p>
				</div>
			</div>

			<div className="family-wallet-actions">
				<div className="family-wallet-input-group">
					<label
						htmlFor="family-withdraw-amount"
						className="family-wallet-input-label"
					>
						Сумма списания (₽)
					</label>
					<input
						id="family-withdraw-amount"
						type="number"
						className="family-wallet-input"
						value={amount || ""}
						onChange={(e) => setAmount(Number(e.target.value))}
						placeholder="0.00"
						disabled={isPaying}
						max={balanceVal}
					/>
				</div>
				<div className="family-wallet-btn-container">
					<button
						type="button"
						onClick={handlePay}
						disabled={isPaying || balanceVal < amount || amount <= 0}
						className="family-wallet-btn"
					>
						{isPaying ? "Списание..." : "Списать с баланса"}{" "}
						<ArrowRight size={16} />
					</button>
				</div>
			</div>

			{/* Пополнение. БЫЛО: интерфейса и эндпоинта пополнения не существовало,
			    баланс мог только уменьшаться — поэтому он всегда оставался нулевым,
			    и любая оплата с семейного счёта отклонялась как «недостаточно средств». */}
			<div className="family-wallet-actions">
				<div className="family-wallet-input-group">
					<label
						htmlFor="family-topup-amount"
						className="family-wallet-input-label"
					>
						Пополнить счёт (₽)
					</label>
					<input
						id="family-topup-amount"
						type="number"
						min={1}
						step={1}
						className="family-wallet-input"
						value={topupAmount || ""}
						onChange={(e) => setTopupAmount(Math.trunc(Number(e.target.value)))}
						placeholder="0"
						disabled={isToppingUp}
					/>
				</div>
				<div className="family-wallet-btn-container">
					<button
						type="button"
						onClick={handleTopup}
						disabled={isToppingUp || topupAmount <= 0}
						className="family-wallet-btn"
					>
						{isToppingUp ? "Зачисление..." : "Пополнить"} <PlusCircle size={16} />
					</button>
				</div>
			</div>
		</div>
	);
};
