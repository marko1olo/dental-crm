import React from "react";
import { ChevronDown, ExternalLink, FileCheck, Shield } from "lucide-react";
import { POPULAR_DMS_COMPANIES } from "./constants";
import {
	formatOmsPolicy,
	formatSnils,
	formatTaxpayerInn,
} from "../../../../utils/inputSanitation";
import type { PatientInsuranceSectionProps } from "./types";

export const PatientInsuranceSection: React.FC<PatientInsuranceSectionProps> = React.memo(
	function PatientInsuranceSection({
		patient,
		onUpdatePatient,
		disabled = false,
		isOpen = false,
		onToggle,
		summary = "Не заполнено",
		onOpenDmsLetters,
		onOpenTaxCertificate,
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
					data-testid="accordion-toggle-insurance"
					aria-expanded={isOpen}
				>
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] border border-[var(--teal)]/20 flex items-center justify-center shrink-0">
							<FileCheck className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<span className="text-xs sm:text-sm font-bold text-[var(--ink)] block truncate">
								Страхование и СНИЛС (ОМС, ДМС)
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

				{/* Раскрывающийся блок: СНИЛС, ИНН, ОМС, ДМС */}
				<div
					className={
						isOpen
							? "p-3.5 sm:p-4 border-t border-[var(--glass-border)] flex flex-col gap-3.5 bg-[var(--paper)]"
							: "hidden"
					}
				>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted)] flex items-center justify-between">
								<span>СНИЛС (по желанию)</span>
								<span className="flex items-center gap-1.5">
									<span className="text-[9px] text-teal-600 font-bold uppercase">Для вычета 13%</span>
									{onOpenTaxCertificate && (
										<button
											type="button"
											onClick={onOpenTaxCertificate}
											className="text-[10px] text-teal-600 hover:underline font-bold cursor-pointer inline-flex items-center gap-0.5"
											title="Оформить справку для налогового вычета (13%)"
											data-testid="link-order-tax-certificate"
										>
											<span>Вычет</span>
											<ExternalLink className="w-2.5 h-2.5" />
										</button>
									)}
								</span>
							</label>
							<input
								type="text"
								className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
								value={patient?.snils ?? ""}
								onChange={(e) => onUpdatePatient?.("snils", formatSnils(e.target.value))}
								placeholder="123-456-789 00 (необязательно)"
								disabled={disabled}
								data-testid="input-snils"
								title="СНИЛС не обязателен для приёма и лечения. Нужен только при оформлении справки для налогового вычета 13%"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted)] flex items-center justify-between">
								<span>ИНН (не требуется физлицам)</span>
								<span className="text-[9px] text-[var(--muted)]">Необязательно</span>
							</label>
							<input
								type="text"
								className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
								value={patient?.inn ?? ""}
								onChange={(e) => onUpdatePatient?.("inn", formatTaxpayerInn(e.target.value))}
								placeholder="Только при наличии (необязательно)"
								disabled={disabled}
								data-testid="input-inn"
								title="Для пациентов-физлиц ИНН не требуется. Заполняется добровольно или для организаций и ИП"
							/>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted)]">Полис ОМС (ЕНП)</label>
							<input
								type="text"
								className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
								value={patient?.omsPolicyNumber ?? ""}
								onChange={(e) => onUpdatePatient?.("omsPolicyNumber", formatOmsPolicy(e.target.value))}
								placeholder="16 цифр полиса ОМС"
								disabled={disabled}
								data-testid="input-oms-policy"
							/>
						</div>
					</div>

					{/* Выделенный блок: Страховой полис ДМС */}
					<div className="rounded-xl p-3 sm:p-3.5 bg-[var(--paper-soft)] border border-[var(--teal)]/25 flex flex-col gap-3 shadow-2xs">
						<div className="flex items-center justify-between gap-2 flex-wrap">
							<div className="flex items-center gap-2">
								<div className="w-6 h-6 rounded-md bg-[var(--teal)]/15 text-[var(--teal)] flex items-center justify-center shrink-0">
									<Shield className="w-3.5 h-3.5" />
								</div>
								<span className="text-xs sm:text-sm font-bold text-[var(--ink)]">
									Страховой полис ДМС
								</span>
								{patient?.dmsInsuranceCompany && (
									<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-[var(--teal)] border border-teal-500/20">
										{patient.dmsInsuranceCompany}
									</span>
								)}
							</div>
							<button
								type="button"
								onClick={() => {
									if (onOpenDmsLetters) {
										onOpenDmsLetters();
									} else {
										window.dispatchEvent(
											new CustomEvent("dente:open-dms-letters", {
												detail: {
													patientId: patient?.id,
													patientFullName: patient?.fullName,
												},
											}),
										);
									}
								}}
								className="min-h-[44px] sm:min-h-[28px] h-7 px-2.5 rounded-lg text-xs font-bold hover:opacity-90 cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
								style={{
									border: "1px solid var(--teal, #0d9488)",
									background: "rgba(13, 148, 136, 0.12)",
									color: "var(--teal, #0d9488)",
								}}
								title="Открыть гарантийные письма и согласованные услуги по ДМС"
								data-testid="btn-open-dms-letters-tab"
							>
								<Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
								<span>Гарантийные письма</span>
							</button>
						</div>

						{/* Страховая компания и быстрые чипы */}
						<div className="flex flex-col gap-1.5">
							<label className="text-[11px] font-bold text-[var(--muted)]">
								Страховая компания ДМС
							</label>
							<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
								<input
									type="text"
									className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] flex-1 focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
									value={patient?.dmsInsuranceCompany ?? ""}
									onChange={(e) => onUpdatePatient?.("dmsInsuranceCompany", e.target.value)}
									placeholder="СОГАЗ, Ингосстрах, АльфаСтрахование..."
									disabled={disabled}
									data-testid="input-dms-company"
								/>
								<div className="flex items-center gap-1.5 flex-wrap">
									{POPULAR_DMS_COMPANIES.slice(0, 6).map((comp) => {
										const isSelected = patient?.dmsInsuranceCompany === comp;
										return (
											<button
												key={comp}
												type="button"
												className="min-h-[44px] sm:min-h-[28px] h-7 text-xs px-2.5 rounded-lg font-semibold transition-colors cursor-pointer inline-flex items-center justify-center select-none"
												style={{
													border: isSelected
														? "1px solid var(--teal)"
														: "1px solid var(--line-strong, var(--line, #cbd5e1))",
													background: isSelected ? "var(--teal)" : "var(--paper-soft, #f1f5f9)",
													color: isSelected ? "var(--on-teal, #ffffff)" : "var(--ink)",
													boxShadow: isSelected ? "0 1px 2px rgba(13, 148, 136, 0.25)" : "none",
												}}
												onClick={() => onUpdatePatient?.("dmsInsuranceCompany", comp)}
											>
												{comp}
											</button>
										);
									})}
								</div>
							</div>
						</div>

						{/* Номер полиса, Номер гарантийного письма, Лимит покрытия, Программа */}
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
							<div className="flex flex-col gap-1">
								<label className="text-[11px] font-bold text-[var(--muted)]">
									Номер полиса ДМС
								</label>
								<input
									type="text"
									className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
									value={patient?.dmsPolicyNumber ?? ""}
									onChange={(e) => onUpdatePatient?.("dmsPolicyNumber", e.target.value)}
									placeholder="ДМС-2026/00123"
									disabled={disabled}
									data-testid="input-dms-policy"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-[11px] font-bold text-[var(--muted)]">
									Номер гарантийного письма
								</label>
								<input
									type="text"
									className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
									value={patient?.dmsGuaranteeLetterNumber ?? ""}
									onChange={(e) => onUpdatePatient?.("dmsGuaranteeLetterNumber", e.target.value)}
									placeholder="ГП-8841/26"
									disabled={disabled}
									data-testid="input-dms-letter-number"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-[11px] font-bold text-[var(--muted)]">
									Лимит покрытия (₽)
								</label>
								<input
									type="number"
									className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
									value={patient?.dmsCoverageLimitRub ?? ""}
									onChange={(e) => {
										const val = e.target.value ? parseFloat(e.target.value) : undefined;
										onUpdatePatient?.("dmsCoverageLimitRub", val);
										onUpdatePatient?.("dmsCoverageLimitKopecks", val ? Math.round(val * 100) : undefined);
									}}
									placeholder="50000"
									disabled={disabled}
									data-testid="input-dms-coverage-limit"
								/>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-[11px] font-bold text-[var(--muted)]">
									Программа ДМС
								</label>
								<input
									type="text"
									className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
									value={patient?.dmsProgramName ?? ""}
									onChange={(e) => onUpdatePatient?.("dmsProgramName", e.target.value)}
									placeholder="Стоматология Стандарт"
									disabled={disabled}
									data-testid="input-dms-program"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	},
);

export default PatientInsuranceSection;
