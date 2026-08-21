import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
	Building2,
	Check,
	CheckCircle2,
	Coins,
	FileCheck,
	FileCode,
	FileSpreadsheet,
	FileText,
	Layers,
	Palette,
	Printer,
	QrCode,
	RotateCcw,
	Save,
	Settings2,
	ShieldCheck,
	Sliders,
	Sparkles,
	Type,
	Wand2,
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

type PreviewDocType = "043u" | "act" | "consent" | "invoice";

interface PresetItem {
	readonly id: string;
	readonly title: string;
	readonly subtitle: string;
	readonly icon: React.ReactNode;
	readonly config: {
		readonly brandAccentColor: DocumentBrandColor;
		readonly headerStyle: DocumentHeaderStyle;
		readonly fontFamily: DocumentFontFamily;
		readonly layoutDensity: DocumentDensity;
	};
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
		address: "г. Москва, пр-кт Вернадского, д. 42, кв. 119",
		gender: "female",
	},
	sampleDoctorName = "Д-р Смирнов Алексей Владимирович",
	sampleDoctorSpecialty = "Врач стоматолог-терапевт, хирург высшей категории",
}) => {
	const branding = useDocumentBrandingStore();
	const [activeTab, setActiveTab] = useState<"style" | "requisites" | "sections" | "typography" | "presets">("style");
	const [previewDocType, setPreviewDocType] = useState<PreviewDocType>("043u");

	if (!isOpen) return null;

	const handleSave = () => {
		showToast("Фирменный стиль документов и бланков успешно сохранён", "success");
		onClose();
	};

	const handleTestPrint = () => {
		window.print();
	};

	const presets: readonly PresetItem[] = [
		{
			id: "dente_signature",
			title: "DENTE Signature (Клинический Изумруд)",
			subtitle: "Изумрудно-бирюзовый акцент • Современный сплит • Inter",
			icon: <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
			config: {
				brandAccentColor: "deep_teal",
				headerStyle: "modern_split",
				fontFamily: "sans",
				layoutDensity: "comfortable",
			},
		},
		{
			id: "minzdrav_official",
			title: "Минздрав РФ (Академический стандарт)",
			subtitle: "Медицинский синий • Центрированная шапка • PT Serif",
			icon: <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
			config: {
				brandAccentColor: "medical_navy",
				headerStyle: "classic_centered",
				fontFamily: "serif",
				layoutDensity: "comfortable",
			},
		},
		{
			id: "slate_strict",
			title: "Строгий юридический (Монохром)",
			subtitle: "Графитовый минимализм • Минимальная шапка • JetBrains",
			icon: <FileCode className="w-5 h-5 text-slate-600 dark:text-slate-400" />,
			config: {
				brandAccentColor: "pure_slate",
				headerStyle: "minimal_clean",
				fontFamily: "mono",
				layoutDensity: "compact",
			},
		},
		{
			id: "gold_vip",
			title: "VIP Эстетика & Имплантация",
			subtitle: "Благородное золото • Просторные поля 20мм • Inter",
			icon: <Wand2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
			config: {
				brandAccentColor: "gold_luxury",
				headerStyle: "modern_split",
				fontFamily: "sans",
				layoutDensity: "formal",
			},
		},
	];

	const activePalette = BRAND_COLOR_PALETTES[branding.brandAccentColor] || BRAND_COLOR_PALETTES.deep_teal;

	const modalContent = (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Конструктор фирменных бланков и документов клиники"
		>
			<div className="relative w-full max-w-7xl h-[94vh] max-h-[980px] bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#cbd5e1)] dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)] dark:text-slate-100">
				{/* ── Modal Header ── */}
				<div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900/90 no-print">
					<div className="flex items-center gap-3">
						<div
							className="p-2.5 rounded-2xl text-white shadow-sm shrink-0 flex items-center justify-center"
							style={{ backgroundColor: activePalette.primary }}
						>
							<Sparkles className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-black text-[var(--ink,#0f172a)] dark:text-white m-0 flex items-center gap-2">
								Конструктор фирменных бланков и документов клиники
								<span
									className="text-xs px-2.5 py-0.5 rounded-full font-bold border"
									style={{
										backgroundColor: activePalette.softBg,
										color: activePalette.primaryDark,
										borderColor: activePalette.accentBorder,
									}}
								>
									A4 / ГОСТ & Минздрав РФ
								</span>
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0 mt-0.5">
								Настройка журнальной полиграфической типографики, фирменной палитры, реквизитов и печати.
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={branding.resetToDefaults}
							className="px-3.5 py-2.5 min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--muted,#64748b)] dark:text-slate-300 text-xs font-bold hover:text-[var(--ink,#0f172a)] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
							title="Сбросить к стандартному оформлению Минздрава РФ"
						>
							<RotateCcw className="w-4 h-4" />
							<span>Сброс</span>
						</button>
						<button
							type="button"
							onClick={handleTestPrint}
							className="px-4 py-2.5 min-h-[44px] rounded-xl border text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
							style={{
								borderColor: activePalette.accentBorder,
								backgroundColor: activePalette.softBg,
								color: activePalette.primaryDark,
							}}
							title="Проверить печать на принтере"
						>
							<Printer className="w-4 h-4" />
							<span>Тест печати (Ctrl+P)</span>
						</button>
						<button
							type="button"
							onClick={handleSave}
							className="px-5 py-2.5 min-h-[44px] rounded-xl text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
							style={{
								backgroundColor: activePalette.primary,
							}}
						>
							<Save className="w-4 h-4" />
							<span>Сохранить шаблон</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="p-2.5 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
							aria-label="Закрыть конструктор"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* ── Main Body: 2 Columns (Settings vs Live A4 Preview) ── */}
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
					{/* Left Column: Settings Panel (5 cols) */}
					<div className="lg:col-span-5 border-r border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col bg-[var(--paper,#ffffff)] dark:bg-slate-900/95 overflow-hidden">
						{/* Tabs Header */}
						<div className="flex border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 p-2 gap-1.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950/60 overflow-x-auto">
							<button
								type="button"
								onClick={() => setActiveTab("style")}
								className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
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
								className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
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
								className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
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
								className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
									activeTab === "typography"
										? "bg-teal-600 text-white shadow-sm"
										: "text-[var(--muted,#64748b)] dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
								}`}
							>
								<Type className="w-4 h-4" />
								<span>Шрифты</span>
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("presets")}
								className={`px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
									activeTab === "presets"
										? "bg-teal-600 text-white shadow-sm"
										: "text-[var(--muted,#64748b)] dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
								}`}
							>
								<Sparkles className="w-4 h-4" />
								<span>Пресеты</span>
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
														className={`p-3 min-h-[56px] rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
															isSelected
																? "border-teal-500 ring-2 ring-teal-500/30 bg-teal-50/50 dark:bg-teal-950/40 font-bold"
																: "border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800"
														}`}
													>
														<span
															className="w-8 h-8 rounded-xl shadow-sm shrink-0 border border-white/40 flex items-center justify-center text-white text-xs"
															style={{ backgroundColor: pal.primary }}
														>
															{isSelected && <Check className="w-4 h-4" />}
														</span>
														<div className="min-w-0 flex-1">
															<div className="text-xs font-bold truncate text-[var(--ink,#0f172a)] dark:text-slate-100">
																{pal.label.split("(")[0]}
															</div>
															<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 font-mono">
																{pal.primary}
															</div>
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
													className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer min-h-[48px] flex items-center justify-center ${
														branding.headerStyle === h.id
															? "border-teal-500 bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500"
															: "border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-slate-100"
													}`}
												>
													{h.label}
												</button>
											))}
										</div>
									</div>

									<div>
										<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1.5">
											Слоган клиники (подзаголовок под логотипом)
										</label>
										<input
											type="text"
											value={branding.slogan}
											onChange={(e) => branding.updateBranding({ slogan: e.target.value })}
											placeholder="Например: Цифровая стоматология и эстетика"
											className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1.5">
											Фоновый водяной знак (опционально)
										</label>
										<input
											type="text"
											value={branding.customWatermarkText || ""}
											onChange={(e) => branding.updateBranding({ customWatermarkText: e.target.value })}
											placeholder="Например: ОБРАЗЕЦ / КОПИЯ"
											className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
										/>
									</div>
								</div>
							)}

							{/* Tab 2: Requisites */}
							{activeTab === "requisites" && (
								<div className="space-y-4">
									<div>
										<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1.5">
											Коммерческое название клиники
										</label>
										<input
											type="text"
											value={branding.clinicName}
											onChange={(e) => branding.updateBranding({ clinicName: e.target.value })}
											className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1.5">
											Юридическое наименование (ООО / ИП)
										</label>
										<input
											type="text"
											value={branding.clinicLegalName}
											onChange={(e) => branding.updateBranding({ clinicLegalName: e.target.value })}
											className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
										/>
									</div>

									<div>
										<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1.5">
											Медицинская лицензия МЗ РФ
										</label>
										<input
											type="text"
											value={branding.licenseNumber}
											onChange={(e) => branding.updateBranding({ licenseNumber: e.target.value })}
											className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
										/>
									</div>

									<div className="grid grid-cols-2 gap-2.5">
										<div>
											<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1.5">
												ИНН
											</label>
											<input
												type="text"
												value={branding.clinicInn}
												onChange={(e) => branding.updateBranding({ clinicInn: e.target.value })}
												className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-mono text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
											/>
										</div>
										<div>
											<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1.5">
												ОГРН
											</label>
											<input
												type="text"
												value={branding.clinicOgrn}
												onChange={(e) => branding.updateBranding({ clinicOgrn: e.target.value })}
												className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-mono text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
											/>
										</div>
									</div>

									<div>
										<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1.5">
											Адрес клиники
										</label>
										<input
											type="text"
											value={branding.clinicAddress}
											onChange={(e) => branding.updateBranding({ clinicAddress: e.target.value })}
											className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
										/>
									</div>

									<div className="grid grid-cols-2 gap-2.5">
										<div>
											<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1.5">
												Телефон клиники
											</label>
											<input
												type="text"
												value={branding.clinicPhone}
												onChange={(e) => branding.updateBranding({ clinicPhone: e.target.value })}
												className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
											/>
										</div>
										<div>
											<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1.5">
												Веб-сайт
											</label>
											<input
												type="text"
												value={branding.clinicWebsite}
												onChange={(e) => branding.updateBranding({ clinicWebsite: e.target.value })}
												className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs font-medium text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
											/>
										</div>
									</div>
								</div>
							)}

							{/* Tab 3: Sections & Content Toggles */}
							{activeTab === "sections" && (
								<div className="space-y-3.5">
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
												className="flex items-center justify-between p-3.5 min-h-[52px] rounded-2xl border border-[var(--line,#cbd5e1)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
											>
												<div className="pr-3">
													<div className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100">
														{item.label}
													</div>
													<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5">
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
										<label className="block text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-200 mb-1.5">
											Юридическое примечание в подвале (Гарантии / Рекомендации)
										</label>
										<textarea
											rows={3}
											value={branding.customDisclaimer}
											onChange={(e) => branding.updateBranding({ customDisclaimer: e.target.value })}
											className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 text-xs text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-teal-500"
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
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
											{[
												{ id: "sans", label: "Inter (Sans)", desc: "Современный гротеск" },
												{ id: "serif", label: "PT Serif (Serif)", desc: "Классический академический" },
												{ id: "mono", label: "JetBrains (Mono)", desc: "Инженерный клинический" },
											].map((f) => (
												<button
													key={f.id}
													type="button"
													onClick={() => branding.updateBranding({ fontFamily: f.id as DocumentFontFamily })}
													className={`p-3 min-h-[56px] rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-center ${
														branding.fontFamily === f.id
															? "border-teal-500 bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold ring-1 ring-teal-500"
															: "border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-slate-100"
													}`}
												>
													<div className="text-xs font-bold">{f.label}</div>
													<div className="text-xs opacity-75 mt-0.5 text-slate-500 dark:text-slate-400">{f.desc}</div>
												</button>
											))}
										</div>
									</div>

									<div>
										<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-2">
											Плотность полей и интервалов A4
										</label>
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
											{[
												{ id: "compact", label: "Компактный", desc: "Умещается на 1 лист A4" },
												{ id: "comfortable", label: "Комфортный", desc: "Сбалансированные отступы" },
												{ id: "formal", label: "Просторный", desc: "Широкие поля 20 мм" },
											].map((d) => (
												<button
													key={d.id}
													type="button"
													onClick={() => branding.updateBranding({ layoutDensity: d.id as DocumentDensity })}
													className={`p-3 min-h-[56px] rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-center ${
														branding.layoutDensity === d.id
															? "border-teal-500 bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold ring-1 ring-teal-500"
															: "border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-slate-100"
													}`}
												>
													<div className="text-xs font-bold">{d.label}</div>
													<div className="text-xs opacity-75 mt-0.5 text-slate-500 dark:text-slate-400">{d.desc}</div>
												</button>
											))}
										</div>
									</div>
								</div>
							)}

							{/* Tab 5: Presets Studio */}
							{activeTab === "presets" && (
								<div className="space-y-3.5">
									<label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-1">
										Готовые полиграфические стили клиники
									</label>

									{presets.map((p) => (
										<button
											key={p.id}
											type="button"
											onClick={() => {
												branding.updateBranding(p.config);
												showToast(`Применен стиль: ${p.title}`, "info");
											}}
											className="w-full p-4 min-h-[64px] rounded-2xl border border-[var(--line,#cbd5e1)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-all flex items-center justify-between cursor-pointer group"
										>
											<div className="flex items-center gap-3.5">
												<div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
													{p.icon}
												</div>
												<div>
													<div className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
														{p.title}
													</div>
													<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mt-0.5">
														{p.subtitle}
													</div>
												</div>
											</div>
											<div className="text-xs font-bold px-3 py-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300 shrink-0">
												Применить
											</div>
										</button>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Right Column: Live Interactive A4 Paper Sheet Preview (7 cols) */}
					<div className="lg:col-span-7 bg-slate-200 dark:bg-slate-950 p-4 sm:p-6 overflow-y-auto flex flex-col items-center">
						{/* Document Switcher Toolbar */}
						<div className="w-full max-w-[210mm] mb-3 flex flex-wrap items-center justify-between gap-2 no-print">
							<div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
								<FileText className="w-4 h-4 text-teal-600" />
								<span>Превью полиграфии A4:</span>
							</div>

							<div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800 shadow-xs">
								<button
									type="button"
									onClick={() => setPreviewDocType("043u")}
									className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
										previewDocType === "043u"
											? "bg-teal-600 text-white shadow-xs"
											: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
									}`}
								>
									Форма 043/у
								</button>
								<button
									type="button"
									onClick={() => setPreviewDocType("act")}
									className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
										previewDocType === "act"
											? "bg-teal-600 text-white shadow-xs"
											: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
									}`}
								>
									Акт работ
								</button>
								<button
									type="button"
									onClick={() => setPreviewDocType("consent")}
									className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
										previewDocType === "consent"
											? "bg-teal-600 text-white shadow-xs"
											: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
									}`}
								>
									ИДС
								</button>
								<button
									type="button"
									onClick={() => setPreviewDocType("invoice")}
									className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
										previewDocType === "invoice"
											? "bg-teal-600 text-white shadow-xs"
											: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
									}`}
								>
									Счет
								</button>
							</div>
						</div>

						{/* Scaled A4 Paper Container */}
						<div className="w-full flex justify-center">
							{previewDocType === "043u" && (
								<PremiumDocumentPrintSheet
									documentTitle="МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА"
									documentSubtitle="Форма № 043/у (Приказ Минздрава России № 834н)"
									patient={samplePatient}
									doctorName={sampleDoctorName}
									doctorSpecialty={sampleDoctorSpecialty}
									doctorSnils="112-334-556 01"
									visitDate={new Date()}
									diary={{
										anamnesis:
											"Пациент обратился с жалобами на кратковременные боли от холодного и сладкого в области зуба 4.6.",
										statusLocalis:
											"При осмотре полости рта: на окклюзионной поверхности зуба 4.6 глубокая кариозная полость (MOD), зондирование дна безболезненно, перкуссия отрицательная.",
										diagnosisIcd10: "K02.1",
										diagnosisTooth: "46",
										treatmentDescription:
											"• Проводниковая анестезия Sol. Ultracaini DS 1.7 ml.\n• Препарирование кариозной полости, медикаментозная обработка 2% хлоргексидином.\n• Изоляция коффердамом.\n• Травление эмали 37% ортофосфорной кислотой, бондинг OptiBond FL.\n• Восстановление анатомической формы светоотверждаемым композитом Harmonize (A3/Enamel).\n• Шлифовка, полировка пастой Prisma Gloss.",
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
							)}

							{previewDocType === "act" && (
								<PremiumDocumentPrintSheet
									documentTitle="АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ СТОМАТОЛОГИЧЕСКИХ УСЛУГ"
									documentSubtitle="Накладная на списание медикаментов и расходных материалов • Этап 1: Терапевтическая санация"
									patient={samplePatient}
									doctorName={sampleDoctorName}
									doctorSpecialty={sampleDoctorSpecialty}
									doctorSnils="112-334-556 01"
									visitDate={new Date()}
									diary={{
										anamnesis: "Выполнен этап комплексного плана лечения № ТП-2026/043.",
										statusLocalis: "Санация полости рта проведена в полном объеме согласно протоколу СтАР.",
										diagnosisIcd10: "K02.1",
										diagnosisTooth: "46",
										treatmentDescription:
											"1. А06.07.001 Прицельная внутриротовая радиовизиография зуба 4.6 (1 усл.) — 650 ₽\n2. B01.065.001 Анестезия проводниковая Sol. Ultracaini 1.7 ml — 950 ₽\n3. A16.07.002.011 Наложение коффердама (изоляция рабочего поля) — 800 ₽\n4. A16.07.002 Лечение кариеса дентина с восстановлением зуба 4.6 композитом Harmonize (MOD) — 5 800 ₽\n\nИтого стоимость оказанных медицинских услуг: 8 200 ₽ (НДС не облагается).",
									}}
									icd10Label="Кариес дентина (Зуб 46)"
									teethData={[{ toothNumber: 46, state: "Filled", surfaces: ["M", "O", "D"] }]}
									diaryHash="7b12c84910248fca8901bce47102941092841094810294810294819028409128"
									hasCryptoSignature={true}
									lockedAt={new Date()}
								/>
							)}

							{previewDocType === "consent" && (
								<PremiumDocumentPrintSheet
									documentTitle="ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ (ИДС)"
									documentSubtitle="на проведение стоматологического вмешательства (Приказ Минздрава России № 1051н)"
									patient={samplePatient}
									doctorName={sampleDoctorName}
									doctorSpecialty={sampleDoctorSpecialty}
									doctorSnils="112-334-556 01"
									visitDate={new Date()}
									diary={{
										anamnesis: "Пациент проинформирован о целях, методах оказания медицинской помощи, связанном с ними риске.",
										statusLocalis: "Возможные варианты медицинских вмешательств, их последствия и ожидаемые результаты разъяснены врачом в доступной форме.",
										diagnosisIcd10: "K02.1",
										diagnosisTooth: "46",
										treatmentDescription:
											"Я, пациент (законный представитель), даю информированное добровольное согласие на терапевтическое лечение, препарирование твердых тканей зуба, применение местной анестезии и восстановительных пломбировочных материалов. Предупрежден(а) о необходимости соблюдения гигиены и назначений врача.",
									}}
									icd10Label="Терапевтическое лечение кариеса"
									diaryHash="e409128490128490128409128409128490128409128490128409128490128409"
									hasCryptoSignature={true}
									lockedAt={new Date()}
								/>
							)}

							{previewDocType === "invoice" && (
								<PremiumDocumentPrintSheet
									documentTitle="СЧЕТ НА ОПЛАТУ МЕДИЦИНСКИХ УСЛУГ"
									documentSubtitle="Счет-заказ № СЧ-8821 к Договору на оказание платных медицинских услуг"
									patient={samplePatient}
									doctorName={sampleDoctorName}
									doctorSpecialty={sampleDoctorSpecialty}
									doctorSnils="112-334-556 01"
									visitDate={new Date()}
									diary={{
										anamnesis: "Плательщик: Иванова Екатерина Сергеевна. Форма оплаты: Безналичный расчет / Банковская карта.",
										statusLocalis: "Основание платежа: Стоматологические услуги по плану лечения № ТП-2026/043.",
										diagnosisIcd10: "Z01.2",
										treatmentDescription:
											"1. Комплексная терапевтическая санация (Зуб 46) — 8 200 ₽\n2. Профессиональная гигиена полости рта Air-Flow + УЗ — 4 500 ₽\n3. Скидка по программе лояльности: -1 270 ₽\n\nИТОГО К ОПЛАТЕ: 11 430 ₽ (Одиннадцать тысяч четыреста тридцать рублей 00 коп.)",
									}}
									icd10Label="Стоматологический прием и терапия"
									diaryHash="9182374918273491827349182734918273491827349182734918273491827349"
									hasCryptoSignature={true}
									lockedAt={new Date()}
								/>
							)}
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
