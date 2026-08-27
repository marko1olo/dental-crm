/**
 * PatientBillingModal.tsx — 1-Click Completed Works Act & Warranty Certificate Studio (A4).
 * Compliant with Order 804n, Law No. 2300-1, and Government Decree No. 736.
 */

import React, { useMemo, useState } from "react";
import {
	Award,
	Check,
	Copy,
	Download,
	Eye,
	FileCheck,
	FileText,
	Layers,
	Percent,
	Phone,
	Printer,
	QrCode,
	Send,
	ShieldCheck,
	Smartphone,
	Sparkles,
	X,
} from "lucide-react";
import {
	type CompletedWorksActParams,
	type InvoiceServiceItem,
	compileCompletedWorksAct,
	generateCompletedActAndWarrantyHtml,
} from "./invoiceEngine";
import {
	distributeLoyaltyDiscountAcrossItems,
	LOYALTY_DISCOUNT_PRESETS,
	type LoyaltyDiscountPreset,
} from "./fiscal/fiscal54fzEngine";
import {
	groupServicesIntoFriendlyBlocks,
	generateFriendlyBillingWhatsAppMessage,
	buildWhatsAppLink,
} from "../portal/patientCabinet/patientCareInstructionsEngine";
import { generateQrCodeSvg } from "../portal/patientCabinet/patientCabinetEngine";
import { OneCExportButton } from "./OneCExportButton";

export interface PatientBillingModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: {
		readonly id?: string | undefined;
		readonly fullName?: string | null | undefined;
		readonly birthDate?: string | null | undefined;
		readonly passportData?: string | null | undefined;
		readonly phone?: string | null | undefined;
		readonly address?: string | null | undefined;
		readonly medicalCardNumber?: string | null | undefined;
	} | null | undefined;
	readonly doctor?: {
		readonly fullName?: string | null | undefined;
		readonly specialty?: string | null | undefined;
	} | null | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicLicenseNumber?: string | undefined;
	readonly initialServices?: readonly InvoiceServiceItem[] | undefined;
	readonly contractNumber?: string | undefined;
	readonly contractDateIso?: string | undefined;
}

