/**
 * apps/web/src/components/billing/InvoicesView.tsx
 *
 * DENTE Dental CRM — Solo Doctor & Small Clinic Invoicing & Acts View.
 * Compliance: Mandates 8e, 8k, 8n, 8d (Apple HIG / Studio Clinical Invariants).
 *
 * Features:
 * - 1-line dense toolbar (32–36px) with quick filter tabs and search.
 * - Entity cards with <=2 primary action buttons ([Оплатить], [Счет]).
 * - Context menu (...) for secondary operations (Акт 804н, Справка ФНС, Гарантия 100%).
 * - Seamless integration with PaymentModal (cash, card, SBP, certificate, bonus, 0 ₽ warranty).
 * - Minimum touch target >= 44x44px, modal depth strictly 1.
 * - Zero emojis (strict Lucide vector icons).
 */

import React, { useState, useMemo } from "react";
import {
	Search,
	Plus,
	Printer,
	FileText,
	CreditCard,
	CheckCircle2,
	Clock,
	ShieldCheck,
	MoreVertical,
	Receipt,
	X,
	FileCheck,
	Sparkles,
} from "lucide-react";
import { rubToKopecks } from "@dental/shared";
import { PaymentModal } from "../finance/PaymentModal.js";
import { hardwarePrinter } from "../../services/hardware/HardwarePrinter.js";
import { showToast } from "../GlobalToast.js";

export interface InvoiceLineItem {
	id: string;
	code?: string | undefined;
	name: string;
	quantity: number;
	priceRub: number;
}

export interface BillingInvoice {
	id: string;
	number: string;
	patientId: string;
	patientName: string;
	patientPhone?: string | undefined;
	doctorName: string;
	date: string;
	totalAmountRub: number;
	paidAmountRub: number;
	status: "draft" | "issued" | "paid" | "partially_paid" | "warranty_100";
	items: InvoiceLineItem[];
	createdAt: string;
	paidAt?: string | undefined;
	paymentMethod?: string | undefined;
	notes?: string | undefined;
}

export interface InvoicesViewProps {
	initialInvoices?: BillingInvoice[];
	currentDoctorName?: string;
	clinicLegalName?: string;
	onClose?: () => void;
}

type InvoiceFilterTab = "all" | "pending" | "paid" | "warranty";

const DEMO_INVOICES: BillingInvoice[] = [
	{
		id: "inv-001",
		number: "СЧ-004812",
		patientId: "pat-101",
		patientName: "Кузнецов Андрей Владимирович",
		patientPhone: "+7 (916) 234-56-78",
		doctorName: "Д-р Смирнов А.В.",
		date: new Date().toLocaleDateString("ru-RU"),
		totalAmountRub: 8500,
		paidAmountRub: 0,
		status: "issued",
		items: [
			{ id: "li-1", code: "A16.07.002", name: "Лечение глубокого кариеса световой пломбой (Estelite Asteria)", quantity: 1, priceRub: 6500 },
			{ id: "li-2", code: "A16.07.030", name: "Анестезия проводниковая Ультракаин Д-С Форте 1.7 мл", quantity: 1, priceRub: 1200 },
			{ id: "li-3", code: "A16.07.091", name: "Изоляция операционного поля коффердамом", quantity: 1, priceRub: 800 },
		],
		createdAt: new Date().toISOString(),
	},
	{
		id: "inv-002",
		number: "СЧ-004811",
		patientId: "pat-102",
		patientName: "Морозова Елена Сергеевна",
		patientPhone: "+7 (926) 345-67-89",
		doctorName: "Д-р Смирнов А.В.",
		date: new Date(Date.now() - 86400000).toLocaleDateString("ru-RU"),
		totalAmountRub: 12000,
		paidAmountRub: 12000,
		status: "paid",
		items: [
			{ id: "li-4", code: "A16.07.051", name: "Комплексная гигиена полости рта по протоколу GBT", quantity: 1, priceRub: 12000 },
		],
		createdAt: new Date(Date.now() - 86400000).toISOString(),
		paidAt: new Date(Date.now() - 86400000).toISOString(),
		paymentMethod: "card_terminal",
	},
	{
		id: "inv-003",
		number: "СЧ-004810",
		patientId: "pat-103",
		patientName: "Волков Денис Игоревич",
		patientPhone: "+7 (903) 456-78-90",
		doctorName: "Д-р Смирнов А.В.",
		date: new Date(Date.now() - 172800000).toLocaleDateString("ru-RU"),
		totalAmountRub: 0,
		paidAmountRub: 0,
		status: "warranty_100",
		items: [
			{ id: "li-5", code: "A16.07.002", name: "Коррекция пломбы по гарантии (Скидка 100%)", quantity: 1, priceRub: 0 },
		],
		createdAt: new Date(Date.now() - 172800000).toISOString(),
		paidAt: new Date(Date.now() - 172800000).toISOString(),
		paymentMethod: "warranty_discount_100",
		notes: "Гарантийный случай: скол полировки в пределах срока гарантии",
	},
];

