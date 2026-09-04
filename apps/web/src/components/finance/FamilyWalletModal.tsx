/**
 * FamilyWalletModal.tsx — Family Wallet Management & Balance Allocation Studio.
 * Allows allocating shared family funds, configuring monthly spend limits,
 * tracking deduction history, and 1-click top-ups.
 */

import React, { useMemo, useState } from "react";
import {
	AlertCircle,
	ArrowDownLeft,
	ArrowUpRight,
	Baby,
	Banknote,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Coins,
	CreditCard,
	DollarSign,
	Download,
	Eye,
	FileText,
	Filter,
	Heart,
	Layers,
	Lock,
	MoreHorizontal,
	Percent,
	Phone,
	Plus,
	Printer,
	QrCode,
	Receipt,
	RefreshCw,
	RotateCcw,
	Search,
	ShieldCheck,
	Sliders,
	Smartphone,
	Sparkles,
	Unlock,
	User,
	UserCheck,
	Users,
	Wallet,
	X,
	Zap,
} from "lucide-react";
import {
	type FamilyRelationshipType,
	FAMILY_RELATIONSHIP_RU,
	SbpQrEngine,
	rublesToKopecks,
	rubToKopecks,
	kopecksToRub,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import { generateQrCodeSvg } from "../portal/patientCabinet/patientCabinetEngine";

export interface FamilyMemberAllocation {
	readonly id: string;
	readonly patientId: string;
	readonly fullName: string;
	readonly role: FamilyRelationshipType;
	readonly birthDate?: string | undefined;
	readonly monthlyLimitRub?: number | undefined; // 0 or undefined = unlimited
	readonly spentThisMonthRub: number;
	readonly allocatedBalanceRub: number;
	readonly isLocked?: boolean | undefined;
}

export interface FamilyTransactionRecord {
	readonly id: string;
	readonly dateIso: string;
	readonly memberId: string;
	readonly memberName: string;
	readonly memberRole: string;
	readonly type: "deduction" | "topup" | "refund";
	readonly amountRub: number;
	readonly description: string;
	readonly procedureCode804n?: string | undefined;
	readonly toothNumber?: number | undefined;
	readonly tenderSource: "deposit" | "sbp" | "card" | "cash";
	readonly receiptNumber?: string | undefined;
	readonly status: "completed" | "pending" | "cancelled";
}

export interface FamilyWalletModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly familyGroupId?: string | undefined;
	readonly familyGroupName?: string | undefined;
	readonly headPayerName?: string | undefined;
	readonly headPayerPhone?: string | undefined;
	readonly initialTotalBalanceRub?: number | undefined;
	readonly initialMembers?: readonly FamilyMemberAllocation[] | undefined;
	readonly initialTransactions?: readonly FamilyTransactionRecord[] | undefined;
	readonly onSaveAllocations?: ((allocations: readonly FamilyMemberAllocation[]) => void) | undefined;
	readonly onTopup?: ((amountRub: number, method: string) => void) | undefined;
	readonly onOpenCombinedBilling?: (() => void) | undefined;
}

