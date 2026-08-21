import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
	Building2,
	Check,
	CheckCircle2,
	FileCode,
	FileText,
	Layers,
	Palette,
	Printer,
	QrCode,
	RotateCcw,
	Save,
	Settings2,
	Sliders,
	Sparkles,
	Type,
	X,
} from "lucide-react";
import {
	BRAND_COLOR_PALETTES,
	type DocumentBrandColor,
	type DocumentDensity,
	type DocumentFontFamily,
	type DocumentHeaderStyle,
	useDocumentBrandingStore,
} from "../../store/documentBrandingStore";
import { PremiumDocumentPrintSheet } from "./PremiumDocumentPrintSheet";
import { showToast } from "../GlobalToast";

export interface DocumentCustomizerModalProps {
	isOpen: boolean;
	onClose: () => void;
	samplePatient?: {
		fullName?: string | null | undefined;
		birthDate?: string | null | undefined;
		medicalCardNumber?: string | null | undefined;
		passport?: string | null | undefined;
		omsPolis?: string | null | undefined;
		snils?: string | null | undefined;
		phone?: string | null | undefined;
		address?: string | null | undefined;
		gender?: string | null | undefined;
	} | null | undefined;
	sampleDoctorName?: string | null | undefined;
	sampleDoctorSpecialty?: string | null | undefined;
}

