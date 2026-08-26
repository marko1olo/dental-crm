/**
 * BankInstallmentQrModal.tsx — 1-клик генератор банковской рассрочки (Сбер / Т-Банк / Подели).
 * 
 * ПОЗВОЛЯЕТ:
 * • Пациенту: мгновенно отсканировать QR-код с экрана врача и оформить рассрочку без первого взноса и переплат (0-0-6 / 0-0-12 / Подели 4 платежа).
 * • Врачу/Администратору: в 1 клик сгенерировать ссылку, отправить СМС или имитировать подтверждение кредитного скоринга для закрытия этапа.
 */

import React, { useMemo, useState } from "react";
import {
	Banknote,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	CreditCard,
	DollarSign,
	ExternalLink,
	HelpCircle,
	MessageSquare,
	Percent,
	QrCode,
	Send,
	ShieldCheck,
	Sparkles,
	Wallet,
	X,
} from "lucide-react";
import { type Kopecks, formatKopecksRu, rublesToKopecks } from "@dental/shared";
import { TreatmentPlanQrCode } from "../treatment-plans/qr/TreatmentPlanQrCode";
import { showToast } from "../GlobalToast";
import {
	type BankInstallmentCalculationResult,
	type BankInstallmentProviderId,
	BANK_INSTALLMENT_PROVIDERS,
	calculateBankInstallment,
	generateBankInstallmentDeepLink,
	simulateBankApproval,
} from "./bankInstallmentEngine";
import "./bankInstallment.css";

export interface BankInstallmentQrModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly stageTitle?: string;
	readonly stageNumber?: number;
	readonly stageAmountKopecks: Kopecks;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly patientPhone?: string;
	readonly clinicName?: string;
	readonly clinicInn?: string;
	readonly planId?: string;
	readonly onInstallmentApproved?: (approval: {
		readonly providerId: BankInstallmentProviderId;
		readonly approvalId: string;
		readonly approvedAmountKopecks: Kopecks;
		readonly monthlyPaymentRub: number;
	}) => void;
}

