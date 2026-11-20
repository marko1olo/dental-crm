/**
 * DENTE Dental CRM — Экшены и API-мутации Студии Лояльности (LOYALTY ACTIONS SSOT)
 * Мандат 8b (Декомпозиция хука <= 300 строк), Мандат 8bm (rublesToKopecks, kopecksToRubles).
 */

import { rublesToKopecks, kopecksToRubles } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import {
	validateGiftCertificateSerial,
	redeemGiftCertificate,
	debitFamilySharedBalance,
	formatKopecksToRubles,
	type Fiscal54FzSplitResult,
	type LoyaltyLedgerEntry,
	type FamilyMember,
	type TierProgressionResult,
	type LoyaltyRedemptionResult,
} from "./loyaltyCatalogData";

export const postLoyaltyJson = (url: string, body: unknown) =>
	fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Idempotency-Key": crypto.randomUUID(),
			...denteAdminSecretRequestHeaders(),
		},
		body: JSON.stringify(body),
	});

export interface VerifiedCertState {
	readonly id: string;
	readonly serialNumber: string;
	readonly nominalRub: number;
	readonly currentBalanceRub: number;
	readonly currentBalanceKop: number;
	readonly status: string;
}

export async function actionApplyPoints(params: {
	readonly patientId: string | undefined;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly currentInvoiceAmountKop: number;
	readonly activeEffectiveBalanceRub: number;
	readonly pointsBalance: number;
	readonly isDoctorOverride: boolean;
	readonly hasFamilyGroup: boolean;
	readonly selectedFamilyMemberId: string | null;
	readonly familyMembers: readonly FamilyMember[];
	readonly familyGroupId: string;
	readonly familyName: string;
	readonly totalPooledPoints: number;
	readonly redemption: LoyaltyRedemptionResult;
	readonly progression: TierProgressionResult;
	readonly setPointsBalance: (b: number | ((prev: number) => number)) => void;
	readonly setLedger: (fn: (prev: readonly LoyaltyLedgerEntry[]) => readonly LoyaltyLedgerEntry[]) => void;
	readonly onRedeemSuccess?: ((redeemedPointsRub: number, fiscalSplit: Fiscal54FzSplitResult) => void) | undefined;
}): Promise<void> {
	const {
		patientId, patientName, medicalCardNumber, currentInvoiceAmountKop,
		activeEffectiveBalanceRub, pointsBalance, isDoctorOverride, hasFamilyGroup,
		selectedFamilyMemberId, familyMembers, familyGroupId, familyName, totalPooledPoints,
		redemption, progression, setPointsBalance, setLedger, onRedeemSuccess,
	} = params;

	if (redemption.actualRedeemedPointsRub <= 0) {
		if (currentInvoiceAmountKop <= 0) showToast("Сумма счета не указана. Введите чек к оплате", "info");
		else if (activeEffectiveBalanceRub <= 0 && !isDoctorOverride) showToast("На балансе нет бонусов. Включите гарантию врача для 100% покрытия", "info");
		else showToast("Укажите сумму бонусов для списания", "warning");
		return;
	}

	const prevPointsBalance = pointsBalance;

	if (hasFamilyGroup && selectedFamilyMemberId) {
		const member = familyMembers.find((m) => m.patientId === selectedFamilyMemberId);
		const famResult = debitFamilySharedBalance({
			familyGroupId,
			familyName,
			sponsorPatientId: patientId || "",
			sponsorFullName: patientName,
			targetPatientId: member?.patientId ?? patientId ?? "",
			targetPatientName: member?.fullName ?? patientName,
			targetRoleRu: member?.roleRu ?? "Член семьи",
			invoiceAmountKop: currentInvoiceAmountKop,
			availableFamilyPointsRub: totalPooledPoints,
			requestedPointsRub: redemption.actualRedeemedPointsRub,
			allowFullCoverage: isDoctorOverride,
		});
		setPointsBalance(famResult.remainingFamilyBalanceRub);
		setLedger((prev) => [famResult.ledgerEntry, ...prev]);
		try {
			const res = await postLoyaltyJson("/api/loyalty/family/debit", {
				sponsorPatientId: patientId,
				targetPatientId: member?.patientId ?? patientId,
				pointsToDebit: famResult.debitedPointsRub,
				description: `Списание из семейного кошелька за ${member?.fullName ?? patientName}`,
			});
			if (!res.ok) {
				const errJson = await res.json().catch(() => ({}));
				showToast(errJson.message || "Ошибка списания баллов с семейного счета", "error");
				setPointsBalance(prevPointsBalance);
				return;
			}
			showToast(famResult.messageRu, "success");
			if (onRedeemSuccess) onRedeemSuccess(famResult.debitedPointsRub, famResult.fiscal54FzSplit);
		} catch (err) {
			console.error("[LoyaltyStudioActions] Family debit failed:", err);
			showToast("Сетевой сбой при списании семейных баллов", "error");
			setPointsBalance(prevPointsBalance);
		}
	} else {
		const newBal = pointsBalance - redemption.actualRedeemedPointsRub;
		setPointsBalance(newBal);
		const entry: LoyaltyLedgerEntry = {
			id: `tx-${Date.now().toString().slice(-4)}`,
			timestampIso: new Date().toLocaleString("ru-RU"),
			patientId: patientId || "",
			patientName,
			medicalCardNumber,
			operationType: "redemption",
			operationTypeRu: isDoctorOverride ? "Списание (Гарантия врача 100%)" : `Оплата бонусами (${progression.currentTier.nameRu})`,
			invoiceAmountKop: currentInvoiceAmountKop,
			pointsDeltaRub: -redemption.actualRedeemedPointsRub,
			balanceAfterRub: newBal,
			paymentMethodRu: "Бонусы + Касса",
			staffNameRu: "Администратор / Касса",
			noteRu: `Списание ${redemption.actualRedeemedPointsRub} ₽ бонусов по счету`,
		};
		setLedger((prev) => [entry, ...prev]);
		try {
			const invoiceRub = currentInvoiceAmountKop > 0 ? kopecksToRubles(currentInvoiceAmountKop) : redemption.actualRedeemedPointsRub;
			const amountKop = currentInvoiceAmountKop > 0 ? currentInvoiceAmountKop : rublesToKopecks(redemption.actualRedeemedPointsRub);
			const res = await postLoyaltyJson("/api/loyalty/redeem", {
				patientId,
				amountKopecks: amountKop,
				invoiceAmountKopecks: amountKop,
				invoiceAmountRub: invoiceRub,
				pointsToRedeem: redemption.actualRedeemedPointsRub,
				allowFullCoverage: isDoctorOverride,
			});
			if (!res.ok) {
				const errJson = await res.json().catch(() => ({}));
				showToast(errJson.message || "Не удалось списать бонусы в базе данных", "error");
				setPointsBalance(prevPointsBalance);
				return;
			}
			const data = await res.json().catch(() => ({}));
			if (typeof data.activePoints === "number") setPointsBalance(data.activePoints);
			showToast(`Успешно списано ${redemption.actualRedeemedPointsRub} бонусов. К оплате: ${formatKopecksToRubles(redemption.remainingPayableKop)}`, "success");
			if (onRedeemSuccess) onRedeemSuccess(redemption.actualRedeemedPointsRub, redemption.fiscal54FzSplit);
		} catch (err) {
			console.error("[LoyaltyStudioActions] Redeem call failed:", err);
			showToast("Сетевой сбой при списании бонусов. Проверьте соединение", "error");
			setPointsBalance(prevPointsBalance);
		}
	}
}

