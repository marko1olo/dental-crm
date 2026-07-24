import { Activity, ArrowRight, ShieldCheck, Users, Wallet } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
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
	const [amount, setAmount] = useState<number>(remainingDebtRub || 0);

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
		if (patientId) fetchFamily();
	}, [patientId, fetchFamily]);

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
		if (!family) return;
		if (amount <= 0) {
			showToast("Введите сумму", "error");
			return;
		}
		if (amount > balanceVal) {
			showToast("Недостаточно средств на семейном балансе", "error");
			return;
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
				}),
			});

			if (!res.ok) {
				const err = await res.json();
				showToast(err.message || "Ошибка оплаты", "error");
			} else {
				showToast("Оплата списана с семейного кошелька", "success");
				if (onPaymentSuccess) onPaymentSuccess();
				// UI updates via WS, but we can refetch just in case
				fetchFamily();
			}
		} catch (e) {
			showToast("Сетевая ошибка", "error");
		} finally {
			setIsPaying(false);
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
		<div className="family-wallet-panel">
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
						Единый счет для семьи ({family.members.length} чел.)
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
		</div>
	);
};
