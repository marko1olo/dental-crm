import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles/modules/documents.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./styles/components.css";

import { DocumentsCatalogView } from "./components/documents/DocumentsCatalogView";
import { FnsTaxCertificateModal } from "./components/documents/FnsTaxCertificateModal";
import { ConsentModal } from "./components/consents/ConsentModal";
import { PrimaryIntakePackageModal } from "./components/documents/PrimaryIntakePackageModal";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";
import { FileCheck, FileText, Moon, Printer, Receipt, ShieldCheck, Sun, Zap } from "lucide-react";
import type { Patient, GeneratedDocument } from "@dental/shared";
import type { TaxPaymentRecord } from "./components/documents/taxCertificateEngine";

const mockPatient: Patient = {
	id: "pat-morozov-2026",
	organizationId: "org-dente-01",
	status: "active",
	fullName: "Морозов Александр Сергеевич",
	phone: "+7 (926) 444-22-11",
	email: "morozov@example.com",
	birthDate: "1988-04-12",
	gender: "male",
	balanceRub: 125000,
	notes: "Постоянный пациент клиники. Соматически здоров, аллергий нет.",
	inn: "772812341040",
	administrativeProfile: {
		passportSeries: "4518",
		passportNumber: "789123",
		passportIssuedBy: "ГУ МВД России по г. Москве",
		passportIssuedDate: "2018-05-20",
		passportDepartmentCode: "770-045",
		registrationAddress: "125047, г. Москва, ул. 1-я Тверская-Ямская, д. 14, кв. 35",
		snils: "145-892-301 77",
		inn: "772812341040",
	} as any,
	createdAt: "2024-03-10T10:00:00.000Z",
	updatedAt: "2026-10-08T10:00:00.000Z",
};

const mockClinicProfile = {
	clinicName: "ООО «Стоматология ДЕНТЕ Премиум»",
	legalName: "ООО «Стоматологическая клиника ДЕНТЕ Премиум»",
	inn: "7710984521",
	kpp: "771001001",
	ogrn: "1217700456123",
	medicalLicenseNumber: "ЛО41-01137-77/00645892",
	licenseNumber: "ЛО41-01137-77/00645892",
	licenseDate: "2022-04-15",
	address: "127006, г. Москва, ул. Тверская, д. 12, стр. 2",
	phone: "+7 (495) 123-45-67",
	directorFullName: "Воронов Алексей Владимирович",
};

const mockPayments: TaxPaymentRecord[] = [
	{
		id: "pay-01",
		dateIso: "2026-03-15T11:00:00.000Z",
		amountRub: 45000,
		amountKopecks: 4500000,
		taxCode: "1",
		serviceName: "Профессиональная гигиена и терапевтическое лечение кариеса",
		code804n: "A16.07.002",
		receiptNumber: "ФЧ-2026/0891",
		fiscalDocumentNumber: "ФД-10492",
		fiscalSign: "389104821",
		isRefund: false,
	},
	{
		id: "pay-02",
		dateIso: "2026-06-20T14:30:00.000Z",
		amountRub: 180000,
		amountKopecks: 18000000,
		taxCode: "2",
		serviceName: "Дентальная имплантация Straumann и костная пластика (дорогостоящее)",
		code804n: "A16.07.054",
		receiptNumber: "ФЧ-2026/0892",
		fiscalDocumentNumber: "ФД-10493",
		fiscalSign: "928174029",
		isRefund: false,
	},
];