export const BankInstallmentQrModal: React.FC<BankInstallmentQrModalProps> = ({
	isOpen,
	onClose,
	stageTitle = "Комплексный этап лечения",
	stageNumber,
	stageAmountKopecks,
	patientId = "pat-1001",
	patientName = "Иванов Иван Иванович",
	patientPhone = "+7 (999) 000-00-00",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "7701234567",
	planId,
	onInstallmentApproved,
}) => {
	const [selectedProvider, setSelectedProvider] = useState<BankInstallmentProviderId>("sberbank");
	const [selectedTerm, setSelectedTerm] = useState<number>(12);
	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [isSmsSent, setIsSmsSent] = useState<boolean>(false);
	const [isApprovedState, setIsApprovedState] = useState<boolean>(false);

	const activeProviderConfig = BANK_INSTALLMENT_PROVIDERS[selectedProvider];

	// Расчет параметров рассрочки
	const calculation: BankInstallmentCalculationResult = useMemo(() => {
		return calculateBankInstallment(stageAmountKopecks, selectedProvider, selectedTerm);
	}, [stageAmountKopecks, selectedProvider, selectedTerm]);

	// Генерация deep-link и QR-кода
	const linkData = useMemo(() => {
		return generateBankInstallmentDeepLink({
			providerId: selectedProvider,
			amountRub: calculation.totalRub,
			stageTitle,
			stageNumber,
			patientId,
			patientName,
			patientPhone,
			clinicInn,
			clinicName,
			planId,
			termMonths: selectedTerm,
		});
	}, [
		selectedProvider,
		calculation.totalRub,
		stageTitle,
		stageNumber,
		patientId,
		patientName,
		patientPhone,
		clinicInn,
		clinicName,
		planId,
		selectedTerm,
	]);

	if (!isOpen) return null;

	const handleProviderChange = (providerId: BankInstallmentProviderId) => {
		setSelectedProvider(providerId);
		const cfg = BANK_INSTALLMENT_PROVIDERS[providerId];
		setSelectedTerm(cfg.defaultTermMonths);
		setIsApprovedState(false);
	};

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(linkData.deepLinkUrl);
			setIsCopied(true);
			showToast("Ссылка на банковскую рассрочку скопирована в буфер обмена", "success");
			setTimeout(() => setIsCopied(false), 2500);
		} catch {
			showToast("Не удалось скопировать ссылку", "error");
		}
	};

	const handleSendSms = () => {
		setIsSmsSent(true);
		showToast(
			`СМС со ссылкой на оформление рассрочки успешно отправлено на номер ${patientPhone}!`,
			"success",
			4000,
		);
		setTimeout(() => setIsSmsSent(false), 4000);
	};

	const handleSimulateApproval = () => {
		const approval = simulateBankApproval(
			stageAmountKopecks,
			selectedProvider,
			patientName,
			selectedTerm,
		);
		setIsApprovedState(true);
		showToast(approval.confirmationMessageRu, "success", 5000);
		if (onInstallmentApproved) {
			onInstallmentApproved({
				providerId: selectedProvider,
				approvalId: approval.approvalId,
				approvedAmountKopecks: approval.approvedAmountKopecks,
				monthlyPaymentRub: approval.monthlyPaymentRub,
			});
		}
	};

	return (
		<div
			className="bank-installment-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="bank-installment-title"
			data-testid="bank-installment-modal"
		>
			<div className="bank-installment-container">
				{/* Modal Header */}
				<header className="bank-installment-header">
					<div className="flex items-center gap-3">
						<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal,var(--brand-primary))]/20">
							<CreditCard className="h-6 w-6" />
						</div>
						<div>
							<h3
								id="bank-installment-title"
								className="text-base font-bold text-[var(--ink,#0f172a)] flex items-center gap-2 m-0"
							>
								Оформление банковской рассрочки
								<span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
									0% переплат
								</span>
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
								{patientName} · {stageTitle} (
								<strong className="text-[var(--ink,#0f172a)]">
									{formatKopecksRu(stageAmountKopecks)}
								</strong>
								)
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
						aria-label="Закрыть"
						data-testid="bank-installment-close-btn"
					>
						<X className="h-5 w-5" />
					</button>
				</header>

				{/* Modal Body */}
				<div className="p-6 space-y-5 text-xs text-[var(--ink,#0f172a)] max-h-[80vh] overflow-y-auto">
					{/* Banking Partner Selector Tabs */}
					<div className="space-y-2">
						<span className="font-bold text-[var(--ink,#0f172a)] block">
							Выберите банк-партнер:
						</span>
						<div className="flex flex-wrap items-center gap-2">
							{(Object.keys(BANK_INSTALLMENT_PROVIDERS) as BankInstallmentProviderId[]).map(
								(pId) => {
									const p = BANK_INSTALLMENT_PROVIDERS[pId];
									const isActive = selectedProvider === pId;
									return (
										<button
											key={pId}
											type="button"
											onClick={() => handleProviderChange(pId)}
											className={`bank-provider-tab ${isActive ? "active" : ""}`}
											data-testid={`provider-tab-${pId}`}
										>
											<div
												className="w-2.5 h-2.5 rounded-full"
												style={{ backgroundColor: p.logoColor }}
											/>
											<span>{p.name}</span>
										</button>
									);
								},
							)}
						</div>
					</div>

					{/* Term Selector */}
					{activeProviderConfig.availableTermsMonths.length > 1 && (
						<div className="space-y-2">
							<span className="font-bold text-[var(--ink,#0f172a)] block">
								Срок рассрочки:
							</span>
							<div className="flex flex-wrap items-center gap-2">
								{activeProviderConfig.availableTermsMonths.map((m) => (
									<button
										key={m}
										type="button"
										onClick={() => setSelectedTerm(m)}
										className={`bank-term-chip ${selectedTerm === m ? "active" : ""}`}
										data-testid={`term-chip-${m}`}
									>
										{m} {m === 3 ? "месяца" : "месяцев"}
									</button>
								))}
							</div>
						</div>
					)}

					{/* Main QR Code & Payment Breakdown Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
						{/* QR Code Presentation Box */}
						<div className="qr-display-box space-y-3" data-testid="bank-installment-qr-box">
							<div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
								<QrCode size={15} className="text-[var(--teal,var(--brand-primary))]" />
								<span>Сканируйте камерой телефона</span>
							</div>

							<div className="p-2 rounded-xl bg-white border border-slate-200 shadow-inner">
								<TreatmentPlanQrCode
									value={linkData.qrPayload}
									size={170}
									title="QR-код для оформления банковской рассрочки"
								/>
							</div>

							<p className="text-[11px] text-center text-[var(--muted,#64748b)] max-w-xs leading-snug">
								Пациент открывает приложение {activeProviderConfig.name} и подтверждает рассрочку
								без документов.
							</p>

							{/* Actions: Copy & SMS */}
							<div className="flex items-center gap-2 w-full pt-1">
								<button
									type="button"
									onClick={handleCopyLink}
									className="min-h-[44px] flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--paper-soft,#f8fafc)] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] transition cursor-pointer"
									data-testid="copy-installment-link-btn"
								>
									{isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
									<span>{isCopied ? "Скопировано" : "Копировать"}</span>
								</button>

								<button
									type="button"
									onClick={handleSendSms}
									className="min-h-[44px] flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--paper-soft,#f8fafc)] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] transition cursor-pointer"
									data-testid="send-installment-sms-btn"
								>
									{isSmsSent ? <Check size={14} className="text-emerald-500" /> : <Send size={14} />}
									<span>{isSmsSent ? "Отправлено" : "СМС на телефон"}</span>
								</button>
							</div>
						</div>

						{/* Payment Calculation Summary Card */}
						<div className="space-y-4">
							<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-xs text-[var(--muted,#64748b)]">Сумма этапа:</span>
									<strong className="text-sm text-[var(--ink,#0f172a)] font-mono">
										{calculation.totalRub.toLocaleString("ru-RU")} ₽
									</strong>
								</div>

								<div className="flex items-center justify-between pb-2 border-b border-[var(--border,#cbd5e1)]">
									<span className="text-xs text-[var(--muted,#64748b)]">Переплата:</span>
									<span className="font-bold text-emerald-600 dark:text-emerald-400">
										0 ₽ (0%)
									</span>
								</div>

								<div className="flex items-baseline justify-between pt-1">
									<div>
										<span className="text-xs font-bold text-[var(--ink,#0f172a)] block">
											{selectedProvider === "podeli"
												? "Платеж раз в 2 недели:"
												: "Ежемесячный платеж:"}
										</span>
										<span className="text-[11px] text-[var(--muted,#64748b)]">
											{selectedProvider === "podeli"
												? "4 равных части по 25%"
												: `На ${calculation.termMonths} мес`}
										</span>
									</div>
									<div className="text-right">
										<span className="text-xl font-black text-[var(--teal-dark,var(--brand-primary))] font-mono">
											{calculation.monthlyPaymentRub.toLocaleString("ru-RU")} ₽
										</span>
										<span className="text-[11px] text-[var(--muted,#64748b)] block">
											{selectedProvider === "podeli" ? "/ 2 нед." : "/ мес."}
										</span>
									</div>
								</div>
							</div>

							{/* Provider Advantages */}
							<div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
								<div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-200">
									<Sparkles size={14} className="text-emerald-600" />
									<span>Преимущества {activeProviderConfig.name}:</span>
								</div>
								<ul className="space-y-1 text-emerald-900/80 dark:text-emerald-300 text-[11px] pl-4 list-disc">
									{activeProviderConfig.advantages.map((adv, idx) => (
										<li key={idx}>{adv}</li>
									))}
								</ul>
							</div>
						</div>
					</div>

					{/* Payment Schedule Breakdown */}
					<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] p-4 space-y-2">
						<span className="font-bold text-xs text-[var(--ink,#0f172a)] block">
							График списаний:
						</span>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
							{calculation.schedule.slice(0, 4).map((item) => (
								<div
									key={item.paymentNumber}
									className="p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)]"
								>
									<span className="text-[10px] text-[var(--muted,#64748b)] block truncate">
										{item.dueDateText}
									</span>
									<strong className="text-xs font-mono text-[var(--ink,#0f172a)] block mt-0.5">
										{item.amountRub.toLocaleString("ru-RU")} ₽
									</strong>
								</div>
							))}
						</div>
					</div>

					{/* Bank Approval State Banner or Action */}
					{isApprovedState ? (
						<div
							className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-3"
							data-testid="installment-approved-banner"
						>
							<div className="flex items-center gap-2.5">
								<CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
								<div>
									<h4 className="font-bold text-sm">Рассрочка одобрена банком!</h4>
									<p className="text-[11px] mt-0.5">
										Средства в размере {formatKopecksRu(stageAmountKopecks)} зачислены на эскроу-депозит пациента. Наряд в ЗТЛ разблокирован.
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={onClose}
								className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition cursor-pointer shrink-0"
							>
								Готово
							</button>
						</div>
					) : (
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border,#cbd5e1)]">
							<div className="text-[11px] text-[var(--muted,#64748b)] flex items-center gap-1.5">
								<ShieldCheck size={14} className="text-emerald-500 shrink-0" />
								<span>Деньги поступают на счет клиники сразу в полном объеме</span>
							</div>

							<button
								type="button"
								onClick={handleSimulateApproval}
								className="min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[var(--teal-dark,var(--brand-primary))] hover:bg-[var(--teal,var(--brand-primary))] shadow-sm transition cursor-pointer"
								data-testid="simulate-bank-approval-btn"
								title="Имитировать онлайн-одобрение банком и моментально зачесть аванс за этап"
							>
								<Sparkles size={14} />
								<span>Имитировать одобрение банком</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default BankInstallmentQrModal;