export const InvoicesView: React.FC<InvoicesViewProps> = ({
	initialInvoices = DEMO_INVOICES,
	currentDoctorName = "Врач-стоматолог",
	clinicLegalName = "ООО «ДЕНТЕ»",
	onClose,
}) => {
	const [invoices, setInvoices] = useState<BillingInvoice[]>(initialInvoices);
	const [filterTab, setFilterTab] = useState<InvoiceFilterTab>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [activePaymentInvoice, setActivePaymentInvoice] = useState<BillingInvoice | null>(null);
	const [activeMenuInvoiceId, setActiveMenuInvoiceId] = useState<string | null>(null);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

	// Quick Invoice Create form state (Solo Doctor friction-killer)
	const [newPatientName, setNewPatientName] = useState<string>("");
	const [newServiceName, setNewServiceName] = useState<string>("");
	const [newServicePriceRub, setNewServicePriceRub] = useState<number>(5000);
	const [newIsWarranty100, setNewIsWarranty100] = useState<boolean>(false);

	// Filtered list
	const filteredInvoices = useMemo(() => {
		return invoices.filter((inv) => {
			if (filterTab === "pending" && (inv.status === "paid" || inv.status === "warranty_100")) return false;
			if (filterTab === "paid" && inv.status !== "paid") return false;
			if (filterTab === "warranty" && inv.status !== "warranty_100") return false;

			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchName = inv.patientName.toLowerCase().includes(q);
				const matchNum = inv.number.toLowerCase().includes(q);
				const matchPhone = (inv.patientPhone || "").toLowerCase().includes(q);
				if (!matchName && !matchNum && !matchPhone) return false;
			}
			return true;
		});
	}, [invoices, filterTab, searchQuery]);

	// Fast Print Invoice
	const handlePrintInvoice = (inv: BillingInvoice) => {
		const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Счет ${inv.number}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; }