export const FamilyWalletModal: React.FC<FamilyWalletModalProps> = ({
	isOpen,
	onClose,
	familyGroupId = "fam-grp-1",
	familyGroupName = "Семья Ивановых",
	headPayerName = "Иванов Иван Иванович",
	headPayerPhone = "+7 (916) 123-45-67",
	initialTotalBalanceRub = 45000,
	initialMembers,
	initialTransactions,
	onSaveAllocations,
	onTopup,
	onOpenCombinedBilling,
}) => {
	const [activeTab, setActiveTab] = useState<"allocation" | "history" | "topup">("allocation");
	const [totalBalanceRub, setTotalBalanceRub] = useState<number>(initialTotalBalanceRub);

	// Default fallback members
	const [members, setMembers] = useState<FamilyMemberAllocation[]>(() => {
		if (initialMembers && initialMembers.length > 0) {
			return [...initialMembers];
		}
		return [
			{
				id: "mem-1",
				patientId: "pat-1",
				fullName: "Иванов Иван Иванович",
				role: "parent",
				monthlyLimitRub: 0, // unlimited
				spentThisMonthRub: 12500,
				allocatedBalanceRub: 20000,
				isLocked: false,
			},
			{
				id: "mem-2",
				patientId: "pat-2",
				fullName: "Иванова Елена Сергеевна",
				role: "spouse",
				monthlyLimitRub: 25000,
				spentThisMonthRub: 6500,
				allocatedBalanceRub: 15000,
				isLocked: false,
			},
			{
				id: "mem-3",
				patientId: "pat-3",
				fullName: "Иванов Михаил Иванович",
				role: "child",
				birthDate: "2015-06-12",
				monthlyLimitRub: 10000,
				spentThisMonthRub: 3500,
				allocatedBalanceRub: 10000,
				isLocked: false,
			},
		];
	});

	// Default fallback transactions
	const [transactions, setTransactions] = useState<FamilyTransactionRecord[]>(() => {
		if (initialTransactions && initialTransactions.length > 0) {
			return [...initialTransactions];
		}
		return [
			{
				id: "tx-1",
				dateIso: new Date(Date.now() - 86400000 * 2).toISOString(),
				memberId: "mem-1",
				memberName: "Иванов Иван Иванович",
				memberRole: "Родитель (Плательщик)",
				type: "deduction",
				amountRub: 12500,
				description: "Лечение кариеса и фотополимерная пломба (Зуб 16)",
				procedureCode804n: "A16.07.002.001",
				toothNumber: 16,
				tenderSource: "deposit",
				receiptNumber: "ФД-4819",
				status: "completed",
			},
			{
				id: "tx-2",
				dateIso: new Date(Date.now() - 86400000 * 5).toISOString(),
				memberId: "mem-3",
				memberName: "Иванов Михаил Иванович",
				memberRole: "Ребенок",
				type: "deduction",
				amountRub: 3500,
				description: "Профессиональная гигиена молочных зубов и фторирование",
				procedureCode804n: "A16.07.051",
				tenderSource: "deposit",
				receiptNumber: "ФД-4790",
				status: "completed",
			},
			{
				id: "tx-3",
				dateIso: new Date(Date.now() - 86400000 * 8).toISOString(),
				memberId: "mem-1",
				memberName: "Иванов Иван Иванович",
				memberRole: "Родитель (Плательщик)",
				type: "topup",
				amountRub: 50000,
				description: "Пополнение семейного депозита через СБП QR",
				tenderSource: "sbp",
				receiptNumber: "СБП-99281",
				status: "completed",
			},
		];
	});

	// Topup form states
	const [topupAmountRub, setTopupAmountRub] = useState<number>(10000);
	const [topupMethod, setTopupMethod] = useState<"sbp" | "card" | "cash">("sbp");
	const [selectedHistoryFilter, setSelectedHistoryFilter] = useState<string>("all");
	const [toastMsg, setToastMsg] = useState<string | null>(null);

	// Allocated sum
	const totalAllocatedRub = useMemo(() => {
		return members.reduce((acc, m) => acc + m.allocatedBalanceRub, 0);
	}, [members]);

	const unallocatedBalanceRub = totalBalanceRub - totalAllocatedRub;

	// Handlers for 1-Click quick actions
	const handleSplitEqually = () => {
		if (members.length === 0) return;
		const perMember = Math.floor(totalBalanceRub / members.length);
		const remainder = totalBalanceRub - perMember * members.length;

		setMembers((prev) =>
			prev.map((m, idx) => ({
				...m,
				allocatedBalanceRub: perMember + (idx === 0 ? remainder : 0),
			})),
		);
		setToastMsg("Баланс распределен поровну между всеми членами семьи!");
	};

	const handleGiveChildrenFixed = (childAmount = 10000) => {
		const childrenCount = members.filter((m) => m.role === "child").length;
		if (childrenCount === 0) {
			setToastMsg("В семье нет зарегистрированных детей.");
			return;
		}

		const totalForChildren = childAmount * childrenCount;
		const remainingForParents = Math.max(0, totalBalanceRub - totalForChildren);
		const parentsCount = members.filter((m) => m.role !== "child").length || 1;
		const perParent = Math.floor(remainingForParents / parentsCount);

		setMembers((prev) =>
			prev.map((m) => {
				if (m.role === "child") {
					return { ...m, allocatedBalanceRub: childAmount };
				}
				return { ...m, allocatedBalanceRub: perParent };
			}),
		);
		setToastMsg(`Детям выделено по ${childAmount.toLocaleString("ru-RU")} ₽!`);
	};

	const handleRemoveLimits = () => {
		setMembers((prev) =>
			prev.map((m) => ({
				...m,
				monthlyLimitRub: 0,
			})),
		);
		setToastMsg("Все персональные лимиты сняты (свободный общий доступ).");
	};

	const handleMemberAllocationChange = (id: string, amount: number) => {
		setMembers((prev) =>
			prev.map((m) => (m.id === id ? { ...m, allocatedBalanceRub: Math.max(0, amount) } : m)),
		);
	};

	const handleMemberLimitChange = (id: string, limit: number) => {
		setMembers((prev) =>
			prev.map((m) => (m.id === id ? { ...m, monthlyLimitRub: Math.max(0, limit) } : m)),
		);
	};

	const handleQuickDeduct = (memberId: string, amountRub: number) => {
		const member = members.find((m) => m.id === memberId);
		if (!member) return;
		if (amountRub <= 0) return;

		const totalBalanceKop = rubToKopecks(totalBalanceRub);
		if (totalBalanceKop <= 0) {
			setToastMsg("Семейный баланс исчерпан.");
			return;
		}

		const memberAllocatedKop = rubToKopecks(member.allocatedBalanceRub);
		const maxAvailableKop = memberAllocatedKop > 0 ? Math.min(memberAllocatedKop, totalBalanceKop) : totalBalanceKop;
		const requestedKop = rubToKopecks(amountRub);
		const actualDeductKop = Math.min(requestedKop, maxAvailableKop);

		if (actualDeductKop <= 0) {
			setToastMsg(`Недостаточно средств для списания (${member.fullName})`);
			return;
		}

		const actualDeductRub = kopecksToRub(actualDeductKop);
		const newTotalBalanceRub = kopecksToRub(totalBalanceKop - actualDeductKop);
		setTotalBalanceRub(newTotalBalanceRub);

		setMembers((prev) =>
			prev.map((m) => {
				if (m.id !== memberId) return m;
				const currentAllocatedKop = rubToKopecks(m.allocatedBalanceRub);
				const newAllocatedKop = currentAllocatedKop > 0 ? Math.max(0, currentAllocatedKop - actualDeductKop) : 0;
				const newSpentKop = rubToKopecks(m.spentThisMonthRub) + actualDeductKop;
				return {
					...m,
					allocatedBalanceRub: kopecksToRub(newAllocatedKop),
					spentThisMonthRub: kopecksToRub(newSpentKop),
				};
			}),
		);

		const newTx: FamilyTransactionRecord = {
			id: `tx-deduct-${Date.now()}`,
			dateIso: new Date().toISOString(),
			memberId: member.id,
			memberName: member.fullName,
			memberRole: FAMILY_RELATIONSHIP_RU[member.role] || member.role,
			type: "deduction",
			amountRub: actualDeductRub,
			description: `1-Клик списание с семейного баланса без пароля: ${member.fullName}`,
			tenderSource: "deposit",
			receiptNumber: `СЕМ-${Math.floor(1000 + Math.random() * 9000)}`,
			status: "completed",
		};

		setTransactions((prev) => [newTx, ...prev]);
		setToastMsg(`Списано ${actualDeductRub.toLocaleString("ru-RU")} ₽ в пользу: ${member.fullName}`);
	};

	const handleExecuteTopup = () => {
		if (topupAmountRub <= 0) return;
		const newTotal = totalBalanceRub + topupAmountRub;
		setTotalBalanceRub(newTotal);

		const newTx: FamilyTransactionRecord = {
			id: `tx-${Date.now()}`,
			dateIso: new Date().toISOString(),
			memberId: "mem-1",
			memberName: headPayerName,
			memberRole: "Родитель (Плательщик)",
			type: "topup",
			amountRub: topupAmountRub,
			description: `Пополнение семейного счета (${topupMethod.toUpperCase()})`,
			tenderSource: topupMethod,
			receiptNumber: `ККТ-${Math.floor(1000 + Math.random() * 9000)}`,
			status: "completed",
		};

		setTransactions((prev) => [newTx, ...prev]);
		if (onTopup) onTopup(topupAmountRub, topupMethod);

		setToastMsg(`Семейный счет пополнен на +${topupAmountRub.toLocaleString("ru-RU")} ₽!`);
		setActiveTab("allocation");
	};

	const handleSave = () => {
		if (onSaveAllocations) {
			onSaveAllocations(members);
		}
		setToastMsg("Лимиты и распределение баланса сохранены в клинике.");
		setTimeout(() => {
			onClose();
		}, 600);
	};

	const filteredTransactions = useMemo(() => {
		if (selectedHistoryFilter === "all") return transactions;
		return transactions.filter((t) => t.memberId === selectedHistoryFilter);
	}, [transactions, selectedHistoryFilter]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-label="Семейный кошелек и распределение баланса"
			data-testid="family-wallet-modal"
		>
			<div className="bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
				{/* Toast Banner */}
				{toastMsg && (
					<div className="bg-teal-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0">
						<span className="flex items-center gap-1.5"><Check size={14} className="shrink-0" /> {toastMsg}</span>
						<button type="button" onClick={() => setToastMsg(null)} className="text-white hover:opacity-80 p-0.5 rounded cursor-pointer" aria-label="Закрыть уведомление"><X size={14} /></button>
					</div>
				)}

				{/* Top Header */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-3">
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 flex items-center justify-center border border-pink-500/30 shrink-0">
							<Users className="w-4 h-4" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="text-base sm:text-lg font-bold text-[var(--ink)] m-0 leading-tight">
									{familyGroupName} — Семейный кошелек
								</h3>
								<span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border border-pink-500/30 uppercase shrink-0">
									{members.length} чел.
								</span>
							</div>
							<p className="text-[11px] sm:text-xs text-[var(--muted)] m-0 mt-0.5 leading-tight flex items-center gap-2">
								<span>Глава семьи / Плательщик: <strong>{headPayerName}</strong></span>
								<span>•</span>
								<span>{headPayerPhone}</span>
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-11 w-11 sm:h-9 sm:w-9 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center border border-transparent shrink-0"
						aria-label="Закрыть окно"
					>
						<X className="w-5 h-5 sm:w-4 sm:h-4" />
					</button>
				</div>

				{/* Tabs Navigation (32px Segmented Control) */}
				<div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-2 border-b border-[var(--line)] bg-[var(--paper)] text-xs font-bold shrink-0">
					<div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--border,#cbd5e1)]">
						<button
							type="button"
							onClick={() => setActiveTab("allocation")}
							className={`h-8 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-bold ${
								activeTab === "allocation"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)] font-medium"
							}`}
							data-testid="tab-family-allocation"
						>
							<Sliders className="w-3.5 h-3.5 text-pink-600 shrink-0" />
							<span>Распределение & Лимиты</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("history")}
							className={`h-8 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-bold ${
								activeTab === "history"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)] font-medium"
							}`}
							data-testid="tab-family-history"
						>
							<Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
							<span>История операций ({transactions.length})</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("topup")}
							className={`h-8 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-bold ${
								activeTab === "topup"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)] font-medium"
							}`}
							data-testid="tab-family-topup"
						>
							<Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
							<span>Пополнить счет (1-клик)</span>
						</button>
					</div>

					<div className="flex items-center gap-2">
						<span className="text-[11px] text-[var(--muted)] font-semibold hidden sm:inline">Баланс кошелька:</span>
						<strong className="text-sm sm:text-base font-black text-pink-600 dark:text-pink-400 font-mono">
							{totalBalanceRub.toLocaleString("ru-RU")} ₽
						</strong>
					</div>
				</div>

				{/* Body Content */}
				<div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 pb-20">
					{/* Balance Summary Monolithic Container (Anti-Matryoshka) */}
					<div className="p-4 sm:p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-wrap items-center justify-between gap-4">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<Wallet className="w-5 h-5 text-pink-600" />
								<span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">
									Общий остаток семейного счета
								</span>
							</div>
							<div className="text-2xl sm:text-3xl font-black text-[var(--ink)] font-mono">
								{totalBalanceRub.toLocaleString("ru-RU")} ₽
							</div>
						</div>

						<div className="flex items-center gap-3 flex-wrap">
							<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-0.5">
								<div className="text-[10px] font-bold text-[var(--muted)] uppercase">Распределено:</div>
								<div className="text-sm font-black font-mono text-pink-600 dark:text-pink-400">
									{totalAllocatedRub.toLocaleString("ru-RU")} ₽
								</div>
							</div>
							<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-0.5">
								<div className="text-[10px] font-bold text-[var(--muted)] uppercase">Не распределено:</div>
								<div className={`text-sm font-black font-mono ${unallocatedBalanceRub < 0 ? "text-rose-600" : "text-emerald-600"}`}>
									{unallocatedBalanceRub.toLocaleString("ru-RU")} ₽
								</div>
							</div>
						</div>
					</div>

					{activeTab === "allocation" && (
						<div className="space-y-4" data-testid="family-allocation-view">
							{/* 1-Click Quick Actions Toolbar (32-36px height buttons) */}
							<div className="p-3 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-2 flex-wrap">
								<span className="text-xs font-extrabold text-[var(--ink)] uppercase tracking-wider">
									Быстрые действия (1-клик):
								</span>
								<div className="flex items-center gap-1.5 flex-wrap">
									<button
										type="button"
										onClick={handleSplitEqually}
										className="h-8 px-2.5 rounded-lg text-xs font-bold bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)] cursor-pointer transition-all active:scale-95 shadow-2xs"
										data-testid="btn-split-equally"
									>
										Поровну всем
									</button>
									<button
										type="button"
										onClick={() => handleGiveChildrenFixed(10000)}
										className="h-8 px-2.5 rounded-lg text-xs font-bold bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)] cursor-pointer transition-all active:scale-95 shadow-2xs"
										data-testid="btn-children-10k"
									>
										Детям по 10 000 ₽
									</button>
									<button
										type="button"
										onClick={handleRemoveLimits}
										className="h-8 px-2.5 rounded-lg text-xs font-bold bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)] cursor-pointer transition-all active:scale-95 shadow-2xs"
										data-testid="btn-remove-limits"
									>
										Снять лимиты
									</button>
								</div>
							</div>

							{/* Members Allocation List (Monolithic Clean Rows - Anti-Matryoshka) */}
							<div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-xs divide-y divide-[var(--line)]/60">
								{members.map((mem) => {
									const isChild = mem.role === "child";
									const hasLimit = mem.monthlyLimitRub && mem.monthlyLimitRub > 0;
									const limitUsagePct = hasLimit ? Math.min(100, Math.round((mem.spentThisMonthRub / mem.monthlyLimitRub!) * 100)) : 0;

									return (
										<div key={mem.id} className="p-4 sm:p-5 space-y-3 hover:bg-[var(--paper-soft)]/40 transition-colors" data-testid={`member-row-${mem.id}`}>
											<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
												<div className="flex items-center gap-3">
													<div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
														isChild
															? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
															: "bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-700"
													}`}>
														{isChild ? <Baby className="w-5 h-5" /> : <User className="w-5 h-5" />}
													</div>

													<div>
														<div className="flex items-center gap-2 flex-wrap">
															<strong className="text-sm sm:text-base font-extrabold text-[var(--ink)]">
																{mem.fullName}
															</strong>
															<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
																{FAMILY_RELATIONSHIP_RU[mem.role] || mem.role}
															</span>
														</div>
														<div className="text-[11px] text-[var(--muted)] mt-0.5">
															Списано в этом месяце: <strong className="text-[var(--ink)] font-mono">{mem.spentThisMonthRub.toLocaleString("ru-RU")} ₽</strong>
														</div>
													</div>
												</div>

												{/* Right Side: Allocation & Limit Inputs */}
												<div className="flex items-center gap-3 flex-wrap">
													<div className="space-y-1">
														<label className="text-[10px] font-bold text-[var(--muted)] uppercase block">
															Выделенный баланс (₽):
														</label>
														<input
															type="number"
															min={0}
															step="500"
															value={mem.allocatedBalanceRub}
															onChange={(e) => handleMemberAllocationChange(mem.id, parseFloat(e.target.value) || 0)}
															className="h-9 w-28 sm:w-32 px-2.5 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--border,#cbd5e1)] rounded-xl text-[var(--ink)] focus:border-pink-500 outline-none"
														/>
													</div>

													<div className="space-y-1">
														<label className="text-[10px] font-bold text-[var(--muted)] uppercase block">
															Лимит на месяц (₽):
														</label>
														<input
															type="number"
															min={0}
															step="1000"
															value={mem.monthlyLimitRub || ""}
															placeholder="Без лимита"
															onChange={(e) => handleMemberLimitChange(mem.id, parseFloat(e.target.value) || 0)}
															className="h-9 w-28 sm:w-32 px-2.5 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--border,#cbd5e1)] rounded-xl text-[var(--ink)] focus:border-pink-500 outline-none"
														/>
													</div>
												</div>
											</div>

											{/* Visual Spend Progress Bar (if limit is configured) */}
											{hasLimit && (
												<div className="space-y-1 pt-1">
													<div className="flex justify-between text-[10px] font-bold text-[var(--muted)]">
														<span>Использование месячного лимита:</span>
														<span className="font-mono">{mem.spentThisMonthRub.toLocaleString("ru-RU")} / {mem.monthlyLimitRub!.toLocaleString("ru-RU")} ₽ ({limitUsagePct}%)</span>
													</div>
													<div className="w-full h-2 rounded-full bg-[var(--line)] overflow-hidden">
														<div
															className={`h-full rounded-full transition-all duration-300 ${
																limitUsagePct >= 90 ? "bg-rose-500" : limitUsagePct >= 60 ? "bg-amber-500" : "bg-teal-500"
															}`}
															style={{ width: `${limitUsagePct}%` }}
														/>
													</div>
												</div>
											)}

											{/* 1-Click Quick Deduction Strip without master password */}
											<div className="pt-2.5 border-t border-[var(--line)]/60 flex items-center justify-between gap-2 flex-wrap">
												<div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--muted)]">
													<Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
													<span>1-Клик Списание:</span>
												</div>
												<div className="flex items-center gap-1.5 flex-wrap">
													{[1000, 3000, 5000].map((amt) => {
														const memberAvailableRub = mem.allocatedBalanceRub > 0 ? Math.min(mem.allocatedBalanceRub, totalBalanceRub) : totalBalanceRub;
														const isDisabled = totalBalanceRub <= 0 || memberAvailableRub <= 0;
														return (
															<button
																key={amt}
																type="button"
																onClick={() => handleQuickDeduct(mem.id, amt)}
																disabled={isDisabled}
																className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-[var(--paper-soft)] hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 border border-[var(--border,#cbd5e1)] text-[var(--ink)] cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
																data-testid={`btn-quick-deduct-${mem.id}-${amt}`}
															>
																-{amt.toLocaleString("ru-RU")} ₽
															</button>
														);
													})}
													<button
														type="button"
														onClick={() => handleQuickDeduct(mem.id, mem.allocatedBalanceRub > 0 ? Math.min(mem.allocatedBalanceRub, totalBalanceRub) : totalBalanceRub)}
														disabled={totalBalanceRub <= 0 || (mem.allocatedBalanceRub > 0 ? mem.allocatedBalanceRub : totalBalanceRub) <= 0}
														className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
														data-testid={`btn-quick-deduct-${mem.id}-all`}
													>
														Весь доступный ({Math.min(mem.allocatedBalanceRub > 0 ? mem.allocatedBalanceRub : totalBalanceRub, totalBalanceRub).toLocaleString("ru-RU")} ₽)
													</button>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{activeTab === "history" && (
						<div className="space-y-4" data-testid="family-history-view">
							{/* Filter Bar */}
							<div className="p-3 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-3 flex-wrap text-xs">
								<div className="flex items-center gap-2 font-bold text-[var(--ink)]">
									<Filter className="w-4 h-4 text-teal-600" />
									<span>Фильтр по члену семьи:</span>
									<select
										value={selectedHistoryFilter}
										onChange={(e) => setSelectedHistoryFilter(e.target.value)}
										className="h-8 px-2.5 rounded-lg bg-[var(--paper)] border border-[var(--border,#cbd5e1)] text-[var(--ink)] outline-none cursor-pointer"
									>
										<option value="all">Все члены семьи ({transactions.length})</option>
										{members.map((m) => (
											<option key={m.id} value={m.id}>{m.fullName}</option>
										))}
									</select>
								</div>
							</div>

							{/* Ledger Table */}
							<div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-xs divide-y divide-[var(--line)]/60 text-xs">
								{filteredTransactions.map((tx) => (
									<div key={tx.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-[var(--paper-soft)]/40 transition-colors">
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
												tx.type === "topup"
													? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 border border-emerald-500/30"
													: "bg-rose-100 dark:bg-rose-950 text-rose-600 border border-rose-500/30"
											}`}>
												{tx.type === "topup" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
											</div>

											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2 flex-wrap">
													<strong className="text-[var(--ink)] font-bold truncate">
														{tx.memberName}
													</strong>
													<span className="text-[10px] text-[var(--muted)] font-mono">
														{new Date(tx.dateIso).toLocaleDateString("ru-RU")}
													</span>
													{tx.receiptNumber && (
														<span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
															{tx.receiptNumber}
														</span>
													)}
												</div>
												<div className="text-[11px] text-[var(--muted)] truncate mt-0.5">
													{tx.description}
												</div>
											</div>
										</div>

										<div className="text-right shrink-0">
											<div className={`font-bold font-mono text-sm ${tx.type === "topup" ? "text-emerald-600" : "text-[var(--ink)]"}`}>
												{tx.type === "topup" ? "+" : "-"}{tx.amountRub.toLocaleString("ru-RU")} ₽
											</div>
											<div className="text-[10px] text-[var(--muted)] uppercase">
												{tx.tenderSource}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{activeTab === "topup" && (
						<div className="space-y-4" data-testid="family-topup-view">
							<div className="p-4 sm:p-6 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-4 max-w-xl mx-auto">
								<h4 className="text-xs sm:text-sm font-extrabold text-[var(--ink)] m-0 uppercase tracking-wider text-center">
									Пополнение счета семейного депозита
								</h4>

								{/* Denomination Buttons (32-36px height) */}
								<div className="space-y-1.5">
									<label className="text-[11px] font-semibold text-[var(--muted)]">
										Быстрый выбор суммы:
									</label>
									<div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
										{[5000, 10000, 25000, 50000, 100000].map((amt) => (
											<button
												key={amt}
												type="button"
												onClick={() => setTopupAmountRub(amt)}
												className={`h-9 rounded-xl text-xs font-bold transition-all cursor-pointer font-mono ${
													topupAmountRub === amt
														? "bg-teal-600 text-white shadow-xs"
														: "bg-[var(--paper)] border border-[var(--border,#cbd5e1)] text-[var(--ink)] hover:bg-[var(--paper-strong)]"
												}`}
											>
												{amt.toLocaleString("ru-RU")} ₽
											</button>
										))}
									</div>
								</div>

								{/* Custom Amount Input */}
								<div className="space-y-1">
									<label className="text-[11px] font-semibold text-[var(--muted)]">
										Или введите свою сумму (₽):
									</label>
									<input
										type="number"
										min={100}
										step="500"
										value={topupAmountRub || ""}
										onChange={(e) => setTopupAmountRub(parseFloat(e.target.value) || 0)}
										className="h-10 w-full px-3 py-1 text-base font-bold font-mono bg-[var(--paper)] border border-[var(--border,#cbd5e1)] rounded-xl text-[var(--ink)] outline-none focus:border-teal-500"
									/>
								</div>

								{/* Payment Method Selector */}
								<div className="space-y-1.5">
									<label className="text-[11px] font-semibold text-[var(--muted)]">
										Способ внесения средств:
									</label>
									<div className="grid grid-cols-3 gap-2">
										<button
											type="button"
											onClick={() => setTopupMethod("sbp")}
											className={`h-10 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
												topupMethod === "sbp"
													? "bg-purple-600 text-white shadow-xs"
													: "bg-[var(--paper)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
											}`}
										>
											<QrCode className="w-3.5 h-3.5" />
											<span>СБП QR (0.7%)</span>
										</button>
										<button
											type="button"
											onClick={() => setTopupMethod("card")}
											className={`h-10 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
												topupMethod === "card"
													? "bg-blue-600 text-white shadow-xs"
													: "bg-[var(--paper)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
											}`}
										>
											<CreditCard className="w-3.5 h-3.5" />
											<span>Терминал</span>
										</button>
										<button
											type="button"
											onClick={() => setTopupMethod("cash")}
											className={`h-10 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
												topupMethod === "cash"
													? "bg-emerald-600 text-white shadow-xs"
													: "bg-[var(--paper)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
											}`}
										>
											<Banknote className="w-3.5 h-3.5" />
											<span>Наличные</span>
										</button>
									</div>
								</div>

								{/* SBP QR Preview if SBP is chosen */}
								{topupMethod === "sbp" && (
									<div className="flex flex-col items-center p-3 bg-[var(--paper)] rounded-2xl border border-[var(--line)] space-y-2">
										<div
											className="p-2 bg-white rounded-xl border border-slate-300"
											dangerouslySetInnerHTML={{
												__html: generateQrCodeSvg(
													SbpQrEngine.buildNspkDynamicPayload({
														operationId: `FWALLET${familyGroupId.replace(/[^A-Za-z0-9]/g, "").slice(0, 10) || "MAIN"}${topupAmountRub}`,
														bankMemberId: "100000000111",
														amountKopecks: rublesToKopecks(topupAmountRub),
														currency: "RUB",
													}).payloadUrl,
													{ size: 140 },
												),
											}}
										/>
										<span className="text-[11px] text-[var(--muted)] text-center">
											Сканируйте QR в мобильном банке для моментального пополнения через СБП
										</span>
									</div>
								)}

								<button
									type="button"
									onClick={handleExecuteTopup}
									className="w-full h-11 rounded-xl font-extrabold bg-teal-600 hover:bg-teal-700 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
									data-testid="btn-execute-topup"
								>
									<Plus className="w-4 h-4" />
									<span>Пополнить семейный счет на {topupAmountRub.toLocaleString("ru-RU")} ₽</span>
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Bottom Sticky Action Bar (Hick's & Fitts's Laws) */}
				<div className="sticky bottom-0 z-50 bg-[var(--paper)] border-t border-[var(--line)] px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 shadow-lg">
					<div className="flex items-center gap-2">
						{onOpenCombinedBilling && (
							<button
								type="button"
								onClick={onOpenCombinedBilling}
								className="h-9 px-3 rounded-xl text-xs font-bold bg-pink-50 dark:bg-pink-950/50 border border-pink-500/30 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/50 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
								data-testid="btn-open-combined-billing"
							>
								<Receipt className="w-3.5 h-3.5" />
								<span>Объединенный счет семьи</span>
							</button>
						)}
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="h-9 px-3.5 rounded-xl text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--border,#cbd5e1)] text-[var(--ink)] hover:bg-[var(--paper-strong)] cursor-pointer transition-colors"
						>
							Закрыть
						</button>

						<button
							type="button"
							onClick={handleSave}
							className="h-10 px-5 rounded-xl text-xs sm:text-sm font-extrabold bg-teal-600 hover:bg-teal-700 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
							data-testid="btn-save-family-wallet"
						>
							<Check className="w-4 h-4" />
							<span>Сохранить настройки</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