export const DocumentCustomizerModal: React.FC<DocumentCustomizerModalProps> = ({
	isOpen,
	onClose,
	samplePatient = {
		fullName: "Иванова Екатерина Сергеевна",
		birthDate: "1988-05-14",
		medicalCardNumber: "043-8821/26",
		passport: "Серия 45 12 № 789456 выдан ОВД г. Москвы",
		omsPolis: "7756 8899 0012 3456",
		snils: "145-882-901 88",
		phone: "+7 (916) 123-45-67",
	},
	sampleDoctorName = "Д-р Смирнов А. В.",
	sampleDoctorSpecialty = "Врач стоматолог-терапевт, хирург",
}) => {
	const branding = useDocumentBrandingStore();
	const [activeTab, setActiveTab] = useState<"style" | "requisites" | "sections" | "typography">("style");

	if (!isOpen) return null;

	const handleSave = () => {
		showToast("Фирменный стиль документов сохранён", "success");
		onClose();
	};

	const handleTestPrint = () => {
		window.print();
	};

	const modalContent = (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Конструктор фирменных бланков и документов клиники"
		>
			<div className="relative w-full max-w-7xl h-[92vh] max-h-[950px] bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#cbd5e1)] dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)] dark:text-slate-100">
				{/* ── Modal Header ── */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900/90 no-print">
					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-2xl bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 shrink-0">
							<Sparkles className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-lg font-black text-[var(--ink,#0f172a)] dark:text-white m-0 flex items-center gap-2">
								Конструктор фирменных бланков и документов клиники
								<span className="text-xs px-2 py-0.5 rounded-full font-bold bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30">
									A4 / Форма 043/у
								</span>
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0 mt-0.5">
								Настройка официального медицинского оформления, цветовой палитры, логотипа и секций печати.
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={branding.resetToDefaults}
							className="px-3.5 py-2 min-h-[44px] rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-[var(--muted,#64748b)] dark:text-slate-300 text-xs font-semibold hover:text-[var(--ink,#0f172a)] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
							title="Сбросить к стандартному оформлению Минздрава РФ"
						>
							<RotateCcw className="w-3.5 h-3.5" />
							<span>Сброс</span>
						</button>
						<button
							type="button"
							onClick={handleTestPrint}
							className="px-4 py-2 min-h-[44px] rounded-xl border border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
							title="Проверить печать на принтере"
						>
							<Printer className="w-4 h-4" />
							<span>Тест печати</span>
						</button>
						<button
							type="button"
							onClick={handleSave}
							className="px-5 py-2 min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-teal-600/30 flex items-center gap-1.5 cursor-pointer"
						>
							<Save className="w-4 h-4" />
							<span>Сохранить шаблон</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
							aria-label="Закрыть конструктор"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* ── Main Body: 2 Columns (Controls vs Live A4 Sheet Preview) ── */}
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
					{/* Left Column: Settings Panel (5 cols) */}
					<div className="lg:col-span-5 border-r border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col bg-[var(--paper,#ffffff)] dark:bg-slate-900/95 overflow-hidden">
						{/* Tabs Header */}
						<div className="flex border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 p-2 gap-1 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950/60 overflow-x-auto">
							<button
								type="button"
								onClick={() => setActiveTab("style")}
								className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
									activeTab === "style"
										? "bg-teal-600 text-white shadow-sm"
										: "text-[var(--muted,#64748b)] dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
								}`}
							>
								<Palette className="w-4 h-4" />
								<span>Цвет и бренд</span>
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("requisites")}
								className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
									activeTab === "requisites"
										? "bg-teal-600 text-white shadow-sm"
										: "text-[var(--muted,#64748b)] dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
								}`}
							>
								<Building2 className="w-4 h-4" />
								<span>Реквизиты</span>
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("sections")}
								className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
									activeTab === "sections"
										? "bg-teal-600 text-white shadow-sm"
										: "text-[var(--muted,#64748b)] dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
								}`}
							>
								<Layers className="w-4 h-4" />
								<span>Секции</span>
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("typography")}
								className={`px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
									activeTab === "typography"
										? "bg-teal-600 text-white shadow-sm"
										: "text-[var(--muted,#64748b)] dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
								}`}
							>
								<Type className="w-4 h-4" />
								<span>Шрифты и плотность</span>
							</button>
						</div>

						{/* Tabs Content */}
						<div className="flex-1 overflow-y-auto p-5 space-y-5">
							{/* Tab 1: Color & Brand */}
							{activeTab === "style" && (
								<div className="space-y-4">
									<div>
										<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-2">
											Фирменная цветовая палитра бланка
										</label>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
											{(Object.keys(BRAND_COLOR_PALETTES) as DocumentBrandColor[]).map((key) => {
												const pal = BRAND_COLOR_PALETTES[key];
												const isSelected = branding.brandAccentColor === key;
												return (
													<button
														key={key}
														type="button"
														onClick={() => branding.updateBranding({ brandAccentColor: key })}
														className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
															isSelected
																? "border-teal-500 ring-2 ring-teal-500/30 bg-teal-50/50 dark:bg-teal-950/40 font-bold"
																: "border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800"
														}`}
													>
														<span
															className="w-7 h-7 rounded-xl shadow-sm shrink-0 border border-white/40 flex items-center justify-center text-white text-xs"
															style={{ backgroundColor: pal.primary }}
														>
															{isSelected && <Check className="w-4 h-4" />}
														</span>
														<div className="min-w-0">
															<div className="text-xs font-bold truncate">{pal.label.split("(")[0]}</div>
															<div className="text-[10px] text-[var(--muted,#64748b)] font-mono">{pal.primary}</div>
														</div>
													</button>
												);
											})}
										</div>
									</div>

									<div>
										<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-2">
											Стиль оформления шапки клиники
										</label>
										<div className="grid grid-cols-3 gap-2">
											{[
												{ id: "modern_split", label: "Современный (Split)" },
												{ id: "classic_centered", label: "Центрированный" },
												{ id: "minimal_clean", label: "Минимализм" },
											].map((h) => (
												<button
													key={h.id}
													type="button"
													onClick={() => branding.updateBranding({ headerStyle: h.id as DocumentHeaderStyle })}
													className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer min-h-[44px] ${
														branding.headerStyle === h.id
															? "border-teal-500 bg-teal-500/15 text-teal-700 dark:text-teal-300"
															: "border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
													}`}
												>
													{h.label}
												</button>
											))}
										</div>
									</div>

									<div>
										<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1">
											Слоган клиники (подзаголовок под логотипом)
										</label>
										<input
											type="text"
											value={branding.slogan}
											onChange={(e) => branding.updateBranding({ slogan: e.target.value })}
											placeholder="Например: Цифровая стоматология и эстетика"
											className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
										/>
									</div>
								</div>
							)}

							{/* Tab 2: Requisites */}
							{activeTab === "requisites" && (
								<div className="space-y-3.5">
									<div>
										<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1">
											Коммерческое название клиники
										</label>
										<input
											type="text"
											value={branding.clinicName}
											onChange={(e) => branding.updateBranding({ clinicName: e.target.value })}
											className="w-full px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1">
											Юридическое наименование (ООО / ИП)
										</label>
										<input
											type="text"
											value={branding.clinicLegalName}
											onChange={(e) => branding.updateBranding({ clinicLegalName: e.target.value })}
											className="w-full px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1">
											Медицинская лицензия МЗ РФ
										</label>
										<input
											type="text"
											value={branding.licenseNumber}
											onChange={(e) => branding.updateBranding({ licenseNumber: e.target.value })}
											className="w-full px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
										/>
									</div>

									<div className="grid grid-cols-2 gap-2">
										<div>
											<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1">
												ИНН
											</label>
											<input
												type="text"
												value={branding.clinicInn}
												onChange={(e) => branding.updateBranding({ clinicInn: e.target.value })}
												className="w-full px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-mono text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
											/>
										</div>
										<div>
											<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1">
												ОГРН
											</label>
											<input
												type="text"
												value={branding.clinicOgrn}
												onChange={(e) => branding.updateBranding({ clinicOgrn: e.target.value })}
												className="w-full px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-mono text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
											/>
										</div>
									</div>

									<div>
										<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1">
											Адрес клиники
										</label>
										<input
											type="text"
											value={branding.clinicAddress}
											onChange={(e) => branding.updateBranding({ clinicAddress: e.target.value })}
											className="w-full px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
										/>
									</div>

									<div className="grid grid-cols-2 gap-2">
										<div>
											<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1">
												Телефон клиники
											</label>
											<input
												type="text"
												value={branding.clinicPhone}
												onChange={(e) => branding.updateBranding({ clinicPhone: e.target.value })}
												className="w-full px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
											/>
										</div>
										<div>
											<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1">
												Веб-сайт
											</label>
											<input
												type="text"
												value={branding.clinicWebsite}
												onChange={(e) => branding.updateBranding({ clinicWebsite: e.target.value })}
												className="w-full px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
											/>
										</div>
									</div>
								</div>
							)}

							{/* Tab 3: Sections & Content Toggles */}
							{activeTab === "sections" && (
								<div className="space-y-3">
									<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-1">
										Отображаемые медицинские модули
									</label>

									{[
										{
											key: "showClinicLogo" as const,
											label: "Логотип клиники в шапке",
											desc: "Отображать эмблему или монограмму клиники",
										},
										{
											key: "showClinicRequisites" as const,
											label: "Блок реквизитов и лицензии",
											desc: "Лицензия МЗ РФ, адрес, телефон и сайт",
										},
										{
											key: "showQrVerification" as const,
											label: "QR-код верификации карты",
											desc: "Штамп электронной подписи и ссылка на проверку",
										},
										{
											key: "showOdontogramDiagram" as const,
											label: "Графическая зубная формула (FDI)",
											desc: "Отметки патологий по номерам зубов 11–48",
										},
										{
											key: "showRadiologyThumbnails" as const,
											label: "Снимки визиографа и КЛКТ",
											desc: "Превью радиовизиографии с плотностью кости и описанием",
										},
										{
											key: "showDetailedSoap" as const,
											label: "Детализация SOAP (S, O, A, P)",
											desc: "Жалобы, осмотр, диагноз по МКБ-10 и протокол лечения",
										},
										{
											key: "showDoctorStampFrame" as const,
											label: "Место для печати врача (М.П.)",
											desc: "Круглая гербовая рамка для оттиска личной печати",
										},
										{
											key: "showPatientSignatureLine" as const,
											label: "Линия подписи пациента",
											desc: "Подпись об ознакомлении с диагнозом и лечением",
										},
									].map((item) => {
										const isChecked = branding[item.key];
										return (
											<label
												key={item.key}
												className="flex items-center justify-between p-3 rounded-2xl border border-[var(--line,#cbd5e1)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
											>
												<div>
													<div className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100">
														{item.label}
													</div>
													<div className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400">
														{item.desc}
													</div>
												</div>
												<input
													type="checkbox"
													checked={isChecked}
													onChange={(e) =>
														branding.updateBranding({ [item.key]: e.target.checked })
													}
													className="w-5 h-5 accent-teal-600 rounded cursor-pointer shrink-0"
												/>
											</label>
										);
									})}

									<div className="pt-2">
										<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1">
											Юридическое примечание в подвале (Гарантии / Рекомендации)
										</label>
										<textarea
											rows={3}
											value={branding.customDisclaimer}
											onChange={(e) => branding.updateBranding({ customDisclaimer: e.target.value })}
											className="w-full px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
										/>
									</div>
								</div>
							)}

							{/* Tab 4: Typography & Density */}
							{activeTab === "typography" && (
								<div className="space-y-4">
									<div>
										<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-2">
											Гарнитура шрифта документа
										</label>
										<div className="grid grid-cols-3 gap-2">
											{[
												{ id: "sans", label: "Inter (Sans)", desc: "Современный гротеск" },
												{ id: "serif", label: "PT Serif (Serif)", desc: "Классический академический" },
												{ id: "mono", label: "JetBrains (Mono)", desc: "Инженерный клинический" },
											].map((f) => (
												<button
													key={f.id}
													type="button"
													onClick={() => branding.updateBranding({ fontFamily: f.id as DocumentFontFamily })}
													className={`p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[44px] ${
														branding.fontFamily === f.id
															? "border-teal-500 bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold"
															: "border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 text-[var(--muted,#64748b)]"
													}`}
												>
													<div className="text-xs">{f.label}</div>
													<div className="text-[10px] opacity-75">{f.desc}</div>
												</button>
											))}
										</div>
									</div>

									<div>
										<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-2">
											Плотность полей и интервалов A4
										</label>
										<div className="grid grid-cols-3 gap-2">
											{[
												{ id: "compact", label: "Компактный", desc: "Умещается на 1 лист A4" },
												{ id: "comfortable", label: "Комфортный", desc: "Сбалансированные отступы" },
												{ id: "formal", label: "Просторный", desc: "Широкие поля 20 мм" },
											].map((d) => (
												<button
													key={d.id}
													type="button"
													onClick={() => branding.updateBranding({ layoutDensity: d.id as DocumentDensity })}
													className={`p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[44px] ${
														branding.layoutDensity === d.id
															? "border-teal-500 bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold"
															: "border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 text-[var(--muted,#64748b)]"
													}`}
												>
													<div className="text-xs">{d.label}</div>
													<div className="text-[10px] opacity-75">{d.desc}</div>
												</button>
											))}
										</div>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Right Column: Live Interactive A4 Paper Sheet Preview (7 cols) */}
					<div className="lg:col-span-7 bg-slate-200 dark:bg-slate-950 p-4 sm:p-6 overflow-y-auto flex flex-col items-center">
						<div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5 no-print">
							<span>📄 Интерактивное превью бланка A4 (Обновляется в реальном времени):</span>
						</div>

						{/* Scaled A4 Paper Container */}
						<div className="w-full flex justify-center">
							<PremiumDocumentPrintSheet
								documentTitle="МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА"
								documentSubtitle="Форма № 043/у (Приказ Минздрава России № 834н)"
								patient={samplePatient}
								doctorName={sampleDoctorName}
								doctorSpecialty={sampleDoctorSpecialty}
								doctorSnils="112-334-556 01"
								visitDate={new Date()}
								diary={{
									anamnesis: "Пациент обратился с жалобами на кратковременные боли от холодного и сладкого в области зуба 4.6.",
									statusLocalis: "При осмотре полости рта: на окклюзионной поверхности зуба 4.6 глубокая кариозная полость (MOD), зондирование дна безболезненно, перкуссия отрицательная.",
									diagnosisIcd10: "K02.1",
									diagnosisTooth: "46",
									treatmentDescription: "• Проводниковая анестезия Sol. Ultracaini DS 1.7 ml.\n• Препарирование кариозной полости, медикаментозная обработка 2% хлоргексидином.\n• Изоляция коффердамом.\n• Травление эмали 37% ортофосфорной кислотой, бондинг OptiBond FL.\n• Восстановление анатомической формы светоотверждаемым композитом Harmonize (A3/Enamel).\n• Шлифовка, полировка пастой Prisma Gloss.",
								}}
								icd10Label="Кариес дентина"
								teethData={[
									{ toothNumber: 46, state: "Caries", surfaces: ["M", "O", "D"] },
									{ toothNumber: 36, state: "Filled", surfaces: ["O"] },
									{ toothNumber: 16, state: "Crown" },
								]}
								diaryHash="a8fbc7329410ef39581c70e281943019a84fbe392019a84bce1849201849a019"
								hasCryptoSignature={true}
								lockedAt={new Date()}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
};
