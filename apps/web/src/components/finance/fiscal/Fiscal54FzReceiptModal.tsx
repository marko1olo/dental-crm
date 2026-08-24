/**
 * Fiscal54FzReceiptModal.tsx — 54-FZ FFD 1.2 Interactive Fiscalization & Multi-Tender Split Modal.
 */

import React, { useMemo, useState } from "react";
import {
	AlertCircle,
	AlertTriangle,
	Banknote,
	Check,
	CheckCircle2,
	Coins,
	Copy,
	CreditCard,
	Download,
	FileCheck,
	FileText,
	Gift,
	Layers,
	Printer,
	QrCode,
	Receipt,
	Send,
	ShieldCheck,
	Sparkles,
	Tag,
	Users,
	Wallet,
	X,
} from "lucide-react";
import {
	buildFiscalReceiptPayloadSignature,
	createFiscalCompositeIdempotencyKey,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import {
	compileFiscalDraftSummary,
	type FiscalItemDraft,
	getCashPresetSuggestions,
	type SplitTenderState,
	validateDataMatrixBarcode,
} from "./fiscal54fzEngine";
import { FiscalReceiptPrintView } from "./FiscalReceiptPrintView";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { numberToWordsRu } from "../../treatment-plans/TreatmentPlanCompletedActPrint";
import {
	calculateTaxDeductionSummary,
	downloadFnsTaxXmlFile,
	type TaxDeductionRelationship,
	type TaxDeductionPaymentItem,
} from "../taxDeductionEngine";

export interface Fiscal54FzReceiptModalProps {
	readonly isOpen: boolean;
	readonly items: readonly FiscalItemDraft[];
	readonly patientId: string;
	readonly patientName?: string;
	readonly patientPhone?: string;
	readonly patientDepositRub?: number;
	readonly patientFamilyBalanceRub?: number;
	readonly cashierFullName?: string;
	readonly clinicName?: string;
	readonly clinicInn?: string;
	readonly onClose: () => void;
	readonly onReceiptFiscalized?: (receiptData: unknown) => void;
}

export const Fiscal54FzReceiptModal: React.FC<Fiscal54FzReceiptModalProps> = ({
	isOpen,
	items,
	patientId,
	patientName = "Пациент",
	patientPhone = "+7 (999) 000-00-00",
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	cashierFullName = "Кассир-администратор",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "7701234567",
	onClose,
	onReceiptFiscalized,
}) => {
	if (!isOpen) return null;

	const [activeTab, setActiveTab] = useState<"split" | "act" | "certificate" | "preview">("split");
	const [actNumber, setActNumber] = useState<string>(
		`АКТ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
	);
	const [contractNumber, setContractNumber] = useState<string>(
		`ДОГ-${new Date().getFullYear()}/${patientId.slice(0, 5).toUpperCase()}`,
	);
	const [payerFullName, setPayerFullName] = useState<string>(patientName);
	const [payerInn, setPayerInn] = useState<string>("");
	const [payerRelationship, setPayerRelationship] = useState<TaxDeductionRelationship>("patient");
	const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());
	const [cashAmount, setCashAmount] = useState<number>(0);
	const [receivedCashRub, setReceivedCashRub] = useState<number>(0);
	const [cardAmount, setCardAmount] = useState<number>(0);
	const [sbpAmount, setSbpAmount] = useState<number>(0);
	const [advanceOffsetAmount, setAdvanceOffsetAmount] = useState<number>(0);
	const [familyWalletAmount, setFamilyWalletAmount] = useState<number>(0);
	const [certificateAmount, setCertificateAmount] = useState<number>(0);
	const [customerContact, setCustomerContact] = useState<string>(patientPhone);
	const [isFiscalizing, setIsFiscalizing] = useState<boolean>(false);
	const [itemMarkingCodes, setItemMarkingCodes] = useState<Record<string, string>>({});

	// Merge item marking codes
	const currentItems = useMemo(() => {
		return items.map((it) => ({
			...it,
			markingCode: itemMarkingCodes[it.id] ?? it.markingCode ?? undefined,
		}));
	}, [items, itemMarkingCodes]);

	const distinctFamilyPatients = useMemo(() => {
		interface FamilyPatientSummary {
			readonly fullName: string;
			readonly role: string | null;
			count: number;
			totalRub: number;
		}
		const map = new Map<string, FamilyPatientSummary>();
		for (const it of currentItems) {
			if (it.patientFullName) {
				let existing = map.get(it.patientFullName);
				if (!existing) {
					existing = {
						fullName: it.patientFullName,
						role: it.familyMemberRole ?? null,
						count: 0,
						totalRub: 0,
					};
					map.set(it.patientFullName, existing);
				}
				existing.count += it.quantity || 1;
				existing.totalRub += it.priceRub * (it.quantity || 1) - (it.discountRub || 0);
			}
		}
		return Array.from(map.values());
	}, [currentItems]);

	const tenders: SplitTenderState = useMemo(() => ({
		cashRub: Number(cashAmount) || 0,
		receivedCashRub: receivedCashRub > 0 ? Number(receivedCashRub) : Number(cashAmount) || 0,
		cardRub: Number(cardAmount) || 0,
		sbpRub: Number(sbpAmount) || 0,
		advanceOffsetRub: Number(advanceOffsetAmount) || 0,
		familyWalletRub: Number(familyWalletAmount) || 0,
		certificateRub: Number(certificateAmount) || 0,
	}), [cashAmount, receivedCashRub, cardAmount, sbpAmount, advanceOffsetAmount, familyWalletAmount, certificateAmount]);

	const summary = useMemo(() => {
		return compileFiscalDraftSummary(currentItems, tenders);
	}, [currentItems, tenders]);

	// Cash Presets suggestions
	const cashPresets = useMemo(() => {
		return getCashPresetSuggestions(cashAmount);
	}, [cashAmount]);

	// Initialize default 100% to Card on mount
	React.useEffect(() => {
		if (
			cashAmount === 0 &&
			cardAmount === 0 &&
			sbpAmount === 0 &&
			advanceOffsetAmount === 0 &&
			familyWalletAmount === 0 &&
			certificateAmount === 0 &&
			summary.totalRub > 0
		) {
			if (patientDepositRub > 0) {
				const offset = Math.min(summary.totalRub, patientDepositRub);
				setAdvanceOffsetAmount(offset);
				setCardAmount(Math.max(0, summary.totalRub - offset));
			} else if (patientFamilyBalanceRub > 0) {
				const familyOffset = Math.min(summary.totalRub, patientFamilyBalanceRub);
				setFamilyWalletAmount(familyOffset);
				setCardAmount(Math.max(0, summary.totalRub - familyOffset));
			} else {
				setCardAmount(summary.totalRub);
			}
		}
	}, [summary.totalRub, patientDepositRub, patientFamilyBalanceRub]);

	const handleOneClickMethod = (method: "card" | "cash" | "sbp" | "deposit_all" | "family_all") => {
		setCashAmount(0);
		setReceivedCashRub(0);
		setCardAmount(0);
		setSbpAmount(0);
		setAdvanceOffsetAmount(0);
		setFamilyWalletAmount(0);
		setCertificateAmount(0);

		if (method === "card") {
			setCardAmount(summary.totalRub);
		} else if (method === "cash") {
			setCashAmount(summary.totalRub);
			setReceivedCashRub(summary.totalRub);
		} else if (method === "sbp") {
			setSbpAmount(summary.totalRub);
		} else if (method === "deposit_all") {
			const offset = Math.min(summary.totalRub, patientDepositRub);
			setAdvanceOffsetAmount(offset);
			setCardAmount(Math.max(0, summary.totalRub - offset));
		} else if (method === "family_all") {
			const offset = Math.min(summary.totalRub, patientFamilyBalanceRub);
			setFamilyWalletAmount(offset);
			setCardAmount(Math.max(0, summary.totalRub - offset));
		}
	};

	const handleMarkingCodeChange = (itemId: string, code: string) => {
		setItemMarkingCodes((prev) => ({
			...prev,
			[itemId]: code,
		}));
	};

	const handleExecuteFiscalization = async () => {
		if (!summary.isFullyAllocated) {
			showToast(`Небаланс оплаты: Сумма оплат должна точно совпадать с итогом (${summary.totalRubFormatted} ₽). Остаток: ${summary.remainingRub.toFixed(2)} ₽`, "error");
			return;
		}

		setIsFiscalizing(true);
		try {
			// Generate composite Idempotency-Key: <uuid>#<sha256(payloadSignature)>
			const rawUuid = crypto.randomUUID();
			const signature = buildFiscalReceiptPayloadSignature({
				patientId,
				operationType: "income",
				taxationSystem: "usn_income",
				totalKopecks: summary.totalKopecks,
				cashKopecks: Math.round(tenders.cashRub * 100),
				electronicCardKopecks: Math.round(tenders.cardRub * 100),
				sbpKopecks: Math.round(tenders.sbpRub * 100),
				prepaidKopecks: Math.round((tenders.advanceOffsetRub + (tenders.familyWalletRub || 0) + tenders.certificateRub) * 100),
				items: currentItems.map((it) => ({
					name: it.name,
					priceKopecks: Math.round(it.priceRub * 100),
					quantity: it.quantity,
					amountKopecks: Math.round((it.priceRub * it.quantity - (it.discountRub || 0)) * 100),
					subject: it.subject,
					method: it.method,
					vatRate: it.vatRate,
					measure: it.measure,
					markingCode: it.markingCode || null,
					medicalServiceCode804n: it.code804n || null,
				})),
			});
			const compositeIdempotencyKey = createFiscalCompositeIdempotencyKey(rawUuid, signature);

			const payload = {
				clientMutationId: compositeIdempotencyKey,
				patientId,
				customerContact,
				cashierFullName,
				operationType: "income",
				taxationSystem: "usn_income",
				totalKopecks: summary.totalKopecks,
				cashKopecks: Math.round(tenders.cashRub * 100),
				electronicCardKopecks: Math.round(tenders.cardRub * 100),
				sbpKopecks: Math.round(tenders.sbpRub * 100),
				prepaidKopecks: Math.round((tenders.advanceOffsetRub + (tenders.familyWalletRub || 0) + tenders.certificateRub) * 100),
				items: currentItems.map((it) => ({
					name: it.name,
					priceKopecks: Math.round(it.priceRub * 100),
					quantity: it.quantity,
					amountKopecks: Math.round((it.priceRub * it.quantity - (it.discountRub || 0)) * 100),
					medicalServiceCode804n: it.code804n || null,
					subject: it.subject,
					method: it.method,
					vatRate: it.vatRate,
					measure: it.measure,
					markingCode: it.markingCode || null,
					taxDeductionCode: it.taxDeductionCategory === "2" ? "code_2_expensive_treatment" : "code_1_standard_treatment",
				})),
				taxDeductionSummaryCode: summary.overallTaxDeductionCategory === "2" ? "code_2_expensive_treatment" : "code_1_standard_treatment",
			};

			const response = await fetch("/api/fiscal/receipts", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": compositeIdempotencyKey,
				}),
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || "Ошибка фискализации чека");
			}

			const result = await response.json();
			showToast(`Чек успешно фискализирован: ФД №${result.fiscalDocumentNumber || "1"} · ФПД ${result.fiscalSign || "0"}`, "success");

			onReceiptFiscalized?.(result);
			onClose();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Не удалось отправить чек на кассу";
			showToast(`Ошибка фискализации: ${message}`, "error");
		} finally {
			setIsFiscalizing(false);
		}
	};

	const handleCopyActData = () => {
		const lines = [
			`АКТ № ${actNumber} СДАЧИ-ПРИЕМКИ ВЫПОЛНЕННЫХ СТОМАТОЛОГИЧЕСКИХ РАБОТ (ОКАЗАННЫХ УСЛУГ)`,
			`Дата: ${new Date().toLocaleDateString("ru-RU")}`,
			`К договору оказания платных медицинских услуг: № ${contractNumber}`,
			`Исполнитель: ${clinicName}`,
			`Пациент (Заказчик): ${patientName}`,
			``,
			`ОКАЗАННЫЕ МЕДИЦИНСКИЕ УСЛУГИ:`,
			...currentItems.map((it, i) => {
				const toothPart = it.toothFdiNumber ? ` [Зуб ${it.toothFdiNumber}]` : "";
				const codePart = it.code804n ? ` (${it.code804n})` : "";
				const qty = it.quantity || 1;
				const sum = it.priceRub * qty - (it.discountRub || 0);
				return `${i + 1}. ${it.name}${codePart}${toothPart} — ${qty} шт. × ${it.priceRub.toFixed(2)} ₽ = ${sum.toFixed(2)} ₽`;
			}),
			``,
			`ИТОГО ОКАЗАНО УСЛУГ: ${summary.totalRubFormatted} ₽`,
			`Сумма прописью: ${numberToWordsRu(summary.totalRub)}`,
			``,
			`УСЛОВИЯ ПРИЕМКИ:`,
			`Вышеперечисленные медицинские услуги выполнены в полном объеме, надлежащего качества и в установленные сроки.`,
			`Заказчик претензий по объему, качеству и срокам оказания услуг к Исполнителю не имеет.`,
			``,
			`Исполнитель: _________________ / ${cashierFullName}`,
			`Заказчик:    _________________ / ${patientName}`,
		];
		navigator.clipboard.writeText(lines.join("\n"));
		showToast("Текст Акта выполненных работ скопирован в буфер!", "success", 2500);
	};

	const certPaymentItems: TaxDeductionPaymentItem[] = useMemo(() => {
		return currentItems.map((it, idx) => ({
			id: it.id || `pay-${idx}`,
			dateIso: new Date().toISOString(),
			receiptNumber: `00${idx + 1}`,
			fiscalDocumentNumber: `${100 + idx + 1}`,
			fiscalSign: "3920194821",
			serviceName: it.name,
			code804n: it.code804n || undefined,
			amountRub: it.priceRub * (it.quantity || 1) - (it.discountRub || 0),
			taxCode: it.taxDeductionCategory || (it.name.toLowerCase().includes("имплант") ? "2" : "1"),
		}));
	}, [currentItems]);

	const taxDeductionSummary = useMemo(() => {
		return calculateTaxDeductionSummary(certPaymentItems);
	}, [certPaymentItems]);

	const handleDownloadXml = () => {
		downloadFnsTaxXmlFile({
			certificateNumber: actNumber.replace(/\D/g, "") || "101",
			issueDateIso: new Date().toISOString(),
			taxYear,
			taxOfficeCode: "7701",
			clinic: {
				legalName: clinicName,
				inn: clinicInn,
				kpp: "770101001",
				ogrn: "1027700132195",
				licenseNumber: "ЛО41-01137-77/00123456",
				licenseDate: "15.02.2021",
				address: "г. Москва, ул. Стоматологическая, д. 10",
				chiefDoctorName: cashierFullName,
			},
			payer: {
				fullName: payerFullName,
				inn: payerInn || "500100732259",
				birthDate: "1985-05-12",
				identityDocumentSeries: "4510",
				identityDocumentNumber: "123456",
				relationship: payerRelationship,
			},
			patient: {
				fullName: patientName,
				birthDate: "1985-05-12",
				inn: payerInn || undefined,
			},
			payments: certPaymentItems,
		});
		showToast("XML справки 824@ успешно выгружен для ФНС!", "success");
	};

	const handleCopyCertData = () => {
		const yrSummary = taxDeductionSummary.yearsSummary[0] || {
			code01Rub: 0,
			code02Rub: 0,
			totalRub: summary.totalRub,
			refund13EstimateRub: Math.round(summary.totalRub * 0.13),
		};
		const text = `СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ ДЛЯ ФНС (КНД 1151156)
Номер: ${actNumber.replace(/\D/g, "") || "101"}
Клиника: ${clinicName} (ИНН ${clinicInn})
Налогоплательщик: ${payerFullName}
Пациент: ${patientName}
Налоговый период: ${taxYear} год
Сумма по Коду 01 (Стандартное лечение): ${yrSummary.code01Rub.toLocaleString("ru-RU")} ₽
Сумма по Коду 02 (Дорогостоящее лечение): ${yrSummary.code02Rub.toLocaleString("ru-RU")} ₽
ИТОГО к вычету: ${yrSummary.totalRub.toLocaleString("ru-RU")} ₽
Оценка возврата НДФЛ (13%): ${yrSummary.refund13EstimateRub.toLocaleString("ru-RU")} ₽`;
		navigator.clipboard.writeText(text);
		showToast("Данные справки скопированы в буфер обмена!", "success", 2500);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
			<div
				className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden"
				data-testid="fiscal-54fz-modal"
			>
				{/* Modal Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
							<Receipt className="w-6 h-6" />
						</div>
						<div>
							<h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
								{activeTab === "act"
									? "Акт сдачи-приемки работ (804н)"
									: activeTab === "certificate"
										? "Справка для налоговой (КНД 1151156)"
										: activeTab === "preview"
											? "Предпросмотр фискального чека"
											: "Быстрая касса & 54-ФЗ (ФФД 1.2)"}
								<span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
									Online ККТ
								</span>
							</h2>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								{distinctFamilyPatients.length > 1 ? "Плательщик:" : "Пациент:"} <span className="font-semibold text-slate-700 dark:text-slate-300">{patientName}</span>
								{patientDepositRub > 0 && (
									<span className="ml-2 text-blue-600 dark:text-blue-400">
										· Депозит: {patientDepositRub.toLocaleString("ru-RU")} ₽
									</span>
								)}
								{patientFamilyBalanceRub > 0 && (
									<span className="ml-2 text-purple-600 dark:text-purple-400">
										· Семья: {patientFamilyBalanceRub.toLocaleString("ru-RU")} ₽
									</span>
								)}
							</p>
							{distinctFamilyPatients.length > 1 && (
								<div className="flex flex-wrap items-center gap-1.5 mt-1.5">
									<span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
										Семья ({distinctFamilyPatients.length}):
									</span>
									{distinctFamilyPatients.map((member) => (
										<span
											key={member.fullName}
											className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
										>
											{member.fullName}{member.role ? ` (${member.role})` : ""} — <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{member.totalRub.toLocaleString("ru-RU")} ₽</span>
										</span>
									))}
								</div>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2">
						<div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
							<button
								type="button"
								onClick={() => setActiveTab("split")}
								className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
									activeTab === "split"
										? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
								}`}
							>
								Оплата 54-ФЗ
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("act")}
								className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
									activeTab === "act"
										? "bg-emerald-600 text-white shadow-sm"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
								}`}
							>
								Акт работ (804н)
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("certificate")}
								className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
									activeTab === "certificate"
										? "bg-indigo-600 text-white shadow-sm"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
								}`}
							>
								Справка ФНС
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("preview")}
								className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
									activeTab === "preview"
										? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
								}`}
							>
								Вид чека
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
							aria-label="Закрыть"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Modal Body */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{activeTab === "split" ? (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
							{/* Left Column: Tenders & 1-Click Fast Allocators */}
							<div className="lg:col-span-7 space-y-5">
								{/* 1-Click Fast Documentation Bar for Front Desk */}
								<div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex flex-wrap items-center justify-between gap-2.5">
									<div className="flex items-center gap-2 text-xs font-bold text-teal-900 dark:text-teal-100">
										<FileCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
										<span>1-Click Документы при закрытии визита:</span>
									</div>
									<div className="flex items-center gap-2 flex-wrap">
										<button
											type="button"
											onClick={() => setActiveTab("act")}
											className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
											title="1-Клик: Сформировать и распечатать Акт выполненных работ"
										>
											<FileText className="w-4 h-4" />
											<span>Акт выполненных работ</span>
										</button>
										<button
											type="button"
											onClick={() => setActiveTab("certificate")}
											className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-indigo-500/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/15 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
											title="1-Клик: Сформировать и распечатать Справку для налоговой КНД 1151156"
										>
											<FileCheck className="w-4 h-4" />
											<span>Справка КНД 1151156</span>
										</button>
									</div>
								</div>
								{/* 1-Click Fast Actions */}
								<div>
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
										1-Click Способ оплаты (100% чека)
									</label>
									<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
										<button
											type="button"
											onClick={() => handleOneClickMethod("card")}
											className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-white dark:bg-slate-800/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-slate-700 dark:text-slate-200 transition-all text-center cursor-pointer active:scale-95"
										>
											<CreditCard className="w-5 h-5 text-blue-600" />
											<span className="text-xs font-bold">100% Картой</span>
										</button>
										<button
											type="button"
											onClick={() => handleOneClickMethod("cash")}
											className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-slate-800/80 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-slate-700 dark:text-slate-200 transition-all text-center cursor-pointer active:scale-95"
										>
											<Banknote className="w-5 h-5 text-emerald-600" />
											<span className="text-xs font-bold">100% Наличные</span>
										</button>
										<button
											type="button"
											onClick={() => handleOneClickMethod("sbp")}
											className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 bg-white dark:bg-slate-800/80 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-slate-700 dark:text-slate-200 transition-all text-center cursor-pointer active:scale-95"
										>
											<QrCode className="w-5 h-5 text-purple-600" />
											<span className="text-xs font-bold">100% СБП QR</span>
										</button>
										<button
											type="button"
											onClick={() => handleOneClickMethod("deposit_all")}
											disabled={patientDepositRub <= 0}
											className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-white dark:bg-slate-800/80 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-200 transition-all text-center cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
										>
											<Wallet className="w-5 h-5 text-indigo-600" />
											<span className="text-xs font-bold">Депозит</span>
										</button>
										<button
											type="button"
											onClick={() => handleOneClickMethod("family_all")}
											disabled={patientFamilyBalanceRub <= 0}
											className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-pink-500 bg-white dark:bg-slate-800/80 hover:bg-pink-50/50 dark:hover:bg-pink-950/20 text-slate-700 dark:text-slate-200 transition-all text-center cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
										>
											<Users className="w-5 h-5 text-pink-600" />
											<span className="text-xs font-bold">Семья</span>
										</button>
									</div>
								</div>

								{/* Multi-Tender Inputs */}
								<div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
										Разделение сумм по видам оплат (рубли)
									</label>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-1">
												<CreditCard className="w-3.5 h-3.5 text-blue-500" /> Банковская карта (Тег 1081)
											</span>
											<input
												type="number"
												min={0}
												step="0.01"
												value={cardAmount || ""}
												onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
												className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
												placeholder="0.00 ₽"
											/>
										</div>

										<div>
											<span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-1">
												<Banknote className="w-3.5 h-3.5 text-emerald-500" /> Наличные (Тег 1031)
											</span>
											<input
												type="number"
												min={0}
												step="0.01"
												value={cashAmount || ""}
												onChange={(e) => {
													const val = parseFloat(e.target.value) || 0;
													setCashAmount(val);
													if (receivedCashRub < val) {
														setReceivedCashRub(val);
													}
												}}
												className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
												placeholder="0.00 ₽"
											/>
										</div>

										<div>
											<span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-1">
												<QrCode className="w-3.5 h-3.5 text-purple-500" /> СБП QR / SberPay (Тег 1081)
											</span>
											<input
												type="number"
												min={0}
												step="0.01"
												value={sbpAmount || ""}
												onChange={(e) => setSbpAmount(parseFloat(e.target.value) || 0)}
												className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
												placeholder="0.00 ₽"
											/>
										</div>

										<div>
											<span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-1">
												<Wallet className="w-3.5 h-3.5 text-indigo-500" /> Зачет аванса / депозита (Тег 1215)
											</span>
											<input
												type="number"
												min={0}
												step="0.01"
												value={advanceOffsetAmount || ""}
												onChange={(e) => setAdvanceOffsetAmount(parseFloat(e.target.value) || 0)}
												className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
												placeholder="0.00 ₽"
											/>
										</div>

										{patientFamilyBalanceRub > 0 && (
											<div>
												<span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-1">
													<Users className="w-3.5 h-3.5 text-pink-500" /> Семейный счет (Тег 1215)
												</span>
												<input
													type="number"
													min={0}
													step="0.01"
													value={familyWalletAmount || ""}
													onChange={(e) => setFamilyWalletAmount(parseFloat(e.target.value) || 0)}
													className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-pink-500 focus:outline-none"
													placeholder="0.00 ₽"
												/>
											</div>
										)}

										<div>
											<span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-1">
												<Gift className="w-3.5 h-3.5 text-amber-500" /> Сертификат (Тег 1215)
											</span>
											<input
												type="number"
												min={0}
												step="0.01"
												value={certificateAmount || ""}
												onChange={(e) => setCertificateAmount(parseFloat(e.target.value) || 0)}
												className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
												placeholder="0.00 ₽"
											/>
										</div>
									</div>
								</div>

								{/* Быстрая касса: Расчет сдачи при оплате наличными */}
								{cashAmount > 0 && (
									<div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
												<Coins className="w-4 h-4 text-emerald-600" />
												Моментальный расчет сдачи
											</span>
											{summary.changeRub > 0 && (
												<span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-emerald-600 text-white">
													Сдача: {summary.changeRub.toLocaleString("ru-RU")} ₽
												</span>
											)}
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
											<div>
												<label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
													Получено от пациента (рубли):
												</label>
												<input
													type="number"
													min={0}
													step="1"
													value={receivedCashRub || ""}
													onChange={(e) => setReceivedCashRub(parseFloat(e.target.value) || 0)}
													className="w-full px-3 py-2 text-base font-black font-mono bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-emerald-950 dark:text-emerald-200"
													placeholder={`${cashAmount} ₽`}
												/>
											</div>

											{/* Быстрые купюры */}
											<div className="space-y-1">
												<span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
													Быстрые купюры:
												</span>
												<div className="flex flex-wrap gap-1.5">
													<button
														type="button"
														onClick={() => setReceivedCashRub(cashAmount)}
														className="px-2 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-800 dark:text-slate-200 cursor-pointer"
													>
														Без сдачи
													</button>
													{cashPresets.map((preset) => (
														<button
															key={preset}
															type="button"
															onClick={() => setReceivedCashRub(preset)}
															className="px-2 py-1 text-xs font-bold font-mono rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-800 dark:text-slate-200 cursor-pointer"
														>
															{preset.toLocaleString("ru-RU")} ₽
														</button>
													))}
												</div>
											</div>
										</div>

										{summary.isCashShortage && (
											<div className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
												<AlertTriangle className="w-3.5 h-3.5" />
												Внесенной суммы не хватает (недобор: {summary.cashShortageRub.toLocaleString("ru-RU")} ₽)
											</div>
										)}
									</div>
								)}

								{/* Electronic Delivery Contact */}
								<div>
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
										Контакты для электронного чека (Тег 1008 — SMS / Email)
									</label>
									<input
										type="text"
										value={customerContact}
										onChange={(e) => setCustomerContact(e.target.value)}
										placeholder="+79991234567 или patient@example.com"
										className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
									/>
								</div>
							</div>

							{/* Right Column: Positions Review & DataMatrix Scanner Input */}
							<div className="lg:col-span-5 space-y-4">
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
										Номенклатура ({currentItems.length})
									</label>
									{summary.overallTaxDeductionCategory === "2" && (
										<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
											Код 02 (Дорогостоящее)
										</span>
									)}
								</div>

								<div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
									{currentItems.map((it, idx) => {
										const isMarked = Boolean(it.markingCode || it.name.toLowerCase().includes("анестетик") || it.name.toLowerCase().includes("имплант"));
										return (
											<div
												key={it.id || idx}
												className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5"
											>
												{it.patientFullName && distinctFamilyPatients.length > 1 && (
													<div className="flex items-center gap-1">
														<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
															Пациент: {it.patientFullName}{it.familyMemberRole ? ` (${it.familyMemberRole})` : ""}
														</span>
													</div>
												)}
												<div className="flex justify-between items-start text-xs font-bold text-slate-900 dark:text-slate-100">
													<span className="line-clamp-1">{idx + 1}. {it.name}</span>
													<span className="font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap ml-2">
														{(it.priceRub * it.quantity).toFixed(2)} ₽
													</span>
												</div>

												{isMarked && (
													<div className="pt-1">
														<div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 mb-1">
															<Tag className="w-3 h-3 text-emerald-500" />
															<span>Код маркировки DataMatrix:</span>
														</div>
														<input
															type="text"
															value={itemMarkingCodes[it.id] ?? it.markingCode ?? ""}
															onChange={(e) => handleMarkingCodeChange(it.id, e.target.value)}
															placeholder="Отсканируйте DataMatrix (01)0366... "
															className="w-full px-2.5 py-1 text-[11px] font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
														/>
													</div>
												)}
											</div>
										);
									})}
								</div>

								{/* Parity & Totals Card */}
								<div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
									<div className="flex justify-between text-xs text-slate-400">
										<span>Итого по чеку:</span>
										<span className="font-bold text-white text-sm">{summary.totalRubFormatted} ₽</span>
									</div>
									<div className="flex justify-between text-xs text-slate-400">
										<span>Распределено:</span>
										<span className="font-bold text-emerald-400 text-sm">{summary.allocatedRub.toFixed(2)} ₽</span>
									</div>
									<div className="border-t border-slate-800 pt-2 flex justify-between items-center text-xs">
										<span>Баланс:</span>
										{summary.isFullyAllocated ? (
											<span className="flex items-center gap-1 text-emerald-400 font-bold">
												<CheckCircle2 className="w-4 h-4" /> Точно (0.00 ₽)
											</span>
										) : summary.isOverallocated ? (
											<span className="flex items-center gap-1 text-rose-400 font-bold">
												<AlertCircle className="w-4 h-4" /> Переплата (+{Math.abs(summary.remainingRub).toFixed(2)} ₽)
											</span>
										) : (
											<span className="flex items-center gap-1 text-amber-400 font-bold">
												<AlertTriangle className="w-4 h-4" /> Не хватает ({summary.remainingRub.toFixed(2)} ₽)
											</span>
										)}
									</div>
								</div>
							</div>
						</div>
					) : activeTab === "act" ? (
						<div className="space-y-6">
							{/* Act Controls */}
							<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
								<h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
									<FileText className="w-4 h-4 text-emerald-600" />
									Реквизиты Акта сдачи-приемки выполненных стоматологических работ:
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
									<div>
										<label className="block text-xs font-semibold text-slate-500 mb-1">
											Номер акта:
										</label>
										<input
											type="text"
											value={actNumber}
											onChange={(e) => setActNumber(e.target.value)}
											className="w-full min-h-[44px] px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold text-slate-500 mb-1">
											К договору №:
										</label>
										<input
											type="text"
											value={contractNumber}
											onChange={(e) => setContractNumber(e.target.value)}
											className="w-full min-h-[44px] px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold text-slate-500 mb-1">
											Кассир-администратор:
										</label>
										<input
											type="text"
											value={cashierFullName}
											readOnly
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
										/>
									</div>
								</div>
							</div>

							{/* Printable Act Preview Paper */}
							<div className="p-6 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-sm space-y-4 font-serif select-text">
								<div className="text-center space-y-1 border-b border-slate-300 pb-3">
									<h2 className="text-base sm:text-lg font-bold font-sans tracking-wide uppercase">
										АКТ № {actNumber}
									</h2>
									<p className="text-xs font-sans text-slate-600">
										сдачи-приемки выполненных стоматологических работ (оказанных медицинских услуг)
									</p>
									<p className="text-xs font-sans font-semibold text-slate-700">
										к Договору на оказание платных медицинских услуг № {contractNumber} от {new Date().toLocaleDateString("ru-RU")} г.
									</p>
								</div>

								<div className="text-xs space-y-1 text-slate-800 font-sans">
									<p>
										<strong>Исполнитель:</strong> {clinicName}, ИНН {clinicInn}, КПП 770101001, Лицензия ЛО41-01137-77/00123456
									</p>
									<p>
										<strong>Заказчик (Пациент):</strong> {patientName}, тел. {customerContact}
									</p>
									<p className="pt-1 leading-relaxed">
										Мы, нижеподписавшиеся, Исполнитель в лице {cashierFullName}, с одной стороны, и Пациент (Заказчик) {patientName}, с другой стороны, составили настоящий Акт о том, что Исполнителем были фактически оказаны, а Заказчиком приняты следующие медицинские услуги:
									</p>
								</div>

								{/* Items Table */}
								<div className="overflow-x-auto">
									<table className="w-full text-xs font-sans border-collapse border border-slate-400">
										<thead>
											<tr className="bg-slate-100 text-slate-800 font-bold text-center">
												<th className="border border-slate-400 p-2 w-8">№</th>
												<th className="border border-slate-400 p-2 w-28">Код 804н</th>
												<th className="border border-slate-400 p-2 text-left">Наименование медицинской услуги</th>
												<th className="border border-slate-400 p-2 w-14">Зуб</th>
												<th className="border border-slate-400 p-2 w-14">Кол-во</th>
												<th className="border border-slate-400 p-2 w-24 text-right">Цена (руб.)</th>
												<th className="border border-slate-400 p-2 w-24 text-right">Сумма (руб.)</th>
											</tr>
										</thead>
										<tbody>
											{currentItems.map((it, idx) => {
												const qty = it.quantity || 1;
												const sum = it.priceRub * qty - (it.discountRub || 0);
												return (
													<tr key={it.id || idx} className="hover:bg-slate-50">
														<td className="border border-slate-400 p-2 text-center">{idx + 1}</td>
														<td className="border border-slate-400 p-2 font-mono text-center text-[11px]">{it.code804n || "—"}</td>
														<td className="border border-slate-400 p-2">{it.name}</td>
														<td className="border border-slate-400 p-2 text-center font-bold">{it.toothFdiNumber || "—"}</td>
														<td className="border border-slate-400 p-2 text-center">{qty}</td>
														<td className="border border-slate-400 p-2 text-right font-mono">{it.priceRub.toFixed(2)} ₽</td>
														<td className="border border-slate-400 p-2 text-right font-mono font-bold">{sum.toFixed(2)} ₽</td>
													</tr>
												);
											})}
										</tbody>
										<tfoot>
											<tr className="bg-slate-100 font-bold">
												<td colSpan={6} className="border border-slate-400 p-2 text-right uppercase">Итого к оплате:</td>
												<td className="border border-slate-400 p-2 text-right font-mono font-extrabold text-sm">{summary.totalRubFormatted} ₽</td>
											</tr>
										</tfoot>
									</table>
								</div>

								{/* Amount in words */}
								<div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-sans space-y-1">
									<p>
										<strong>Всего оказано услуг:</strong> {currentItems.length} на сумму <strong>{summary.totalRubFormatted} ₽</strong>
									</p>
									<p>
										<strong>Сумма прописью:</strong> <em>{numberToWordsRu(summary.totalRub)}</em>
									</p>
								</div>

								{/* Guarantee and Quality Statement */}
								<div className="text-[11px] text-slate-700 font-sans space-y-1 pt-1 leading-relaxed">
									<p>
										Вышеперечисленные медицинские услуги выполнены в полном объеме, надлежащего качества и в установленные сроки согласно стандартам медицинской помощи и клиническим рекомендациям Минздрава РФ (ст. 779 ГК РФ, Постановление Правительства РФ № 736). Заказчик претензий по объему, качеству и срокам оказания услуг к Исполнителю не имеет.
									</p>
								</div>

								{/* Signatures */}
								<div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300 text-xs font-sans">
									<div className="space-y-4">
										<p className="font-bold">Исполнитель:</p>
										<p className="text-slate-600">{clinicName}</p>
										<div className="pt-4 border-b border-slate-400 flex justify-between items-end">
											<span>Подпись / М.П.:</span>
											<span className="font-bold">/ {cashierFullName} /</span>
										</div>
									</div>
									<div className="space-y-4">
										<p className="font-bold">Заказчик (Пациент):</p>
										<p className="text-slate-600">{patientName}</p>
										<div className="pt-4 border-b border-slate-400 flex justify-between items-end">
											<span>Подпись:</span>
											<span className="font-bold">/ {patientName} /</span>
										</div>
									</div>
								</div>
							</div>

							{/* Actions: Copy & Print */}
							<div className="flex flex-wrap gap-3">
								<button
									type="button"
									onClick={handleCopyActData}
									className="min-h-[44px] px-5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
								>
									<Copy className="w-4 h-4" />
									<span>Скопировать текст Акта</span>
								</button>
								<button
									type="button"
									onClick={() => window.print()}
									className="min-h-[44px] px-5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 cursor-pointer transition-colors shadow-md"
								>
									<Printer className="w-4 h-4" />
									<span>Печать Акта выполненных работ</span>
								</button>
							</div>
						</div>
					) : activeTab === "certificate" ? (
						<div className="space-y-6">
							{/* Deduction Codes Breakdown */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
									<div className="flex items-center justify-between">
										<span className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono font-bold text-xs">
											КОД 01 — Стандартное лечение
										</span>
										<span className="text-xs text-slate-500">Лимит: 150 000 ₽ / год</span>
									</div>
									<p className="text-xs text-slate-500">
										Терапия, кариес, пульпит, чистка, ортодонтия.
									</p>
									<div className="pt-2 flex justify-between items-baseline border-t border-slate-200 dark:border-slate-700">
										<span className="text-xs text-slate-500">Сумма:</span>
										<span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
											{(taxDeductionSummary.yearsSummary[0]?.code01Rub || 0).toLocaleString("ru-RU")} ₽
										</span>
									</div>
								</div>

								<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
									<div className="flex items-center justify-between">
										<span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs">
											КОД 02 — Дорогостоящее лечение
										</span>
										<span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">БЕЗ ЛИМИТА</span>
									</div>
									<p className="text-xs text-slate-500">
										Дентальная имплантация, костная пластика, синус-лифтинг.
									</p>
									<div className="pt-2 flex justify-between items-baseline border-t border-slate-200 dark:border-slate-700">
										<span className="text-xs text-slate-500">Сумма:</span>
										<span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
											{(taxDeductionSummary.yearsSummary[0]?.code02Rub || 0).toLocaleString("ru-RU")} ₽
										</span>
									</div>
								</div>
							</div>

							{/* Taxpayer / Payer Form */}
							<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
								<h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
									<FileCheck className="w-4 h-4 text-teal-600" />
									Реквизиты справки КНД 1151156 для налогового органа:
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
									<div>
										<label className="block text-xs font-semibold text-slate-500 mb-1">
											Налогоплательщик (ФИО):
										</label>
										<input
											type="text"
											value={payerFullName}
											onChange={(e) => setPayerFullName(e.target.value)}
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold text-slate-500 mb-1">
											ИНН налогоплательщика:
										</label>
										<input
											type="text"
											value={payerInn}
											onChange={(e) => setPayerInn(e.target.value)}
											placeholder="12 цифр"
											className="w-full min-h-[44px] px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold text-slate-500 mb-1">
											Степень родства:
										</label>
										<select
											value={payerRelationship}
											onChange={(e) => setPayerRelationship(e.target.value as TaxDeductionRelationship)}
											className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
										>
											<option value="patient">1 — Пациент лично (за себя)</option>
											<option value="spouse">2 — Супруг / супруга</option>
											<option value="parent">3 — Родитель</option>
											<option value="child">4 — Ребенок / подопечный</option>
										</select>
									</div>
									<div>
										<label className="block text-xs font-semibold text-slate-500 mb-1">
											Налоговый год:
										</label>
										<input
											type="number"
											value={taxYear}
											onChange={(e) => setTaxYear(Number(e.target.value) || new Date().getFullYear())}
											className="w-full min-h-[44px] px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
										/>
									</div>
								</div>
							</div>

							{/* Actions: Copy, Print, XML */}
							<div className="flex flex-wrap gap-3">
								<button
									type="button"
									onClick={handleCopyCertData}
									className="min-h-[44px] px-5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
								>
									<Copy className="w-4 h-4" />
									<span>Скопировать данные</span>
								</button>
								<button
									type="button"
									onClick={handleDownloadXml}
									className="min-h-[44px] px-5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 cursor-pointer transition-colors shadow-md"
								>
									<Download className="w-4 h-4" />
									<span>Выгрузить XML для ФНС</span>
								</button>
								<button
									type="button"
									onClick={() => window.print()}
									className="min-h-[44px] px-5 py-2 rounded-xl font-bold text-xs sm:text-sm bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 cursor-pointer transition-colors shadow-md"
								>
									<Printer className="w-4 h-4" />
									<span>Печать справки КНД 1151156</span>
								</button>
							</div>
						</div>
					) : (
						<div className="py-2">
							<FiscalReceiptPrintView
								clinicName={clinicName}
								clinicInn={clinicInn}
								cashierFullName={cashierFullName}
								customerContact={customerContact}
								patientName={patientName}
								items={currentItems}
								tenders={tenders}
								totalRub={summary.totalRub}
								totalRubFormatted={summary.totalRubFormatted}
							/>
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
					<div className="text-xs text-slate-500 dark:text-slate-400">
						Федеральный закон № 54-ФЗ · Приказ ФНС № ЕД-7-20/662@
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
						>
							Отмена
						</button>

						<button
							type="button"
							onClick={handleExecuteFiscalization}
							disabled={!summary.isFullyAllocated || isFiscalizing}
							className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
						>
							{isFiscalizing ? (
								<>Печать чека на ККТ...</>
							) : (
								<>
									<Printer className="w-4 h-4" />
									Фискализировать и напечатать
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
