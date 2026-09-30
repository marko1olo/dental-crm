import {
	buildFiscalReceiptPayloadSignature,
	createFiscalCompositeIdempotencyKey,
} from "@dental/shared";
import {
	generate54FzFiscalPayload,
	splitStateToCheckoutPayments,
	type CheckoutPaymentMethodType,
	type ClientLegalType,
	type Ffd12FiscalPayload,
	type StageAdvanceCalculationResult,
} from "../payments/checkout/fastCheckoutEngine";
import { FiscalReceiptQueueManager } from "../../services/hardware/fiscalReceiptQueueManager";
import { KktLanPrinterService } from "../../services/hardware/kktLanPrinter";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export interface FiscalExecutionParams {
	targetBillKop: number;
	targetBillRub: number;
	effectiveTotalRub: number;
	cardAmountRub: number;
	cashAmountRub: number;
	sbpAmountRub: number;
	depositAmountRub: number;
	loyaltyAmountRub: number;
	dmsAmountRub: number;
	cashTenderedRub: number;
	remainingRub: number;
	activeMethod: CheckoutPaymentMethodType;
	validation: { isValid: boolean; errorMessageRu?: string; errorMessage?: string };
	clientType: ClientLegalType;
	buyerInn: string;
	buyerName: string;
	isElectronicReceiptOnly: boolean;
	patientId?: string | undefined;
	patientPhone?: string | undefined;
	patientEmail?: string | undefined;
	orderId: string;
	effectiveCashierFullName: string;
	stageCalc: StageAdvanceCalculationResult;
	onPaymentComplete?: ((payload: Ffd12FiscalPayload) => void) | undefined;
	onClose: () => void;
	inFlightRef: React.MutableRefObject<boolean>;
	lastClickTimeRef: React.MutableRefObject<number>;
	isPrinting: boolean;
	setIsPrinting: (val: boolean) => void;
	setIsOfflineBuffered: (val: boolean) => void;
	setInterruptedPaymentState: (val: {
		readonly isInterrupted: boolean;
		readonly reason: string;
		readonly amountRub: number;
		readonly method: string;
	} | null) => void;
	setCardAmountRub: React.Dispatch<React.SetStateAction<number>>;
	setCashAmountRub: React.Dispatch<React.SetStateAction<number>>;
	setCashTenderedRub: React.Dispatch<React.SetStateAction<number>>;
	setSbpAmountRub: React.Dispatch<React.SetStateAction<number>>;
	setDepositAmountRub: React.Dispatch<React.SetStateAction<number>>;
	setLoyaltyAmountRub: React.Dispatch<React.SetStateAction<number>>;
	setDmsAmountRub: React.Dispatch<React.SetStateAction<number>>;
}