export async function actionAccruePoints(params: {
	readonly patientId: string | undefined;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly pointsBalance: number;
	readonly accrueInputRub: string;
	readonly setPointsBalance: (b: number | ((prev: number) => number)) => void;
	readonly setLedger: (fn: (prev: readonly LoyaltyLedgerEntry[]) => readonly LoyaltyLedgerEntry[]) => void;
	readonly setAccrueInputRub: (v: string) => void;
	readonly setIsAccrueOpen: (v: boolean) => void;
}): Promise<void> {
	const {
		patientId, patientName, medicalCardNumber, pointsBalance,
		accrueInputRub, setPointsBalance, setLedger, setAccrueInputRub, setIsAccrueOpen,
	} = params;

	const amount = Math.max(0, Number(accrueInputRub) || 500);
	if (amount <= 0) {
		showToast("Укажите сумму бонусов для начисления", "warning");
		return;
	}
	const prevPointsBalance = pointsBalance;
	const newBal = pointsBalance + amount;
	setPointsBalance(newBal);
	setLedger((prev) => [
		{
			id: `acc-${Date.now().toString().slice(-4)}`,
			timestampIso: new Date().toLocaleString("ru-RU"),
			patientId: patientId || "",
			patientName,
			medicalCardNumber,
			operationType: "accrual",
			operationTypeRu: "Начисление бонусов",
			invoiceAmountKop: 0,
			pointsDeltaRub: amount,
			balanceAfterRub: newBal,
			paymentMethodRu: "Программа лояльности",
			staffNameRu: "Администратор / Врач",
			noteRu: `Начислено ${amount} бонусов пациенту ${patientName}`,
		},
		...prev,
	]);
	try {
		const res = await postLoyaltyJson("/api/loyalty/accrue", {
			patientId,
			amountPoints: amount,
			description: "Ручное начисление бонусов",
		});
		if (!res.ok) {
			const errJson = await res.json().catch(() => ({}));
			showToast(errJson.message || "Ошибка начисления бонусов", "error");
			setPointsBalance(prevPointsBalance);
			return;
		}
		const data = await res.json().catch(() => ({}));
		const actualBal = typeof data.activePoints === "number" ? data.activePoints : newBal;
		if (typeof data.activePoints === "number") setPointsBalance(data.activePoints);
		showToast(`Начислено ${amount} бонусов! Новый баланс: ${actualBal} ₽`, "success");
		setAccrueInputRub("");
		setIsAccrueOpen(false);
	} catch (err) {
		console.error("[LoyaltyStudioActions] Accrue call failed:", err);
		showToast("Сетевой сбой при начислении бонусов", "error");
		setPointsBalance(prevPointsBalance);
	}
}