export const PatientBillingModal: React.FC<PatientBillingModalProps> = ({
	isOpen,
	onClose,
	patient,
	doctor,
	clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicLicenseNumber = "ЛО41-01137-77/00368421",
	initialServices = [],
	contractNumber = "Д-2026/089",
	contractDateIso,
}) => {
	const [activeTab, setActiveTab] = useState<"preview" | "friendly" | "details">("friendly");
	const [actNumber] = useState(() => `АКТ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
	const [copied, setCopied] = useState(false);
	const [isQrOpen, setIsQrOpen] = useState(false);
	const [toastMsg, setToastMsg] = useState<string | null>(null);
	const [discountPreset, setDiscountPreset] = useState<LoyaltyDiscountPreset>("none");
	const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);
	const [customDiscountRub, setCustomDiscountRub] = useState<number>(0);

	// Raw services before discount
	const rawServices: InvoiceServiceItem[] = useMemo(() => {
		if (initialServices.length > 0) return [...initialServices];
		return [
			{
				id: "srv-1",
				name: "Восстановление зуба пломбой (светоотверждаемый нанокомпозит Filtek Ultimate)",
				code804n: "A16.07.002.001",
				toothNumber: "16",
				quantity: 1,
				priceRub: 6500,
				category: "therapy",
			},
			{
				id: "srv-2",
				name: "Инфильтрационная анестезия (Артикаин 4% с эпинефрином)",
				code804n: "B01.003.004.001",
				toothNumber: "16",
				quantity: 1,
				priceRub: 1200,
				category: "therapy",
			},
			{
				id: "srv-3",
				name: "Установка дентального имплантата Straumann BLX (Швейцария)",
				code804n: "A16.07.054",
				toothNumber: "26",
				quantity: 1,
				priceRub: 55000,
				category: "implantology",
			},
		];
	}, [initialServices]);

	const discountResult = useMemo(() => {
		return distributeLoyaltyDiscountAcrossItems(rawServices, {
			preset: discountPreset,
			customPercent: customDiscountPercent,
			customRub: customDiscountRub,
		});
	}, [rawServices, discountPreset, customDiscountPercent, customDiscountRub]);

	const services: readonly InvoiceServiceItem[] = discountResult.items;

	const friendlyBreakdown = useMemo(() => {
		return groupServicesIntoFriendlyBlocks(services);
	}, [services]);

	const actParams: CompletedWorksActParams = useMemo(() => {
		return {
			actNumber,
			contractNumber,
			contractDateIso: contractDateIso || new Date().toISOString(),
			actDateIso: new Date().toISOString(),
			clinic: {
				name: "Стоматологическая клиника ДЕНТЕ",
				legalName: clinicLegalName,
				inn: "7701234567",
				kpp: "770101001",
				ogrn: "1027700132195",
				licenseNumber: clinicLicenseNumber,
				licenseDate: "12.10.2021",
				address: "г. Москва, Ломоносовский проспект, д. 24",
				phone: "+7 (495) 789-01-23",
				chiefDoctorName: "Д-р Смирнов А. В.",
			},
			patient: {
				id: patient?.id,
				fullName: patient?.fullName || "Иванов Иван Иванович",
				birthDate: patient?.birthDate || undefined,
				passportData: patient?.passportData || "Паспорт РФ: 45 12 № 384920, выдан ОВД Хамовники г. Москвы",
				phone: patient?.phone || "+7 (916) 123-45-67",
				address: patient?.address || "г. Москва, ул. Арбат, д. 12, кв. 4",
				medicalCardNumber: patient?.medicalCardNumber || "043/у-2026",
			},
			doctor: {
				fullName: doctor?.fullName || "Д-р Кузнецов П. С.",
				specialty: doctor?.specialty || "Врач-стоматолог терапевт-ортопед",
			},
			items: services,
		};
	}, [actNumber, contractNumber, contractDateIso, clinicLegalName, clinicLicenseNumber, patient, doctor, services]);

	const summary = useMemo(() => compileCompletedWorksAct(actParams), [actParams]);
	const printableHtml = useMemo(() => generateCompletedActAndWarrantyHtml(actParams), [actParams]);

	const handleSendWhatsApp = () => {
		const text = generateFriendlyBillingWhatsAppMessage(
			actParams.patient.fullName,
			friendlyBreakdown,
			actParams.clinic.name,
			actParams.clinic.phone || "+7 (495) 789-01-23",
		);
		const link = buildWhatsAppLink(actParams.patient.phone || "+79991234567", text);
		window.open(link, "_blank");
		setToastMsg("Детализация счета отправлена в WhatsApp!");
		setTimeout(() => setToastMsg(null), 3000);
	};

	if (!isOpen) return null;

	const handlePrint = () => {
		const printWin = window.open("", "_blank", "width=850,height=1050");
		if (printWin) {
			printWin.document.write(printableHtml);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 250);
		}
	};

	const handleCopyText = () => {
		const text = `АКТ ВЫПОЛНЕННЫХ РАБОТ И ГАРАНТИЙНЫЙ ТАЛОН № ${summary.actNumber}
Пациент: ${actParams.patient.fullName}
Клиника: ${actParams.clinic.legalName} (Лицензия ${actParams.clinic.licenseNumber})
Итого оказано услуг: ${summary.totalNetRubFormatted} ₽ (${summary.totalInWords})
Гарантийные обязательства:
${summary.warrantyTerms.map((w) => `• ${w.categoryName} (Зубы: ${w.teethDisplay}): ${w.warrantyPeriodText}. Условия: ${w.conditionsText}`).join("\n")}`;

		if (navigator.clipboard) {
			navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-label="Акт выполненных работ и гарантийный талон"
			data-testid="patient-billing-modal"
		>
			<div className="bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
				{/* Toast Notification */}
				{toastMsg && (
					<div className="bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0">
						<span>✓ {toastMsg}</span>
						<button type="button" onClick={() => setToastMsg(null)} className="text-white hover:opacity-80">✕</button>
					</div>
				)}

				{/* Top Header */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-3">
					<div className="flex items-center gap-3 min-w-0 flex-1">
						<div className="w-9 h-9 rounded-xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/25 shrink-0">
							<FileCheck className="w-4 h-4" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
								<h3 className="text-sm sm:text-base font-extrabold text-[var(--ink)] m-0 whitespace-nowrap">
									Акт выполненных работ & Гарантийный талон (А4)
								</h3>
								<span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30 uppercase shrink-0">
									Официальный бланк
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5 truncate">
								Лицензия № {clinicLicenseNumber} • Приказ МЗ РФ № 804н • Закон РФ № 2300-1
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handlePrint}
							className="px-3.5 py-1.5 h-8 sm:h-9 rounded-xl text-xs font-bold bg-[var(--teal,#0d9488)] hover:opacity-90 text-[var(--on-teal,#ffffff)] shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
							data-testid="btn-print-billing-act"
						>
							<Printer className="w-4 h-4 shrink-0" />
							<span className="hidden sm:inline">Печать бланка А4 (Ctrl+P)</span>
							<span className="sm:hidden">Печать А4</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="h-8 w-8 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer flex items-center justify-center border border-transparent hover:border-[var(--line)] shrink-0"
							aria-label="Закрыть окно"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Tabs Navigation (Compact 32px SegmentedControl) */}
				<div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2 border-b border-[var(--line)] bg-[var(--paper)] text-xs font-bold shrink-0">
					<div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--border,#cbd5e1)] text-xs shrink-0 overflow-x-auto max-w-full">
						<button
							type="button"
							onClick={() => setActiveTab("friendly")}
							className={`h-8 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap font-semibold shrink-0 ${
								activeTab === "friendly"
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="btn-tab-friendly-bill"
						>
							<Sparkles className="w-3.5 h-3.5 shrink-0" />
							<span>Понятный счет (без латыни)</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("preview")}
							className={`h-8 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap font-semibold shrink-0 ${
								activeTab === "preview"
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="btn-tab-preview-act"
						>
							<Eye className="w-3.5 h-3.5 shrink-0" />
							<span>Официальный бланк А4</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("details")}
							className={`h-8 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap font-semibold shrink-0 ${
								activeTab === "details"
									? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="btn-tab-details-act"
						>
							<Layers className="w-3.5 h-3.5 shrink-0" />
							<span>Спецификация и гарантии ({summary.items.length} поз.)</span>
						</button>
					</div>

					<div className="flex items-center gap-1.5 shrink-0">
						{patient?.phone && (
							<a
								href={`tel:+${patient.phone.replace(/\D/g, "")}`}
								className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--ok-bg,#f0fdf4)] border border-[var(--ok-fg,#059669)]/30 text-[var(--ok-fg,#059669)] hover:opacity-90 flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
								title="Позвонить пациенту"
							>
								<Phone className="w-3 h-3 text-[var(--ok-fg,#059669)] shrink-0" />
								<span>Позвонить</span>
							</a>
						)}
						<button
							type="button"
							onClick={handleSendWhatsApp}
							className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[#25d366] hover:bg-[#20ba59] text-white flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
							data-testid="btn-quick-whatsapp-bill"
							title="Отправить понятный счет в WhatsApp"
						>
							<Send className="w-3 h-3 shrink-0" />
							<span className="shrink-0 whitespace-nowrap">В WhatsApp</span>
						</button>
						<button
							type="button"
							onClick={handleCopyText}
							className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
							title="Скопировать акт и гарантийные условия в буфер обмена"
						>
							<Copy className="w-3 h-3 shrink-0" />
							<span className="shrink-0 whitespace-nowrap">{copied ? "Скопировано!" : "Копировать"}</span>
						</button>
					</div>
				</div>

				{/* Loyalty Discount & Presets Toolbar (Compact h-8 Controls) */}
				<div className="px-4 sm:px-6 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)] flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
					<div className="flex items-center gap-2 font-bold text-[var(--ink)]">
						<Percent className="w-3.5 h-3.5 text-[var(--brand-primary,#0d9488)]" />
						<span>Скидка:</span>
					</div>

					<div className="flex items-center gap-1.5 flex-wrap">
						{LOYALTY_DISCOUNT_PRESETS.map((preset) => (
							<button
								key={preset.id}
								type="button"
								onClick={() => setDiscountPreset(preset.id)}
								className={`h-8 px-2.5 rounded-lg font-bold transition-all cursor-pointer ${
									discountPreset === preset.id
										? "bg-[var(--brand-primary,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
										: "bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink)] hover:border-[var(--brand-primary,#0d9488)]"
								}`}
								title={preset.description}
							>
								{preset.label}
							</button>
						))}
					</div>

					{discountPreset === "manual_percent" && (
						<div className="flex items-center gap-1.5">
							<input
								type="number"
								min={0}
								max={100}
								value={customDiscountPercent || ""}
								onChange={(e) => setCustomDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
								placeholder="0%"
								className="h-8 w-20 px-2 py-1 text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line)] rounded-lg text-[var(--ink)]"
							/>
							<span>%</span>
						</div>
					)}

					{discountPreset === "manual_rub" && (
						<div className="flex items-center gap-1.5">
							<input
								type="number"
								min={0}
								max={discountResult.totalGrossRub}
								value={customDiscountRub || ""}
								onChange={(e) => setCustomDiscountRub(Math.max(0, parseFloat(e.target.value) || 0))}
								placeholder="0 ₽"
								className="h-8 w-24 px-2 py-1 text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line)] rounded-lg text-[var(--ink)]"
							/>
							<span>₽</span>
						</div>
					)}

					{discountResult.totalDiscountRub > 0 && (
						<div className="h-8 px-2.5 rounded-lg bg-[var(--ok-bg,#f0fdf4)] border border-[var(--ok-fg,#059669)]/30 text-[var(--ok-fg,#059669)] font-extrabold flex items-center gap-1">
							<Sparkles className="w-3 h-3 text-[var(--ok-fg,#059669)]" />
							<span>{discountResult.savingsText} ({discountResult.effectivePercent}%)</span>
						</div>
					)}
				</div>

				{/* Body Content */}
				<div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
					{activeTab === "friendly" ? (
						<div className="space-y-4" data-testid="friendly-billing-view">
							{/* Summary Header Card */}
							<div className="p-4 sm:p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3">
								<div className="flex items-center justify-between flex-wrap gap-3">
									<div className="max-w-xl">
										<div className="flex items-center gap-2">
											<Sparkles className="w-5 h-5 text-[var(--teal,#0d9488)]" />
											<h4 className="text-base font-extrabold text-[var(--ink)] m-0">
												Понятная расшифровка счета для пациента
											</h4>
										</div>
										<p className="text-xs text-[var(--muted)] m-0 mt-1">
											{friendlyBreakdown.patientFriendlySummaryRu}
										</p>
									</div>

									<div className="flex items-center gap-2 flex-wrap">
										<button
											type="button"
											onClick={handleSendWhatsApp}
											className="px-4 py-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold bg-[#25d366] hover:bg-[#20ba59] text-white shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
											data-testid="btn-send-bill-whatsapp"
										>
											<Send className="w-4 h-4" />
											<span>Отправить в WhatsApp</span>
										</button>
										<button
											type="button"
											onClick={() => setIsQrOpen(true)}
											className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors"
											data-testid="btn-show-bill-qr"
										>
											<QrCode className="w-4 h-4" />
											<span>QR для телефона</span>
										</button>
									</div>
								</div>
							</div>

							{/* Grouped Friendly Blocks */}
							<div className="space-y-3">
								{friendlyBreakdown.groups.map((grp) => (
									<div
										key={grp.categoryGroup}
										className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3 shadow-xs"
										data-testid={`friendly-group-${grp.categoryGroup}`}
									>
										<div className="flex items-center justify-between flex-wrap gap-2 border-b border-[var(--line)] pb-2.5">
											<div className="flex items-center gap-2.5">
												<span className="text-2xl leading-none">{grp.groupIcon}</span>
												<div>
													<div className="flex items-center gap-2">
														<h4 className="text-sm sm:text-base font-extrabold text-[var(--ink)] m-0">
															{grp.categoryGroupRu}
														</h4>
														<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30">
															{grp.percentageOfTotal}% от счета
														</span>
													</div>
													<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
														{grp.summaryRu}
													</p>
												</div>
											</div>

											<div className="text-right">
												<div className="text-base sm:text-lg font-black text-[var(--teal,#0d9488)] font-mono">
													{grp.subtotalRub.toLocaleString("ru-RU")} ₽
												</div>
											</div>
										</div>

										{/* Items in this group */}
										<div className="space-y-2">
											{grp.items.map((it) => (
												<div
													key={it.id}
													className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-3 text-xs"
												>
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2 flex-wrap">
															<strong className="text-[var(--ink)] font-bold">
																{it.friendlyName}
															</strong>
															{it.toothNumber && (
																<span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-[var(--ink)]">
																	Зуб #{it.toothNumber}
																</span>
															)}
														</div>
														<div className="text-[11px] text-[var(--muted)] mt-0.5">
															{it.plainDescriptionRu}
														</div>
													</div>

													<div className="text-right shrink-0">
														<div className="font-bold text-[var(--ink)] font-mono text-sm">
															{it.totalRub.toLocaleString("ru-RU")} ₽
														</div>
														{it.quantity > 1 && (
															<div className="text-[10px] text-[var(--muted)]">
																{it.quantity} шт. &times; {it.priceRub.toLocaleString("ru-RU")} ₽
															</div>
														)}
													</div>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					) : activeTab === "preview" ? (
						<div className="border border-slate-300 dark:border-slate-700 rounded-2xl bg-white text-black p-6 sm:p-8 shadow-inner overflow-x-auto text-xs">
							{/* Printable Preview Sheet */}
							<div className="max-w-3xl mx-auto space-y-4 font-serif">
								{/* Header */}
								<div className="flex justify-between items-start border-b-2 border-black pb-3">
									<div>
										<div className="font-sans font-bold text-sm uppercase">{actParams.clinic.legalName}</div>
										<div className="text-[11px] text-slate-700">Лицензия: № {actParams.clinic.licenseNumber} от {actParams.clinic.licenseDate} г.</div>
										<div className="text-[11px] text-slate-700">Адрес: {actParams.clinic.address}</div>
									</div>
									<div className="text-right text-[11px] text-slate-700">
										<div>ИНН: {actParams.clinic.inn} / КПП: {actParams.clinic.kpp}</div>
										<div>ОГРН: {actParams.clinic.ogrn}</div>
										<div>Тел: <strong>{actParams.clinic.phone}</strong></div>
									</div>
								</div>

								{/* Title */}
								<div className="text-center font-sans">
									<h2 className="text-sm sm:text-base font-black uppercase tracking-tight m-0">
										АКТ ВЫПОЛНЕННЫХ РАБОТ И ГАРАНТИЙНЫЙ ТАЛОН № {summary.actNumber}
									</h2>
									<p className="text-[11px] text-slate-600 m-0 mt-0.5">
										к Договору на оказание платных медицинских услуг № {actParams.contractNumber} • Дата: {new Date().toLocaleDateString("ru-RU")} г.
									</p>
								</div>

								{/* Requisites Table */}
								<table className="w-full border-collapse border border-slate-400 text-[11px]">
									<tbody>
										<tr>
											<td className="p-1.5 bg-slate-100 font-bold border border-slate-400 w-1/4">Исполнитель (Клиника):</td>
											<td className="p-1.5 border border-slate-400 w-1/4">{actParams.clinic.legalName}</td>
											<td className="p-1.5 bg-slate-100 font-bold border border-slate-400 w-1/4">Пациент (Заказчик):</td>
											<td className="p-1.5 border border-slate-400 w-1/4 font-bold">{actParams.patient.fullName}</td>
										</tr>
										<tr>
											<td className="p-1.5 bg-slate-100 font-bold border border-slate-400">Лечащий врач:</td>
											<td className="p-1.5 border border-slate-400">{actParams.doctor.fullName}</td>
											<td className="p-1.5 bg-slate-100 font-bold border border-slate-400">Паспорт / Медкарта:</td>
											<td className="p-1.5 border border-slate-400">{actParams.patient.medicalCardNumber}</td>
										</tr>
									</tbody>
								</table>

								{/* Services Table */}
								<div>
									<div className="font-sans font-bold text-xs mb-1 uppercase">1. Оказанные медицинские услуги:</div>
									<table className="w-full border-collapse border border-black text-[11px]">
										<thead>
											<tr className="bg-slate-100 font-bold">
												<th className="border border-black p-1 text-center w-8">№</th>
												<th className="border border-black p-1 text-center w-24">Код 804н</th>
												<th className="border border-black p-1 text-center w-14">Зуб</th>
												<th className="border border-black p-1 text-left">Наименование медицинской услуги</th>
												<th className="border border-black p-1 text-center w-12">Кол.</th>
												<th className="border border-black p-1 text-right w-20">Цена, ₽</th>
												<th className="border border-black p-1 text-right w-24">Сумма, ₽</th>
											</tr>
										</thead>
										<tbody>
											{summary.items.map((it, idx) => (
												<tr key={it.id || idx}>
													<td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
													<td className="border border-black p-1 text-center font-mono text-[10px]">{it.code804n || "—"}</td>
													<td className="border border-black p-1 text-center font-bold">{it.toothNumber ? `№${it.toothNumber}` : "—"}</td>
													<td className="border border-black p-1">{it.name}</td>
													<td className="border border-black p-1 text-center font-mono">{it.quantity}</td>
													<td className="border border-black p-1 text-right font-mono">{it.priceRub.toFixed(2)}</td>
													<td className="border border-black p-1 text-right font-mono font-bold">{(it.priceRub * it.quantity - (it.discountRub || 0)).toFixed(2)}</td>
												</tr>
											))}
											<tr className="bg-slate-100 font-bold">
												<td colSpan={6} className="border border-black p-1.5 text-right uppercase">Итого к оплате (Без НДС):</td>
												<td className="border border-black p-1.5 text-right font-mono text-sm">{summary.totalNetRubFormatted} ₽</td>
											</tr>
										</tbody>
									</table>
									<div className="mt-1 text-[11px]">
										<strong>Сумма прописью:</strong> <em>{summary.totalInWords}</em>.
									</div>
								</div>

								{/* Warranty Box */}
								<div className="border border-black p-2.5 rounded-lg bg-slate-50 space-y-1.5">
									<div className="font-sans font-bold text-xs uppercase flex items-center gap-1.5 text-[var(--ok-fg,#059669)]">
										<ShieldCheck className="w-4 h-4 text-[var(--ok-fg,#059669)] inline" />
										<span>2. Гарантийный талон и обязательства клиники (СтАР & Закон РФ № 2300-1):</span>
									</div>
									<table className="w-full border-collapse border border-slate-400 text-[10px] bg-white">
										<thead>
											<tr className="bg-slate-100 font-bold">
												<th className="border border-slate-400 p-1 text-left">Категория лечения</th>
												<th className="border border-slate-400 p-1 text-center">Зубы</th>
												<th className="border border-slate-400 p-1 text-left">Гарантийный срок</th>
												<th className="border border-slate-400 p-1 text-left">Срок службы</th>
											</tr>
										</thead>
										<tbody>
											{summary.warrantyTerms.map((w, idx) => (
												<tr key={idx}>
													<td className="border border-slate-400 p-1 font-bold">{w.categoryName}</td>
													<td className="border border-slate-400 p-1 text-center font-mono">{w.teethDisplay}</td>
													<td className="border border-slate-400 p-1 text-[var(--ok-fg,#059669)] font-bold">{w.warrantyPeriodText}</td>
													<td className="border border-slate-400 p-1">{w.serviceLifeText}</td>
												</tr>
											))}
										</tbody>
									</table>
									<div className="text-[10px] text-slate-600 leading-tight">
										Условия гарантии: строгое соблюдение гигиены полости рта, прохождение бесплатного профосмотра и профгигиены каждые 6 месяцев.
									</div>
								</div>

								{/* Signatures & Seal Zone */}
								<div className="grid grid-cols-2 gap-8 pt-4 border-t border-black text-[11px]">
									<div>
										<div className="font-bold">Исполнитель: {actParams.clinic.legalName}</div>
										<div>Врач-стоматолог: <strong>{actParams.doctor.fullName}</strong></div>
										<div className="border-b border-black mt-5 pb-0.5 flex justify-between text-[10px]">
											<span>Подпись: ________________</span>
											<span>/ {actParams.doctor.fullName} /</span>
										</div>
										<div className="flex items-center gap-3 mt-2">
											<div className="border-2 border-[var(--ok-fg,#059669)] text-[var(--ok-fg,#059669)] font-black text-xs px-2 py-0.5 rounded-sm uppercase transform -rotate-3">
												✓ ОПЛАЧЕНО
											</div>
											<div className="w-16 h-16 rounded-full border border-dashed border-slate-400 flex items-center justify-center text-[9px] text-slate-500 text-center">
												М.П.<br />Клиники
											</div>
										</div>
									</div>
									<div>
										<div className="font-bold">Заказчик (Пациент):</div>
										<div>ФИО: <strong>{actParams.patient.fullName}</strong></div>
										<div className="border-b border-black mt-5 pb-0.5 flex justify-between text-[10px]">
											<span>Подпись: ________________</span>
											<span>/ {actParams.patient.fullName} /</span>
										</div>
										<div className="text-[9px] text-slate-500 mt-2">
											Претензий по качеству и объему услуг не имею. С условиями гарантии ознакомлен.
										</div>
									</div>
								</div>
							</div>
						</div>
					) : (
						/* Details Tab */
						<div className="space-y-4">
							<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3">
								<div className="flex items-center gap-2 font-bold text-sm text-[var(--ink)]">
									<Award className="w-4 h-4 text-[var(--teal,#0d9488)]" />
									<span>Гарантийные условия по позициям счета:</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
									{summary.warrantyTerms.map((term, idx) => (
										<div key={idx} className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
											<div className="flex items-center justify-between gap-2">
												<strong className="text-[var(--teal,#0d9488)]">{term.categoryName}</strong>
												<span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-[var(--line)]">
													{term.teethDisplay}
												</span>
											</div>
											<div className="text-[var(--ok-fg,#059669)] font-semibold">
												Гарантия: {term.warrantyPeriodText}
											</div>
											<div className="text-[var(--muted)]">Срок службы: {term.serviceLifeText}</div>
											<div className="text-[11px] text-[var(--muted)] border-t border-[var(--line)] pt-1 mt-1">
												💡 {term.conditionsText}
											</div>
										</div>
									))}
								</div>
							</div>

							<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2">
								<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted)] m-0">
									Реквизиты медицинской лицензии и клиники:
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
									<div>
										<span className="text-[var(--muted)]">Юр. лицо:</span> <strong>{actParams.clinic.legalName}</strong>
									</div>
									<div>
										<span className="text-[var(--muted)]">Лицензия:</span> <strong>№ {actParams.clinic.licenseNumber}</strong>
									</div>
									<div>
										<span className="text-[var(--muted)]">ИНН / ОГРН:</span> {actParams.clinic.inn} / {actParams.clinic.ogrn}
									</div>
									<div>
										<span className="text-[var(--muted)]">Главный врач:</span> {actParams.clinic.chiefDoctorName}
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Bottom Footer Actions (Fixed Sticky Bar) */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-3">
					<div className="text-xs text-[var(--muted)] font-medium">
						Итоговая сумма: <strong className="text-sm sm:text-base text-[var(--teal,#0d9488)] font-mono font-bold">{friendlyBreakdown.totalAmountRubFormatted}</strong>
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={handleSendWhatsApp}
							className="h-9 px-3.5 rounded-xl text-xs font-bold bg-[#25d366] hover:bg-[#20ba59] text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
							data-testid="btn-footer-send-whatsapp"
						>
							<Send className="w-3.5 h-3.5" />
							<span>В WhatsApp</span>
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="h-9 px-4 rounded-xl text-xs font-extrabold bg-[var(--teal,#0d9488)] hover:opacity-90 text-[var(--on-teal,#ffffff)] shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
						>
							<Printer className="w-3.5 h-3.5" />
							<span>Печать (А4)</span>
						</button>
						<OneCExportButton
							actNumber={summary.actNumber}
							documentDate={new Date().toISOString().slice(0, 10)}
							docType="act"
							patientName={actParams.patient.fullName}
							patientId={patient?.id || "pat-1"}
							patientPhone={patient?.phone || ""}
							patientAddress={patient?.address || ""}
							doctorName={actParams.doctor.fullName}
							clinicName={actParams.clinic.legalName}
							clinicInn={actParams.clinic.inn}
							clinicKpp={actParams.clinic.kpp || ""}
							items={summary.items.map((it) => {
								const itemObj: {
									id: string;
									code804n: string;
									name: string;
									quantity: number;
									priceRub: number;
									toothNumber?: number;
									discountRub?: number;
								} = {
									id: it.id,
									code804n: it.code804n || "A16.07.002",
									name: it.name,
									quantity: it.quantity,
									priceRub: it.priceRub,
								};
								if (it.toothNumber) {
									itemObj.toothNumber = Number(it.toothNumber);
								}
								if (it.discountRub !== undefined) {
									itemObj.discountRub = it.discountRub;
								}
								return itemObj;
							})}
							totalRub={summary.totalNetRub}
							contractNumber={actParams.contractNumber}
							contractDate={actParams.contractDateIso?.split("T")[0] || new Date().toISOString().split("T")[0]}
							className="h-9 px-3.5 font-bold"
						/>
						<button
							type="button"
							onClick={onClose}
							className="h-9 px-3.5 rounded-xl text-xs font-semibold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
						>
							Закрыть
						</button>
					</div>
				</div>

				{/* QR Code Phone Modal */}
				{isQrOpen && (
					<div
						className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
						onClick={() => setIsQrOpen(false)}
						role="dialog"
						aria-modal="true"
						data-testid="billing-phone-qr-modal"
					>
						<div
							className="bg-white text-black p-6 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-4"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="flex items-center justify-between w-full">
								<div className="flex items-center gap-2 text-[var(--teal,#0d9488)] font-bold text-sm">
									<Smartphone className="w-4 h-4" />
									<span>Сохранить счет на телефон</span>
								</div>
								<button
									type="button"
									onClick={() => setIsQrOpen(false)}
									className="p-1 rounded-lg text-slate-400 hover:text-black cursor-pointer"
								>
									<X className="w-5 h-5" />
								</button>
							</div>

							<div
								className="p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-md"
								dangerouslySetInnerHTML={{
									__html: generateQrCodeSvg(
										`https://dente.ru/bill/${summary.actNumber}?sum=${friendlyBreakdown.totalAmountRub}&patient=${encodeURIComponent(actParams.patient.fullName)}`,
										{ size: 200 },
									),
								}}
							/>

							<div>
								<div className="text-xs text-slate-500 font-medium">Сумма к оплате:</div>
								<div className="text-xl font-black text-[var(--teal,#0d9488)] font-mono">
									{friendlyBreakdown.totalAmountRubFormatted}
								</div>
							</div>

							<p className="text-xs text-slate-600 leading-snug m-0">
								Наведите камеру смартфона для мгновенного сохранения детализации и оплаты через СБП без комиссии.
							</p>

							<button
								type="button"
								onClick={() => setIsQrOpen(false)}
								className="w-full py-2.5 rounded-xl font-bold bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-md hover:opacity-90 cursor-pointer min-h-[44px]"
							>
								Готово
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
