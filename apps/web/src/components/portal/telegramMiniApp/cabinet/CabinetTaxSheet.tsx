import React, { memo } from "react";
import {
	CheckCircle2,
	Download,
	FileCheck2,
	QrCode,
	RefreshCw,
	ShieldCheck,
	X,
} from "lucide-react";

export interface CabinetTaxSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly taxYear: number;
	readonly onChangeTaxYear: (year: number) => void;
	readonly payerType: "self" | "child" | "spouse";
	readonly onChangePayerType: (type: "self" | "child" | "spouse") => void;
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
	onDownloadTaxCert,
	onTriggerHaptic,
}) => {
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
							<FileCheck2 size={18} className="text-teal-400" />
							<span>Справка для налоговой (КНД 1151156)</span>
						</div>
						<div className="tg-sheet-subtitle">
							Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@
						</div>
					</div>
					<button
						type="button"
						className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center"
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
									{[2025, 2024, 2023].map((y) => (
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
									{[
										{ id: "self", label: "За себя" },
										{ id: "child", label: "За ребёнка" },
										{ id: "spouse", label: "За супруга" },
									].map((opt) => (
										<button
											key={opt.id}
											type="button"
											className={`tg-chip-selector-btn ${payerType === opt.id ? "active" : ""}`}
											onClick={() => {
												onChangePayerType(opt.id as any);
												onTriggerHaptic?.("light");
											}}
										>
											{opt.label}
										</button>
									))}
								</div>
							</div>

							{/* Поля реквизитов налогоплательщика */}
							<div className="space-y-2.5 bg-slate-100 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
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
											className="mt-0.5 accent-teal-500"
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
											className="mt-0.5 accent-teal-500"
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
							<div className="tg-deduction-summary-box">
								<span className="text-xs font-bold text-slate-700 dark:text-slate-300">
									Расчетная сумма вычета:
								</span>
								<span className="font-bold text-teal-600 dark:text-teal-300 text-sm">
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
								<span>Сформировать справку КНД 1151156</span>
							</button>
						</>
					) : (
						/* Состояние готовой справки с печатью и QR-кодом */
						<div className="space-y-4">
							<div className="tg-tax-cert-preview">
								<div className="tg-cert-stamp-badge">
									<ShieldCheck size={16} className="text-emerald-500" />
									<span>Подписано УКЭП клиники</span>
								</div>

								<div className="text-center my-2">
									<div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">
										ФОРМА ПО КНД 1151156
									</div>
									<div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
										СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ
									</div>
									<div className="text-[11px] text-slate-500 dark:text-slate-400">
										№ ФНС-2026/043-9821 от {new Date().toLocaleDateString("ru-RU")}
									</div>
								</div>

								<div className="tg-cert-details-card space-y-1.5 my-3">
									<div className="flex justify-between">
										<span className="text-slate-500 dark:text-slate-400">Клиника:</span>
										<span className="font-bold text-slate-900 dark:text-slate-200">ООО «Стоматология ДЕНТЕ»</span>
									</div>
									<div className="flex justify-between">
										<span className="text-slate-500 dark:text-slate-400">ИНН / КПП:</span>
										<span className="font-mono text-slate-900 dark:text-slate-200">7701234567 / 770101001</span>
									</div>
									<div className="flex justify-between">
										<span className="text-slate-500 dark:text-slate-400">Лицензия:</span>
										<span className="text-slate-900 dark:text-slate-200">ЛО41-01137-77/00368142</span>
									</div>
									<div className="flex justify-between">
										<span className="text-slate-500 dark:text-slate-400">Налогоплательщик:</span>
										<span className="font-bold text-slate-900 dark:text-slate-200">{payerFullName}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-slate-500 dark:text-slate-400">ИНН физлица:</span>
										<span className="font-mono text-teal-600 dark:text-teal-300 font-bold">{payerInn}</span>
									</div>
									<div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
										<span className="text-slate-700 dark:text-slate-300 font-bold">Сумма расходов:</span>
										<span className="font-bold text-slate-900 dark:text-slate-100">
											{totalYearExpense.toLocaleString("ru-RU")} ₽
										</span>
									</div>
								</div>

								{/* QR-код для Личного кабинета налогоплательщика */}
								<div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
									<div className="w-14 h-14 bg-white rounded-lg p-1 flex items-center justify-center flex-shrink-0 border border-slate-200">
										<QrCode size={48} className="text-slate-950" />
									</div>
									<div className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
										<span className="font-bold text-teal-600 dark:text-teal-400 block mb-0.5">
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
									className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700"
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
								<div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-xs font-bold text-center">
									✓ Справка КНД 1151156 сформирована и готова к отправке в ФНС!
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