export async function actionRedeemCertificate(params: {
	readonly verifiedCertificate: VerifiedCertState | null;
	readonly currentInvoiceAmountKop: number;
	readonly patientId: string | undefined;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly pointsBalance: number;
	readonly setCertFeedback: (v: string | null) => void;
	readonly setVerifiedCertificate: (v: VerifiedCertState | null) => void;
	readonly setCertSerial: (v: string) => void;
	readonly setLedger: (fn: (prev: readonly LoyaltyLedgerEntry[]) => readonly LoyaltyLedgerEntry[]) => void;
	readonly onRedeemSuccess?: ((redeemedPointsRub: number, fiscalSplit: Fiscal54FzSplitResult) => void) | undefined;
}): Promise<void> {
	const {
		verifiedCertificate, currentInvoiceAmountKop, patientId, patientName,
		medicalCardNumber, pointsBalance, setCertFeedback, setVerifiedCertificate,
		setCertSerial, setLedger, onRedeemSuccess,
	} = params;

	if (!verifiedCertificate) return;
	try {
		const invoiceRub =
			currentInvoiceAmountKop > 0
				? kopecksToRubles(currentInvoiceAmountKop)
				: verifiedCertificate.currentBalanceRub;
		const amountToRedeemRub = Math.min(verifiedCertificate.currentBalanceRub, invoiceRub);
		const amountKop = currentInvoiceAmountKop > 0
			? Math.min(verifiedCertificate.currentBalanceKop, currentInvoiceAmountKop)
			: verifiedCertificate.currentBalanceKop;

		const res = await postLoyaltyJson("/api/loyalty/certificates/redeem", {
			serialNumber: verifiedCertificate.serialNumber,
			invoiceAmountRub: invoiceRub,
			amountToRedeemRub,
			amountKopecks: amountKop,
			patientId,
			description: `Погашение сертификата ${verifiedCertificate.serialNumber} в Студии лояльности`,
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			showToast(err.message || "Не удалось списать сертификат", "warning");
			return;
		}
		const data = await res.json();
		showToast(`Сертификат успешно зачтён на сумму ${data.redeemedAmountRub} ₽! (Чек 54-ФЗ тег 1215)`, "success");
		setCertFeedback(`Зачтено ${data.redeemedAmountRub} ₽. Новый остаток: ${data.newBalanceRub} ₽`);
		setVerifiedCertificate(null);
		setCertSerial("");
		const redeemedKop = rublesToKopecks(Number(data.redeemedAmountRub) || 0);
		setLedger((prev) => [
			{
				id: `redeem-cert-${Date.now().toString().slice(-4)}`,
				timestampIso: new Date().toLocaleString("ru-RU"),
				patientId: patientId || "",
				patientName,
				medicalCardNumber,
				operationType: "redemption",
				operationTypeRu: "Зачёт сертификата",
				invoiceAmountKop: redeemedKop,
				pointsDeltaRub: 0,
				balanceAfterRub: pointsBalance,
				paymentMethodRu: "Сертификат (аванс 1215)",
				fiscalReceiptNumber: `CERT-${Date.now().toString().slice(-6)}`,
				staffNameRu: "Администратор",
				noteRu: `Погашение сертификата ${verifiedCertificate.serialNumber} на ${data.redeemedAmountRub} ₽`,
			},
			...prev,
		]);
		if (onRedeemSuccess) {
			onRedeemSuccess(0, {
				tag1031CashKop: 0,
				tag1081ElectronicCardKop: Math.max(0, currentInvoiceAmountKop - redeemedKop),
				tag1215AdvancePrepaymentBonusKop: redeemedKop,
				tag1043DiscountKop: 0,
				totalGrossKop: currentInvoiceAmountKop || redeemedKop,
				totalNetPayableKop: Math.max(0, currentInvoiceAmountKop - redeemedKop),
			});
		}
	} catch (err) {
		console.error("[LoyaltyStudioActions] Redeem certificate call failed:", err);
		showToast("Ошибка сети при списании сертификата", "error");
	}
}

export async function actionIssueCertificate(params: {
	readonly nominalRub: number;
	readonly title: string;
	readonly patientId: string | undefined;
	readonly patientName: string;
	readonly medicalCardNumber: string;
	readonly pointsBalance: number;
	readonly setCertSerial: (v: string) => void;
	readonly setCertFeedback: (v: string | null) => void;
	readonly setLedger: (fn: (prev: readonly LoyaltyLedgerEntry[]) => readonly LoyaltyLedgerEntry[]) => void;
}): Promise<void> {
	const {
		nominalRub, title, patientId, patientName, medicalCardNumber,
		pointsBalance, setCertSerial, setCertFeedback, setLedger,
	} = params;

	try {
		const nominalKopecks = rublesToKopecks(nominalRub);
		const res = await postLoyaltyJson("/api/loyalty/certificates/issue", {
			purchaserPatientId: patientId,
			purchaserName: patientName,
			nominalRub,
			nominalKopecks,
			expiresInDays: 365,
			notes: `Продажа сертификата «${title}» для ${patientName}`,
		});
		if (!res.ok) {
			const errJson = await res.json().catch(() => ({}));
			showToast(errJson.message || "Не удалось оформить сертификат", "warning");
			return;
		}
		const data = await res.json().catch(() => ({}));
		const serial = data.certificate?.serialNumber || "—";
		setCertSerial(serial);
		setCertFeedback(`Оформлен сертификат ${serial} на сумму ${nominalRub.toLocaleString("ru-RU")} ₽`);
		showToast(`Сертификат на ${nominalRub.toLocaleString("ru-RU")} ₽ успешно оформлен! Номер: ${serial}`, "success");
		setLedger((prev) => [
			{
				id: `cert-${Date.now().toString().slice(-4)}`,
				timestampIso: new Date().toLocaleString("ru-RU"),
				patientId: patientId || "",
				patientName,
				medicalCardNumber,
				operationType: "accrual",
				operationTypeRu: "Продажа сертификата",
				invoiceAmountKop: nominalKopecks,
				pointsDeltaRub: 0,
				balanceAfterRub: pointsBalance,
				paymentMethodRu: "Касса клиники",
				staffNameRu: "Администратор",
				noteRu: `Оформлен сертификат ${serial} (${nominalRub.toLocaleString("ru-RU")} ₽)`,
			},
			...prev,
		]);
	} catch (err) {
		console.error("[LoyaltyStudioActions] Issue certificate call failed:", err);
		showToast("Ошибка сети при оформлении сертификата", "error");
	}
}

export async function actionVerifyCertificate(params: {
	readonly certSerial: string;
	readonly currentInvoiceAmountKop: number;
	readonly setCertFeedback: (v: string | null) => void;
	readonly setVerifiedCertificate: (v: VerifiedCertState | null) => void;
}): Promise<void> {
	const { certSerial, currentInvoiceAmountKop, setCertFeedback, setVerifiedCertificate } = params;
	const serial = certSerial.trim();
	if (!serial) {
		showToast("Введите номер подарочного сертификата", "warning");
		return;
	}
	if (!validateGiftCertificateSerial(serial)) {
		setCertFeedback("Номер сертификата недействителен (ошибка контрольной суммы)");
		showToast("Ошибка контрольной суммы сертификата", "warning");
		return;
	}
	try {
		const res = await postLoyaltyJson("/api/loyalty/certificates/validate", { serialNumber: serial });
		if (res.ok) {
			const certData = await res.json();
			if (certData.certificate) {
				const cert = certData.certificate;
				if (cert.status === "depleted") {
					setCertFeedback("Баланс сертификата полностью исчерпан");
					showToast("Баланс сертификата исчерпан", "warning");
					setVerifiedCertificate(null);
					return;
				}
				if (cert.status === "cancelled") {
					setCertFeedback("Сертификат аннулирован администрацией клиники");
					showToast("Сертификат аннулирован", "warning");
					setVerifiedCertificate(null);
					return;
				}
				if (cert.status === "expired") {
					setCertFeedback("Срок действия сертификата истек");
					showToast("Срок действия сертификата истек", "warning");
					setVerifiedCertificate(null);
					return;
				}
				const redeemRes = redeemGiftCertificate(cert, currentInvoiceAmountKop);
				const coveredMsg =
					redeemRes.coveredInvoiceAmountKop > 0
						? `, к зачёту: ${formatKopecksToRubles(redeemRes.coveredInvoiceAmountKop)}`
						: "";
				const nomKop = cert.nominalKop || rublesToKopecks(cert.nominalRub || 0);
				const balKop = cert.currentBalanceKop || rublesToKopecks(cert.currentBalanceRub || 0);
				setCertFeedback(
					`Сертификат подтвержден! Номинал: ${formatKopecksToRubles(nomKop)}, баланс: ${formatKopecksToRubles(balKop)}${coveredMsg}`,
				);
				setVerifiedCertificate({
					id: cert.id,
					serialNumber: cert.serialNumber,
					nominalRub: Number(cert.nominalRub || 0),
					currentBalanceRub: Number(cert.currentBalanceRub || 0),
					currentBalanceKop: Number(balKop),
					status: cert.status,
				});
				showToast("Сертификат подтвержден через базу клиники", "success");
				return;
			}
		}
		const err = await res.json().catch(() => ({}));
		const msg = err.message || "Сертификат не найден в базе клиники или аннулирован";
		setCertFeedback(msg);
		setVerifiedCertificate(null);
		showToast(msg, "warning");
	} catch {
		setCertFeedback("Сертификат не найден в базе клиники или аннулирован");
		setVerifiedCertificate(null);
		showToast("Сертификат не найден в базе клиники или аннулирован", "warning");
	}
}