export async function executeFiscalPayment(
	params: FiscalExecutionParams,
	forceOfflineBuffer = false
): Promise<void> {
	const {
		targetBillKop,
		targetBillRub,
		effectiveTotalRub,
		cardAmountRub,
		cashAmountRub,
		sbpAmountRub,
		depositAmountRub,
		loyaltyAmountRub,
		dmsAmountRub,
		cashTenderedRub,
		remainingRub,
		activeMethod,
		validation,
		clientType,
		buyerInn,
		buyerName,
		isElectronicReceiptOnly,
		patientId,
		patientPhone,
		patientEmail,
		orderId,
		effectiveCashierFullName,
		stageCalc,
		onPaymentComplete,
		onClose,
		inFlightRef,
		lastClickTimeRef,
		isPrinting,
		setIsPrinting,
		setIsOfflineBuffered,
		setInterruptedPaymentState,
		setCardAmountRub,
		setCashAmountRub,
		setCashTenderedRub,
		setSbpAmountRub,
		setDepositAmountRub,
		setLoyaltyAmountRub,
		setDmsAmountRub,
	} = params;

	const now = Date.now();
	if (inFlightRef.current || isPrinting || now - lastClickTimeRef.current < 600) {
		return;
	}

	let effectiveCardRub = cardAmountRub;
	let effectiveCashRub = cashAmountRub;
	let effectiveSbpRub = sbpAmountRub;
	let effectiveDepositRub = depositAmountRub;
	let effectiveLoyaltyRub = loyaltyAmountRub;
	let effectiveDmsRub = dmsAmountRub;

	if (!validation.isValid) {
		const errorMsg =
			validation.errorMessageRu ||
			validation.errorMessage ||
			"Скорректируйте сумму оплаты перед пробитием чека";

		if (clientType !== "physical_person" && validation.errorMessageRu?.includes("ИНН")) {
			showToast(errorMsg, "warning");
			return;
		}

		if (clientType === "physical_person" && validation.errorMessageRu?.includes("ИНН") && remainingRub === 0) {
			// Автономный пропуск проверки ИНН для физлица — оплата продолжается без задержек
		} else if (remainingRub > 0) {
			const method = activeMethod || "bank_card";
			if (method === "cash") {
				const nextCash = +(cashAmountRub + remainingRub).toFixed(2);
				setCashAmountRub(nextCash);
				if (cashTenderedRub < nextCash) {
					setCashTenderedRub(nextCash);
				}
				effectiveCashRub = nextCash;
			} else if (method === "sbp_qr") {
				const nextSbp = +(sbpAmountRub + remainingRub).toFixed(2);
				setSbpAmountRub(nextSbp);
				effectiveSbpRub = nextSbp;
			} else if (method === "patient_deposit") {
				const nextDeposit = +(depositAmountRub + remainingRub).toFixed(2);
				setDepositAmountRub(nextDeposit);
				effectiveDepositRub = nextDeposit;
			} else if (method === "loyalty_points") {
				const nextLoyalty = +(loyaltyAmountRub + remainingRub).toFixed(2);
				setLoyaltyAmountRub(nextLoyalty);
				effectiveLoyaltyRub = nextLoyalty;
			} else if (method === "dms_insurance") {
				const nextDms = +(dmsAmountRub + remainingRub).toFixed(2);
				setDmsAmountRub(nextDms);
				effectiveDmsRub = nextDms;
			} else {
				const nextCard = +(cardAmountRub + remainingRub).toFixed(2);
				setCardAmountRub(nextCard);
				effectiveCardRub = nextCard;
			}
			showToast("Недостающая сумма автоматически добавлена к оплате!", "info");
		} else {
			showToast(errorMsg, "warning");
			return;
		}
	}

	inFlightRef.current = true;
	lastClickTimeRef.current = now;
	setIsPrinting(true);

	let effectivePayments = splitStateToCheckoutPayments({
		cardRub: effectiveCardRub,
		cashRub: effectiveCashRub,
		sbpRub: effectiveSbpRub,
		depositRub: effectiveDepositRub,
		loyaltyRub: effectiveLoyaltyRub,
		dmsRub: effectiveDmsRub,
	});

	if (targetBillKop > 0 && effectivePayments.length > 0) {
		const sumKop = effectivePayments.reduce((acc, p) => acc + p.amountKop, 0);
		const deltaKop = targetBillKop - sumKop;
		if (deltaKop !== 0) {
			effectivePayments = effectivePayments.map((p, idx) => {
				if (idx === effectivePayments.length - 1) {
					return { ...p, amountKop: Math.max(0, p.amountKop + deltaKop) };
				}
				return p;
			});
		}
	}

	const rawUuid =
		typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID()
			: `idemp-${now}-${Date.now().toString(36)}`;
	const signature = buildFiscalReceiptPayloadSignature({
		patientId: orderId,
		operationType: "income",
		taxationSystem: "usn_income",
		totalKopecks: targetBillKop,
		cashKopecks: Math.round(effectiveCashRub * 100),
		electronicCardKopecks: Math.round(effectiveCardRub * 100),
		sbpKopecks: Math.round(effectiveSbpRub * 100),
		prepaidKopecks: Math.round((effectiveDepositRub + effectiveLoyaltyRub) * 100),
		items: [
			{
				name: "Стоматологические услуги по плану лечения",
				priceKopecks: targetBillKop,
				quantity: 1,
				amountKopecks: targetBillKop,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
			},
		],
	});
	const compositeIdempotencyKey = createFiscalCompositeIdempotencyKey(rawUuid, signature);

	const cashKop = Math.round(effectiveCashRub * 100);
	const electronicKop = Math.round((effectiveCardRub + effectiveSbpRub) * 100);
	const isSplitPayment = cashKop > 0 && electronicKop > 0;
	const primaryMethod = isSplitPayment
		? "split"
		: effectiveCashRub > 0 && effectiveCardRub === 0 && effectiveSbpRub === 0
		? "cash"
		: effectiveDepositRub > 0 && effectiveCashRub === 0 && effectiveCardRub === 0 && effectiveSbpRub === 0
		? "family_wallet"
		: (activeMethod === "sbp_qr" || effectiveSbpRub > 0) && effectiveCashRub === 0 && effectiveCardRub === 0
		? "online"
		: activeMethod === "dms_insurance"
		? "insurance"
		: "card";

	const recordCrmPayment = async (noteSuffix = "") => {
		if (!patientId) return;
		try {
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": compositeIdempotencyKey,
			});

			if (typeof fetch === "function") {
				await fetch("/api/billing/payments", {
					method: "POST",
					headers,
					body: JSON.stringify({
						patientId,
						amountRub: effectiveTotalRub,
						method: targetBillKop === 0 ? "warranty" : (isSplitPayment ? "split" : primaryMethod),
						cashAmountKopecks: cashKop > 0 ? cashKop : undefined,
						electronicAmountKopecks: electronicKop > 0 ? electronicKop : undefined,
						cashAmountRub: effectiveCashRub > 0 ? effectiveCashRub : undefined,
						electronicAmountRub: (effectiveCardRub + effectiveSbpRub) > 0 ? Number((effectiveCardRub + effectiveSbpRub).toFixed(2)) : undefined,
						clientMutationId: compositeIdempotencyKey,
						note: targetBillKop === 0
							? `Акт гарантийного обслуживания / списания услуг (${effectiveCashierFullName}): скидка 100%, 0.00 ₽`
							: `Быстрый расчет (${effectiveCashierFullName})${noteSuffix}: ${isSplitPayment ? `сплит (нал: ${effectiveCashRub} ₽, безнал: ${(effectiveCardRub + effectiveSbpRub).toFixed(2)} ₽)` : primaryMethod}`,
					}),
				}).catch((fetchErr) => {
					console.warn("[FastCheckoutModal] /api/billing/payments error:", fetchErr);
				});
			}
		} catch (crmErr) {
			console.warn("[FastCheckoutModal] Failed to record payment in CRM:", crmErr);
		}
	};

	const payload = generate54FzFiscalPayload(
		{
			orderId,
			totalBillKop: targetBillKop,
			payments: effectivePayments,
			patientPhone,
			patientEmail,
			clientType,
			buyerInn: buyerInn || undefined,
			buyerName: buyerName || undefined,
			isElectronicReceiptOnly,
			idempotencyKey: compositeIdempotencyKey,
		},
		{
			paymentMethodTag1214: stageCalc.ffdTag1214,
			paymentSubjectTag1212: stageCalc.ffdTag1212,
			idempotencyKey: compositeIdempotencyKey,
			isElectronicReceiptOnly,
			offlineBuffered: forceOfflineBuffer,
		}
	);

	if (targetBillKop === 0) {
		await recordCrmPayment(" [Акт гарантийного обслуживания / списания услуг (скидка 100%, 0.00 ₽)]");
		showToast(
			"Оформлен Акт гарантийного обслуживания / списания услуг (скидка 100%, 0 ₽). Визит закрыт без обращения к кассе!",
			"success",
			4000
		);
		if (onPaymentComplete) {
			onPaymentComplete({
				...payload,
				offlineBuffered: false,
			});
		}
		setTimeout(() => {
			setIsPrinting(false);
			inFlightRef.current = false;
			onClose();
		}, 300);
		return;
	}

	if (forceOfflineBuffer || (typeof navigator !== "undefined" && navigator.onLine === false)) {
		FiscalReceiptQueueManager.enqueueReceipt(
			{
				operationType: "income",
				customerContact: patientPhone || patientEmail || "",
				cashierFullName: effectiveCashierFullName,
				totalRub: targetBillRub,
				items: [
					{
						name: "Стоматологические услуги по плану лечения",
						priceRub: targetBillRub,
						quantity: 1,
						amountRub: targetBillRub,
						paymentMethod: "full_payment",
						paymentSubject: "service",
					},
				],
				cashRub: payload.paymentsDistribution.cashKop / 100,
				electronicRub: payload.paymentsDistribution.electronicKop / 100,
				prepaidRub: payload.paymentsDistribution.advancePrepaymentKop / 100,
				taxationSystem: "usn_income_expense",
			},
			forceOfflineBuffer
				? "Оплата через автономный терминал (без ККТ) / чек пробить позже"
				: "Кассовый аппарат временно недоступен в сети",
			compositeIdempotencyKey
		);
		setIsOfflineBuffered(true);
		showToast(
			"Оплата принята через автономный терминал! Фискальный чек поставлен в очередь отложенной печати. Пациент рассчитан.",
			"success",
			4000
		);

		await recordCrmPayment(" [автономный терминал / отложенный чек]");

		if (onPaymentComplete) {
			onPaymentComplete({ ...payload, offlineBuffered: true });
		}

		setTimeout(() => {
			setIsPrinting(false);
			inFlightRef.current = false;
			onClose();
		}, 400);
		return;
	}

	try {
		const printResult = await KktLanPrinterService.printReceipt({
			operationType: "income",
			customerContact: patientPhone || patientEmail || "",
			cashierFullName: effectiveCashierFullName,
			totalRub: targetBillRub,
			items: [
				{
					name: "Стоматологические услуги по плану лечения",
					priceRub: targetBillRub,
					quantity: 1,
					amountRub: targetBillRub,
					paymentMethod: "full_payment",
					paymentSubject: "service",
				},
			],
			cashRub: payload.paymentsDistribution.cashKop / 100,
			electronicRub: payload.paymentsDistribution.electronicKop / 100,
			prepaidRub: payload.paymentsDistribution.advancePrepaymentKop / 100,
			taxationSystem: "usn_income_expense",
		});

		if (!printResult.success || printResult.status === "hardware_offline") {
			FiscalReceiptQueueManager.enqueueReceipt(
				{
					operationType: "income",
					customerContact: patientPhone || patientEmail || "",
					cashierFullName: effectiveCashierFullName,
					totalRub: targetBillRub,
					items: [
						{
							name: "Стоматологические услуги по плану лечения",
							priceRub: targetBillRub,
							quantity: 1,
							amountRub: targetBillRub,
							paymentMethod: "full_payment",
							paymentSubject: "service",
						},
					],
					cashRub: payload.paymentsDistribution.cashKop / 100,
					electronicRub: payload.paymentsDistribution.electronicKop / 100,
					prepaidRub: payload.paymentsDistribution.advancePrepaymentKop / 100,
					taxationSystem: "usn_income_expense",
				},
				printResult.error || "ККТ временно недоступна / нет бумаги",
				compositeIdempotencyKey
			);
			setIsOfflineBuffered(true);
			showToast(
				"ККТ временно офлайн: чек помещён в буфер отложенной фискализации. Пациент отпущен без задержек!",
				"warning"
			);

			if (onPaymentComplete) {
				onPaymentComplete({ ...payload, offlineBuffered: true });
			}
		} else {
			if (isElectronicReceiptOnly) {
				showToast(
					`Электронный чек отправлен на ${patientPhone || patientEmail || "контакт пациента"} (бумага сэкономлена)!`,
					"success"
				);
			} else {
				showToast("Кассовый чек успешно напечатан!", "success");
			}

			if (onPaymentComplete) {
				onPaymentComplete(payload);
			}
		}

		await recordCrmPayment();

		setTimeout(() => {
			setIsPrinting(false);
			inFlightRef.current = false;
			onClose();
		}, 600);
	} catch (err: unknown) {
		FiscalReceiptQueueManager.enqueueReceipt(
			{
				operationType: "income",
				customerContact: patientPhone || patientEmail || "",
				cashierFullName: effectiveCashierFullName,
				totalRub: targetBillRub,
				items: [
					{
						name: "Стоматологические услуги по плану лечения",
						priceRub: targetBillRub,
						quantity: 1,
						amountRub: targetBillRub,
						paymentMethod: "full_payment",
						paymentSubject: "service",
					},
				],
				cashRub: payload.paymentsDistribution.cashKop / 100,
				electronicRub: payload.paymentsDistribution.electronicKop / 100,
				prepaidRub: payload.paymentsDistribution.advancePrepaymentKop / 100,
				taxationSystem: "usn_income_expense",
			},
			err instanceof Error ? err.message : "Аварийный сбой связи с ККТ",
			compositeIdempotencyKey
		);
		setInterruptedPaymentState({
			isInterrupted: true,
			reason: err instanceof Error ? err.message : "Аварийный сбой связи с ККТ",
			amountRub: targetBillRub,
			method: activeMethod,
		});
		setIsOfflineBuffered(true);
		showToast(
			"ККТ не отвечает: чек сохранен в локальный буфер отложенной фискализации. Пациент отпущен!",
			"warning"
		);

		await recordCrmPayment(" [аварийный буфер]");

		if (onPaymentComplete) {
			onPaymentComplete({ ...payload, offlineBuffered: true });
		}

		setTimeout(() => {
			setIsPrinting(false);
			inFlightRef.current = false;
			onClose();
		}, 600);
	}
}

