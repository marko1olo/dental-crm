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
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
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
								title="Для пациентов-физлиц ИНН не требуется (Мандат 8e). Заполняется добровольно или для юрлиц/ИП"
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

						<div className="flex flex-col gap-1">
							<div className="flex items-center justify-between">
								<label className="text-[11px] font-bold text-[var(--muted)]">Полис ДМС (Номер)</label>
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
									className="min-h-[44px] sm:min-h-[24px] h-6 px-2 rounded text-[11px] font-bold bg-teal-50 dark:bg-teal-950/40 border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 cursor-pointer flex items-center gap-1 transition-colors"
									title="Открыть гарантийные письма и согласованные услуги по ДМС"
									data-testid="btn-open-dms-letters-tab"
								>
									<Shield className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
									<span>Гарантийные письма</span>
								</button>
							</div>
							<input
								type="text"
								className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
								value={patient?.dmsPolicyNumber ?? ""}
								onChange={(e) => onUpdatePatient?.("dmsPolicyNumber", e.target.value)}
								placeholder="Номер договора ДМС"
								disabled={disabled}
								data-testid="input-dms-policy"
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-[var(--glass-border)]">
						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted)]">Страховая компания ДМС</label>
							<div className="flex items-center gap-1.5">
								<input
									type="text"
									className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] flex-1 focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
									value={patient?.dmsInsuranceCompany ?? ""}
									onChange={(e) => onUpdatePatient?.("dmsInsuranceCompany", e.target.value)}
									placeholder="СОГАЗ, Ингосстрах..."
									disabled={disabled}
									data-testid="input-dms-company"
								/>
								<div className="hidden sm:flex items-center gap-1 overflow-x-auto scrollbar-none">
									{POPULAR_DMS_COMPANIES.slice(0, 3).map((comp) => (
										<button
											key={comp}
											type="button"
											className="min-h-[44px] sm:min-h-[28px] text-[10px] px-2 py-1 rounded-lg bg-[var(--paper-strong)] hover:bg-[var(--glass-hover,var(--paper-soft))] hover:border-[var(--teal)] font-semibold border border-[var(--glass-border)] text-[var(--ink)] shrink-0 cursor-pointer transition-colors shadow-2xs"
											onClick={() => onUpdatePatient?.("dmsInsuranceCompany", comp)}
										>
											{comp}
										</button>
									))}
								</div>
							</div>
						</div>

						<div className="flex flex-col gap-1">
							<label className="text-[11px] font-bold text-[var(--muted)]">Программа и лимит ДМС</label>
							<input
								type="text"
								className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
								value={patient?.dmsProgramName ?? ""}
								onChange={(e) => onUpdatePatient?.("dmsProgramName", e.target.value)}
								placeholder="Стоматология Бизнес (лимит 50 000 ₽)"
								disabled={disabled}
								data-testid="input-dms-program"
							/>
						</div>
					</div>
				</div>
			</div>
		);
	},
);

export default PatientInsuranceSection;
