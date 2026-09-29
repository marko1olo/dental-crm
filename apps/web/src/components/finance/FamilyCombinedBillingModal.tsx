/**
 * FamilyCombinedBillingModal.tsx — 1-Click виджет объединения счетов членов семьи (родитель + дети)
 * с формированием отдельных фискальных строк для налогового вычета (Код 01 / Код 02) по 54-ФЗ
 * и генерацией динамического QR-кода СБП на сумму со сплитом (депозит + доплата по СБП).
 */

import React, { useMemo, useState } from "react";
import {
	Award,
	Layers,
	Printer,
	QrCode,
	ShieldCheck,
	Sparkles,
	Users,
	X,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import {
	type CombinedFamilyBillingDraft,
	type CombinedFamilyBillingResult,
	type FamilyBillingPayerProfile,
	type FamilyMemberBillingItem,
	FAMILY_RELATIONSHIP_RU,
	compileFamilyBillingDraft,
} from "@dental/shared";
import { FamilyBillingPaymentTab } from "./FamilyBillingPaymentTab";
import { printSbpQrReceipt, printTaxCertificates } from "./familyBillingPrint";
import {
	formatFamilyBalanceLabel,
	formatAvailableForDebitLabel,
	safeFamilyMemberName,
} from "./familyWalletHelpers";

export { FamilyBillingPaymentTab } from "./FamilyBillingPaymentTab";
export { printSbpQrReceipt, printTaxCertificates } from "./familyBillingPrint";

export interface FamilyCombinedBillingModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly familyGroupId?: string | undefined;
	readonly familyGroupName?: string | undefined;
	readonly availableFamilyWalletRub?: number | undefined;
	readonly initialPayer?: FamilyBillingPayerProfile | undefined;
	readonly initialItems?: readonly FamilyMemberBillingItem[] | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly onCheckoutComplete?: (result: CombinedFamilyBillingResult) => void;
}