export interface ManualCardTerminalParams {
	targetBillRub: number;
	overrideAmountRub?: number;
	patientId?: string;
	patientPhone?: string;
	patientEmail?: string;
	effectiveCashierFullName: string;
	orderId: string;
	clientType: ClientLegalType;
	buyerInn: string;
	buyerName: string;
	isElectronicReceiptOnly: boolean;
	stageCalc: StageAdvanceCalculationResult;
	onPaymentComplete?: ((payload: Ffd12FiscalPayload) => void) | undefined;
	onClose: () => void;
	setIsSubmittingManualCard: (val: boolean) => void;
	setIsOfflineBuffered: (val: boolean) => void;
	setInterruptedPaymentState: (val: null) => void;
}

export async function executeManualCardTerminalConfirm(
	params: ManualCardTerminalParams
): Promise<void> {
	const {
		targetBillRub,
		overrideAmountRub,
		patientId,
		patientPhone,
		patientEmail,
		effectiveCashierFullName,
		orderId,
		clientType,
		buyerInn,
		buyerName,
		isElectronicReceiptOnly,
		stageCalc,
		onPaymentComplete,
		onClose,
		setIsSubmittingManualCard,
		setIsOfflineBuffered,
		setInterruptedPaymentState,
	} = params;

	const amountRub = overrideAmountRub ?? targetBillRub;
	setIsSubmittingManualCard(true);
	try {
		const rawUuid =
			typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: `idemp-${Date.now()}-${Date.now().toString(36)}`;

		const compositeIdempotencyKey = createFiscalCompositeIdempotencyKey(
			rawUuid,
			{ method: "manual-card", orderId, amountRub }
		);

		FiscalReceiptQueueManager.enqueueReceipt(
			{
				operationType: "income",
				customerContact: patientPhone || patientEmail || "",
				cashierFullName: effectiveCashierFullName,
				totalRub: amountRub,
				items: [
					{
						name: "Стоматологические услуги по плану лечения",
						priceRub: amountRub,
						quantity: 1,
						amountRub: amountRub,
						paymentMethod: "full_payment",
						paymentSubject: "service",
					},
				],
				cashRub: 0,
				electronicRub: amountRub,
				prepaidRub: 0,
				taxationSystem: "usn_income_expense",
			},
			"Оплата картой подтверждена на терминале вручную (без повторного списания с карты)",
			compositeIdempotencyKey
		);
		setIsOfflineBuffered(true);

		if (patientId && amountRub > 0 && typeof fetch === "function") {
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": compositeIdempotencyKey,
			});
			await fetch("/api/billing/payments", {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					amountRub,
					method: "card",
					clientMutationId: compositeIdempotencyKey,
					note: `Оплата картой подтверждена на терминале вручную (${effectiveCashierFullName}): ${amountRub} ₽ [Без повторного списания с карты]`,
				}),
			}).catch((err) => {
				console.warn("[FastCheckoutModal] Manual card payment recording warning:", err);
			});
		}

		showToast(
			`Оплата картой на сумму ${amountRub} ₽ подтверждена вручную на терминале. Чек поставлен в очередь фискализации, визит закрыт!`,
			"success",
			5000
		);

		if (onPaymentComplete) {
			const payload = generate54FzFiscalPayload(
				{
					orderId,
					totalBillKop: Math.round(amountRub * 100),
					payments: [{ method: "bank_card", amountKop: Math.round(amountRub * 100) }],
					patientPhone,
					patientEmail,
					clientType,
					buyerInn: buyerInn || undefined,
					buyerName: buyerName || undefined,
					isElectronicReceiptOnly,
					idempotencyKey: compositeIdempotencyKey,
				},
				{
					paymentMethodTag1214: stageCalc.ffdTag1214,
					paymentSubjectTag1212: stageCalc.ffdTag1212,
					idempotencyKey: compositeIdempotencyKey,
					isElectronicReceiptOnly,
					offlineBuffered: true,
				}
			);
			onPaymentComplete({ ...payload, offlineBuffered: true });
		}

		setInterruptedPaymentState(null);
		setTimeout(() => {
			setIsSubmittingManualCard(false);
			onClose();
		}, 400);
	} catch (err: unknown) {
		const errMsg = err instanceof Error ? err.message : "Ошибка ручного подтверждения оплаты";
		showToast(errMsg, "error");
		setIsSubmittingManualCard(false);
	}
}