export function DocumentsInquisitionPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const initialTheme = (params.get("theme") as ThemeMode) || "light";
	const initialView = params.get("view") || "catalog";

	const [theme, setTheme] = useState<ThemeMode>(initialTheme);
	const [activeView, setActiveView] = useState<"catalog" | "tax_cert" | "ids_1051n" | "primary_intake">(
		initialView === "tax_cert"
			? "tax_cert"
			: initialView === "ids_1051n"
				? "ids_1051n"
				: initialView === "primary_intake"
					? "primary_intake"
					: "catalog",
	);

	const [isTaxModalOpen, setIsTaxModalOpen] = useState(true);
	const [isConsentModalOpen, setIsConsentModalOpen] = useState(true);
	const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(true);

	useEffect(() => {
		const isDark = theme === "dark" || theme === "night";
		const resolved = resolveTheme(theme, isDark);
		applyThemeToRoot(document.documentElement, resolved);
	}, [theme]);

	return (
		<div
			className="min-h-screen bg-[var(--bg,#f8fafc)] text-[var(--ink,#0f172a)] flex flex-col font-sans"
			data-testid="documents-inquisition-preview-root"
		>
			{/* Top Preview Control Bar */}
			<header className="sticky top-0 z-50 bg-[var(--paper-strong,#ffffff)] border-b border-[var(--line,#e2e8f0)] px-4 py-2.5 flex items-center justify-between shadow-xs">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-xs">
						<ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span>DENTE Документооборот & ФНС Инквизиция</span>
					</div>

					<nav className="inline-flex p-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] gap-1">
						<button
							type="button"
							onClick={() => setActiveView("catalog")}
							className={`h-7 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
								activeView === "catalog"
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
							}`}
							data-testid="tab-preview-catalog"
						>
							<FileText className="w-3.5 h-3.5 text-teal-500" />
							<span>Каталог документов</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setActiveView("tax_cert");
								setIsTaxModalOpen(true);
							}}
							className={`h-7 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
								activeView === "tax_cert"
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
							}`}
							data-testid="tab-preview-tax-cert"
						>
							<Receipt className="w-3.5 h-3.5 text-emerald-500" />
							<span>Справка ФНС (КНД 1151156)</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setActiveView("ids_1051n");
								setIsConsentModalOpen(true);
							}}
							className={`h-7 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
								activeView === "ids_1051n"
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
							}`}
							data-testid="tab-preview-ids"
						>
							<ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
							<span>ИДС 1051н</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setActiveView("primary_intake");
								setIsIntakeModalOpen(true);
							}}
							className={`h-7 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
								activeView === "primary_intake"
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/50"
							}`}
							data-testid="tab-preview-intake"
						>
							<Printer className="w-3.5 h-3.5 text-amber-500" />
							<span>Пакет первичного приёма</span>
						</button>
					</nav>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
						className="h-8 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition flex items-center gap-1.5 cursor-pointer"
						data-testid="btn-toggle-theme"
					>
						{theme === "dark" ? (
							<>
								<Sun className="w-4 h-4 text-amber-400" />
								<span>Светлая тема</span>
							</>
						) : (
							<>
								<Moon className="w-4 h-4 text-indigo-500" />
								<span>Тёмная тема</span>
							</>
						)}
					</button>
				</div>
			</header>

			{/* Main Content Area */}
			<main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
				{/* 1. КАТАЛОГ ДОКУМЕНТОВ */}
				{activeView === "catalog" && (
					<div className="space-y-4">
						<div className="mb-2">
							<h1 className="text-lg font-black tracking-tight text-[var(--ink,#0f172a)]">
								Каталог медицинских документов клиники (#documents)
							</h1>
							<p className="text-xs text-[var(--muted,#64748b)]">
								Пациент: {mockPatient.fullName} (37 лет) · Врач: {mockClinicProfile.directorFullName}
							</p>
						</div>

						<DocumentsCatalogView
							patient={mockPatient}
							patientName={mockPatient.fullName}
							patientAgeYears={37}
							doctorName={mockClinicProfile.directorFullName}
							clinicName={mockClinicProfile.clinicName}
							clinicProfileDraft={mockClinicProfile}
							onOpenPrimaryIntakePackage={() => {
								setActiveView("primary_intake");
								setIsIntakeModalOpen(true);
							}}
							onOpenTaxCertificate={() => {
								setActiveView("tax_cert");
								setIsTaxModalOpen(true);
							}}
						/>
					</div>
				)}

				{/* 2. СПРАВКА ФНС КНД 1151156 */}
				{activeView === "tax_cert" && (
					<div className="space-y-4">
						<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
							<div>
								<h2 className="text-sm font-bold text-[var(--ink)]">
									Справка об оплате медицинских услуг для налогового вычета (ФНС КНД 1151156)
								</h2>
								<p className="text-xs text-[var(--muted)]">
									Честная агрегация оплат: Код 1 (45 000 ₽) + Код 2 дорогостоящее (180 000 ₽) · Возврат 13%: 29 250 ₽
								</p>
							</div>
							<button
								type="button"
								onClick={() => setIsTaxModalOpen(true)}
								className="h-8 px-3 rounded-lg bg-[var(--teal)] text-white text-xs font-bold"
							>
								Открыть справку
							</button>
						</div>

						<FnsTaxCertificateModal
							isOpen={isTaxModalOpen}
							onClose={() => setIsTaxModalOpen(false)}
							patient={mockPatient}
							clinicProfileDraft={mockClinicProfile}
							payments={mockPayments}
							initialYear={2026}
						/>
					</div>
				)}

				{/* 3. ИДС 1051н */}
				{activeView === "ids_1051n" && (
					<div className="space-y-4">
						<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
							<div>
								<h2 className="text-sm font-bold text-[var(--ink)]">
									Информированное добровольное согласие (Приказ Минздрава № 1051н)
								</h2>
								<p className="text-xs text-[var(--muted)]">
									Пациент: {mockPatient.fullName} · 1-клик печать и подписание без дублирования полей
								</p>
							</div>
							<button
								type="button"
								onClick={() => setIsConsentModalOpen(true)}
								className="h-8 px-3 rounded-lg bg-[var(--teal)] text-white text-xs font-bold"
							>
								Открыть согласие
							</button>
						</div>

						<ConsentModal
							isOpen={isConsentModalOpen}
							onClose={() => setIsConsentModalOpen(false)}
							patient={mockPatient}
							doctorName={mockClinicProfile.directorFullName}
							clinicName={mockClinicProfile.clinicName}
							isMinorPatient={false}
						/>
					</div>
				)}

				{/* 4. ПАКЕТ ПЕРВИЧНОГО ПРИЁМА */}
				{activeView === "primary_intake" && (
					<div className="space-y-4">
						<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
							<div>
								<h2 className="text-sm font-bold text-[var(--ink)]">
									Пакет первичного приёма в 1 клик
								</h2>
								<p className="text-xs text-[var(--muted)]">
									ИДС Приказ 1051н + Договор ПП РФ № 736 + 152-ФЗ персданные + Анкета здоровья
								</p>
							</div>
							<button
								type="button"
								onClick={() => setIsIntakeModalOpen(true)}
								className="h-8 px-3 rounded-lg bg-[var(--teal)] text-white text-xs font-bold"
							>
								Открыть пакет
							</button>
						</div>

						<PrimaryIntakePackageModal
							isOpen={isIntakeModalOpen}
							onClose={() => setIsIntakeModalOpen(false)}
							patient={mockPatient}
							existingDocuments={[]}
							onCreateDocument={() => {}}
							onOpenDocument={() => {}}
							onSelectDocumentKind={() => {}}
							doctorFullName={mockClinicProfile.directorFullName}
							clinicProfileDraft={mockClinicProfile}
						/>
					</div>
				)}
			</main>
		</div>
	);
}

const rootElement = document.getElementById("root");
if (rootElement) {
	ReactDOM.createRoot(rootElement).render(<DocumentsInquisitionPreviewApp />);
}
