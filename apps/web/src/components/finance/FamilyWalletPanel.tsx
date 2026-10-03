import {
	Activity,
	ArrowRight,
	BookOpen,
	Crown,
	FileText,
	Printer,
	RotateCcw,
	ShieldCheck,
	Sparkles,
	Users,
	Wallet,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders, money } from "../../AppHelpers";
import { useCountUp } from "../../hooks/useCountUp";
import { useWebsocket } from "../../hooks/useWebsocket";
import { actionFailureToast } from "../../lib/panelStateText";
/*
 * Разбор набранной суммы — тот же, что в форме приёма оплаты. Второй разбор
 * рядом с кассой означал бы, что «1500,50» в одном поле и в другом понимается
 * по-разному.
 */
import { normalizeRubAmountInput } from "../../rubAmountInput";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";
import {
	familyMutationId,
	familyPayRequestKey,
	familyTopupRequestKey,
	familyRefundRequestKey,
	type MutationTicket,
} from "./familyWalletMutationKey";
import { FamilyCombinedBillingModal } from "./FamilyCombinedBillingModal";
import {
	type FamilyGroup,
	type FamilyMember,
	type FamilyTopupMethod,
	type FamilyLedgerEntry,
	FAMILY_TOPUP_METHODS,
	PATIENT_ID_PATTERN,
	formatFamilyBalanceLabel,
	formatAvailableForDebitLabel,
	safeFamilyMemberName,
	refusalToast,
	WALLET_PANEL_SUBJECT,
} from "./familyWalletHelpers";
import { printFamilyLedgerStatement } from "./familyBillingPrint";
import { FamilyMembersList } from "./FamilyMembersList";
import { FamilyBonusSection } from "./FamilyBonusSection";
import { FamilyTopupSection } from "./FamilyTopupSection";
import "./FamilyWalletPanel.css";
import { logger } from "../../utils/logger";