.header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
h1 { margin: 0 0 8px 0; font-size: 20px; font-weight: 800; }
.clinic { font-size: 13px; color: #475569; }
.patient { margin: 16px 0; font-size: 14px; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
th { background: #f8fafc; font-weight: 700; }
.total { text-align: right; font-size: 16px; font-weight: 800; margin-top: 20px; }
.footer { margin-top: 40px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="header">
  <h1>СЧЕТ НА ОПЛАТУ № ${inv.number}</h1>
  <div class="clinic">${clinicLegalName} • Стоматологические услуги • Без НДС (пп. 2 п. 2 ст. 149 НК РФ)</div>
</div>
<div class="patient">
  <div><strong>Плательщик:</strong> ${inv.patientName}</div>
  <div><strong>Лечащий врач:</strong> ${inv.doctorName}</div>
  <div><strong>Дата:</strong> ${inv.date}</div>
</div>
<table>
  <thead>
    <tr><th>№</th><th>Код услуги</th><th>Наименование медицинской услуги</th><th>Кол-во</th><th>Сумма</th></tr>
  </thead>
  <tbody>
    ${inv.items
			.map(
				(it, idx) =>
					`<tr><td>${idx + 1}</td><td>${it.code || "A16.07.002"}</td><td>${it.name}</td><td>${it.quantity}</td><td>${it.priceRub.toLocaleString("ru-RU")} ₽</td></tr>`,
			)
			.join("")}
  </tbody>
</table>
<div class="total">Итого к оплате: ${inv.status === "warranty_100" ? "0 ₽ (Скидка 100% — Гарантия)" : `${inv.totalAmountRub.toLocaleString("ru-RU")} ₽`}</div>
<div class="footer">
  <div>Врач-стоматолог: ________________ / ${inv.doctorName} /</div>
  <div>М.П.</div>
</div>
</body>
</html>`;

		void hardwarePrinter.printHtmlWithPopupFallback(html, {
			title: `Счет № ${inv.number}`,
			downloadFilename: `Schet_${inv.number}.html`,
		}).then(() => {
			showToast(`Счет ${inv.number} отправлен на печать`, "success");
		}).catch(() => {
			showToast("Ошибка отправки счета на принтер", "error");
		});
	};

	// Fast Print Act 804n
	const handlePrintAct = (inv: BillingInvoice) => {
		const actNumber = `АКТ-${inv.number.replace(/\D/g, "") || Date.now().toString().slice(-6)}`;
		const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Акт выполненных работ ${actNumber}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; }
.header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
h1 { margin: 0 0 8px 0; font-size: 20px; font-weight: 800; }
.clinic { font-size: 13px; color: #475569; }
.patient { margin: 16px 0; font-size: 14px; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
th { background: #f8fafc; font-weight: 700; }
.total { text-align: right; font-size: 16px; font-weight: 800; margin-top: 20px; }
.footer { margin-top: 40px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="header">
  <h1>АКТ СДАЧИ-ПРИЕМКИ ВЫПОЛНЕННЫХ РАБОТ № ${actNumber}</h1>
  <div class="clinic">${clinicLegalName} • Приказ Минздрава РФ № 804н • Закон РФ № 2300-1</div>
</div>
<div class="patient">
  <div><strong>Заказчик (Пациент):</strong> ${inv.patientName}</div>
  <div><strong>Исполнитель (Врач):</strong> ${inv.doctorName}</div>
  <div><strong>Дата выполнения:</strong> ${inv.date}</div>
</div>
<table>
  <thead>
    <tr><th>№</th><th>Код (804н)</th><th>Наименование стоматологической услуги</th><th>Кол-во</th><th>Сумма</th></tr>
  </thead>
  <tbody>
    ${inv.items
			.map(
				(it, idx) =>
					`<tr><td>${idx + 1}</td><td>${it.code || "A16.07.002"}</td><td>${it.name}</td><td>${it.quantity}</td><td>${it.priceRub.toLocaleString("ru-RU")} ₽</td></tr>`,
			)
			.join("")}
  </tbody>
</table>
<div class="total">Всего оказано услуг на сумму: ${inv.status === "warranty_100" ? "0 ₽ (Скидка 100% — Гарантия)" : `${inv.totalAmountRub.toLocaleString("ru-RU")} ₽`}</div>
<div class="footer">
  <div>Заказчик: ________________ / ${inv.patientName} /</div>
  <div>Исполнитель: ________________ / ${inv.doctorName} /</div>
</div>
</body>
</html>`;

		void hardwarePrinter.printHtmlWithPopupFallback(html, {
			title: `Акт № ${actNumber}`,
			downloadFilename: `Akt_${actNumber}.html`,
		}).then(() => {
			showToast(`Акт по счету ${inv.number} отправлен на печать`, "success");
		}).catch(() => {
			showToast("Ошибка отправки акта на принтер", "error");
		});
	};

	// 100% Warranty discount application (Doctor Autonomy Mandate 8e)
	const handleApplyWarranty100 = (inv: BillingInvoice) => {
		setInvoices((prev) =>
			prev.map((item) =>
				item.id === inv.id
					? {
							...item,
							totalAmountRub: 0,
							paidAmountRub: 0,
							status: "warranty_100",
							paymentMethod: "warranty_discount_100",
							notes: (item.notes ? `${item.notes}; ` : "") + "Гарантия 100% (без чека ККТ)",
						}
					: item,
			),
		);
		setActiveMenuInvoiceId(null);
		showToast(`Счет ${inv.number} переведен в статус: Гарантия 100% (0 ₽)`, "info");
	};

	// Create new invoice (1-click preset)
	const handleCreateInvoice = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newPatientName.trim()) {
			showToast("Введите ФИО пациента для создания счета", "warning");
			return;
		}

		const invoiceNumber = `СЧ-${Date.now().toString().slice(-6)}`;
		const finalAmount = newIsWarranty100 ? 0 : Math.max(0, newServicePriceRub);
		const newInvoice: BillingInvoice = {
			id: `inv-${Date.now()}`,
			number: invoiceNumber,
			patientId: `pat-${Date.now().toString().slice(-4)}`,
			patientName: newPatientName.trim(),
			doctorName: currentDoctorName,
			date: new Date().toLocaleDateString("ru-RU"),
			totalAmountRub: finalAmount,
			paidAmountRub: newIsWarranty100 ? 0 : 0,
			status: newIsWarranty100 ? "warranty_100" : "issued",
			items: [
				{
					id: `li-${Date.now()}`,
					code: "A16.07.002",
					name: newServiceName.trim() || "Стоматологический прием и лечение",
					quantity: 1,
					priceRub: finalAmount,
				},
			],
			createdAt: new Date().toISOString(),
			paymentMethod: newIsWarranty100 ? "warranty_discount_100" : undefined,
			notes: newIsWarranty100 ? "Гарантийный прием 100%" : undefined,
		};

		setInvoices((prev) => [newInvoice, ...prev]);
		setIsCreateModalOpen(false);
		setNewPatientName("");
		setNewServiceName("");
		setNewServicePriceRub(5000);
		setNewIsWarranty100(false);
		showToast(`Счет ${invoiceNumber} успешно сформирован`, "success");
	};

	return (
		<div className="w-full h-full flex flex-col bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] select-none">
			{/* 1-Line Dense Toolbar (32–36px) — Compliance: Mandate 8d & Hick's Law */}
			<div
				className="h-9 min-h-[36px] px-3 bg-[var(--paper,#ffffff)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2 shrink-0"
				role="toolbar"
				aria-label="Панель счетов и актов"
			>
				{/* Left: Section Identity & Filter Tabs */}
				<div className="flex items-center gap-1.5 overflow-x-auto">
					<div className="flex items-center gap-1.5 font-bold text-xs mr-2 text-[var(--ink,#0f172a)] shrink-0">
						<Receipt size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Счета и Акты</span>
					</div>

					<div className="flex items-center gap-1 bg-[var(--paper-soft,#f1f5f9)] p-0.5 rounded-lg border border-[var(--line,#e2e8f0)]">
						<button
							type="button"
							onClick={() => setFilterTab("all")}
							className={`min-h-[44px] sm:min-h-[26px] px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
								filterTab === "all"
									? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] shadow-2xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="filter-invoices-all"
						>
							<span>Все</span>
							<span className="text-[10px] opacity-70">({invoices.length})</span>
						</button>
						<button
							type="button"
							onClick={() => setFilterTab("pending")}
							className={`min-h-[44px] sm:min-h-[26px] px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
								filterTab === "pending"
									? "bg-[var(--paper,#ffffff)] text-amber-700 dark:text-amber-400 shadow-2xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="filter-invoices-pending"
						>
							<span>К оплате</span>
							<span className="text-[10px] opacity-70">
								({invoices.filter((i) => i.status === "issued" || i.status === "draft" || i.status === "partially_paid").length})
							</span>
						</button>
						<button
							type="button"
							onClick={() => setFilterTab("paid")}
							className={`min-h-[44px] sm:min-h-[26px] px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
								filterTab === "paid"
									? "bg-[var(--paper,#ffffff)] text-emerald-700 dark:text-emerald-400 shadow-2xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="filter-invoices-paid"
						>
							<span>Оплачено</span>
							<span className="text-[10px] opacity-70">
								({invoices.filter((i) => i.status === "paid").length})
							</span>
						</button>
						<button
							type="button"
							onClick={() => setFilterTab("warranty")}
							className={`min-h-[44px] sm:min-h-[26px] px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
								filterTab === "warranty"
									? "bg-[var(--paper,#ffffff)] text-purple-700 dark:text-purple-400 shadow-2xs border border-[var(--line,#e2e8f0)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
							data-testid="filter-invoices-warranty"
						>
							<span>Гарантия 100%</span>
							<span className="text-[10px] opacity-70">
								({invoices.filter((i) => i.status === "warranty_100").length})
							</span>
						</button>
					</div>
				</div>

				{/* Right: Search + 1-Click New Invoice Button */}
				<div className="flex items-center gap-2 shrink-0">
					<div className="relative flex items-center">
						<Search size={13} className="absolute left-2 text-[var(--muted,#64748b)] pointer-events-none" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по пациенту или № счета..."
							className="h-7 w-44 sm:w-56 pl-7 pr-2 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] outline-none focus:border-teal-500"
							data-testid="input-search-invoices"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 absolute right-1 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer flex items-center justify-center"
								aria-label="Очистить поиск"
							>
								<X size={12} />
							</button>
						)}
					</div>

					<button
						type="button"
						onClick={() => setIsCreateModalOpen(true)}
						className="min-h-[44px] min-w-[44px] sm:min-h-[28px] sm:min-w-0 h-8 sm:h-7 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-98"
						data-testid="btn-create-invoice-open"
						title="Создать счет (1 клик)"
					>
						<Plus size={14} />
						<span className="hidden sm:inline">Новый счет</span>
					</button>

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-8 w-8 sm:h-7 sm:w-7 rounded-lg border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer transition-colors"
							aria-label="Закрыть реестр счетов"
						>
							<X size={16} />
						</button>
					)}
				</div>
			</div>

			{/* Invoices List Content */}
			<div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
				{filteredInvoices.length === 0 ? (
					<div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[var(--line,#e2e8f0)] rounded-2xl bg-[var(--paper,#ffffff)]">
						<Receipt size={36} className="text-[var(--muted,#64748b)] mb-2 opacity-50" />
						<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] mb-1">Счета не найдены</h3>
						<p className="text-xs text-[var(--muted,#64748b)] max-w-sm mb-4">
							{searchQuery
								? `По запросу «${searchQuery}» ничего не найдено.`
								: "В данном фильтре пока нет счетов. Нажмите «Новый счет» для быстрого создания."}
						</p>
						<button
							type="button"
							onClick={() => setIsCreateModalOpen(true)}
							className="min-h-[44px] px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
						>
							<Plus size={14} />
							<span>Создать первый счет</span>
						</button>
					</div>
				) : (
					filteredInvoices.map((inv) => {
						const isPaid = inv.status === "paid";
						const isWarranty = inv.status === "warranty_100";
						const isPending = !isPaid && !isWarranty;
						const isMenuOpen = activeMenuInvoiceId === inv.id;

						return (
							<div
								key={inv.id}
								className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3 sm:p-3.5 shadow-2xs hover:border-teal-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative"
								data-testid={`invoice-card-${inv.id}`}
							>
								{/* Left: Invoice Identity & Details */}
								<div className="flex items-start gap-3 min-w-0 flex-1">
									<div
										className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
											isPaid
												? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
												: isWarranty
													? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
													: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
										}`}
									>
										{isPaid ? <CheckCircle2 size={20} /> : isWarranty ? <ShieldCheck size={20} /> : <Clock size={20} />}
									</div>

									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="font-mono text-xs font-extrabold text-[var(--ink,#0f172a)]">
												{inv.number}
											</span>
											<span className="text-xs text-[var(--muted,#64748b)]">• {inv.date}</span>
											<span
												className={`px-2 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
													isPaid
														? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
														: isWarranty
															? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200"
															: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200"
												}`}
											>
												{isPaid
													? "Оплачено"
													: isWarranty
														? "Гарантия 100% (0 ₽)"
														: "К оплате"}
											</span>
										</div>

										<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] mt-0.5 truncate">
											{inv.patientName}
										</h4>

										<div className="flex items-center gap-2 text-xs text-[var(--muted,#64748b)] mt-0.5 flex-wrap">
											<span>Врач: <strong className="text-[var(--ink,#0f172a)] font-medium">{inv.doctorName}</strong></span>
											<span>•</span>
											<span>Услуг: {inv.items.length}</span>
											{inv.paymentMethod && (
												<>
													<span>•</span>
													<span className="text-teal-700 dark:text-teal-400 font-medium">
														{inv.paymentMethod === "card_terminal"
															? "Карта"
															: inv.paymentMethod === "cash"
																? "Наличные"
																: inv.paymentMethod === "warranty_discount_100"
																	? "Гарантия"
																	: inv.paymentMethod}
													</span>
												</>
											)}
										</div>
									</div>
								</div>

								{/* Middle: Amount in Roubles */}
								<div className="text-left sm:text-right shrink-0 px-2 sm:px-4">
									<div className="font-mono text-base sm:text-lg font-black text-[var(--ink,#0f172a)]">
										{isWarranty ? "0 ₽" : `${inv.totalAmountRub.toLocaleString("ru-RU")} ₽`}
									</div>
									<div className="text-[11px] text-[var(--muted,#64748b)]">
										{isPaid ? "Оплачено полностью" : isWarranty ? "Гарантийная скидка 100%" : "Остаток к оплате"}
									</div>
								</div>

								{/* Right: Actions (Mandate 8d: <=2 primary buttons, secondary in ...) */}
								<div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
									{isPending && (
										<button
											type="button"
											onClick={() => setActivePaymentInvoice(inv)}
											className="min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
											data-testid={`btn-pay-invoice-${inv.id}`}
											title="Принять оплату (касса 54-ФЗ / карта / сплит)"
										>
											<CreditCard size={14} />
											<span>Оплатить</span>
										</button>
									)}

									<button
										type="button"
										onClick={() => handlePrintInvoice(inv)}
										className="min-h-[44px] sm:min-h-[34px] px-2.5 py-1.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5 cursor-pointer transition-colors"
										data-testid={`btn-print-invoice-${inv.id}`}
										title="Печать счета на оплату"
									>
										<Printer size={14} className="text-slate-500" />
										<span className="hidden md:inline">Счет</span>
									</button>

									{/* Context Menu Trigger for secondary options */}
									<div className="relative">
										<button
											type="button"
											onClick={() => setActiveMenuInvoiceId(isMenuOpen ? null : inv.id)}
											className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] h-9 w-9 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
											aria-label="Дополнительные действия"
											data-testid={`btn-invoice-menu-${inv.id}`}
										>
											<MoreVertical size={16} />
										</button>

										{isMenuOpen && (
											<div
												className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-xl z-20 py-1 text-xs text-[var(--ink,#0f172a)] animate-in fade-in zoom-in-95 duration-100"
												role="menu"
											>
												<button
													type="button"
													onClick={() => {
														handlePrintAct(inv);
														setActiveMenuInvoiceId(null);
													}}
													className="w-full min-h-[44px] sm:min-h-[34px] px-3 py-2 text-left hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer transition-colors"
													role="menuitem"
												>
													<FileText size={14} className="text-teal-600" />
													<span>Печать акта 804н</span>
												</button>

												{isPending && (
													<button
														type="button"
														onClick={() => handleApplyWarranty100(inv)}
														className="w-full min-h-[44px] sm:min-h-[34px] px-3 py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-300 flex items-center gap-2 cursor-pointer transition-colors font-medium"
														role="menuitem"
													>
														<ShieldCheck size={14} className="text-purple-600" />
														<span>Гарантия 100% (0 ₽)</span>
													</button>
												)}

												<button
													type="button"
													onClick={() => {
														showToast(`Справка для налоговой (ФНС 1151156) по счету ${inv.number} подготовлена`, "info");
														setActiveMenuInvoiceId(null);
													}}
													className="w-full min-h-[44px] sm:min-h-[34px] px-3 py-2 text-left hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer transition-colors"
													role="menuitem"
												>
													<FileCheck size={14} className="text-blue-600" />
													<span>Справка ФНС (1151156)</span>
												</button>
											</div>
										)}
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* Payment Modal (Modal Depth strictly 1) */}
			{activePaymentInvoice && (
				<PaymentModal
					isOpen={true}
					onClose={() => setActivePaymentInvoice(null)}
					amountKopecks={rubToKopecks(activePaymentInvoice.totalAmountRub)}
					patientId={activePaymentInvoice.patientId}
					patientName={activePaymentInvoice.patientName}
					doctorName={activePaymentInvoice.doctorName}
					clinicLegalName={clinicLegalName}
					invoiceId={activePaymentInvoice.id}
					onSuccess={(res) => {
						setInvoices((prev) =>
							prev.map((item) =>
								item.id === activePaymentInvoice.id
									? {
											...item,
											status: res.method === "warranty_discount_100" ? "warranty_100" : "paid",
											paidAmountRub: res.method === "warranty_discount_100" ? 0 : item.totalAmountRub,
											paidAt: new Date().toISOString(),
											paymentMethod: res.method,
										}
									: item,
							),
						);
						setActivePaymentInvoice(null);
						showToast(`Счет ${activePaymentInvoice.number} успешно закрыт`, "success");
					}}
				/>
			)}

			{/* Quick Create Invoice Modal (Modal Depth strictly 1) */}
			{isCreateModalOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="create-invoice-title"
				>
					<div className="w-full max-w-lg rounded-2xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col">
						{/* Header */}
						<div className="p-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
							<h3 id="create-invoice-title" className="text-base font-bold flex items-center gap-2 m-0">
								<Receipt size={18} className="text-teal-600" />
								<span>Быстрое создание счета (1 клик)</span>
							</h3>
							<button
								type="button"
								onClick={() => setIsCreateModalOpen(false)}
								className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-9 w-9 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
								aria-label="Закрыть окно создания счета"
							>
								<X size={18} />
							</button>
						</div>

						{/* Form */}
						<form onSubmit={handleCreateInvoice} className="p-4 space-y-4">
							{/* 1-Click Fast Presets (Mandate 8e: Doctor Autonomy) */}
							<div className="space-y-1.5">
								<label className="text-xs font-bold text-[var(--muted,#64748b)] flex items-center gap-1">
									<Sparkles size={13} className="text-amber-500" />
									<span>Быстрые пресеты услуг:</span>
								</label>
								<div className="flex items-center gap-1.5 flex-wrap">
									<button
										type="button"
										onClick={() => {
											setNewServiceName("Первичный осмотр + Компьютерная томография (КЛКТ)");
											setNewServicePriceRub(3500);
											setNewIsWarranty100(false);
										}}
										className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:border-teal-400 text-xs font-medium cursor-pointer"
									>
										Осмотр + КЛКТ (3 500 ₽)
									</button>
									<button
										type="button"
										onClick={() => {
											setNewServiceName("Профессиональная гигиена полости рта (GBT)");
											setNewServicePriceRub(10000);
											setNewIsWarranty100(false);
										}}
										className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:border-teal-400 text-xs font-medium cursor-pointer"
									>
										Профгигиена GBT (10 000 ₽)
									</button>
									<button
										type="button"
										onClick={() => {
											setNewServiceName("Лечение глубокого кариеса с пломбой");
											setNewServicePriceRub(6500);
											setNewIsWarranty100(false);
										}}
										className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:border-teal-400 text-xs font-medium cursor-pointer"
									>
										Кариес (6 500 ₽)
									</button>
									<button
										type="button"
										onClick={() => {
											setNewServiceName("Гарантийная переделка реставрации");
											setNewServicePriceRub(0);
											setNewIsWarranty100(true);
										}}
										className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold cursor-pointer"
									>
										Гарантия 100% (0 ₽)
									</button>
								</div>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-[var(--muted,#64748b)]">
									ФИО Пациента <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									required
									value={newPatientName}
									onChange={(e) => setNewPatientName(e.target.value)}
									placeholder="Например: Иванов Иван Иванович"
									data-testid="input-new-invoice-patient"
									className="h-10 w-full px-3 text-sm rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] outline-none focus:border-teal-500"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-[var(--muted,#64748b)]">
									Наименование услуги
								</label>
								<input
									type="text"
									value={newServiceName}
									onChange={(e) => setNewServiceName(e.target.value)}
									placeholder="Стоматологический прием и лечение"
									data-testid="input-new-invoice-service"
									className="h-10 w-full px-3 text-sm rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] outline-none focus:border-teal-500"
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)]">
										Сумма к оплате, ₽
									</label>
									<input
										type="number"
										min={0}
										step="1"
										disabled={newIsWarranty100}
										value={newIsWarranty100 ? 0 : newServicePriceRub}
										onChange={(e) => setNewServicePriceRub(Math.max(0, parseFloat(e.target.value) || 0))}
										data-testid="input-new-invoice-price"
										className="h-10 w-full px-3 font-mono font-bold text-sm rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] outline-none focus:border-teal-500 disabled:opacity-50"
									/>
								</div>

								<div className="space-y-1.5">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)]">
										Лечащий врач
									</label>
									<input
										type="text"
										readOnly
										value={currentDoctorName}
										className="h-10 w-full px-3 text-sm rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] outline-none"
									/>
								</div>
							</div>

							<div className="pt-2 flex items-center justify-end gap-2">
								<button
									type="button"
									onClick={() => setIsCreateModalOpen(false)}
									className="min-h-[44px] sm:min-h-[36px] px-4 rounded-xl border border-[var(--line,#e2e8f0)] text-xs font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
								>
									Отмена
								</button>
								<button
									type="submit"
									className="min-h-[44px] sm:min-h-[36px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
									data-testid="btn-new-invoice-submit"
								>
									<Plus size={14} />
									<span>Создать счет</span>
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};
export default InvoicesView;
