import React, { memo, useMemo } from "react";
import {
	CheckCircle2,
	Download,
	FileCheck2,
	RefreshCw,
	ShieldCheck,
	X,
} from "lucide-react";
import { generateQrCodeSvg } from "@dental/shared";

export type PayerType = "self" | "child" | "spouse";

const PAYER_TYPE_OPTIONS: readonly { readonly id: PayerType; readonly label: string }[] = [
	{ id: "self", label: "За себя" },
	{ id: "child", label: "За ребёнка" },
	{ id: "spouse", label: "За супруга" },
];

export interface CabinetTaxSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly taxYear: number;
	readonly onChangeTaxYear: (year: number) => void;
	readonly payerType: PayerType;
	readonly onChangePayerType: (type: PayerType) => void;
	readonly payerFullName: string;
	readonly onChangePayerFullName: (name: string) => void;
	readonly payerInn: string;
	readonly onChangePayerInn: (inn: string) => void;
	readonly payerPassport: string;
	readonly onChangePayerPassport: (passport: string) => void;
	readonly serviceCode: "1" | "2";
	readonly onChangeServiceCode: (code: "1" | "2") => void;
	readonly isTaxCertGenerated: boolean;
	readonly onGenerateCert: () => void;
	readonly onResetCert: () => void;
	readonly calculatedDeduction: number;
	readonly totalYearExpense: number;
	readonly taxCopiedNotice: boolean;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicLicense?: string | undefined;
	readonly certificateNumber?: string | undefined;
	readonly issueDate?: string | undefined;
	readonly onDownloadTaxCert: () => void;
	readonly onTriggerHaptic?: (style?: "light" | "medium" | "heavy") => void;
}