export type { FamilyMember, FamilyGroup, FamilyTopupMethod, FamilyLedgerEntry };
export {
	WALLET_PANEL_SUBJECT,
	refusalToast,
	PATIENT_ID_PATTERN,
	FAMILY_TOPUP_METHODS,
	formatFamilyBalanceLabel,
	formatAvailableForDebitLabel,
};
export { FamilyMembersList } from "./FamilyMembersList";
export { FamilyBonusSection } from "./FamilyBonusSection";
export { FamilyTopupSection } from "./FamilyTopupSection";

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
	const [loadFailure, setLoadFailure] = useState<{
		status: number | null;
	} | null>(null);
	const [isPaying, setIsPaying] = useState(false);
	const [isToppingUp, setIsToppingUp] = useState(false);
	const [isCombinedBillingModalOpen, setIsCombinedBillingModalOpen] = useState(false);
	const [isLedgerOpen, setIsLedgerOpen] = useState(false);
	const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

	const [topupInput, setTopupInput] = useState("");
	const [topupMethod, setTopupMethod] = useState<FamilyTopupMethod>("cash");
	const [amountInput, setAmountInput] = useState("");

	// Семейный гроссбух: история операций по общему депозиту
	const [ledgerEntries, setLedgerEntries] = useState<FamilyLedgerEntry[]>([]);

	// Состояние формы возврата средств на депозит
	const [refundAmountInput, setRefundAmountInput] = useState("");
	const [refundTargetPatientId, setRefundTargetPatientId] = useState<string>(patientId);
	const [refundReason, setRefundReason] = useState("Отмена визита / возврат за неоказанные услуги");
	const [refundDestination, setRefundDestination] = useState<"family_deposit" | "cash_payout">("family_deposit");
	const [isRefunding, setIsRefunding] = useState(false);

	const topupMutationRef = useRef<MutationTicket | null>(null);
	const payMutationRef = useRef<MutationTicket | null>(null);
	const refundMutationRef = useRef<MutationTicket | null>(null);

	const isPatientDatabaseId = PATIENT_ID_PATTERN.test(patientId);
	const requestGenerationRef = useRef(0);
	const selectedPatientIdRef = useRef(patientId);

	/**
	 * Одна загрузка на все случаи: первый показ, кнопка «Повторить» и обновление
	 * после оплаты.
	 */
	const loadFamily = useCallback(async () => {
		const generation = requestGenerationRef.current + 1;
		requestGenerationRef.current = generation;
		const isStale = () =>
			requestGenerationRef.current !== generation ||
			selectedPatientIdRef.current !== patientId;
		setIsLoading(true);
		try {
			const res = await fetch(`/api/finance/family/patient/${patientId}`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (isStale()) return;
			if (res.ok) {
				const data = (await res.json()) as FamilyGroup;
				if (isStale()) return;
				setFamily(data);
				if (data.ledger && Array.isArray(data.ledger)) {
					setLedgerEntries(data.ledger);
				}
				setLoadFailure(null);
				return;
			}
			setFamily(null);
			setLoadFailure(res.status === 404 ? null : { status: res.status });
		} catch (e) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(e as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isStale()) return;
			logger.error("[family wallet] не удалось прочитать семейный кошелёк:", e);
			setFamily(null);
			setLoadFailure({ status: null });
		} finally {
			if (!isStale()) setIsLoading(false);
		}
	}, [patientId]);

	useEffect(() => {
		selectedPatientIdRef.current = patientId;
		setFamily(null);
		setLoadFailure(null);
		setAmountInput("");
		setTopupInput("");
		setRefundTargetPatientId(patientId);
		if (!isPatientDatabaseId) {
			setIsLoading(false);
			return;
		}
		void loadFamily();
		return () => {
			requestGenerationRef.current += 1;
		};
	}, [isPatientDatabaseId, loadFamily, patientId]);

	// Sync balance with WS
	const wsUrl = (() => {
		const wsHost = (
			import.meta as unknown as { env?: Record<string, string> }
		).env?.VITE_WS_URL;
		if (wsHost) return wsHost;
		if (typeof window !== "undefined" && window.location) {
			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			return `${protocol}//${window.location.host}/api/ws/schedule`;
		}
		return "ws://127.0.0.1:4100/api/ws/schedule";
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

	const parsedBalance = Number(family?.balance ?? 0);
	const balanceVal = Number.isFinite(parsedBalance) ? parsedBalance : 0;
	const animatedBalance = useCountUp(balanceVal, 1000);

	const [targetPatientId, setTargetPatientId] = useState<string>(patientId);

	useEffect(() => {
		setTargetPatientId(patientId);
	}, [patientId]);

	// Определение главы семьи
	const headMember =
		(family?.members ?? []).find(
			(member) => member.id === family?.headPatientId || member.isHead,
		) || (family?.members ?? [])[0];
	const headFullName =
		headMember?.fullName?.trim() || family?.headPatientName?.trim() || "Глава семьи";

	const payerName =
		(family?.members ?? []).find((member) => member.id === targetPatientId)
			?.fullName?.trim() ||
		(family?.members ?? []).find((member) => member.id === patientId)
			?.fullName?.trim() ||
		headFullName;

	const targetMemberName =
		(family?.members ?? []).find((member) => member.id === targetPatientId)
			?.fullName?.trim() || payerName;

	const parsedAmount = normalizeRubAmountInput(amountInput);
	const amount = parsedAmount ?? 0;
	const amountInvalid = Boolean(amountInput.trim()) && parsedAmount === null;
	const parsedTopup = normalizeRubAmountInput(topupInput);
	const topupAmount = parsedTopup ?? 0;
	const topupInvalid = Boolean(topupInput.trim()) && parsedTopup === null;

	const debtSuggestionRub = Number.isFinite(remainingDebtRub)
		? Math.max(0, Math.round(remainingDebtRub * 100) / 100)
		: 0;

	const payBlockReason = amountInvalid
		? "Впишите сумму цифрами, копейки после запятой: 1500,50"
		: amount > 0 && Math.abs(Math.round(amount * 100) - amount * 100) > 1e-4
			? "Сумма списания может содержать не более 2 знаков после запятой (копейки)."
			: amount > balanceVal && amount > 0
				? `На семейном счету только ${money(balanceVal)}. Спишите не больше этой суммы, остальное примите обычной оплатой или пополните счёт.`
				: null;

	const topupBlockReason = topupInvalid
		? "Впишите сумму цифрами, копейки после запятой: 1500,50"
		: topupAmount > 0 && Math.abs(Math.round(topupAmount * 100) - topupAmount * 100) > 1e-4
			? "Сумма пополнения может содержать не более 2 знаков после запятой (копейки)."
			: null;

	const handlePay = async () => {
		if (!family || isPaying) return;
		if (amount <= 0) {
			showToast("Введите сумму", "error");
			return;
		}
		if (Math.abs(Math.round(amount * 100) - amount * 100) > 1e-4) {
			showToast("Сумма списания может содержать не более 2 знаков после запятой", "error");
			return;
		}
		if (amount > balanceVal) {
			showToast("Недостаточно средств на семейном балансе", "error");
			return;
		}
		const mutationId = familyMutationId(
			payMutationRef,
			"family-pay",
			familyPayRequestKey(targetPatientId, family.id, amount),
		);

		setIsPaying(true);
		try {
			const res = await fetch("/api/finance/family/pay", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: targetPatientId,
					familyGroupId: family.id,
					amountRub: amount,
					clientMutationId: mutationId,
				}),
			});

			if (!res.ok) {
				const errPayload = (await res.json().catch(() => null)) as {
					message?: string;
				} | null;
				showToast(
					refusalToast(
						"Списание с семейного счёта не прошло",
						res.status,
						errPayload?.message,
					),
					"error",
				);
				return;
			}
			payMutationRef.current = null;
			const payResult = (await res.json().catch(() => null)) as {
				duplicate?: boolean;
			} | null;

			// Фиксация записи в семейном гроссбухе
			setLedgerEntries((prev) => [
				{
					id: `debit-${Date.now()}`,
					createdAt: new Date().toISOString(),
					entryType: "debit",
					amountRub: amount,
					amountKopecks: Math.round(amount * 100),
					payerFullName: headFullName,
					targetPatientId,
					targetPatientFullName: targetMemberName,
					notes: "Списание за лечение с семейного депозита",
					clientMutationId: mutationId,
				},
				...prev,
			]);

			showToast(
				payResult?.duplicate
					? "Эта оплата уже была списана раньше — второй раз деньги не списаны."
					: "Оплата списана с семейного кошелька",
				"success",
			);
			setAmountInput("");
			if (onPaymentSuccess) onPaymentSuccess();
			void loadFamily();
		} catch (e) {
			logger.error("[family wallet] списание не получило ответа сервера:", e);
			showToast(
				actionFailureToast(
					"Ответ по списанию с семейного счёта не получен",
					null,
				),
				"error",
			);
		} finally {
			setIsPaying(false);
		}
	};

	const handleTopup = async () => {
		if (!family || isToppingUp) return;
		if (topupAmount <= 0 || Math.abs(Math.round(topupAmount * 100) - topupAmount * 100) > 1e-4) {
			showToast("Введите корректную сумму пополнения", "error");
			return;
		}
		const mutationId = familyMutationId(
			topupMutationRef,
			"family-topup",
			familyTopupRequestKey(patientId, family.id, topupAmount, topupMethod),
		);

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
					method: topupMethod,
					clientMutationId: mutationId,
				}),
			});
			if (!res.ok) {
				const errPayload = (await res.json().catch(() => null)) as {
					message?: string;
				} | null;
				showToast(
					refusalToast(
						"Пополнение семейного счёта не прошло",
						res.status,
						errPayload?.message,
					),
					"error",
				);
				return;
			}
			topupMutationRef.current = null;
			const topupResult = (await res.json().catch((err) => {
				logger.error("[Dente]", err);
				showToast(
					actionFailureToast(
						"Ответ о пополнении не прочитан",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				return null;
			})) as {
				duplicate?: boolean;
			} | null;

			// Фиксация пополнения в семейном гроссбухе
			setLedgerEntries((prev) => [
				{
					id: `topup-${Date.now()}`,
					createdAt: new Date().toISOString(),
					entryType: "deposit",
					amountRub: topupAmount,
					amountKopecks: Math.round(topupAmount * 100),
					payerPatientId: patientId,
					payerFullName: payerName,
					method: topupMethod,
					notes: `Пополнение семейного счёта (${topupMethod})`,
					clientMutationId: mutationId,
				},
				...prev,
			]);

			showToast(
				topupResult?.duplicate
					? `Этот аванс уже был зачислен раньше — ${money(topupAmount)} второй раз не зачислены.`
					: `Семейный счёт пополнен на ${money(topupAmount)}`,
				"success",
			);
			setTopupInput("");
			void loadFamily();
		} catch (e) {
			logger.error("[family wallet] пополнение не получило ответа сервера:", e);
			showToast(
				actionFailureToast(
					"Ответ по пополнению семейного счёта не получен",
					null,
				),
				"error",
			);
		} finally {
			setIsToppingUp(false);
		}
	};

	// Возврат средств на семейный депозит (Refund Routing)
	const handleExecuteRefund = async () => {
		if (!family || isRefunding) return;
		const parsedRefund = normalizeRubAmountInput(refundAmountInput);
		const refundAmount = parsedRefund ?? 0;
		if (refundAmount <= 0) {
			showToast("Введите корректную сумму возврата", "error");
			return;
		}

		if (refundDestination === "cash_payout") {
			showToast(
				"Внимание: возврат наличными требует обязательного пробития фискального чека «Возврат прихода» (54-ФЗ) на кассе!",
				"warning",
				5000,
			);
			setIsRefundModalOpen(false);
			return;
		}

		setIsRefunding(true);
		try {
			const targetRefundMember = (family.members ?? []).find((m) => m.id === refundTargetPatientId);
			const targetName = targetRefundMember?.fullName?.trim() || "Пациент";
			const effectiveTargetPatientId = refundTargetPatientId || patientId;
			const cleanReason = refundReason.trim();

			const mutationId = familyMutationId(
				refundMutationRef,
				"family-refund",
				familyRefundRequestKey(effectiveTargetPatientId, family.id, refundAmount, cleanReason),
			);

			const res = await fetch("/api/finance/family/topup", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: effectiveTargetPatientId,
					familyGroupId: family.id,
					amountRub: refundAmount,
					method: "other",
					comment: `Возврат средств на семейный депозит за пациента ${targetName}: ${cleanReason}`,
					clientMutationId: mutationId,
				}),
			});

			if (!res.ok) {
				const errPayload = await res.json().catch(() => null);
				showToast(errPayload?.message || "Не удалось вернуть средства на депозит", "error");
				return;
			}
			refundMutationRef.current = null;

			// Фиксация в семейном гроссбухе
			setLedgerEntries((prev) => [
				{
					id: `ledger-${mutationId}`,
					createdAt: new Date().toISOString(),
					entryType: "refund_deposit",
					amountRub: refundAmount,
					amountKopecks: Math.round(refundAmount * 100),
					payerFullName: headFullName,
					targetPatientId: effectiveTargetPatientId,
					targetPatientFullName: targetName,
					notes: `Возврат на семейный депозит: ${cleanReason}`,
					clientMutationId: mutationId,
				},
				...prev,
			]);

			showToast(
				`Средства (${money(refundAmount)}) успешно возвращены на семейный депозит!`,
				"success",
			);
			setRefundAmountInput("");
			setIsRefundModalOpen(false);
			void loadFamily();
		} catch (e) {
			logger.error("[family wallet] ошибка возврата на депозит:", e);
			showToast("Ошибка связи при оформлении возврата", "error");
		} finally {
			setIsRefunding(false);
		}
	};

	const handlePrintLedger = () => {
		printFamilyLedgerStatement({
			clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			familyGroupName: family?.name?.trim() || "Семейная группа",
			headFullName,
			currentBalanceRub: balanceVal,
			entries: ledgerEntries,
		});
	};

	if (isLoading)
		return (
			<div className="family-wallet-loading">
				<Activity size={16} className="animate-spin inline mr-2" />
				Загрузка семейного кошелька...
			</div>
		);
	if (loadFailure)
		return (
			<PanelLoadFailure
				subject={WALLET_PANEL_SUBJECT}
				status={loadFailure.status}
				onRetry={() => {
					void loadFamily();
				}}
			/>
		);
	if (!family) return null;

	return (
		<div className="family-wallet-panel" data-testid="family-wallet-panel">
			<div className="family-wallet-bg-icon">
				<Users size={96} />
			</div>

			<div className="family-wallet-header">
				<div>
					<div className="flex items-center gap-2 flex-wrap">
						<h3 className="family-wallet-title-row">
							<Wallet size={20} />
							Семейный Кошелек: {family.name?.trim() || "без названия"}
						</h3>
						<span
							className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/15 text-teal-800 dark:text-teal-200 border border-teal-500/30"
							data-testid="badge-family-balance-head"
						>
							<Crown size={12} className="text-amber-500" />
							{formatFamilyBalanceLabel(balanceVal, headFullName)}
						</span>
					</div>

					<p className="family-wallet-subtitle flex items-center gap-2 flex-wrap">
						<span>Единый счет для семьи ({(family.members ?? []).length} чел.)</span>
						<span>·</span>
						<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
							<ShieldCheck size={13} className="text-emerald-500" />
							Защита от овердрафта: баланс ≥ 0 ₽
						</span>
					</p>
				</div>

				<div className="flex items-center gap-2.5 flex-wrap">
					<div className="family-wallet-balance-container">
						<div className="family-wallet-balance">{money(animatedBalance)}</div>
						<p
							className="family-wallet-balance-label"
							title="Сумма, доступная для списания за лечение любого члена семьи"
							data-testid="badge-available-for-debit"
						>
							<ShieldCheck size={12} />
							{formatAvailableForDebitLabel(balanceVal)}
						</p>
					</div>

					{/* Кнопка семейного расчета */}
					<button
						type="button"
						onClick={() => setIsCombinedBillingModalOpen(true)}
						className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
						title="Объединить счета членов семьи и принять оплату со сплитом"
						data-testid="btn-open-family-combined-billing"
					>
						<Sparkles size={15} className="animate-pulse" />
						<span>Семейная оплата</span>
					</button>

					{/* Кнопка Гроссбуха (история операций) */}
					<button
						type="button"
						onClick={() => setIsLedgerOpen((prev) => !prev)}
						className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
							isLedgerOpen
								? "bg-teal-600 text-white border-teal-600"
								: "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)]"
						}`}
						title="Открыть общий семейный гроссбух: история списаний, пополнений и возвратов"
						data-testid="btn-toggle-family-ledger"
					>
						<BookOpen size={14} />
						<span>Гроссбух ({ledgerEntries.length})</span>
					</button>

					{/* Кнопка возврата средств на депозит */}
					<button
						type="button"
						onClick={() => setIsRefundModalOpen(true)}
						className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-300 transition-all flex items-center gap-1.5 cursor-pointer"
						title="Оформить возврат средств за отмененный визит обратно на семейный депозит"
						data-testid="btn-open-family-refund-modal"
					>
						<RotateCcw size={14} />
						<span>Возврат на депозит</span>
					</button>
				</div>
			</div>

			{/* Секция: Семейный гроссбух (история операций) */}
			{isLedgerOpen && (
				<div className="mt-4 p-4 rounded-xl border border-teal-500/30 bg-[var(--paper-soft,#f8fafc)] space-y-3 animate-in fade-in duration-150" data-testid="family-ledger-container">
					<div className="flex items-center justify-between flex-wrap gap-2">
						<div className="flex items-center gap-2">
							<BookOpen size={18} className="text-teal-600" />
							<h4 className="font-extrabold text-xs sm:text-sm m-0 text-[var(--ink,#0f172a)]">
								Семейный гроссбух: история списаний и депозитов
							</h4>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handlePrintLedger}
								className="min-h-[36px] px-3 rounded-lg border border-[var(--line,#cbd5e1)] text-xs font-bold flex items-center gap-1 hover:bg-[var(--paper,#ffffff)] cursor-pointer"
								title="Распечатать официальную выписку по семейному счету (А4)"
								data-testid="btn-print-family-ledger"
							>
								<Printer size={13} />
								<span>Печать выписки</span>
							</button>

							<button
								type="button"
								onClick={() => setIsLedgerOpen(false)}
								className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--muted,#64748b)] cursor-pointer"
								aria-label="Скрыть гроссбух"
							>
								<X size={16} />
							</button>
						</div>
					</div>

					<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] overflow-hidden shadow-2xs">
						{ledgerEntries.length === 0 ? (
							<div className="p-6 text-center text-xs text-[var(--muted,#64748b)]">
								Операций по семейному кошельку в текущей сессии пока не зафиксировано.
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-xs text-left border-collapse">
									<thead className="bg-slate-100 dark:bg-slate-800 text-[var(--muted,#64748b)] font-bold border-b border-[var(--line,#e2e8f0)]">
										<tr>
											<th className="py-2.5 px-3">Дата/время</th>
											<th className="py-2.5 px-3">Тип</th>
											<th className="py-2.5 px-3">Плательщик</th>
											<th className="py-2.5 px-3">За кого</th>
											<th className="py-2.5 px-3">Основание</th>
											<th className="py-2.5 px-3 text-right">Сумма</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
										{ledgerEntries.map((entry) => {
											const isPlus =
												entry.entryType === "deposit" ||
												entry.entryType === "refund_deposit";
											return (
												<tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
													<td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
														{new Date(entry.createdAt).toLocaleDateString("ru-RU")}
													</td>
													<td className="py-2.5 px-3">
														<span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
															isPlus
																? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
																: "bg-rose-500/15 text-rose-800 dark:text-rose-300"
														}`}>
															{entry.entryType === "deposit"
																? "Пополнение"
																: entry.entryType === "refund_deposit"
																	? "Возврат на депозит"
																	: "Списание"}
														</span>
													</td>
													<td className="py-2.5 px-3 font-medium">
														{entry.payerFullName || headFullName}
													</td>
													<td className="py-2.5 px-3 font-medium">
														{entry.targetPatientFullName || "—"}
													</td>
													<td className="py-2.5 px-3 text-[11px] text-[var(--muted,#64748b)] truncate max-w-[200px]" title={entry.notes}>
														{entry.actNumber || entry.visitId || entry.notes || "—"}
													</td>
													<td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
														isPlus ? "text-emerald-600" : "text-rose-600"
													}`}>
														{isPlus ? "+" : "−"} {money(entry.amountRub)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Списание с семейного баланса */}
			<div className="family-wallet-actions">
				<div className="family-wallet-input-group">
					<label
						htmlFor="family-withdraw-amount"
						className="family-wallet-input-label"
					>
						Сумма списания (₽)
					</label>
					{targetMemberName && (
						<p className="family-wallet-payer">
							Оплата за: <strong>{targetMemberName}</strong>
						</p>
					)}
					<input
						id="family-withdraw-amount"
						type="text"
						inputMode="decimal"
						autoComplete="off"
						className="family-wallet-input"
						value={amountInput}
						onChange={(e) => setAmountInput(e.target.value)}
						placeholder="0"
						disabled={isPaying}
						aria-invalid={payBlockReason ? true : undefined}
						aria-describedby={
							payBlockReason ? "family-withdraw-hint" : undefined
						}
					/>
					{debtSuggestionRub > 0 && (
						<div className="quick-chips-row">
							<button
								type="button"
								className="quick-chip quick-chip--sm"
								onClick={() => setAmountInput(String(debtSuggestionRub))}
								disabled={isPaying}
								title={isPaying ? "Идет операция списания..." : undefined}
							>
								Долг: {money(debtSuggestionRub)}
							</button>
						</div>
					)}
				</div>
				<div className="family-wallet-btn-container">
					<button
						type="button"
						onClick={handlePay}
						disabled={isPaying}
						title={isPaying ? "Идет списание средств с семейного баланса..." : undefined}
						className="family-wallet-btn"
					>
						{isPaying ? "Списание..." : "Списать с баланса"}{" "}
						<ArrowRight size={16} />
					</button>
				</div>
			</div>
			{payBlockReason && (
				<p
					className="family-wallet-hint"
					id="family-withdraw-hint"
					role="status"
				>
					{payBlockReason}
				</p>
			)}

			{/* Бонусные баллы & Быстрый выбор суммы */}
			<FamilyBonusSection
				balanceVal={balanceVal}
				amount={amount}
				isPaying={isPaying}
				onSelectAmount={(val) => setAmountInput(String(val))}
			/>

			{/* Список членов семейной группы и выбор цели списания */}
			<FamilyMembersList
				members={family.members ?? []}
				targetPatientId={targetPatientId}
				patientId={patientId}
				isPaying={isPaying}
				headPatientId={family.headPatientId || headMember?.id}
				onSelectTargetPatient={setTargetPatientId}
			/>

			{/* Пополнение семейного кошелька */}
			<FamilyTopupSection
				topupInput={topupInput}
				setTopupInput={setTopupInput}
				topupMethod={topupMethod}
				setTopupMethod={setTopupMethod}
				topupBlockReason={topupBlockReason}
				isToppingUp={isToppingUp}
				onTopup={handleTopup}
			/>

			{/* Модальное окно объединенного расчета семьи и сплит-оплаты */}
			<FamilyCombinedBillingModal
				isOpen={isCombinedBillingModalOpen}
				onClose={() => setIsCombinedBillingModalOpen(false)}
				familyGroupId={family.id}
				familyGroupName={family.name?.trim() || "Семья"}
				availableFamilyWalletRub={balanceVal}
				initialPayer={{
					payerId: headMember?.id || patientId,
					payerFullName: headFullName,
				}}
				onCheckoutComplete={async () => {
					setIsCombinedBillingModalOpen(false);
					await onPaymentSuccess?.();
					void loadFamily();
				}}
			/>

			{/* Модальное окно возврата на семейный депозит (Refund Routing) */}
			{isRefundModalOpen && (
				<div
					className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
					role="dialog"
					aria-modal="true"
					aria-labelledby="family-refund-title"
					onClick={(e) => {
						if (e.target === e.currentTarget) setIsRefundModalOpen(false);
					}}
				>
					<div className="w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
						<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-3 bg-[var(--paper-soft,#f8fafc)]">
							<div className="flex items-center gap-2.5">
								<div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-600 shrink-0">
									<RotateCcw size={18} />
								</div>
								<div>
									<h3 id="family-refund-title" className="text-sm sm:text-base font-extrabold m-0 text-[var(--ink,#0f172a)]">
										Возврат средств на семейный депозит
									</h3>
									<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
										Семья: <strong>{family.name?.trim() || "Без названия"}</strong> (Глава: {headFullName})
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsRefundModalOpen(false)}
								className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
								aria-label="Закрыть"
							>
								<X size={18} />
							</button>
						</div>

						<div className="p-4 sm:p-5 space-y-4">
							<div>
								<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
									За какого члена семьи оформляется возврат:
								</label>
								<select
									value={refundTargetPatientId}
									onChange={(e) => setRefundTargetPatientId(e.target.value)}
									className="w-full h-11 px-3.5 rounded-xl border border-[var(--line,#cbd5e1)] text-xs font-bold bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)]"
								>
									{(family.members ?? []).map((m) => (
										<option key={m.id} value={m.id}>
											{safeFamilyMemberName(m)} {m.id === headMember?.id ? "(Глава семьи)" : ""}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
									Сумма возврата (₽):
								</label>
								<input
									type="text"
									inputMode="decimal"
									value={refundAmountInput}
									placeholder="0"
									onChange={(e) => setRefundAmountInput(e.target.value)}
									className="w-full h-11 px-3.5 rounded-xl border border-[var(--line,#cbd5e1)] font-mono font-bold text-base bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)]"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1">
									Причина возврата:
								</label>
								<input
									type="text"
									value={refundReason}
									onChange={(e) => setRefundReason(e.target.value)}
									className="w-full h-10 px-3 rounded-xl border border-[var(--line,#cbd5e1)] text-xs bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)]"
									placeholder="Отмена процедуры, изменение плана лечения"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold text-[var(--muted,#64748b)] mb-1.5">
									Направление возврата средств:
								</label>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									<button
										type="button"
										onClick={() => setRefundDestination("family_deposit")}
										className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
											refundDestination === "family_deposit"
												? "border-teal-600 bg-teal-500/10 text-teal-800 dark:text-teal-200"
												: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)]"
										}`}
									>
										<div className="font-extrabold flex items-center gap-1">
											<Wallet size={13} className="text-teal-600" />
											<span>На семейный депозит</span>
										</div>
										<div className="text-[11px] font-normal mt-0.5">
											(Деньги остаются на счете семьи)
										</div>
									</button>

									<button
										type="button"
										onClick={() => setRefundDestination("cash_payout")}
										className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
											refundDestination === "cash_payout"
												? "border-rose-600 bg-rose-500/10 text-rose-800 dark:text-rose-200"
												: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)]"
										}`}
									>
										<div className="font-extrabold flex items-center gap-1">
											<RotateCcw size={13} className="text-rose-600" />
											<span>Выплата из кассы</span>
										</div>
										<div className="text-[11px] font-normal mt-0.5">
											(Чек «Возврат прихода»)
										</div>
									</button>
								</div>
							</div>
						</div>

						<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] flex items-center justify-end gap-2 bg-[var(--paper-soft,#f8fafc)]">
							<button
								type="button"
								onClick={() => setIsRefundModalOpen(false)}
								className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#cbd5e1)] text-xs font-bold cursor-pointer"
							>
								Отмена
							</button>

							<button
								type="button"
								onClick={handleExecuteRefund}
								disabled={isRefunding}
								className="min-h-[44px] px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
								data-testid="btn-confirm-family-refund"
							>
								{isRefunding ? "Выполняется..." : "Подтвердить возврат"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
