/**
 * apps/web/src/components/cashbox/studioModules/useCashRegisterStudioState.ts
 *
 * Dedicated Cash Register State Hook for CashRegisterStudioModal.
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, soft defaults).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (No forced citizen INN).
 * - Integer Kopeck Math: Strict BigInt amountKopecks without floating-point errors.
 * - GlobalToast: Human-friendly feedback on every transaction and error.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { generateUuidV7, formatRubles } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import {
	enqueueOfflinePayment,
	type PaymentMethodKind,
} from "../../../offline/offlinePaymentQueue.js";
import {
	type CashboxTenderType,
	type ClientPayerType,
	type CashRegisterStudioTab,
	rubToKopecks,
	kopecksToRub,
	calculateExactCashChange,
	generateFiscalTapeText,
} from "../cashRegisterCatalogData.js";
import type { CashRegisterStudioModalProps } from "../CashRegisterStudioModal.js";

class CashRegisterNetworkError extends Error {
	readonly status: number;
	constructor(message: string, status: number) {
		super(message);
		this.name = "CashRegisterNetworkError";
		this.status = status;
	}
}

function resolveOfflinePaymentType(
	tender: CashboxTenderType,
	isWarranty: boolean,
): PaymentMethodKind {
	if (isWarranty || tender === "warranty") return "cash";
	if (tender === "split" || tender === "installment" || tender === "insurance") return "mixed";
	if (tender === "card" || tender === "sbp" || tender === "deposit" || tender === "cash") {
		return tender;
	}
	return "cash";
}

function isNetworkFailure(err: unknown, status?: number): boolean {
	if (status && [502, 503, 504].includes(status)) return true;
	if (typeof navigator !== "undefined" && !navigator.onLine) return true;
	if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) return true;
	if (err instanceof Error) {
		const msg = err.message.toLowerCase();
		return (
			msg.includes("network") ||
			msg.includes("failed to fetch") ||
			msg.includes("abort") ||
			msg.includes("timeout") ||
			msg.includes("offline") ||
			msg.includes("econnrefused") ||
			msg.includes("connection")
		);
	}
	return false;
}

export function useCashRegisterStudioState(props: CashRegisterStudioModalProps) {
	const {
		initialTab = "checkout",
		mode = "studio",
		shiftNumber = 1,
		cashierFullName = "Кассир",
		kktRegNumber,
		ofdName,
		isShiftOpen: initialShiftOpen = true,
		netRevenueRub: propNetRevenue,
		cashInDrawerRub: initialCashDrawer = 0,
		cardSumRub: initialCardSum = 0,
		sbpSumRub: initialSbpSum = 0,
		advanceOffsetRub: initialAdvanceSum = 0,
		totalDueRub: propTotalDueRub,
		amountRub: propAmountRub,
		totalDueKopecks: propTotalDueKopecks,
		amountKopecks: propAmountKopecks,
		initialWarranty100 = false,
		visitId: propVisitId,
		defaultMethod = "card",
		initialPaymentMethod,
		printFormat: initialPrintFormat = "tape_80mm",
		onClose,
	} = props;

	const rawBaseDueRub = useMemo(() => {
		if (propTotalDueRub !== undefined) return propTotalDueRub;
		if (propAmountRub !== undefined) return propAmountRub;
		if (propTotalDueKopecks !== undefined) return kopecksToRub(BigInt(propTotalDueKopecks));
		if (propAmountKopecks !== undefined) return kopecksToRub(BigInt(propAmountKopecks));
		return 0;
	}, [propTotalDueRub, propAmountRub, propTotalDueKopecks, propAmountKopecks]);

	const [customBaseDueRub, setCustomBaseDueRub] = useState<number | null>(null);
	const [appliedDmsSplit, setAppliedDmsSplit] = useState<{
		totalDueRub: number;
		dmsRub: number;
		patientRub: number;
		insurerName?: string | undefined;
		letterNumber?: string | undefined;
		letterId?: string | undefined;
	} | null>(null);

	const baseDueRub = customBaseDueRub ?? rawBaseDueRub;

	const normalizedTab: CashRegisterStudioTab =
		mode === "shift" || initialTab === "reconciliation" || initialTab === "drawer"
			? "shift"
			: initialTab === "tape" || initialTab === "history"
				? "tape"
				: "checkout";

	const [activeTab, setActiveTab] = useState<CashRegisterStudioTab>(normalizedTab);
	const [isShiftActive, setIsShiftActive] = useState<boolean>(initialShiftOpen);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isCopied, setIsCopied] = useState<boolean>(false);

	const initialMethod = initialPaymentMethod ?? defaultMethod;
	const [method, setMethod] = useState<CashboxTenderType>(initialMethod);
	const [isWarranty, setIsWarranty] = useState<boolean>(initialWarranty100);
	const [discountPercent, setDiscountPercent] = useState<number>(initialWarranty100 ? 100 : 0);
	const [payerType, setPayerType] = useState<ClientPayerType>("physical_person");
	const [buyerInn, setBuyerInn] = useState<string>("");
	const [cashReceivedRub, setCashReceivedRub] = useState<number>(baseDueRub);
	const [fiscalize, setFiscalize] = useState<boolean>(true);
	const [printFormat, setPrintFormat] = useState<string>(initialPrintFormat);
	const [countedCashInput, setCountedCashInput] = useState<string>(String(initialCashDrawer));
	const [installmentMonths, setInstallmentMonths] = useState<3 | 6 | 12>(6);
	const [certificateNumber, setCertificateNumber] = useState<string>("");

	// Split tender state (honest multi-tender allocation in kopecks)
	const [splitCashRub, setSplitCashRub] = useState<number>(0);
	const [splitCardRub, setSplitCardRub] = useState<number>(baseDueRub);
	const [splitSbpRub, setSplitSbpRub] = useState<number>(0);
	const [splitDepositRub, setSplitDepositRub] = useState<number>(0);
	const [splitCashReceivedRub, setSplitCashReceivedRub] = useState<number>(0);

	// Exact integer financial computations (BIGINT amountKopecks)
	const grossKopecks = rubToKopecks(baseDueRub);
	const isWarrantyCase = isWarranty || method === "warranty";
	const discountMultiplier = isWarrantyCase ? 0 : Math.max(0, 100 - discountPercent);
	const effectiveTotalKop = (grossKopecks * BigInt(discountMultiplier)) / 100n;
	const effectiveTotalRub = isWarrantyCase ? 0 : kopecksToRub(effectiveTotalKop);

	// Cash change computation
	const changeResult = useMemo(
		() => calculateExactCashChange(cashReceivedRub, effectiveTotalRub),
		[cashReceivedRub, effectiveTotalRub],
	);

	// Split tender balance calculations
	const splitCashKop = rubToKopecks(splitCashRub);
	const splitCardKop = rubToKopecks(splitCardRub);
	const splitSbpKop = rubToKopecks(splitSbpRub);
	const splitDepositKop = rubToKopecks(splitDepositRub);
	const appliedDmsKop = appliedDmsSplit ? rubToKopecks(appliedDmsSplit.dmsRub) : 0n;
	const totalSplitAllocatedKop = splitCashKop + splitCardKop + splitSbpKop + splitDepositKop + (method === "split" ? appliedDmsKop : 0n);
	const splitDiffKop = effectiveTotalKop - totalSplitAllocatedKop;
	const isSplitBalanced = splitDiffKop === 0n;

	// DMS Split Event Bus Listener (Mandates 8aq & 8e: Seamless DMS-to-Cashbox Bridge)
	useEffect(() => {
		const handleApplySplit = (e: Event) => {
			if (!("detail" in e) || typeof e.detail !== "object" || e.detail === null) return;
			const d = e.detail as {
				totalDueRub?: number | undefined;
				dmsRub?: number | undefined;
				patientRub?: number | undefined;
				patientCopayRub?: number | undefined;
				patientMethod?: CashboxTenderType | undefined;
				patientCashRub?: number | undefined;
				patientCardRub?: number | undefined;
				letterId?: string | undefined;
				letterNumber?: string | undefined;
				insurerName?: string | undefined;
				invoiceId?: string | undefined;
			};

			const copay = d.patientRub ?? d.patientCopayRub ?? 0;
			const dms = d.dmsRub ?? 0;
			const total = d.totalDueRub ?? (copay + dms);

			setCustomBaseDueRub(total);
			setAppliedDmsSplit({
				totalDueRub: total,
				dmsRub: dms,
				patientRub: copay,
				insurerName: d.insurerName,
				letterNumber: d.letterNumber,
				letterId: d.letterId,
			});

			if (copay > 0 && dms > 0) {
				setMethod("split");
				if (
					d.patientCashRub !== undefined &&
					d.patientCardRub !== undefined &&
					(d.patientCashRub > 0 || d.patientCardRub > 0)
				) {
					setSplitCashRub(d.patientCashRub);
					setSplitCardRub(d.patientCardRub);
					setCashReceivedRub(d.patientCashRub);
				} else if (d.patientMethod === "cash") {
					setSplitCashRub(copay);
					setSplitCardRub(0);
					setCashReceivedRub(copay);
				} else {
					setSplitCardRub(copay);
					setSplitCashRub(0);
					setCashReceivedRub(0);
				}
			} else if (copay === 0 && dms > 0) {
				setMethod("insurance");
				setSplitCashRub(0);
				setSplitCardRub(0);
				setCashReceivedRub(0);
			} else {
				if (d.patientMethod === "cash") {
					setMethod("cash");
					setCashReceivedRub(copay);
					setSplitCashRub(copay);
					setSplitCardRub(0);
				} else {
					setMethod("card");
					setSplitCardRub(copay);
					setSplitCashRub(0);
					setCashReceivedRub(0);
				}
			}
			setSplitSbpRub(0);
			setSplitDepositRub(0);
			setActiveTab("checkout");

			showToast(
				`Применен сплит ДМС: страховая ${formatRubles(dms)}, к доплате ${formatRubles(copay)}`,
				"success",
			);
		};

		window.addEventListener("dente:cashbox-apply-split", handleApplySplit);
		return () => {
			window.removeEventListener("dente:cashbox-apply-split", handleApplySplit);
		};
	}, []);

	// Split cash change
	const splitCashChange = useMemo(() => {
		if (splitCashReceivedRub <= 0 || splitCashRub <= 0) return null;
		return calculateExactCashChange(splitCashReceivedRub, splitCashRub);
	}, [splitCashReceivedRub, splitCashRub]);

	// Auto-balance remaining split tender in 1 click
	const handleBalanceSplit = useCallback((field: "cash" | "card" | "sbp" | "deposit") => {
		const currentKop =
			field === "cash"
				? splitCashKop
				: field === "card"
					? splitCardKop
					: field === "sbp"
						? splitSbpKop
						: splitDepositKop;
		const targetKop = currentKop + splitDiffKop;
		const balancedRub = Math.max(0, kopecksToRub(targetKop));
		if (field === "cash") {
			setSplitCashRub(balancedRub);
			setSplitCashReceivedRub(balancedRub);
		} else if (field === "card") {
			setSplitCardRub(balancedRub);
		} else if (field === "sbp") {
			setSplitSbpRub(balancedRub);
		} else if (field === "deposit") {
			setSplitDepositRub(balancedRub);
		}
	}, [splitCashKop, splitCardKop, splitSbpKop, splitDepositKop, splitDiffKop]);

	const [recentOperations, setRecentOperations] = useState<Array<{
		id: string;
		operationType: string;
		amountRub: number;
		reasonText?: string | null;
		createdAt: string;
	}>>([]);

	useEffect(() => {
		let isCancelled = false;
		async function fetchRecentOps() {
			try {
				const res = await fetch("/api/cash/operation-list", {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const json = await res.json().catch(() => null);
				if (!isCancelled && json && typeof json === "object" && "data" in json && Array.isArray(json.data)) {
					setRecentOperations(json.data.slice(0, 10));
				}
			} catch (fetchErr: unknown) {
				console.warn("[useCashRegisterStudioState] Не удалось загрузить недавние операции кассы:", fetchErr);
				// non-blocking / offline fallback
			}
		}
		void fetchRecentOps();
		return () => { isCancelled = true; };
	}, [isShiftActive]);

	const totalShiftKop =
		rubToKopecks(initialCashDrawer) +
		rubToKopecks(initialCardSum) +
		rubToKopecks(initialSbpSum) +
		rubToKopecks(initialAdvanceSum);
	const calculatedNetRevenue = propNetRevenue ?? kopecksToRub(totalShiftKop);

	const tapeText = useMemo(
		() =>
			generateFiscalTapeText({
				shiftNumber,
				cashierFullName,
				kktRegNumber,
				ofdName,
				netRevenueRub: calculatedNetRevenue,
				cashInDrawerRub: initialCashDrawer,
				cardSumRub: initialCardSum,
				sbpSumRub: initialSbpSum,
				advanceOffsetRub: initialAdvanceSum,
				operations: recentOperations,
				width: printFormat === "tape_58mm" ? "tape_58mm" : "tape_80mm",
			}),
		[
			shiftNumber,
			cashierFullName,
			kktRegNumber,
			ofdName,
			calculatedNetRevenue,
			initialCashDrawer,
			initialCardSum,
			initialSbpSum,
			initialAdvanceSum,
			recentOperations,
			printFormat,
		],
	);

	const handleExecutePayment = useCallback(async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		setErrorMessage(null);

		const isWarrantyCaseFinal = isWarranty || effectiveTotalRub === 0;
		const clientMutationId = generateUuidV7();
		const effectiveVisitId = propVisitId || props.visitId || undefined;

		const isRetailSale = !props.patientId || props.patientId === "pat-walkin";
		const payload: Record<string, unknown> = {
			patientId: !isRetailSale ? props.patientId : undefined,
			isRetailSale,
			visitId: effectiveVisitId,
			invoiceId: props.invoiceId || undefined,
			amountKopecks: isWarrantyCaseFinal ? 0 : Number(effectiveTotalKop),
			amountRub: isWarrantyCaseFinal ? 0 : effectiveTotalRub,
			method: isWarrantyCaseFinal ? "warranty" : method,
			isWarranty: isWarrantyCaseFinal,
			cashierFullName,
			clientType: payerType,
			buyerInn: payerType !== "physical_person" ? buyerInn.trim() || undefined : undefined,
			printFormat,
			clientMutationId,
			note: isWarrantyCaseFinal ? "Гарантийный расчёт (скидка 100%)" : undefined,
		};

		if (appliedDmsSplit && appliedDmsSplit.dmsRub > 0) {
			if (appliedDmsSplit.letterId) {
				payload.guaranteeLetterId = appliedDmsSplit.letterId;
			}
			payload.dmsAmountKopecks = Number(rubToKopecks(appliedDmsSplit.dmsRub));
			payload.dmsAmountRub = appliedDmsSplit.dmsRub;
		}

		if (method === "split" && !isWarrantyCaseFinal) {
			payload.cashAmountKopecks = Number(splitCashKop);
			payload.electronicAmountKopecks = Number(splitCardKop + splitSbpKop);
			payload.depositAmountKopecks = Number(splitDepositKop);

			const tenders: Array<{ method: string; amountKopecks: number; amountRub?: number | undefined; guaranteeLetterId?: string | undefined }> = [];
			if (splitCashKop > 0n) {
				tenders.push({ method: "cash", amountKopecks: Number(splitCashKop), amountRub: kopecksToRub(splitCashKop) });
			}
			if (splitCardKop > 0n) {
				tenders.push({ method: "card", amountKopecks: Number(splitCardKop), amountRub: kopecksToRub(splitCardKop) });
			}
			if (splitSbpKop > 0n) {
				tenders.push({ method: "sbp", amountKopecks: Number(splitSbpKop), amountRub: kopecksToRub(splitSbpKop) });
			}
			if (splitDepositKop > 0n) {
				tenders.push({ method: "family_wallet", amountKopecks: Number(splitDepositKop), amountRub: kopecksToRub(splitDepositKop) });
			}
			if (appliedDmsSplit && appliedDmsSplit.dmsRub > 0) {
				tenders.push({
					method: "insurance",
					amountKopecks: Number(rubToKopecks(appliedDmsSplit.dmsRub)),
					amountRub: appliedDmsSplit.dmsRub,
					...(appliedDmsSplit.letterId ? { guaranteeLetterId: appliedDmsSplit.letterId } : {}),
				});
			}
			payload.splitTenders = tenders;
		}

		if (method === "certificate" && !isWarrantyCaseFinal) {
			payload.certificateNumber = certificateNumber.trim() || undefined;
			payload.certificateAmountKopecks = Number(effectiveTotalKop);
			payload.certificateAmountRub = effectiveTotalRub;
		}

		// Fast offline-first path: if network is already down, enqueue immediately without freeze
		if (typeof navigator !== "undefined" && !navigator.onLine) {
			try {
				const queuedItem = await enqueueOfflinePayment({
					patientId: props.patientId && props.patientId !== "pat-walkin" ? props.patientId : "pat-walkin",
					patientName: props.patientName || "Пациент клиники",
					visitId: effectiveVisitId,
					invoiceId: props.invoiceId || undefined,
					totalKopecks: isWarrantyCaseFinal ? 0 : Number(effectiveTotalKop),
					paymentType: resolveOfflinePaymentType(method, isWarrantyCaseFinal),
					splitDetails:
						method === "split" && !isWarrantyCaseFinal
							? {
									cashKopecks: Number(splitCashKop),
									cardKopecks: Number(splitCardKop),
									sbpKopecks: Number(splitSbpKop),
									depositKopecks: Number(splitDepositKop),
								}
							: undefined,
					items: [
						{
							name: props.serviceTitle || "Стоматологические услуги",
							priceKopecks: isWarrantyCaseFinal ? 0 : Number(effectiveTotalKop),
							quantity: 1,
						},
					],
					cashierName: cashierFullName,
					doctorName: props.doctorFullName,
					patientPhoneOrEmail: props.patientPhone,
					printFiscalReceipt: fiscalize,
				});

				showToast(
					"Платёж сохранён в локальной очереди кассы. Будет синхронизирован с сервером при восстановлении связи",
					"info",
					7000,
				);

				const paymentResult = {
					success: true,
					effectiveTotalRub,
					method,
					clientMutationId,
					visitId: effectiveVisitId,
					isOfflineQueued: true,
					queueId: queuedItem.id,
				};

				if (props.onSuccess) props.onSuccess(paymentResult);
				if (props.onPaymentComplete) props.onPaymentComplete();
				if (props.onConfirmPayment) props.onConfirmPayment(paymentResult);
				onClose();
				return;
			} catch (offlineErr) {
				console.warn("[CashRegisterStudio] Не удалось сохранить платёж в офлайн-очередь, переход к сетевому запросу:", offlineErr);
			}
		}

		try {
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": clientMutationId,
			});
			const res = await fetch("/api/cashbox/payments", {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				if ([502, 503, 504].includes(res.status)) {
					throw new CashRegisterNetworkError(
						`Сервер кассы временно недоступен (код ${res.status})`,
						res.status,
					);
				}
				const errorJson = await res.json().catch(() => null);
				const errorText =
					errorJson?.message || errorJson?.error || `Сбой проведения платежа сервером кассы (код ${res.status})`;
				throw new Error(errorText);
			}
			const json = await res.json().catch(() => null);
			if (json && json.success === false) {
				throw new Error(json.message || "Ошибка проведения платежа через кассовый аппарат");
			}
			const paymentResult = json?.data || {
				success: true,
				effectiveTotalRub,
				method,
				clientMutationId,
				visitId: effectiveVisitId,
			};

			showToast(
				isWarrantyCaseFinal
					? "Гарантийный расчёт оформлен (0 ₽)"
					: `Оплата успешно принята: ${effectiveTotalRub} ₽`,
				"success",
			);

			if (props.onSuccess) props.onSuccess(paymentResult);
			if (props.onPaymentComplete) props.onPaymentComplete();
			if (props.onConfirmPayment) props.onConfirmPayment(paymentResult);
			onClose();
		} catch (err: unknown) {
			let status: number | undefined;
			if (err instanceof CashRegisterNetworkError) {
				status = err.status;
			} else if (typeof err === "object" && err !== null && "status" in err && typeof err.status === "number") {
				status = err.status;
			}
			if (isNetworkFailure(err, status)) {
				// Resilient Offline Queue (Mandates 8e & 8n: Solo Doctor & Small Clinic Resilience)
				try {
					const queuedItem = await enqueueOfflinePayment({
						patientId: props.patientId && props.patientId !== "pat-walkin" ? props.patientId : "pat-walkin",
						patientName: props.patientName || "Пациент клиники",
						visitId: effectiveVisitId,
						invoiceId: props.invoiceId || undefined,
						totalKopecks: isWarrantyCaseFinal ? 0 : Number(effectiveTotalKop),
						paymentType: resolveOfflinePaymentType(method, isWarrantyCaseFinal),
						splitDetails:
							method === "split" && !isWarrantyCaseFinal
								? {
										cashKopecks: Number(splitCashKop),
										cardKopecks: Number(splitCardKop),
										sbpKopecks: Number(splitSbpKop),
										depositKopecks: Number(splitDepositKop),
									}
								: undefined,
						items: [
							{
								name: props.serviceTitle || "Стоматологические услуги",
								priceKopecks: isWarrantyCaseFinal ? 0 : Number(effectiveTotalKop),
								quantity: 1,
							},
						],
						cashierName: cashierFullName,
						doctorName: props.doctorFullName,
						patientPhoneOrEmail: props.patientPhone,
						printFiscalReceipt: fiscalize,
					});

					showToast(
						"Платёж сохранён в локальной очереди кассы. Будет синхронизирован с сервером при восстановлении связи",
						"info",
						7000,
					);

					const paymentResult = {
						success: true,
						effectiveTotalRub,
						method,
						clientMutationId,
						visitId: effectiveVisitId,
						isOfflineQueued: true,
						queueId: queuedItem.id,
					};

					if (props.onSuccess) props.onSuccess(paymentResult);
					if (props.onPaymentComplete) props.onPaymentComplete();
					if (props.onConfirmPayment) props.onConfirmPayment(paymentResult);
					onClose();
					return;
				} catch (queueErr) {
					console.warn("[CashRegisterStudio] Не удалось сохранить офлайн-платёж при сбое сети:", queueErr);
				}
			}

			const errorMsg =
				err instanceof Error
					? err.message
					: "Ошибка связи с сервером кассы. Платёж не проведён.";
			setErrorMessage(errorMsg);
			showToast(errorMsg, "error", 5000);
		} finally {
			setIsSubmitting(false);
		}
	}, [
		isSubmitting,
		isWarranty,
		effectiveTotalRub,
		effectiveTotalKop,
		method,
		certificateNumber,
		splitCashKop,
		splitCardKop,
		splitSbpKop,
		splitDepositKop,
		props,
		propVisitId,
		cashierFullName,
		payerType,
		buyerInn,
		printFormat,
		appliedDmsSplit,
		onClose,
	]);

	const handleToggleShift = useCallback(async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		try {
			if (isShiftActive) {
				const closeFn = props.onCloseShiftAction || props.onCloseShift;
				if (closeFn) {
					await closeFn();
				} else {
					const headers = denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					});
					const res = await fetch("/api/cashbox/shift/close", {
						method: "POST",
						headers,
						body: JSON.stringify({
							force: true,
							cashierFullName,
						}),
					});
					if (!res.ok) {
						const errJson = await res.json().catch(() => null);
						throw new Error(errJson?.message || `Ошибка закрытия смены (код ${res.status})`);
					}
				}
				setIsShiftActive(false);
				showToast(`Кассовая смена №${shiftNumber} закрыта, Z-отчёт сформирован`, "success");
			} else {
				const openFn = props.onOpenShiftAction || props.onOpenShift;
				if (openFn) {
					await openFn();
				} else {
					const headers = denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					});
					const res = await fetch("/api/cashbox/shift/open", {
						method: "POST",
						headers,
						body: JSON.stringify({
							openedByUserId: undefined,
						}),
					});
					if (!res.ok) {
						const errJson = await res.json().catch(() => null);
						throw new Error(errJson?.message || `Ошибка открытия смены (код ${res.status})`);
					}
				}
				setIsShiftActive(true);
				showToast(`Кассовая смена №${shiftNumber} успешно открыта`, "success");
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка при изменении статуса кассовой смены";
			showToast(msg, "error");
		} finally {
			setIsSubmitting(false);
		}
	}, [isSubmitting, isShiftActive, props, cashierFullName, shiftNumber]);

	const handlePrintXReport = useCallback(async () => {
		try {
			const fn = props.onPrintXReportAction || props.onPrintXReport;
			if (fn) await fn();
			showToast(`X-отчёт смены №${shiftNumber} отправлен на печать`, "info");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Не удалось напечатать X-отчёт";
			showToast(msg, "error");
		}
	}, [props, shiftNumber]);

	const handleCopyTape = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(tapeText);
			setIsCopied(true);
			showToast("Чековая лента скопирована в буфер обмена", "info");
			setTimeout(() => setIsCopied(false), 2000);
		}
	}, [tapeText]);

	return {
		baseDueRub,
		activeTab,
		setActiveTab,
		isShiftActive,
		isSubmitting,
		errorMessage,
		setErrorMessage,
		isCopied,
		method,
		setMethod,
		isWarranty,
		setIsWarranty,
		discountPercent,
		setDiscountPercent,
		payerType,
		setPayerType,
		buyerInn,
		setBuyerInn,
		cashReceivedRub,
		setCashReceivedRub,
		fiscalize,
		setFiscalize,
		printFormat,
		setPrintFormat,
		countedCashInput,
		setCountedCashInput,
		installmentMonths,
		setInstallmentMonths,
		certificateNumber,
		setCertificateNumber,
		splitCashRub,
		setSplitCashRub,
		splitCardRub,
		setSplitCardRub,
		splitSbpRub,
		setSplitSbpRub,
		splitDepositRub,
		setSplitDepositRub,
		splitCashReceivedRub,
		setSplitCashReceivedRub,
		effectiveTotalKop,
		effectiveTotalRub,
		changeResult,
		isSplitBalanced,
		splitDiffKop,
		splitCashChange,
		calculatedNetRevenue,
		tapeText,
		appliedDmsSplit,
		handleBalanceSplit,
		handleExecutePayment,
		handleToggleShift,
		handlePrintXReport,
		handleCopyTape,
	};
}