export function FamilyCombinedBillingModal({
	isOpen,
	onClose,
	familyGroupId: _familyGroupId,
	familyGroupName = "Семейная группа",
	availableFamilyWalletRub = 0,
	initialPayer = {
		payerId: "",
		payerFullName: "Ответственный плательщик",
		payerInn: "",
		payerPhone: "",
		payerPassport: "",
	},
	initialItems = [],
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "",
	onCheckoutComplete,
}: FamilyCombinedBillingModalProps) {
	const [activeTab, setActiveTab] = useState<"items" | "payment" | "tax">("items");
	const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
		() => new Set(initialItems.map((i) => i.id)),
	);
	const [useFamilyWallet, setUseFamilyWallet] = useState<boolean>(true);
	const [customWalletOffsetRub, setCustomWalletOffsetRub] = useState<number>(availableFamilyWalletRub);

	React.useEffect(() => {
		setCustomWalletOffsetRub(availableFamilyWalletRub);
	}, [availableFamilyWalletRub]);

	const [additionalPaymentMethod, setAdditionalPaymentMethod] = useState<"sbp" | "card" | "cash">("sbp");
	const [cashReceivedRub, setCashReceivedRub] = useState<number>(0);
	const [isCopiedSbpLink, setIsCopiedSbpLink] = useState(false);
	const [isFiscalizing, setIsFiscalizing] = useState(false);

	const activeItems = useMemo(() => {
		return initialItems.filter((i) => selectedItemIds.has(i.id));
	}, [initialItems, selectedItemIds]);

	const familyDraft: CombinedFamilyBillingDraft = useMemo(() => {
		return {
			payer: initialPayer,
			familyGroupName,
			availableFamilyWalletRub: useFamilyWallet ? customWalletOffsetRub : 0,
			items: activeItems,
			clinicName,
			clinicInn,
		};
	}, [initialPayer, familyGroupName, useFamilyWallet, customWalletOffsetRub, activeItems, clinicName, clinicInn]);

	const billingResult: CombinedFamilyBillingResult = useMemo(() => {
		return compileFamilyBillingDraft(familyDraft);
	}, [familyDraft]);

	if (!isOpen) return null;

	const handleToggleItem = (id: string) => {
		setSelectedItemIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleSelectAll = () => {
		setSelectedItemIds(new Set(initialItems.map((i) => i.id)));
	};

	const handleDeselectAll = () => {
		setSelectedItemIds(new Set());
	};

	const handleCopySbpUrl = async () => {
		if (!billingResult.defaultSplit.sbpQr?.nspkUrl) return;
		try {
			await navigator.clipboard.writeText(billingResult.defaultSplit.sbpQr.nspkUrl);
			setIsCopiedSbpLink(true);
			setTimeout(() => setIsCopiedSbpLink(false), 2000);
			showToast("Платежная ссылка СБП скопирована в буфер", "success");
		} catch {
			showToast("Не удалось скопировать ссылку", "error");
		}
	};

	const handlePrintSbpReceipt = () => {
		const sbp = billingResult.defaultSplit.sbpQr;
		if (!sbp) return;
		printSbpQrReceipt({
			sbp,
			clinicName,
			payerFullName: initialPayer.payerFullName,
			familyGroupName,
		});
	};

	const handlePrintAllTaxCerts = () => {
		printTaxCertificates({
			certs: billingResult.taxDeductionCertificates,
			clinicName,
			clinicInn,
		});
	};

	const handleExecuteFiscalization = () => {
		if (activeItems.length === 0) {
			showToast("Выберите хотя бы одну позицию для формирования чека", "warning", 3500);
			return;
		}
		setIsFiscalizing(true);
		try {
			onCheckoutComplete?.(billingResult);
			showToast(
				`Семейный чек на ${billingResult.totalAmountFormattedRu} успешно фискализирован по 54-ФЗ (ФФД 1.2)!`,
				"success",
				5000,
			);
			onClose();
		} catch (e: any) {
			showToast(`Ошибка фискализации: ${e?.message || e}`, "error");
		} finally {
			setIsFiscalizing(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="family-billing-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
				{/* Шапка модального окна */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-3 bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
							<Users size={22} />
						</div>
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<h2 id="family-billing-title" className="text-base sm:text-lg font-black m-0 text-[var(--ink,#0f172a)]">
									Семейный расчет и объединенный чек 54-ФЗ
								</h2>
								<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
									{familyGroupName}
								</span>
								<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
									{formatFamilyBalanceLabel(availableFamilyWalletRub, initialPayer.payerFullName)}
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5 flex items-center gap-2 flex-wrap">
								<span>Плательщик: <strong>{initialPayer.payerFullName || "Ответственный плательщик"}</strong></span>
								{initialPayer.payerInn && <span>· ИНН: <strong className="font-mono">{initialPayer.payerInn}</strong></span>}
								<span>· <strong className="text-emerald-600">{formatAvailableForDebitLabel(availableFamilyWalletRub)}</strong></span>
								<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
									<ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
									<span>54-ФЗ: ИНН с физлиц НЕ требуется</span>
								</span>
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Навигационные вкладки */}
				<div className="flex border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] px-4 sm:px-5">
					<button
						type="button"
						onClick={() => setActiveTab("items")}
						className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
							activeTab === "items"
								? "border-teal-600 text-teal-600 dark:text-teal-400"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						<Layers size={16} />
						<span>1. Состав счетов и вычет ({activeItems.length})</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("payment")}
						className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
							activeTab === "payment"
								? "border-teal-600 text-teal-600 dark:text-teal-400"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						<QrCode size={16} />
						<span>2. Сплит-оплата & СБП QR ({billingResult.totalAmountFormattedRu})</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("tax")}
						className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
							activeTab === "tax"
								? "border-teal-600 text-teal-600 dark:text-teal-400"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						<ShieldCheck size={16} />
						<span>3. Справки для налоговой (ИФНС)</span>
					</button>
				</div>

				{/* Тело модального окна */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[var(--paper-soft,#f8fafc)]">
					{/* ВКЛАДКА 1: Состав счетов и классификация вычета */}
					{activeTab === "items" && (
						<div className="space-y-4">
							<div className="flex items-center justify-between flex-wrap gap-2">
								<div className="text-xs font-bold text-[var(--muted,#64748b)]">
									Выберите позиции членов семьи для включения в объединенный чек:
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={handleSelectAll}
										className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
									>
										Выбрать все ({initialItems.length})
									</button>
									<span>·</span>
									<button
										type="button"
										onClick={handleDeselectAll}
										className="text-xs font-semibold text-[var(--muted,#64748b)] hover:underline cursor-pointer"
									>
										Снять выбор
									</button>
								</div>
							</div>

							{/* Список позиций по членам семьи */}
							<div className="rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] overflow-hidden shadow-xs divide-y divide-[var(--line,#e2e8f0)]">
								{initialItems.length === 0 ? (
									<div className="p-8 text-center text-xs text-[var(--muted,#64748b)]">
										В семейной группе пока нет неоплаченных счетов или услуг для включения в объединенный чек.
									</div>
								) : (
									initialItems.map((item) => {
										const isSelected = selectedItemIds.has(item.id);
										return (
											<div
												key={item.id}
												onClick={() => handleToggleItem(item.id)}
												className={`p-3.5 sm:p-4 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
													isSelected
														? "bg-teal-50/40 dark:bg-teal-950/20"
														: "bg-[var(--paper,#ffffff)] opacity-60 hover:opacity-100 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
												}`}
											>
												<div className="flex items-start gap-3 min-w-0 flex-1">
													<input
														type="checkbox"
														checked={isSelected}
														onChange={() => handleToggleItem(item.id)}
														className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
													/>
													<div className="min-w-0 flex-1">
														<div className="flex items-center gap-2 flex-wrap">
															<span className="font-extrabold text-xs sm:text-sm text-[var(--ink,#0f172a)]">
																{item.patientFullName}
															</span>
															<span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-[var(--muted,#64748b)]">
																{FAMILY_RELATIONSHIP_RU[item.relationship] || "Семья"}
															</span>
															{item.toothNumber && (
																<span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-teal-500/10 text-teal-700 dark:text-teal-300">
																	Зуб {item.toothNumber}
																</span>
															)}
															<span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-[var(--muted,#64748b)] bg-slate-50 dark:bg-slate-900 border border-[var(--line,#e2e8f0)]">
																{item.code804n}
															</span>
														</div>
														<div className="text-xs text-[var(--ink,#0f172a)] font-medium mt-1 truncate min-w-0" title={item.serviceName}>
															{item.serviceName}
														</div>
													</div>
												</div>

												<div className="text-right shrink-0">
													<div className="font-mono font-black text-sm sm:text-base text-[var(--ink,#0f172a)]">
														{(item.priceRub * item.quantity).toLocaleString("ru-RU")} ₽
													</div>
													<div className="mt-1">
														{item.taxDeductionCategory === "2" ? (
															<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
																<Award size={10} /> Код 02 (Дорогостоящее)
															</span>
														) : (
															<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
																Код 01 (Стандарт)
															</span>
														)}
													</div>
												</div>
											</div>
										);
									})
								)}
							</div>

							{/* Сводка по категориям вычета */}
							<div className="p-4 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] grid grid-cols-1 sm:grid-cols-3 gap-3">
								<div>
									<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase">Всего к оплате</span>
									<div className="text-xl font-black font-mono text-[var(--ink,#0f172a)] mt-0.5">
										{billingResult.totalAmountFormattedRu}
									</div>
								</div>
								<div>
									<span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">Код 01: Стандартное</span>
									<div className="text-lg font-bold font-mono text-blue-700 dark:text-blue-300 mt-0.5">
										{billingResult.code01TotalRub.toLocaleString("ru-RU")} ₽
									</div>
									<span className="text-[10px] text-[var(--muted,#64748b)]">Лимит 150 000 ₽ / год</span>
								</div>
								<div>
									<span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">Код 02: Дорогостоящее</span>
									<div className="text-lg font-bold font-mono text-amber-700 dark:text-amber-300 mt-0.5">
										{billingResult.code02TotalRub.toLocaleString("ru-RU")} ₽
									</div>
									<span className="text-[10px] text-[var(--muted,#64748b)]">Без ограничений по сумме</span>
								</div>
							</div>
						</div>
					)}

					{/* ВКЛАДКА 2: Сплит-оплата и Динамический QR-код СБП */}
					{activeTab === "payment" && (
						<FamilyBillingPaymentTab
							useFamilyWallet={useFamilyWallet}
							setUseFamilyWallet={setUseFamilyWallet}
							availableFamilyWalletRub={availableFamilyWalletRub}
							billingResult={billingResult}
							additionalPaymentMethod={additionalPaymentMethod}
							setAdditionalPaymentMethod={setAdditionalPaymentMethod}
							cashReceivedRub={cashReceivedRub}
							setCashReceivedRub={setCashReceivedRub}
							isCopiedSbpLink={isCopiedSbpLink}
							onCopySbpUrl={handleCopySbpUrl}
							onPrintSbpQrReceipt={handlePrintSbpReceipt}
						/>
					)}

					{/* ВКЛАДКА 3: Справки для налоговой (ИФНС) */}
					{activeTab === "tax" && (
						<div className="space-y-4">
							<div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-900 dark:text-blue-200 flex items-start justify-between gap-3 flex-wrap">
								<div>
									<strong>Справка для налогового вычета (Приказ ФНС России № ЕД-7-11/824@):</strong>
									<div className="mt-1">
										Справки оформляются на имя плательщика (<strong>{initialPayer.payerFullName}</strong>{initialPayer.payerInn ? `, ИНН: ${initialPayer.payerInn}` : ""}) с автоматическим указанием кода родства:
										1 = лично, 2 = супруг, 3 = родитель, 4 = ребенок.
									</div>
									<div className="mt-1 text-[11px] text-blue-700 dark:text-blue-300 font-medium">
										* ИНН налогоплательщика опционален: при отсутствии ИНН справка в налоговую формируется на основании паспортных данных плательщика.
									</div>
								</div>

								<button
									type="button"
									onClick={handlePrintAllTaxCerts}
									className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs active:scale-95 transition-all"
									data-testid="btn-print-tax-certificates"
								>
									<Printer size={14} />
									<span>Печать всех справок на вычет (А4)</span>
								</button>
							</div>

							<div className="space-y-2.5">
								{billingResult.taxDeductionCertificates.map((cert) => (
									<div
										key={cert.certificateNumber}
										className="p-3.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] flex items-center justify-between gap-3"
									>
										<div>
											<div className="flex items-center gap-2">
												<strong className="text-xs sm:text-sm text-[var(--ink,#0f172a)]">{cert.patientFullName}</strong>
												<span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-[var(--muted,#64748b)]">
													{cert.patientRelationshipRu} (Код ФНС: {cert.patientFnsCode})
												</span>
												<span className="font-mono text-xs text-[var(--muted,#64748b)]">
													{cert.certificateNumber}
												</span>
											</div>
											<div className="text-xs text-[var(--muted,#64748b)] mt-1 flex items-center gap-3">
												{cert.code01TotalRub > 0 && (
													<span>Код 01: <strong className="text-blue-600">{cert.code01TotalRub.toLocaleString("ru-RU")} ₽</strong></span>
												)}
												{cert.code02TotalRub > 0 && (
													<span>Код 02: <strong className="text-amber-600">{cert.code02TotalRub.toLocaleString("ru-RU")} ₽</strong></span>
												)}
												<span>Итого: <strong className="text-[var(--ink,#0f172a)]">{cert.grandTotalRub.toLocaleString("ru-RU")} ₽</strong></span>
											</div>
										</div>

										<div className="text-right shrink-0">
											<div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
												Возврат 13%: ~{cert.estimatedRefund13Rub.toLocaleString("ru-RU")} ₽
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Футер с итогом и кнопкой фискализации */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between flex-wrap gap-3 bg-[var(--paper,#ffffff)]">
					<div className="flex items-center gap-3">
						<div>
							<span className="text-[11px] text-[var(--muted,#64748b)] font-bold uppercase">Итого к фискализации:</span>
							<div className="text-xl sm:text-2xl font-black font-mono text-[var(--ink,#0f172a)]">
								{billingResult.totalAmountFormattedRu}
							</div>
						</div>
						{useFamilyWallet && billingResult.defaultSplit.familyWalletOffsetRub > 0 && (
							<div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
								(Депозит: {billingResult.defaultSplit.familyWalletOffsetRub.toLocaleString("ru-RU")} ₽ + Доплата: {billingResult.defaultSplit.remainingDueRub.toLocaleString("ru-RU")} ₽)
							</div>
						)}
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[48px] px-5 rounded-xl border border-[var(--line,#cbd5e1)] text-xs sm:text-sm font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer transition-all"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={handleExecuteFiscalization}
							disabled={isFiscalizing}
							title={
								activeItems.length === 0
									? "Выберите хотя бы одну позицию для формирования чека"
									: isFiscalizing
									? "Выполняется фискализация..."
									: `Пробить единый фискальный чек 54-ФЗ на сумму ${billingResult.totalAmountFormattedRu}`
							}
							className="min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
							data-testid="btn-execute-family-fiscal-checkout"
						>
							<Sparkles size={18} className="animate-pulse" />
							<span>Пробить чек 54-ФЗ в 1 клик</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
