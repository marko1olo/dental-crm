import React from "react";
import { ChevronDown, CreditCard, MapPin } from "lucide-react";
import { IDENTITY_DOCUMENT_TYPES } from "./constants";
import type { IdentityDocType, PatientIdentitySectionProps } from "./types";

export const PatientIdentitySection: React.FC<PatientIdentitySectionProps> = React.memo(
	function PatientIdentitySection({
		patient,
		onUpdatePatient,
		disabled = false,
		isOpen = false,
		onToggle,
		summary = "Не заполнено",
		addressesMatchState,
		setAddressesMatchState,
	}) {
		return (
			<div
				className={`rounded-xl bg-[var(--paper)] border transition-all overflow-hidden ${
					isOpen
						? "border-[var(--teal)]/40 ring-1 ring-[var(--teal)]/20 shadow-xs"
						: "border-[var(--glass-border)] hover:border-[var(--teal)]/40 hover:bg-[var(--paper-soft)]/40 shadow-2xs"
				}`}
			>
				<button
					type="button"
					onClick={onToggle}
					className="w-full flex items-center justify-between p-3 sm:p-3.5 text-left cursor-pointer select-none transition-colors bg-transparent min-h-[44px]"
					data-testid="accordion-toggle-passport"
					aria-expanded={isOpen}
				>
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] border border-[var(--teal)]/20 flex items-center justify-center shrink-0">
							<CreditCard className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<span className="text-xs sm:text-sm font-bold text-[var(--ink)] block truncate">
								Паспортные данные и адреса
							</span>
							<span className="text-[11px] text-[var(--muted)] block truncate font-normal sm:hidden">
								{summary}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2.5 shrink-0 ml-2">
						<span
							className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold hidden sm:inline-block truncate max-w-[260px] md:max-w-xs transition-colors ${
								summary === "Не заполнено"
									? "bg-[var(--paper-soft)] border border-[var(--glass-border)] text-[var(--muted)]"
									: "bg-teal-500/10 text-[var(--teal)] border border-teal-500/20 font-bold"
							}`}
						>
							{summary}
						</span>
						<ChevronDown
							className={`w-4 h-4 text-[var(--teal)] transition-transform duration-200 ${
								isOpen ? "rotate-180" : ""
							}`}
						/>
					</div>
				</button>

				{/* Раскрывающийся блок: Тип документа, реквизиты и адреса */}
				<div
					className={
						isOpen
							? "p-3.5 sm:p-4 border-t border-[var(--glass-border)] flex flex-col gap-3.5 bg-[var(--paper)]"
							: "hidden"
					}
				>
					{/* Выбор типа документа */}
					<div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-[var(--glass-border)]">
						<span className="text-xs font-bold text-[var(--ink)]">
							Реквизиты документа, удостоверяющего личность:
						</span>
						<div className="flex items-center gap-1.5">
							<label htmlFor="select-doc-type-field" className="text-[11px] text-[var(--muted)] font-medium">
								Тип:
							</label>
							<select
								id="select-doc-type-field"
								className="min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-xs rounded-lg bg-[var(--paper-strong)] border border-[var(--glass-border)] hover:bg-[var(--glass-hover,var(--paper-soft))] text-[var(--ink)] font-semibold cursor-pointer shadow-2xs transition-all"
								value={patient?.docType ?? "passport_rf"}
								onChange={(e) => onUpdatePatient?.("docType", e.target.value as IdentityDocType)}
								disabled={disabled}
								data-testid="select-doc-type"
							>
								{IDENTITY_DOCUMENT_TYPES.map((dt) => (
									<option key={dt.code} value={dt.code}>
										{dt.labelRu}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Поля реквизитов */}
					{!patient?.docType || patient?.docType === "passport_rf" ? (
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
							<div className="flex flex-col gap-1">
								<label className="text-[11px] font-bold text-[var(--muted)]">Серия (4 цифры)</label>
								<input
									type="text"
									maxLength={4}
									className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
									value={patient?.passportSeries ?? ""}
									onChange={(e) =>
										onUpdatePatient?.("passportSeries", e.target.value.replace(/\D/g, "").slice(0, 4))
									}
									placeholder="45 10"
									disabled={disabled}
									data-testid="input-passport-series"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-[11px] font-bold text-[var(--muted)]">Номер (6 цифр)</label>
								<input
									type="text"
									maxLength={6}
									className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
									value={patient?.passportNumber ?? ""}
									onChange={(e) =>
										onUpdatePatient?.("passportNumber", e.target.value.replace(/\D/g, "").slice(0, 6))
									}
									placeholder="123456"
									disabled={disabled}
									data-testid="input-passport-number"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-[11px] font-bold text-[var(--muted)]">Дата выдачи</label>
								<input
									type="date"
									className="min-h-[44px] sm:min-h-[32px] h-8 px-2 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
									value={patient?.passportIssuedDate ?? ""}
									onChange={(e) => onUpdatePatient?.("passportIssuedDate", e.target.value)}
									disabled={disabled}
									data-testid="input-passport-issued-date"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-[11px] font-bold text-[var(--muted)]">Код подр. (XXX-XXX)</label>
								<input
									type="text"
									maxLength={7}
									className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
									value={patient?.passportDepartmentCode ?? ""}
									onChange={(e) => {
										const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
										const formatted = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
										onUpdatePatient?.("passportDepartmentCode", formatted);
									}}
									placeholder="770-001"
									disabled={disabled}
									data-testid="input-passport-department-code"
								/>
							</div>

							<div className="flex flex-col gap-1 col-span-2">
								<label className="text-[11px] font-bold text-[var(--muted)]">Кем выдан</label>
								<input
									type="text"
									className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
									value={patient?.passportIssuedBy ?? ""}
									onChange={(e) => onUpdatePatient?.("passportIssuedBy", e.target.value)}
									placeholder="Отделом УФМС России по гор. Москве..."
									disabled={disabled}
									data-testid="input-passport-issued-by"
								/>
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
							<div className="flex flex-col gap-1">
								<label className="text-[11px] font-bold text-[var(--muted)]">Серия и номер документа</label>
								<input
									type="text"
									className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
									value={patient?.passportNumber ?? patient?.passportSeries ?? ""}
									onChange={(e) => onUpdatePatient?.("passportNumber", e.target.value)}
									placeholder="Номер свидетельства / ВНЖ"
									disabled={disabled}
									data-testid="input-passport-number"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-[11px] font-bold text-[var(--muted)]">Дата выдачи</label>
								<input
									type="date"
									className="min-h-[44px] sm:min-h-[32px] h-8 px-2 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
									value={patient?.passportIssuedDate ?? ""}
									onChange={(e) => onUpdatePatient?.("passportIssuedDate", e.target.value)}
									disabled={disabled}
									data-testid="input-passport-issued-date"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-[11px] font-bold text-[var(--muted)]">Орган выдачи</label>
								<input
									type="text"
									className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
									value={patient?.passportIssuedBy ?? ""}
									onChange={(e) => onUpdatePatient?.("passportIssuedBy", e.target.value)}
									placeholder="Кем выдан документ"
									disabled={disabled}
									data-testid="input-passport-issued-by"
								/>
							</div>
						</div>
					)}

					{/* Адреса регистрации и проживания */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-[var(--glass-border)]">
						<div className="flex flex-col gap-1">
							<label className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
								<span className="flex items-center gap-1.5">
									<MapPin className="w-3.5 h-3.5 text-[var(--muted)]" />
									<span>Адрес регистрации (по паспорту)</span>
								</span>
							</label>
							<input
								type="text"
								className="min-h-[44px] sm:min-h-[32px] h-8 px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
								value={patient?.registrationAddress ?? patient?.address ?? ""}
								onChange={(e) => {
									const val = e.target.value;
									onUpdatePatient?.("address", val);
									onUpdatePatient?.("registrationAddress", val);
									if (addressesMatchState) {
										onUpdatePatient?.("residentialAddress", val);
									}
								}}
								placeholder="г. Москва, ул. Ленина, д. 10, кв. 25"
								disabled={disabled}
								data-testid="input-patient-address"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<div className="flex items-center justify-between">
								<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
									<MapPin className="w-3.5 h-3.5 text-[var(--muted)]" />
									<span>Адрес фактического проживания</span>
								</label>
								<label className="flex items-center gap-1 text-[11px] text-[var(--muted)] cursor-pointer select-none">
									<input
										type="checkbox"
										className="rounded text-[var(--teal)] cursor-pointer"
										checked={addressesMatchState}
										onChange={(e) => {
											const checked = e.target.checked;
											setAddressesMatchState(checked);
											onUpdatePatient?.("addressesMatch", checked);
											if (checked) {
												onUpdatePatient?.(
													"residentialAddress",
													patient?.registrationAddress || patient?.address || "",
												);
											}
										}}
										data-testid="checkbox-addresses-match"
									/>
									<span>Совпадает с регистрацией</span>
								</label>
							</div>
							<input
								type="text"
								className={`min-h-[44px] sm:min-h-[32px] h-8 px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors ${
									addressesMatchState ? "opacity-60 bg-[var(--paper-soft)] cursor-not-allowed" : ""
								}`}
								value={
									addressesMatchState
										? (patient?.registrationAddress ?? patient?.address ?? "")
										: (patient?.residentialAddress ?? "")
								}
								onChange={(e) => onUpdatePatient?.("residentialAddress", e.target.value)}
								placeholder="Фактическое место жительства"
								disabled={disabled || addressesMatchState}
								data-testid="input-residential-address"
							/>
						</div>
					</div>
				</div>
			</div>
		);
	},
);

export default PatientIdentitySection;
