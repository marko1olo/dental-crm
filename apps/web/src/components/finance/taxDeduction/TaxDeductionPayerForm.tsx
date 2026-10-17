import React from "react";
import {
	AlertCircle,
	Calendar,
	CheckCircle2,
	Sliders,
	UserCheck,
	Users,
} from "lucide-react";
import { TAX_DEDUCTION_RELATIONSHIP_MAP } from "../taxDeductionEngine";
import type { TaxDeductionPayerFormProps } from "./types";

export const TaxDeductionPayerForm: React.FC<TaxDeductionPayerFormProps> = ({
	selectedYear,
	setSelectedYear,
	availableYears,
	paymentsCountByYear,
	payerRelationship,
	setPayerRelationship,
	onFillFromPatient,
	payerFullName,
	setPayerFullName,
	payerInn,
	setPayerInn,
	innValidation,
	payerBirthDate,
	setPayerBirthDate,
	passportSeries,
	setPassportSeries,
	passportNumber,
	setPassportNumber,
	certificateNumber,
	setCertificateNumber,
	taxOfficeCode,
	setTaxOfficeCode,
	patientName,
	familyMembers,
	onSelectFamilyMember,
	isManualAdjustment,
	setIsManualAdjustment,
	manualCode01Rub,
	setManualCode01Rub,
	manualCode02Rub,
	setManualCode02Rub,
	manualAdjustmentReason,
	setManualAdjustmentReason,
}) => {
	return (
		<div className="space-y-4">
			{/* Tax Year & Payer Defaults Selector */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Tax Year Selection */}
				<div
					className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2"
					style={{ backgroundColor: "var(--paper-soft)", borderColor: "var(--line)" }}
				>
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
							<Calendar size={14} className="text-teal-600" />
							Налоговый период (Отчетный год):
						</span>
						<span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300">
							Лимит Кода 01: {selectedYear >= 2024 ? "150 000 ₽" : "120 000 ₽"}
						</span>
					</div>
					<div className="flex gap-2 flex-wrap">
						{availableYears.map((yr) => {
							const count = paymentsCountByYear[yr] || 0;
							const isSelected = Number(selectedYear) === Number(yr);
							return (
								<button
									key={yr}
									type="button"
									onClick={() => setSelectedYear(yr)}
									className="cursor-pointer transition-all"
									style={{
										minHeight: "44px",
										minWidth: "80px",
										flex: 1,
										borderRadius: "12px",
										border: isSelected ? "1px solid #0d9488" : "1px solid var(--line)",
										backgroundColor: isSelected ? "#0d9488" : "var(--paper)",
										color: isSelected ? "#ffffff" : "var(--ink)",
										fontWeight: 700,
										fontSize: "13px",
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "6px",
									}}
								>
									<span>{yr} год</span>
									{count > 0 && (
										<span
											className="text-[11px] px-1.5 py-0.5 rounded-md font-mono font-bold"
											style={{
												backgroundColor: isSelected ? "rgba(255, 255, 255, 0.25)" : "rgba(13, 148, 136, 0.15)",
												color: isSelected ? "#ffffff" : "#0d9488",
											}}
										>
											{count}
										</span>
									)}
								</button>
							);
						})}
					</div>
				</div>

				{/* Relationship Selector */}
				<div
					className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2"
					style={{ backgroundColor: "var(--paper-soft)", borderColor: "var(--line)" }}
				>
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
							<UserCheck size={14} className="text-teal-600" />
							Степень родства (Код ФНС):
						</span>
						<button
							type="button"
							onClick={onFillFromPatient}
							className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-bold cursor-pointer"
						>
							Заполнить из карточки
						</button>
					</div>
					<div className="grid grid-cols-2 gap-1.5">
						{(["patient", "spouse", "parent", "child"] as const).map((r) => {
							const meta = TAX_DEDUCTION_RELATIONSHIP_MAP[r];
							const isSelected = payerRelationship === r;
							return (
								<button
									key={r}
									type="button"
									onClick={() => setPayerRelationship(r)}
									className="cursor-pointer transition-all"
									style={{
										minHeight: "44px",
										padding: "8px 10px",
										borderRadius: "12px",
										border: isSelected ? "1px solid #0d9488" : "1px solid var(--line)",
										backgroundColor: isSelected ? "#0d9488" : "var(--paper)",
										color: isSelected ? "#ffffff" : "var(--ink)",
										fontWeight: 700,
										fontSize: "12px",
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "6px",
									}}
								>
									<span>Код {meta.code}:</span>
									<span>{meta.shortLabelRu}</span>
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* 1-Click Taxpayer Selector from Family Balance & Patient */}
			<div
				className="p-3.5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-2.5"
				style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
			>
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--teal, #0d9488)" }}>
						<Users size={15} className="text-teal-600" />
						1 клик: Налогоплательщик из семейного баланса:
					</span>
					<span className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>
						Быстрый выбор плательщика
					</span>
				</div>
				<div className="flex gap-2 flex-wrap" role="group" aria-label="Быстрый выбор плательщика">
					<button
						type="button"
						onClick={() => (onSelectFamilyMember ? onSelectFamilyMember("self") : onFillFromPatient())}
						className="secondary-button"
						style={{
							minHeight: "44px",
							padding: "6px 12px",
							borderRadius: "12px",
							border: payerRelationship === "patient" ? "2px solid #0d9488" : "1px solid var(--line)",
							backgroundColor: payerRelationship === "patient" ? "rgba(13, 148, 136, 0.12)" : "var(--paper-soft)",
							color: "var(--ink)",
							fontSize: "12px",
							fontWeight: 700,
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
						}}
						data-testid="taxpayer-chip-self"
						title="Плательщик — сам пациент (лично)"
					>
						<UserCheck size={14} className="text-teal-600" />
						<span>Пациент (лично)</span>
						{patientName ? <span className="opacity-75 font-normal">({patientName})</span> : null}
					</button>
					{(familyMembers ?? []).map((m) => {
						const relMeta = TAX_DEDUCTION_RELATIONSHIP_MAP[m.relationship];
						const isMatch = payerFullName === m.person.fullName;
						return (
							<button
								key={m.id}
								type="button"
								onClick={() => onSelectFamilyMember?.(m)}
								className="secondary-button"
								style={{
									minHeight: "44px",
									padding: "6px 12px",
									borderRadius: "12px",
									border: isMatch ? "2px solid #0d9488" : "1px solid var(--line)",
									backgroundColor: isMatch ? "rgba(13, 148, 136, 0.12)" : "var(--paper-soft)",
									color: "var(--ink)",
									fontSize: "12px",
									fontWeight: 700,
									cursor: "pointer",
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
								}}
								data-testid={`taxpayer-chip-${m.id}`}
								title={`Выбрать плательщиком: ${m.person.fullName} (${relMeta.labelRu})`}
							>
								<span className="text-[11px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-800 dark:text-teal-200 font-mono">
									Код {relMeta.code}
								</span>
								<span>{m.person.fullName}</span>
								<span className="text-[11px] opacity-75 font-normal">
									({relMeta.shortLabelRu}{m.person.inn ? `, ИНН ${m.person.inn}` : ""})
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Payer Requisites Fields */}
			<div
				className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3"
				style={{ backgroundColor: "var(--paper-soft)", borderColor: "var(--line)" }}
			>
				<span className="text-xs font-bold uppercase tracking-wider block" style={{ color: "var(--muted)" }}>
					Реквизиты налогоплательщика (для справки на вычет):
				</span>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div className="space-y-1">
						<label htmlFor="payer-fullname-input" className="text-xs font-bold" style={{ color: "var(--ink)" }}>
							ФИО плательщика:
						</label>
						<input
							id="payer-fullname-input"
							type="text"
							value={payerFullName}
							onChange={(e) => setPayerFullName(e.target.value)}
							className="w-full min-h-[44px] px-3 rounded-xl border text-xs font-medium"
							style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
						/>
					</div>

					<div className="space-y-1">
						<div className="flex items-center justify-between">
							<label htmlFor="payer-inn-input" className="text-xs font-bold" style={{ color: "var(--ink)" }}>
								ИНН плательщика:
							</label>
							{!payerInn ? (
								<span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
									Не заполнен
								</span>
							) : innValidation.isValid ? (
								<span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
									<CheckCircle2 size={12} /> Корректен
								</span>
							) : (
								<span className="text-[11px] text-rose-600 font-bold flex items-center gap-0.5">
									<AlertCircle size={12} /> Ошибка
								</span>
							)}
						</div>
						<input
							id="payer-inn-input"
							type="text"
							maxLength={12}
							value={payerInn}
							onChange={(e) => setPayerInn(e.target.value)}
							placeholder="12 цифр ИНН"
							className="w-full min-h-[44px] px-3 rounded-xl border text-xs font-mono font-bold"
							style={{
								backgroundColor: !payerInn || innValidation.isValid ? "var(--paper)" : "rgba(244, 63, 94, 0.08)",
								borderColor: !payerInn || innValidation.isValid ? "var(--line)" : "#f43f5e",
								color: "var(--ink)",
							}}
						/>
					</div>

					<div className="space-y-1">
						<label htmlFor="payer-bday-input" className="text-xs font-bold" style={{ color: "var(--ink)" }}>
							Дата рождения плательщика:
						</label>
						<input
							id="payer-bday-input"
							type="date"
							value={payerBirthDate}
							onChange={(e) => setPayerBirthDate(e.target.value)}
							className="w-full min-h-[44px] px-3 rounded-xl border text-xs"
							style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
						/>
					</div>
				</div>

				{/* Passport series & number */}
				<div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
					<div className="space-y-1">
						<label htmlFor="passport-series-input" className="text-xs font-bold" style={{ color: "var(--ink)" }}>
							Серия паспорта РФ:
						</label>
						<input
							id="passport-series-input"
							type="text"
							maxLength={4}
							value={passportSeries}
							onChange={(e) => setPassportSeries(e.target.value.replace(/\D/g, ""))}
							placeholder="4510"
							className="w-full min-h-[44px] px-3 rounded-xl border text-xs font-mono"
							style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
						/>
					</div>
					<div className="space-y-1">
						<label htmlFor="passport-number-input" className="text-xs font-bold" style={{ color: "var(--ink)" }}>
							Номер паспорта РФ:
						</label>
						<input
							id="passport-number-input"
							type="text"
							maxLength={6}
							value={passportNumber}
							onChange={(e) => setPassportNumber(e.target.value.replace(/\D/g, ""))}
							placeholder="123456"
							className="w-full min-h-[44px] px-3 rounded-xl border text-xs font-mono"
							style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
						/>
					</div>
					<div className="space-y-1">
						<label htmlFor="cert-number-input" className="text-xs font-bold" style={{ color: "var(--ink)" }}>
							Номер справки:
						</label>
						<input
							id="cert-number-input"
							type="text"
							value={certificateNumber}
							onChange={(e) => setCertificateNumber(e.target.value)}
							className="w-full min-h-[44px] px-3 rounded-xl border text-xs font-mono font-bold"
							style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
						/>
					</div>
					<div className="space-y-1">
						<label htmlFor="tax-office-input" className="text-xs font-bold" style={{ color: "var(--ink)" }}>
							Код ИФНС (КодНО):
						</label>
						<input
							id="tax-office-input"
							type="text"
							maxLength={4}
							value={taxOfficeCode}
							onChange={(e) => setTaxOfficeCode(e.target.value)}
							placeholder="7701"
							className="w-full min-h-[44px] px-3 rounded-xl border text-xs font-mono font-bold"
							style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
						/>
					</div>
				</div>
			</div>

			{/* Mandate 8e: Doctor & Staff Autonomy Manual Adjustment Section */}
			<div
				className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3"
				style={{ backgroundColor: "var(--paper-soft)", borderColor: "var(--line)" }}
			>
				<div className="flex items-center justify-between">
					<label className="flex items-center gap-2 cursor-pointer select-none">
						<input
							type="checkbox"
							checked={Boolean(isManualAdjustment)}
							onChange={(e) => setIsManualAdjustment?.(e.target.checked)}
							className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
							data-testid="tax-manual-adjustment-toggle"
						/>
						<span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--ink)" }}>
							<Sliders size={14} className="text-teal-600" />
							Ручная корректировка сумм вычета (Мандат 8e автономии клиники)
						</span>
					</label>
					{isManualAdjustment && (
						<span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
							Включена ручная правка
						</span>
					)}
				</div>

				{isManualAdjustment && (
					<div className="space-y-3 pt-1 border-t border-[var(--line)]">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div className="space-y-1">
								<label htmlFor="manual-code01-input" className="text-xs font-bold" style={{ color: "var(--ink)" }}>
									Сумма Код 01 (Обычное лечение, руб.):
								</label>
								<input
									id="manual-code01-input"
									type="number"
									min="0"
									step="1"
									value={manualCode01Rub}
									onChange={(e) => setManualCode01Rub?.(e.target.value)}
									placeholder="0"
									className="w-full min-h-[44px] px-3 rounded-xl border text-xs font-mono font-bold"
									style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
									data-testid="input-manual-code01"
								/>
							</div>
							<div className="space-y-1">
								<label htmlFor="manual-code02-input" className="text-xs font-bold" style={{ color: "var(--ink)" }}>
									Сумма Код 02 (Дорогостоящее лечение, руб.):
								</label>
								<input
									id="manual-code02-input"
									type="number"
									min="0"
									step="1"
									value={manualCode02Rub}
									onChange={(e) => setManualCode02Rub?.(e.target.value)}
									placeholder="0"
									className="w-full min-h-[44px] px-3 rounded-xl border text-xs font-mono font-bold"
									style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
									data-testid="input-manual-code02"
								/>
							</div>
						</div>
						<div className="space-y-1">
							<label htmlFor="manual-reason-input" className="text-xs font-bold" style={{ color: "var(--ink)" }}>
								Основание / Причина корректировки (для внутреннего аудита):
							</label>
							<input
								id="manual-reason-input"
								type="text"
								value={manualAdjustmentReason}
								onChange={(e) => setManualAdjustmentReason?.(e.target.value)}
								placeholder="Например: Перерасчет с учетом платежей за предыдущий период"
								className="w-full min-h-[44px] px-3 rounded-xl border text-xs"
								style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)", color: "var(--ink)" }}
								data-testid="input-manual-reason"
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
