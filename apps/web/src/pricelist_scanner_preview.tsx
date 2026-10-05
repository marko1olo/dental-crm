import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./components/settings/SettingsPricesTab.css";

import { SettingsPricesAiImportSection } from "./components/settings/SettingsPricesAiImportSection";
import {
	PriceListMappingDiffView,
	type IngestedMappingItem,
} from "./components/pricing/PriceListMappingDiffView";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";
import { FileSpreadsheet, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

const sampleDiffItems: IngestedMappingItem[] = [
	{
		id: "diff-1",
		sourceLineNumber: 1,
		rawLine: "Пломба световая Gradia Direct (1 пов.) - 4500",
		cleanedTitle: "Восстановление зуба пломбой светового отверждения Gradia Direct (1 поверхность)",
		code804n: "A16.07.002.001",
		statutoryTitle804n:
			"Восстановление зуба пломбой с нарушением формы зуба при кариесе I, V, VI класс по Блэку с использованием светоотверждаемых композитов",
		category: "Терапия",
		specialty: "Стоматология терапевтическая",
		priceRub: 4500,
		priceKopecks: 450000,
		confidence: 0.98,
		confidenceKind: "exact_code",
		matchedExistingServiceId: "srv-101",
		matchedExistingTitle: "Лечение поверхностного кариеса Gradia",
		matchedExistingPriceRub: 4200,
		suggestedAction: "update_existing",
		isApproved: true,
	},
	{
		id: "diff-2",
		sourceLineNumber: 2,
		rawLine: "Удаление зуба сложное с разъединением корней - 6000",
		cleanedTitle: "Сложное удаление постоянного зуба с выкраиванием слизисто-надкостничного лоскута",
		code804n: "A16.07.001.002",
		statutoryTitle804n: "Удаление постоянного зуба сложное с разъединением корней",
		category: "Хирургия",
		specialty: "Стоматология хирургическая",
		priceRub: 6000,
		priceKopecks: 600000,
		confidence: 0.95,
		confidenceKind: "high_keyword",
		suggestedAction: "create_new",
		isApproved: true,
	},
	{
		id: "diff-3",
		sourceLineNumber: 3,
		rawLine: "Установка импланта Straumann SLA (Швейцария) - 45000",
		cleanedTitle: "Дентальная имплантация системы Straumann SLA под ключ",
		code804n: "A16.07.054",
		statutoryTitle804n: "Внутрикостная дентальная имплантация ортопедической конструкции",
		category: "Имплантация",
		specialty: "Стоматология хирургическая",
		priceRub: 45000,
		priceKopecks: 4500000,
		confidence: 0.92,
		confidenceKind: "high_keyword",
		matchedExistingServiceId: "srv-204",
		matchedExistingTitle: "Имплантация Straumann SLA",
		matchedExistingPriceRub: 45000,
		suggestedAction: "identical",
		isApproved: true,
	},
	{
		id: "diff-4",
		sourceLineNumber: 4,
		rawLine: "Профгигиена полости рта AirFlow комплекс - 5500",
		cleanedTitle: "Комплексная профессиональная гигиена полости рта ультразвуком и AirFlow",
		code804n: "A16.07.051",
		statutoryTitle804n: "Профессиональная гигиена полости рта и зубов",
		category: "Профилактика",
		specialty: "Стоматология терапевтическая",
		priceRub: 5500,
		priceKopecks: 550000,
		confidence: 0.89,
		confidenceKind: "medium_keyword",
		suggestedAction: "update_existing",
		isApproved: true,
	},
	{
		id: "diff-5",
		sourceLineNumber: 5,
		rawLine: "Консультация ортодонта + слепок - 2000",
		cleanedTitle: "Первичный консультативный прием врача-ортодонта с антропометрией",
		code804n: "B01.063.001",
		statutoryTitle804n: "Прием (осмотр, консультация) врача-стоматолога-ортодонта первичный",
		category: "Ортодонтия",
		specialty: "Ортодонтия",
		priceRub: 2000,
		priceKopecks: 200000,
		confidence: 0.84,
		confidenceKind: "medium_keyword",
		suggestedAction: "create_new",
		isApproved: false,
	},
];

function PricelistScannerPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const viewMode = params.get("mode") || "diff"; // "upload" | "diff"

	const [items, setItems] = useState<readonly IngestedMappingItem[]>(sampleDiffItems);
	const [activeTab, setActiveTab] = useState<"upload" | "diff">(
		viewMode === "upload" ? "upload" : "diff",
	);

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		const isDark = rawTheme === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.documentElement.setAttribute("data-theme", rawTheme);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen p-4 md:p-6`;
	}, [rawTheme]);

	return (
		<div className="max-w-[1400px] mx-auto w-full space-y-6">
			{/* Top Header Card */}
			<div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2 mb-1">
						<span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
							Номенклатура 804н
						</span>
						<span className="text-xs text-[var(--muted)]">Минздрав РФ • Пакетный сканер прайсов</span>
					</div>
					<h1 className="text-xl md:text-2xl font-bold text-[var(--ink)]">
						Интеллектуальное сопоставление прейскуранта с 804н
					</h1>
					<p className="text-xs md:text-sm text-[var(--muted)] mt-1">
						Загрузка таблиц Excel/CSV, вставка из буфера и двухпанельная сверка с кодами медицинских услуг.
					</p>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setActiveTab("upload")}
						className={`secondary-button text-xs py-2 px-3.5 ${activeTab === "upload" ? "active" : ""}`}
					>
						<FileSpreadsheet size={14} className="mr-1 inline" />
						<span>1. Зона загрузки</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("diff")}
						className={`secondary-button text-xs py-2 px-3.5 ${activeTab === "diff" ? "active" : ""}`}
					>
						<Sparkles size={14} className="mr-1 inline" />
						<span>2. Таблица сопоставления 804н</span>
					</button>
				</div>
			</div>

			{/* State 1: Upload & Paste Zone */}
			{activeTab === "upload" && (
				<div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm">
					<SettingsPricesAiImportSection />
				</div>
			)}

			{/* State 2: Dual-Pane 804n Mapping Diff View */}
			{activeTab === "diff" && (
				<div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm overflow-hidden">
					<PriceListMappingDiffView
						items={items}
						onItemsChange={setItems}
						onApply={(approved) => {
							alert(`Применено ${approved.length} услуг`);
						}}
					/>
				</div>
			)}
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<PricelistScannerPreviewApp />
		</React.StrictMode>,
	);
}
