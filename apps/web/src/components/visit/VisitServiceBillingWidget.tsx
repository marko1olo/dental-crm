/**
 * apps/web/src/components/visit/VisitServiceBillingWidget.tsx
 *
 * DENTE Dental CRM — Chairside Visit Service Billing & 54-FZ Cash Register Widget.
 *
 * Canonical Master Component (Mandate 8s: Single Indivisible Authority).
 *
 * Compliant with:
 * - Mandate 8e, Item 7: Doctor autonomy for discounts (up to 100% on warranty reworks & staff) without admin pin.
 * - Mandate 8e, Item 9: Cash register 54-FZ without obstacles (1-click split payments, optional INN for citizens).
 * - Mandate 8b: Integer kopeck math without float drift.
 * - Mandate 8d & HIG: Zero emojis, 1-line toolbars, WCAG AAA contrast, responsive layout.
 * - Mandate 8n: Solo-doctor & small clinic ergonomics.
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
	Plus,
	Minus,
	Trash2,
	Percent,
	ShieldCheck,
	Check,
	CreditCard,
	Printer,
	Tag,
	Zap,
} from "lucide-react";
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { showToast } from "../GlobalToast.js";
import { PaymentModal } from "../finance/PaymentModal.js";
import { hardwarePrinter } from "../../services/hardware/HardwarePrinter.js";

export interface VisitBillingServiceItem {
	id: string;
	code804n: string;
	title: string;
	toothCode?: string | undefined;
	quantity: number;
	unitPriceRub: number;
	discountPercent?: number | undefined;
	discountRub?: number | undefined;
	isWarranty?: boolean | undefined;
	warrantyReason?: string | undefined;
}

export interface VisitBillingTotals {
	rawTotalRub: number;
	discountRub: number;
	totalDueRub: number;
	effectiveDiscountPercent: number;
	isWarranty100: boolean;
	itemsCount: number;
}

export interface VisitServiceBillingWidgetProps {
	readonly visitId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly cashierName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly initialServices?: readonly VisitBillingServiceItem[] | undefined;
	readonly onServicesChange?: ((services: VisitBillingServiceItem[]) => void) | undefined;
	readonly onSave?: ((services: VisitBillingServiceItem[], totals: VisitBillingTotals) => void) | undefined;
	readonly onOpenPayment?: ((totals: VisitBillingTotals) => void) | undefined;
	readonly onAddBillingItem?: ((item: { code804n?: string; title: string; priceRub: number; toothNumber?: number; quantity?: number }) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly className?: string | undefined;
}

export const DEFAULT_CHAIRSIDE_SERVICES: readonly VisitBillingServiceItem[] = [
	{
		id: "serv-1",
		code804n: "A16.07.002.010",
		title: "Препарирование и медикаментозная обработка кариозной полости",
		toothCode: "36",
		quantity: 1,
		unitPriceRub: 2500,
		discountPercent: 0,
		discountRub: 0,
		isWarranty: false,
	},
	{
		id: "serv-2",
		code804n: "A16.07.002.011",
		title: "Восстановление зуба пломбой светового отверждения (композит)",
		toothCode: "36",
		quantity: 1,
		unitPriceRub: 4500,
		discountPercent: 0,
		discountRub: 0,
		isWarranty: false,
	},
	{
		id: "serv-3",
		code804n: "A25.07.001",
		title: "Местная анестезия (инфильтрационная/проводниковая)",
		toothCode: "36",
		quantity: 1,
		unitPriceRub: 1200,
		discountPercent: 0,
		discountRub: 0,
		isWarranty: false,
	},
];

const DOCTOR_DISCOUNT_PRESETS = [
	{ percent: 0, label: "0% Без скидки", reason: "" },
	{ percent: 5, label: "5% Пенс/Утро", reason: "Пенсионная / Утренняя" },
	{ percent: 10, label: "10% Постоянный", reason: "Постоянный пациент" },
	{ percent: 15, label: "15% Комплекс", reason: "Комплексный план" },
	{ percent: 20, label: "20% Партнёр", reason: "Партнёрская скидка" },
	{ percent: 50, label: "50% Персонал", reason: "Сотрудники клиники / семья врача" },
	{ percent: 100, label: "100% Гарантия / Переделка", reason: "Гарантийная переделка" },
] as const;

export const VisitServiceBillingWidget: React.FC<VisitServiceBillingWidgetProps> = ({
	visitId,
	patientId = "pat-walkin",
	patientName = "Пациент",
	patientPhone = "",
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	doctorName = "Врач-стоматолог",
	cashierName,
	clinicLegalName = "ООО «ДЕНТЕ»",
	initialServices,
	onServicesChange,
	onSave,
	onOpenPayment,
	onAddBillingItem,
	readOnly = false,
	className = "",
}) => {
	const [services, setServices] = useState<VisitBillingServiceItem[]>(() => {
		if (initialServices && initialServices.length > 0) {
			return [...initialServices];
		}
		return [...DEFAULT_CHAIRSIDE_SERVICES];
	});

	const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(0);
	const [isGlobalWarranty100, setIsGlobalWarranty100] = useState<boolean>(false);
	const [globalDiscountReason, setGlobalDiscountReason] = useState<string>("");
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	const updateServices = useCallback(
		(newServices: VisitBillingServiceItem[]) => {
			setServices(newServices);
			onServicesChange?.(newServices);
		},
		[onServicesChange]
	);

	// Слушатель событий добавления и отката услуг от Копилота (Мандат 8e / DEF-COPILOT-01)
	useEffect(() => {
		const handleAddBillingEvent = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (!detail) return;
			const item = detail.item || detail;
			if (!item.title && !item.name) return;
			const newItem: VisitBillingServiceItem = {
				id: `copilot-serv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
				code804n: item.code804n || "A16.07.001",
				title: item.title || item.name || "Услуга",
				toothCode: item.toothNumber ? String(item.toothNumber) : item.toothCode,
				quantity: item.quantity || 1,
				unitPriceRub: Number(item.priceRub ?? item.unitPriceRub ?? item.basePriceRub ?? 0),
				discountPercent: 0,
				discountRub: 0,
				isWarranty: false,
			};
			setServices((prev) => {
				const next = [...prev, newItem];
				onServicesChange?.(next);
				return next;
			});
			onAddBillingItem?.(item);
		};

		const handleRemoveBillingEvent = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (!detail) return;
			const codesOrTitles = detail.items || [detail.item || detail];
			setServices((prev) => {
				const next = prev.filter((s) => {
					return !codesOrTitles.some((t: any) => {
						if (typeof t === "string") return s.code804n === t || s.title === t;
						return (t.code804n && s.code804n === t.code804n) || (t.title && s.title === t.title);
					});
				});
				onServicesChange?.(next);
				return next;
			});
		};

		window.addEventListener("dente-add-billing-item", handleAddBillingEvent);
		window.addEventListener("dente-remove-billing-items", handleRemoveBillingEvent);
		return () => {
			window.removeEventListener("dente-add-billing-item", handleAddBillingEvent);
			window.removeEventListener("dente-remove-billing-items", handleRemoveBillingEvent);
		};
	}, [onServicesChange, onAddBillingItem]);

	// Inline Price Step (+500 ₽ / -500 ₽)
	const handleStepPrice = useCallback(
		(serviceId: string, deltaRub: number) => {
			if (readOnly) return;
			const next = services.map((s) => {
				if (s.id !== serviceId) return s;
				const newPrice = Math.max(0, s.unitPriceRub + deltaRub);
				return {
					...s,
					unitPriceRub: newPrice,
				};
			});
			updateServices(next);
		},
		[readOnly, services, updateServices]
	);

	// Direct Inline Price Change
	const handlePriceChange = useCallback(
		(serviceId: string, newPriceRub: number) => {
			if (readOnly) return;
			const sanitized = Math.max(0, Number.isFinite(newPriceRub) ? newPriceRub : 0);
			const next = services.map((s) => {
				if (s.id !== serviceId) return s;
				return {
					...s,
					unitPriceRub: sanitized,
				};
			});
			updateServices(next);
		},
		[readOnly, services, updateServices]
	);

	// Quantity Step (+ / -)
	const handleQuantityChange = useCallback(
		(serviceId: string, delta: number) => {
			if (readOnly) return;
			const next = services.map((s) => {
				if (s.id !== serviceId) return s;
				const newQty = Math.max(1, s.quantity + delta);
				return { ...s, quantity: newQty };
			});
			updateServices(next);
		},
		[readOnly, services, updateServices]
	);

	// Per-Service 100% Warranty Toggle (Doctor Autonomy Mandate 8e Item 7)
	const handleToggleWarranty = useCallback(
		(serviceId: string) => {
			if (readOnly) return;
			const next = services.map((s) => {
				if (s.id !== serviceId) return s;
				const isNowWarranty = !s.isWarranty;
				return {
					...s,
					isWarranty: isNowWarranty,
					discountPercent: isNowWarranty ? 100 : 0,
					warrantyReason: isNowWarranty ? "Гарантийная переделка" : undefined,
				};
			});
			updateServices(next);
		},
		[readOnly, services, updateServices]
	);

	// Per-Service Discount Change
	const handleServiceDiscountChange = useCallback(
		(serviceId: string, percent: number) => {
			if (readOnly) return;
			const clamped = Math.max(0, Math.min(100, percent));
			const next = services.map((s) => {
				if (s.id !== serviceId) return s;
				return {
					...s,
					discountPercent: clamped,
					isWarranty: clamped === 100,
					warrantyReason: clamped === 100 ? "Гарантийная переделка" : undefined,
				};
			});
			updateServices(next);
		},
		[readOnly, services, updateServices]
	);

	// Add Service
	const handleAddService = useCallback(() => {
		if (readOnly) return;
		const newItem: VisitBillingServiceItem = {
			id: `serv-${Date.now()}`,
			code804n: "A16.07.002",
			title: "Стоматологический приём и лечение",
			quantity: 1,
			unitPriceRub: 1500,
			discountPercent: 0,
			discountRub: 0,
			isWarranty: false,
		};
		updateServices([...services, newItem]);
		showToast("Услуга добавлена в расчёт визита", "info", 1500);
	}, [readOnly, services, updateServices]);

	// Remove Service
	const handleRemoveService = useCallback(
		(serviceId: string) => {
			if (readOnly) return;
			const next = services.filter((s) => s.id !== serviceId);
			updateServices(next);
		},
		[readOnly, services, updateServices]
	);

	// Global Doctor Autonomy Discount Presets (Mandate 8e Item 7)
	const applyGlobalDiscount = useCallback(
		(percent: number, reason: string) => {
			if (readOnly) return;
			const clamped = Math.max(0, Math.min(100, percent));
			const isWarranty = clamped === 100;
			setGlobalDiscountPercent(clamped);
			setIsGlobalWarranty100(isWarranty);
			setGlobalDiscountReason(reason);
			if (isWarranty) {
				showToast("Применена 100% скидка врача: Гарантийная переделка (0 ₽)", "info", 2500);
			} else if (clamped > 0) {
				showToast(`Применена скидка врача ${clamped}% (${reason})`, "info", 2000);
			} else {
				showToast("Скидка врача сброшена (0%)", "info", 1500);
			}
		},
		[readOnly]
	);

	// Kopeck-Exact Totals Calculation (Mandate 8b)
	const totals = useMemo<VisitBillingTotals>(() => {
		let totalGrossKop = 0;
		let totalItemDiscountKop = 0;

		for (const item of services) {
			const itemGrossKop = rubToKopecks(item.unitPriceRub) * item.quantity;
			totalGrossKop += itemGrossKop;

			if (item.isWarranty || (item.discountPercent !== undefined && item.discountPercent >= 100)) {
				totalItemDiscountKop += itemGrossKop;
			} else if (item.discountPercent !== undefined && item.discountPercent > 0) {
				const discKop = Math.round((itemGrossKop * item.discountPercent) / 100);
				totalItemDiscountKop += Math.min(itemGrossKop, discKop);
			} else if (item.discountRub !== undefined && item.discountRub > 0) {
				totalItemDiscountKop += Math.min(itemGrossKop, rubToKopecks(item.discountRub));
			}
		}

		let netKop = Math.max(0, totalGrossKop - totalItemDiscountKop);

		// Apply global visit doctor discount
		let finalDiscountKop = totalItemDiscountKop;
		if (isGlobalWarranty100 || globalDiscountPercent >= 100) {
			finalDiscountKop = totalGrossKop;
			netKop = 0;
		} else if (globalDiscountPercent > 0 && netKop > 0) {
			const additionalDiscKop = Math.round((netKop * globalDiscountPercent) / 100);
			finalDiscountKop += additionalDiscKop;
			netKop = Math.max(0, netKop - additionalDiscKop);
		}

		const rawTotalRub = kopecksToRub(totalGrossKop);
		const discountRub = kopecksToRub(finalDiscountKop);
		const totalDueRub = kopecksToRub(netKop);
		const effectiveDiscountPercent =
			totalGrossKop > 0 ? Number(((finalDiscountKop / totalGrossKop) * 100).toFixed(1)) : 0;

		return {
			rawTotalRub,
			discountRub,
			totalDueRub,
			effectiveDiscountPercent,
			isWarranty100: isGlobalWarranty100 || effectiveDiscountPercent >= 100,
			itemsCount: services.length,
		};
	}, [services, isGlobalWarranty100, globalDiscountPercent]);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			onSave?.(services, totals);
			showToast("Расчёт услуг визита сохранён", "success", 2000);
		} finally {
			setIsSaving(false);
		}
	};

	const handleOpenPaymentModal = () => {
		if (onOpenPayment) {
			onOpenPayment(totals);
		} else {
			setIsPaymentModalOpen(true);
		}
	};

	const handlePrintEstimate = () => {
		const printRows = services
			.map(
				(s, idx) => `<tr>
					<td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
					<td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${s.code804n}</td>
					<td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">
						${s.title}${s.toothCode ? ` (зуб ${s.toothCode})` : ""}
						${s.isWarranty ? '<span style="color: #15803d; font-weight: bold;"> [Гарантия 100%]</span>' : ""}
					</td>
					<td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${s.quantity}</td>
					<td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${s.unitPriceRub.toLocaleString("ru-RU")} ₽</td>
					<td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">
						${s.isWarranty ? "0 ₽" : `${(s.unitPriceRub * s.quantity).toLocaleString("ru-RU")} ₽`}
					</td>
				</tr>`
			)
			.join("");

		const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Смета оказанных стоматологических услуг</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; }
.header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
h1 { margin: 0 0 8px 0; font-size: 20px; font-weight: 800; }
.clinic { font-size: 13px; color: #475569; }
.patient { margin: 16px 0; font-size: 14px; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
th { background: #f8fafc; font-weight: 700; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-align: left; }
.total-box { margin-top: 24px; text-align: right; font-size: 14px; }
.total-due { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 8px; }
</style>
</head>
<body>
<div class="header">
  <h1>СМЕТА ОКАЗАННЫХ СТОМАТОЛОГИЧЕСКИХ УСЛУГ</h1>
  <div class="clinic">${clinicLegalName} • Номенклатура Минздрава РФ № 804н</div>
</div>
<div class="patient">
  <div><strong>Пациент:</strong> ${patientName}</div>
  <div><strong>Лечащий врач:</strong> ${doctorName}</div>
  <div><strong>Дата:</strong> ${new Date().toLocaleDateString("ru-RU")}</div>
</div>
<table>
  <thead>
    <tr>
      <th>№</th>
      <th>Код 804н</th>
      <th>Наименование услуги</th>
      <th style="text-align: center;">Кол-во</th>
      <th style="text-align: right;">Цена</th>
      <th style="text-align: right;">Сумма</th>
    </tr>
  </thead>
  <tbody>
    ${printRows}
  </tbody>
</table>
<div class="total-box">
  <div>Сумма по прейскуранту: <strong>${totals.rawTotalRub.toLocaleString("ru-RU")} ₽</strong></div>
  ${totals.discountRub > 0 ? `<div style="color: #b45309;">Скидка врача: <strong>-${totals.discountRub.toLocaleString("ru-RU")} ₽ (${totals.effectiveDiscountPercent}%)</strong></div>` : ""}
  <div class="total-due">Итого к оплате: ${totals.isWarranty100 ? "0 ₽ (Скидка 100% — Гарантийный прием)" : `${totals.totalDueRub.toLocaleString("ru-RU")} ₽`}</div>
</div>
</body>
</html>`;

		void hardwarePrinter.printHtmlWithPopupFallback(html, {
			title: "Смета услуг визита",
			downloadFilename: `Smeta_${Date.now()}.html`,
		}).then(() => {
			showToast("Смета отправлена на печать", "success", 2000);
		}).catch(() => {
			showToast("Ошибка отправки сметы на печать", "error", 2500);
		});
	};

	return (
		<div
			className={`p-4 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] space-y-4 shadow-sm ${className}`}
			data-testid="visit-service-billing-widget"
		>
			{/* Header: Title & Quick Stats */}
			<div className="flex items-center justify-between flex-wrap gap-2 border-b border-[var(--line,#e2e8f0)] pb-3">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
						<Tag size={18} />
					</div>
					<div>
						<h3 className="text-sm font-bold m-0 flex items-center gap-2">
							<span>Услуги и биллинг у кресла</span>
							<span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-mono font-bold">
								{services.length} поз.
							</span>
						</h3>
						<p className="text-xs text-[var(--muted,#64748b)] m-0">
							Врач: <strong className="text-[var(--ink,#0f172a)]">{doctorName}</strong>
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 flex-wrap">
					{!readOnly && (
						<button
							type="button"
							onClick={handleAddService}
							title="Добавить позицию медицинской услуги в список визита"
							className="h-8 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100 text-xs font-bold cursor-pointer flex items-center gap-1 transition-all"
							data-testid="btn-add-service-chairside"
						>
							<Plus size={14} />
							<span>Добавить услугу</span>
						</button>
					)}
					<button
						type="button"
						onClick={handlePrintEstimate}
						title="Печать сметы оказанных услуг для пациента"
						className="h-8 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] text-xs font-semibold text-[var(--ink,#0f172a)] cursor-pointer flex items-center gap-1 transition-all"
						data-testid="btn-print-visit-estimate"
					>
						<Printer size={14} className="text-blue-600" />
						<span>Смета</span>
					</button>
				</div>
			</div>

			{/* Doctor Autonomy Discount Bar (Mandate 8e Item 7: No Admin Password Barrier) */}
			<div
				className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2"
				data-testid="doctor-discount-bar"
			>
				<div className="flex items-center justify-between flex-wrap gap-2 text-xs">
					<div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
						<Percent size={14} className="text-amber-600 shrink-0" />
						<span>Свобода скидок врача (Мандат 8e • Без паролей и согласований):</span>
					</div>
					{globalDiscountPercent > 0 && (
						<span
							className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200"
							data-testid="active-global-discount-badge"
						>
							Активна скидка {globalDiscountPercent}% {globalDiscountReason ? `(${globalDiscountReason})` : ""}
						</span>
					)}
				</div>

				<div className="flex items-center gap-1.5 flex-wrap">
					{DOCTOR_DISCOUNT_PRESETS.map((preset) => {
						const isSelected =
							(preset.percent === 100 && isGlobalWarranty100) ||
							(!isGlobalWarranty100 && globalDiscountPercent === preset.percent);
						return (
							<button
								key={preset.percent}
								type="button"
								onClick={() => applyGlobalDiscount(preset.percent, preset.reason)}
								title={preset.reason ? `Применить скидку: ${preset.reason}` : "Сбросить скидку"}
								className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
									isSelected
										? preset.percent === 100
											? "bg-emerald-600 text-white shadow-2xs"
											: "bg-amber-600 text-white shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid={`btn-discount-preset-${preset.percent}`}
							>
								{preset.percent === 100 ? <ShieldCheck size={12} /> : <Zap size={11} />}
								<span>{preset.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 100% Warranty Banner */}
			{totals.isWarranty100 && (
				<div
					className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 font-bold"
					data-testid="warranty-100-active-banner"
				>
					<div className="flex items-center gap-2">
						<ShieldCheck size={16} className="text-emerald-600 shrink-0" />
						<span>Гарантийный приём / 100% скидка врача • К оплате в кассу: 0 ₽</span>
					</div>
					<span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
						Без фискального трения
					</span>
				</div>
			)}

			{/* Services List with Inline Price Editing & Step Buttons (+500 ₽ / -500 ₽) */}
			<div className="space-y-2" data-testid="chairside-services-list">
				{services.length === 0 ? (
					<div className="p-8 text-center border-2 border-dashed border-[var(--line,#e2e8f0)] rounded-xl text-xs text-[var(--muted,#64748b)]">
						Нет добавленных услуг. Нажмите «+ Добавить услугу».
					</div>
				) : (
					services.map((item, index) => {
						const rowGrossRub = item.unitPriceRub * item.quantity;
						const isItemWarranty = item.isWarranty || totals.isWarranty100;
						const rowDueRub = isItemWarranty ? 0 : rowGrossRub;

						return (
							<div
								key={item.id}
								className={`p-3 rounded-xl border transition-all ${
									isItemWarranty
										? "border-emerald-500/30 bg-emerald-500/5"
										: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]"
								}`}
								data-testid={`chairside-service-row-${item.id}`}
							>
								<div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
									{/* Service info */}
									<div className="min-w-0 flex-1 space-y-1">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-xs font-mono font-bold text-[var(--muted,#64748b)]">
												#{index + 1}
											</span>
											<span className="text-xs font-bold text-[var(--ink,#0f172a)] break-words">
												{item.title}
											</span>
											{item.toothCode && (
												<span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
													зуб {item.toothCode}
												</span>
											)}
											{item.code804n && (
												<span className="text-[10px] font-mono text-[var(--muted,#64748b)]">
													{item.code804n}
												</span>
											)}
										</div>

										{/* Per-Service 100% Warranty Autonomy Toggle */}
										<div className="flex items-center gap-2 pt-0.5">
											<button
												type="button"
												onClick={() => handleToggleWarranty(item.id)}
												title="Оформить данную услугу по 100% гарантии (0 ₽)"
												className={`h-6 px-2 rounded-md text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
													item.isWarranty
														? "bg-emerald-600 text-white shadow-2xs"
														: "bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] hover:border-emerald-400 text-emerald-700 dark:text-emerald-300"
												}`}
												data-testid={`btn-warranty-toggle-${item.id}`}
											>
												<ShieldCheck size={12} />
												<span>{item.isWarranty ? "Гарантия 100% (0 ₽)" : "По гарантии"}</span>
											</button>
										</div>
									</div>

									{/* Controls: Quantity + Inline Price Editing (+500 ₽ / -500 ₽) */}
									<div className="flex items-center gap-3 flex-wrap shrink-0">
										{/* Quantity */}
										<div className="flex items-center border border-[var(--line,#e2e8f0)] rounded-lg bg-[var(--paper,#ffffff)] overflow-hidden">
											<button
												type="button"
												onClick={() => handleQuantityChange(item.id, -1)}
												title="Уменьшить количество"
												className="w-7 h-7 flex items-center justify-center hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] cursor-pointer"
												data-testid={`btn-qty-minus-${item.id}`}
											>
												<Minus size={12} />
											</button>
											<span className="w-8 text-center text-xs font-bold font-mono">
												{item.quantity}
											</span>
											<button
												type="button"
												onClick={() => handleQuantityChange(item.id, 1)}
												title="Увеличить количество"
												className="w-7 h-7 flex items-center justify-center hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] cursor-pointer"
												data-testid={`btn-qty-plus-${item.id}`}
											>
												<Plus size={12} />
											</button>
										</div>

										{/* Inline Price Editing with +500 ₽ / -500 ₽ Step Buttons */}
										<div className="flex items-center gap-1 bg-[var(--paper,#ffffff)] p-1 rounded-xl border border-[var(--line,#e2e8f0)]">
											<button
												type="button"
												onClick={() => handleStepPrice(item.id, -500)}
												title={item.unitPriceRub <= 0 ? "Минимальная цена 0 ₽" : "Снизить цену на 500 ₽"}
												className="h-7 px-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold font-mono cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center"
												data-testid={`btn-step-minus-500-${item.id}`}
											>
												-500 ₽
											</button>

											<div className="relative flex items-center">
												<input
													type="number"
													min={0}
													step={100}
													value={item.unitPriceRub}
													onChange={(e) => handlePriceChange(item.id, Number(e.target.value) || 0)}
													className="h-7 w-20 px-2 text-xs font-bold font-mono text-right bg-transparent border-0 outline-none text-[var(--ink,#0f172a)]"
													data-testid={`input-unit-price-${item.id}`}
													title="Прямое редактирование цены услуги"
												/>
												<span className="text-xs font-mono font-bold text-[var(--muted,#64748b)] pr-1.5">
													₽
												</span>
											</div>

											<button
												type="button"
												onClick={() => handleStepPrice(item.id, 500)}
												title="Увеличить цену на 500 ₽"
												className="h-7 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold font-mono cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center"
												data-testid={`btn-step-plus-500-${item.id}`}
											>
												+500 ₽
											</button>
										</div>

										{/* Total for row */}
										<div className="w-24 text-right">
											{item.isWarranty || totals.isWarranty100 ? (
												<div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
													0 ₽
													<div className="text-[10px] font-normal text-emerald-700 dark:text-emerald-500">
														Гарантия
													</div>
												</div>
											) : (
												<div className="text-xs font-bold font-mono text-[var(--ink,#0f172a)]">
													{rowDueRub.toLocaleString("ru-RU")} ₽
												</div>
											)}
										</div>

										{/* Delete */}
										{!readOnly && (
											<button
												type="button"
												onClick={() => handleRemoveService(item.id)}
												title="Удалить услугу из визита"
												className="w-7 h-7 rounded-lg text-[var(--muted,#64748b)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer transition-colors"
												data-testid={`btn-remove-service-${item.id}`}
											>
												<Trash2 size={14} />
											</button>
										)}
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* Totals & Bottom Actions */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-3">
				<div className="flex items-center justify-between flex-wrap gap-2 text-xs">
					<div className="space-y-0.5">
						<div className="text-[var(--muted,#64748b)]">
							Сумма по прейскуранту:{" "}
							<strong className="text-[var(--ink,#0f172a)] font-mono">
								{totals.rawTotalRub.toLocaleString("ru-RU")} ₽
							</strong>
						</div>
						{totals.discountRub > 0 && (
							<div className="text-amber-700 dark:text-amber-300 font-medium">
								Скидка врача:{" "}
								<strong className="font-mono">
									-{totals.discountRub.toLocaleString("ru-RU")} ₽ ({totals.effectiveDiscountPercent}%)
								</strong>
							</div>
						)}
					</div>

					<div className="text-right">
						<div className="text-[11px] text-[var(--muted,#64748b)] uppercase tracking-wider font-semibold">
							Итого к оплате:
						</div>
						<div
							className={`text-lg font-black font-mono ${
								totals.isWarranty100
									? "text-emerald-600 dark:text-emerald-400"
									: "text-[var(--ink,#0f172a)]"
							}`}
							data-testid="visit-billing-total-due"
						>
							{totals.isWarranty100 ? "0 ₽ (Гарантия)" : `${totals.totalDueRub.toLocaleString("ru-RU")} ₽`}
						</div>
					</div>
				</div>

				{/* Hot Path Action Buttons (Mandate 8e: Zero Disabled Buttons Without Reason) */}
				<div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleSave}
							title={isSaving ? "Идет сохранение расчёта визита..." : "Сохранить позиции услуг и цены визита"}
							className="h-9 px-4 rounded-xl bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#e2e8f0)] border border-[var(--line,#e2e8f0)] text-xs font-bold text-[var(--ink,#0f172a)] cursor-pointer transition-all flex items-center gap-1.5"
							data-testid="btn-save-visit-billing"
						>
							<Check size={14} className="text-emerald-600" />
							<span>{isSaving ? "Сохранение..." : "Сохранить расчёт"}</span>
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleOpenPaymentModal}
							title={
								totals.isWarranty100
									? "Закрыть визит по 100% гарантии (0 ₽)"
									: `Перейти к оплате ${totals.totalDueRub.toLocaleString("ru-RU")} ₽ в кассу 54-ФЗ`
							}
							className={`h-9 px-5 rounded-xl text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-2 shadow-sm ${
								totals.isWarranty100
									? "bg-emerald-600 hover:bg-emerald-700"
									: "bg-teal-600 hover:bg-teal-700"
							}`}
							data-testid="btn-open-payment-modal"
						>
							{totals.isWarranty100 ? (
								<>
									<ShieldCheck size={16} />
									<span>Закрыть по гарантии (0 ₽)</span>
								</>
							) : (
								<>
									<CreditCard size={16} />
									<span>Оплатить в кассу 54-ФЗ ({totals.totalDueRub.toLocaleString("ru-RU")} ₽)</span>
								</>
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Universal Payment Modal 54-FZ (Sber POS, Cash, SBP, Split) */}
			{isPaymentModalOpen && (
				<PaymentModal
					isOpen={isPaymentModalOpen}
					onClose={() => setIsPaymentModalOpen(false)}
					patientId={patientId}
					patientName={patientName}
					patientPhone={patientPhone}
					amountRub={totals.totalDueRub}
					patientDepositRub={patientDepositRub}
					patientFamilyBalanceRub={patientFamilyBalanceRub}
					cashierName={cashierName || doctorName}
					doctorName={doctorName}
					clinicLegalName={clinicLegalName}
					initialDiscountPercent={globalDiscountPercent}
					initialWarranty100={totals.isWarranty100}
					initialDiscountReason={globalDiscountReason}
					onSuccess={() => {
						setIsPaymentModalOpen(false);
						showToast("Оплата успешно принята в кассу!", "success", 3000);
					}}
				/>
			)}
		</div>
	);
};

export default VisitServiceBillingWidget;