export const CabinetTaxSheet: React.FC<CabinetTaxSheetProps> = memo(({
	isOpen,
	onClose,
	taxYear,
	onChangeTaxYear,
	payerType,
	onChangePayerType,
	payerFullName,
	onChangePayerFullName,
	payerInn,
	onChangePayerInn,
	payerPassport,
	onChangePayerPassport,
	serviceCode,
	onChangeServiceCode,
	isTaxCertGenerated,
	onGenerateCert,
	onResetCert,
	calculatedDeduction,
	totalYearExpense,
	taxCopiedNotice,
	clinicName,
	clinicInn,
	clinicKpp,
	clinicLicense,
	certificateNumber,
	issueDate,
	onDownloadTaxCert,
	onTriggerHaptic,
}) => {
	const certNum = certificateNumber || `СПР-${taxYear}/${payerInn ? payerInn.slice(-4) : "001"}`;
	const certDate = issueDate || new Date().toLocaleDateString("ru-RU");
	const availableTaxYears = useMemo(() => {
		const currentYear = new Date().getFullYear();
		const baseYears = [currentYear, currentYear - 1, currentYear - 2];
		return baseYears.includes(taxYear) ? baseYears : [taxYear, ...baseYears];
	}, [taxYear]);

	const qrPayload = useMemo(() => {
		const cleanClinicInn = clinicInn ? clinicInn.replace(/\D/g, "") : "";
		const cleanPayerInn = payerInn ? payerInn.replace(/\D/g, "") : "";
		return `FNS|KND1151156|${certNum}|${taxYear}|${cleanClinicInn}|${cleanPayerInn}|SUM:${totalYearExpense}`;
	}, [certNum, taxYear, clinicInn, payerInn, totalYearExpense]);

	const qrSvg = useMemo(() => {
		return generateQrCodeSvg(qrPayload, { size: 56, margin: 1 });
	}, [qrPayload]);

	if (!isOpen) return null;

	return (
		<div
			className="tg-sheet-backdrop"
			onClick={() => {
				onClose();
				onTriggerHaptic?.("light");
			}}
		>
			<div
				className="tg-bottom-sheet tg-tax-sheet"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Тактильный хэндл для свайпа */}
				<div className="tg-sheet-handle" />

				{/* Шапка шторки */}
				<div className="tg-sheet-header">
					<div>
						<div className="tg-sheet-title">
							<FileCheck2 size={18} className="text-[var(--primary)]" />
							<span>Справка для налогового вычета</span>
						</div>
						<div className="tg-sheet-subtitle">
							Для оформления социального вычета на лечение (13%)
						</div>
					</div>
					<button
						type="button"
						aria-label="Закрыть"
						className="w-9 h-9 max-sm:h-11 max-sm:w-11 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-full bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--line)] flex items-center justify-center shrink-0"
						onClick={() => {
							onClose();
							onTriggerHaptic?.("light");
						}}
					>
						<X size={16} />
					</button>
				</div>

				{/* Тело шторки */}
				<div className="tg-sheet-body space-y-4">
					{!isTaxCertGenerated ? (
						<>
							{/* Выбор налогового периода */}
							<div>
								<label className="tg-field-label">
									Налоговый период (год оплаты):
								</label>
								<div className="flex gap-2">
									{availableTaxYears.map((y) => (
										<button
											key={y}
											type="button"
											className={`tg-chip-selector-btn ${taxYear === y ? "active" : ""}`}
											onClick={() => {
												onChangeTaxYear(y);
												onTriggerHaptic?.("light");
											}}
										>
											{y} год
										</button>
									))}
								</div>
							</div>

							{/* Кто выступает налогоплательщиком */}
							<div>
								<label className="tg-field-label">
									Кто выступает налогоплательщиком:
								</label>
								<div className="flex gap-2">
									{PAYER_TYPE_OPTIONS.map((opt) => (
										<button
											key={opt.id}
											type="button"
											className={`tg-chip-selector-btn ${payerType === opt.id ? "active" : ""}`}
											onClick={() => {
												onChangePayerType(opt.id);
												onTriggerHaptic?.("light");
											}}
										>
											{opt.label}
										</button>
									))}
								</div>
							</div>

							{/* Поля реквизитов налогоплательщика */}
							<div className="space-y-2.5 bg-[var(--paper-soft)] p-3 rounded-2xl border border-[var(--line)]">
								<div>
									<label className="tg-field-label">
										ФИО налогоплательщика:
									</label>
									<input
										type="text"
										value={payerFullName}
										onChange={(e) => onChangePayerFullName(e.target.value)}
										className="tg-field-input"
									/>
								</div>

								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="tg-field-label">
											ИНН (12 цифр):
										</label>
										<input
											type="text"
											value={payerInn}
											maxLength={12}
											onChange={(e) => onChangePayerInn(e.target.value.replace(/\D/g, ""))}
											className="tg-field-input font-mono font-bold"
										/>
									</div>
									<div>
										<label className="tg-field-label">
											Паспорт РФ:
										</label>
										<input
											type="text"
											value={payerPassport}
											onChange={(e) => onChangePayerPassport(e.target.value)}
											className="tg-field-input"
										/>
									</div>
								</div>
							</div>

							{/* Код услуги ФНС */}
							<div>
								<label className="tg-field-label">
									Код медицинской услуги:
								</label>
								<div className="space-y-2">
									<label
										className={`tg-service-radio-card ${serviceCode === "1" ? "active" : ""}`}
									>
										<input
											type="radio"
											name="serviceCode"
											checked={serviceCode === "1"}
											onChange={() => onChangeServiceCode("1")}
											className="mt-0.5 accent-[var(--primary)]"
										/>
										<div>
											<div className="tg-radio-title">Код 1 — Медицинские услуги</div>
											<div className="tg-radio-desc">
												Терапия, эндодонтия, гигиена (лимит 150 000 ₽)
											</div>
										</div>
									</label>

									<label
										className={`tg-service-radio-card ${serviceCode === "2" ? "active" : ""}`}
									>
										<input
											type="radio"
											name="serviceCode"
											checked={serviceCode === "2"}
											onChange={() => onChangeServiceCode("2")}
											className="mt-0.5 accent-[var(--primary)]"
										/>
										<div>
											<div className="tg-radio-title">Код 2 — Дорогостоящее лечение</div>
											<div className="tg-radio-desc">
												Дентальная имплантация, костная пластика (вычет БЕЗ лимита!)
											</div>
										</div>
									</label>
								</div>
							</div>

							{/* Сводка и итоговая кнопка */}
							{totalYearExpense === 0 ? (
								<div className="p-3 rounded-xl bg-[var(--warning-soft,rgba(245,158,11,0.12))] border border-[var(--warning,#f59e0b)]/30 text-[var(--ink)] text-xs">
									За {taxYear} год оплат не зарегистрировано. Справка для налогового вычета формируется строго на основании фактических фискальных чеков.
								</div>
							) : null}

							<div className="tg-deduction-summary-box">
								<span className="text-xs font-bold text-[var(--ink)]">
									Расчетная сумма вычета:
								</span>
								<span className="font-bold text-[var(--primary)] text-sm font-mono tabular-nums">
									+{calculatedDeduction.toLocaleString("ru-RU")} ₽
								</span>
							</div>

							<button
								type="button"
								className="tg-cta-button"
								onClick={() => {
									onGenerateCert();
									onTriggerHaptic?.("heavy");
								}}
							>
								<CheckCircle2 size={18} />
								<span>Сформировать справку для налогового вычета (13% НДФЛ)</span>
							</button>
						</>
					) : (
						/* Состояние готовой справки с печатью и QR-кодом */
						<div className="space-y-4">
							<div className="tg-tax-cert-preview">
								<div className="tg-cert-stamp-badge">
									<ShieldCheck size={16} className="text-[var(--success)]" />
									<span>Подписано УКЭП клиники</span>
								</div>

								<div className="text-center my-2">
									<div className="text-xs text-[var(--ink-muted)] font-medium">
										Справка для налогового вычета (13% НДФЛ)
									</div>
									<div className="text-sm font-bold text-[var(--ink)] mt-0.5">
										Справка об оплате медицинских услуг
									</div>
									<div className="text-[11px] text-[var(--ink-muted)]">
										№ {certNum} от {certDate}
									</div>
								</div>

								<div className="tg-cert-details-card space-y-1.5 my-3">
									<div className="flex justify-between gap-2">
										<span className="text-[var(--ink-muted)]">Клиника:</span>
										<span className="font-bold text-[var(--ink)] text-right">{clinicName || "Стоматологическая клиника"}</span>
									</div>
									<div className="flex justify-between gap-2">
										<span className="text-[var(--ink-muted)]">ИНН / КПП:</span>
										<span className="font-mono text-[var(--ink)]">{clinicInn ? `${clinicInn}${clinicKpp ? ` / ${clinicKpp}` : ""}` : "—"}</span>
									</div>
									<div className="flex justify-between gap-2">
										<span className="text-[var(--ink-muted)]">Лицензия:</span>
										<span className="text-[var(--ink)] text-right">{clinicLicense || "—"}</span>
									</div>
									<div className="flex justify-between gap-2">
										<span className="text-[var(--ink-muted)]">Налогоплательщик:</span>
										<span className="font-bold text-[var(--ink)] text-right">{payerFullName || "—"}</span>
									</div>
									<div className="flex justify-between gap-2">
										<span className="text-[var(--ink-muted)]">ИНН физлица:</span>
										<span className="font-mono text-[var(--primary)] font-bold">{payerInn || "—"}</span>
									</div>
									<div className="flex justify-between pt-1 border-t border-[var(--line)]">
										<span className="text-[var(--ink)] font-bold">Сумма расходов:</span>
										<span className="font-bold text-[var(--ink)] font-mono tabular-nums">
											{totalYearExpense.toLocaleString("ru-RU")} ₽
										</span>
									</div>
								</div>

								{/* QR-код для Личного кабинета налогоплательщика */}
								<div className="flex items-center gap-3 bg-[var(--paper-soft)] p-2.5 rounded-xl border border-[var(--line)]">
									<div
										data-testid="tax-sheet-qr"
										data-preserve-white="true"
										className="w-14 h-14 bg-white dark:bg-white rounded-lg p-0.5 flex items-center justify-center flex-shrink-0 border border-[var(--line)] overflow-hidden"
										dangerouslySetInnerHTML={{ __html: qrSvg }}
									/>
									<div className="text-[11px] text-[var(--ink-muted)] leading-tight">
										<span className="font-bold text-[var(--primary)] block mb-0.5">
											QR-код для быстрой загрузки:
										</span>
										Отсканируйте камерой в приложении «Налоги ФЛ» для мгновенной предзаполненной декларации.
									</div>
								</div>
							</div>

							{/* Кнопки скачивания и отправки */}
							<div className="space-y-2">
								<button
									type="button"
									className="tg-cta-button"
									onClick={() => {
										onDownloadTaxCert();
										onTriggerHaptic?.("medium");
									}}
								>
									<Download size={18} />
									<span>Скачать справку (PDF с печатью)</span>
								</button>

								<button
									type="button"
									className="w-full min-h-[44px] py-2.5 rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-bold text-xs flex items-center justify-center gap-2 border border-[var(--line)]"
									onClick={() => {
										onResetCert();
										onTriggerHaptic?.("light");
									}}
								>
									<RefreshCw size={14} />
									<span>Изменить реквизиты или год</span>
								</button>
							</div>

							{taxCopiedNotice && (
								<div className="p-2.5 rounded-xl bg-[var(--success-soft)] border border-[var(--success)]/40 text-[var(--success)] text-xs font-bold text-center">
									✓ Справка для налогового вычета (13% НДФЛ) сформирована и готова к отправке в ФНС!
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
});

CabinetTaxSheet.displayName = "CabinetTaxSheet";
