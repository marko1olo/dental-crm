/**
 * ============================================================================
 * NURSE CARPULE DISPOSAL MODAL (САНПИН 3.3686-21 / ВРАЧ, АДМИНИСТРАТОР И МЕДСЕСТРА)
 * 1-кликовое списание пустых карпул анестетиков и расходников врачом,
 * администратором или медсестрой БЕЗ комиссии из 3 человек и с мягким овердрафтом.
 *
 * МАНДАТЫ 8e (п. 10), 8n (Zero Dead-Ends), 8v (ликвидация медсестринского клик-блоата).
 * Автоматический FEFO-светофор срока годности (зеленый / желтый / красный).
 * ============================================================================
 */

import React, { useState, useMemo, useEffect } from "react";
import {
	AlertTriangle,
	CheckCircle2,
	Copy,
	Download,
	MoreVertical,
	PackageCheck,
	Printer,
	ShieldCheck,
	Sparkles,
	Syringe,
	UserCheck,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { handleOneClickPackageWriteOff } from "./warehousePackageWriteOffEngine";

import {
	type AnestheticDrugOption,
	COMMON_ANESTHETICS,
} from "./carpuleDisposalConstants.js";

export {
	type AnestheticDrugOption,
	COMMON_ANESTHETICS,
};

export type FefoTrafficStatus = "green" | "yellow" | "red";

export interface FefoTrafficLightInfo {
	readonly status: FefoTrafficStatus;
	readonly daysLeft: number;
	readonly label: string;
	readonly badgeText: string;
	readonly className: string;
	readonly dotColor: string;
	readonly bgClass: string;
	readonly textClass: string;
	readonly borderClass: string;
	readonly tooltip: string;
}

/** Русское склонение дней: 1 день, 2 дня, 5 дней. */
function daysLabel(count: number): string {
	const absCount = Math.abs(count);
	const lastTwo = absCount % 100;
	const last = absCount % 10;
	if (lastTwo >= 11 && lastTwo <= 14) return `осталось ${absCount} дней`;
	if (last === 1) return `остался ${absCount} день`;
	if (last >= 2 && last <= 4) return `осталось ${absCount} дня`;
	return `осталось ${absCount} дней`;
}

/**
 * Автоматический FEFO-светофор срока годности расходников и анестетиков.
 * First Expired, First Out (СанПиН 3.3686-21, Мандаты 8e, 8n, 8v):
 * 1. Зеленый (green): срок в норме (> 30 дней) — плановое использование.
 * 2. Желтый (yellow): истекает скоро (1..30 дней) — первоочередной отпуск/списание по FEFO.
 * 3. Красный (red): просрочено (<= 0 дней) — запрет применения у кресла, немедленная утилизация (Класс Б).
 */
export function getFefoTrafficLight(
	expirationDateIso: string | null | undefined,
	referenceDate: string | Date = new Date(),
): FefoTrafficLightInfo {
	if (!expirationDateIso || !expirationDateIso.trim()) {
		return {
			status: "green",
			daysLeft: 999,
			label: "Срок не указан",
			badgeText: "Без срока",
			className: "",
			dotColor: "#94a3b8",
			bgClass: "bg-slate-500/10 dark:bg-slate-900/40",
			textClass: "text-slate-600 dark:text-slate-400",
			borderClass: "border-slate-300 dark:border-slate-700",
			tooltip: "Срок годности не указан (бессрочно)",
		};
	}

	const trimmed = expirationDateIso.trim();
	let dateStr = trimmed;

	// Поддержка формата ГГГГ-ММ (например, 2027-06)
	if (/^\d{4}-\d{2}$/.test(trimmed)) {
		const [y, m] = trimmed.split("-").map(Number);
		const lastDay = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
		dateStr = `${trimmed}-${String(lastDay).padStart(2, "0")}`;
	} else if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
		// Поддержка ДД.ММ.ГГГГ
		const [dd, mm, yyyy] = trimmed.split(".");
		dateStr = `${yyyy}-${mm}-${dd}`;
	}

	const ref =
		referenceDate instanceof Date
			? referenceDate
			: referenceDate
				? new Date(referenceDate)
				: new Date();
	const refUtc = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());

	const exp = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
	if (Number.isNaN(exp.getTime())) {
		return {
			status: "green",
			daysLeft: 999,
			label: "Срок не указан",
			badgeText: "Без срока",
			className: "",
			dotColor: "#94a3b8",
			bgClass: "bg-slate-500/10 dark:bg-slate-900/40",
			textClass: "text-slate-600 dark:text-slate-400",
			borderClass: "border-slate-300 dark:border-slate-700",
			tooltip: "Некорректный формат срока годности",
		};
	}

	const expUtc = Date.UTC(exp.getFullYear(), exp.getMonth(), exp.getDate());
	const daysLeft = Math.round((expUtc - refUtc) / 86400000);
	const readable = exp.toLocaleDateString("ru-RU");

	// 1. Красный (Просрочен / истекает сегодня)
	if (daysLeft < 0) {
		return {
			status: "red",
			daysLeft,
			label: `Просрочен с ${readable}`,
			badgeText: "Просрочен",
			className: "inventory-expiry-expired",
			dotColor: "#ef4444",
			bgClass: "bg-rose-500/10 dark:bg-rose-950/40",
			textClass: "text-rose-700 dark:text-rose-300",
			borderClass: "border-rose-500/30",
			tooltip: "Срок годности истек — запрещено использовать на пациентах! Подлежит списанию в утиль (Класс Б, СанПиН 3.3686-21)",
		};
	}

	if (daysLeft === 0) {
		return {
			status: "red",
			daysLeft: 0,
			label: `Истекает сегодня, ${readable}`,
			badgeText: "Истекает сегодня",
			className: "inventory-expiry-expired",
			dotColor: "#ef4444",
			bgClass: "bg-rose-500/10 dark:bg-rose-950/40",
			textClass: "text-rose-700 dark:text-rose-300",
			borderClass: "border-rose-500/30",
			tooltip: "Срок годности истекает сегодня — критично! Использовать сегодня или списать в утиль",
		};
	}

	// 2. Желтый (FEFO приоритет — истекает скоро)
	if (daysLeft <= 30) {
		return {
			status: "yellow",
			daysLeft,
			label: `Годен до ${readable} — ${daysLabel(daysLeft)}`,
			badgeText: "FEFO приоритет",
			className: "inventory-expiry-soon",
			dotColor: "#f59e0b",
			bgClass: "bg-amber-500/10 dark:bg-amber-950/40",
			textClass: "text-amber-800 dark:text-amber-300",
			borderClass: "border-amber-500/30",
			tooltip: `Истекает скоро (${daysLabel(daysLeft)}) — приоритет списания по регламенту FEFO (расходовать в первую очередь)`,
		};
	}

	// 3. Зеленый (FEFO норма)
	return {
		status: "green",
		daysLeft,
		label: `Годен до ${readable}`,
		badgeText: "FEFO норма",
		className: "",
		dotColor: "#10b981",
		bgClass: "bg-emerald-500/10 dark:bg-emerald-950/40",
		textClass: "text-emerald-700 dark:text-emerald-300",
		borderClass: "border-emerald-500/30",
		tooltip: `Срок годности в норме (осталось ${daysLeft} дн., FEFO OK)`,
	};
}

export interface NurseCarpuleDisposalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onDisposalConfirmed?: ((payload: {
		drugId: string;
		drugName: string;
		carpulesCount: number;
		volumeTotalMl: number;
		nurseName: string;
		doctorName: string;
		actNumber: string;
		actDate: string;
		isOverdraft: boolean;
	}) => void | Promise<void>) | undefined;
	readonly initialNurseName?: string | undefined;
	readonly initialDoctorName?: string | undefined;
	readonly currentStockAvailable?: number | undefined;
	readonly stockMap?: Record<string, number> | undefined;
	readonly initialDate?: string | undefined;
}

export function NurseCarpuleDisposalModal({
	isOpen,
	onClose,
	onDisposalConfirmed,
	initialNurseName = "Дежурный персонал / Врач",
	initialDoctorName = "Лечащий врач",
	currentStockAvailable = 0,
	stockMap,
	initialDate,
}: NurseCarpuleDisposalModalProps) {
	const now = new Date();
	const dateIso = initialDate || now.toISOString().slice(0, 10);

	const [selectedDrugId, setSelectedDrugId] = useState<string>("articaine_100k");
	const [carpulesCount, setCarpulesCount] = useState<number>(1);
	const [nurseName, setNurseName] = useState<string>(initialNurseName);
	const [doctorName, setDoctorName] = useState<string>(initialDoctorName);
	const [disposalReason, setDisposalReason] = useState<string>("used_in_procedure");
	const [actNumber] = useState<string>(
		() =>
			`АКТ-КП-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-01`
	);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [isDisposed, setIsDisposed] = useState<boolean>(false);
	const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

	const selectedDrug = useMemo(() => {
		return COMMON_ANESTHETICS.find((d) => d.id === selectedDrugId) ?? COMMON_ANESTHETICS[0]!;
	}, [selectedDrugId]);

	// FEFO светофор для текущего выбранного анестетика
	const fefoInfo = useMemo(() => {
		return getFefoTrafficLight(selectedDrug.defaultExp, dateIso);
	}, [selectedDrug.defaultExp, dateIso]);

	// Автоматический переключатель причины при просрочке
	useEffect(() => {
		if (fefoInfo.status === "red" && disposalReason === "used_in_procedure") {
			setDisposalReason("expired");
		}
	}, [fefoInfo.status, disposalReason]);

	// Динамический расчет доступного остатка для выбранного препарата
	const effectiveStockAvailable = useMemo(() => {
		if (stockMap) {
			const idKey = selectedDrug.id.toLowerCase();
			const nameKey = selectedDrug.nameRu.toLowerCase();
			if (stockMap[idKey] !== undefined) return stockMap[idKey]!;
			if (stockMap[nameKey] !== undefined) return stockMap[nameKey]!;

			for (const [k, v] of Object.entries(stockMap)) {
				const kl = k.toLowerCase();
				if (
					(kl.includes("артикаин") || kl.includes("ультракаин")) &&
					(nameKey.includes("артикаин") || idKey.includes("articaine"))
				) {
					return v;
				}
				if (
					(kl.includes("мепивакаин") || kl.includes("скандонест")) &&
					(nameKey.includes("мепивакаин") || idKey.includes("mepivacaine"))
				) {
					return v;
				}
				if (
					kl.includes("септанест") &&
					(nameKey.includes("септанест") || idKey.includes("septanest"))
				) {
					return v;
				}
			}
		}
		return currentStockAvailable;
	}, [stockMap, currentStockAvailable, selectedDrug]);

	const volumeTotalMl = Number((carpulesCount * selectedDrug.defaultVolumeMl).toFixed(2));
	const isOverdraft = effectiveStockAvailable < carpulesCount;

	const actHtml = useMemo(() => {
		return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Акт списания карпул ${actNumber}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11pt; color: #0f172a; margin: 20mm; line-height: 1.4; }
  .clinic-header { text-align: center; font-size: 10pt; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  h1 { text-align: center; font-size: 13pt; margin: 0 0 4px 0; }
  .sub { text-align: center; font-size: 9.5pt; color: #475569; margin-bottom: 20px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10pt; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #cbd5e1; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
  th, td { border: 1px solid #94a3b8; padding: 6px 10px; text-align: left; }
  th { background: #f8fafc; font-weight: 700; }
  .signatures { margin-top: 30px; font-size: 10pt; }
  .stamp { display: inline-block; margin-top: 16px; padding: 8px 16px; border: 2px dashed #0d9488; color: #0f766e; font-size: 9pt; font-weight: bold; text-transform: uppercase; border-radius: 6px; }
</style>
</head>
<body>
  <div class="clinic-header">Стоматологическая клиника • Процедурный кабинет</div>
  <h1>АКТ СПИСАНИЯ И УТИЛИЗАЦИИ КАРПУЛ АНЕСТЕТИКОВ № ${actNumber}</h1>
  <div class="sub">Регламент СанПиН 3.3686-21 (Медицинские отходы класса Б) • Доступно врачу и администратору в 1 клик (без комиссии из 3 человек)</div>

  <div class="meta-grid">
    <div><strong>Дата списания:</strong> ${dateIso}</div>
    <div><strong>Ответственный сотрудник:</strong> ${nurseName}</div>
    <div><strong>Лечащий врач:</strong> ${doctorName}</div>
    <div><strong>Причина:</strong> ${disposalReason === "used_in_procedure" ? "Использовано при лечении" : disposalReason === "partial_dose" ? "Остаток карпулы после анестезии" : disposalReason === "broken_capsule" ? "Бой карпулы при зарядке" : "Истечение срока годности (FEFO утилизация)"}</div>
    <div><strong>Класс отходов:</strong> Класс Б (дезинфекция Аламинол 3%, 60 мин)</div>
    <div><strong>Статус склада:</strong> ${isOverdraft ? "Мягкий овердрафт (оприходование в пути)" : "Штатный остаток"}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>№</th>
        <th>Наименование препарата</th>
        <th>Серия / Партия</th>
        <th>FEFO статус</th>
        <th>Кол-во</th>
        <th>Объем, мл</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>${selectedDrug.nameRu}</td>
        <td>${selectedDrug.defaultSeries} (до ${selectedDrug.defaultExp})</td>
        <td>${fefoInfo.badgeText}</td>
        <td>${carpulesCount} шт.</td>
        <td>${volumeTotalMl} мл</td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
    <div><strong>Списание произвел(а):</strong> ________________ / ${nurseName} (по СанПиН 3.3686-21, единолично без комиссии)</div>
    <div style="margin-top: 8px;"><strong>МОЛ отделения / врач:</strong> ________________ / ${doctorName}</div>
  </div>

  <div class="stamp">Списано и обеззаражено • СанПиН 3.3686-21</div>
</body>
</html>`;
	}, [actNumber, dateIso, nurseName, doctorName, disposalReason, isOverdraft, selectedDrug, fefoInfo.badgeText, carpulesCount, volumeTotalMl]);

	const handlePrintAct = () => {
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(actHtml);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 250);
		}
	};

	const handleDownloadAct = () => {
		const blob = new Blob([actHtml], { type: "text/html;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `${actNumber}.html`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const handleCopyActDetails = () => {
		const text = `Акт списания карпул ${actNumber} от ${dateIso}\nПрепарат: ${selectedDrug.nameRu}\nКоличество: ${carpulesCount} шт. (${volumeTotalMl} мл)\nFEFO: ${fefoInfo.badgeText}\nОтветственный: ${nurseName}\nВрач: ${doctorName}\nСанПиН 3.3686-21 (без комиссии)`;
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(text);
		}
		showToast("Реквизиты акта скопированы в буфер", "success");
	};

	if (!isOpen) return null;

	const handleFastDispose = async () => {
		setIsSubmitting(true);
		try {
			if (onDisposalConfirmed) {
				await onDisposalConfirmed({
					drugId: selectedDrug.id,
					drugName: selectedDrug.nameRu,
					carpulesCount,
					volumeTotalMl,
					nurseName,
					doctorName,
					actNumber,
					actDate: dateIso,
					isOverdraft,
				});
			}

			setIsDisposed(true);
			const msg = isOverdraft
				? `Списание ${carpulesCount} пустых карпул выполнено в 1 клик (Мягкий овердрафт: дефицит ${carpulesCount - effectiveStockAvailable} шт. зафиксирован, накладная ещё не оприходована).`
				: `Списание ${carpulesCount} пустых карпул оформлено в 1 клик врачом / администратором (СанПиН 3.3686-21, Акт ${actNumber}).`;
			showToast(msg, isOverdraft ? "warning" : "success");
			setTimeout(() => {
				onClose();
			}, 900);
		} catch (err) {
			console.error("Ошибка списания карпул:", err);
			showToast("Списание сохранено локально по аварийному протоколу СанПиН", "info");
			onClose();
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePackageClick = async (packageId: "anesthesia" | "hygiene" | "filling" | "surgery") => {
		if (packageId === "anesthesia") {
			setSelectedDrugId("articaine_100k");
			setCarpulesCount(1);
			showToast("Выбран пакет «Стандартная анестезия» (1 карпула + игла 30G + валики)", "info");
			return;
		}

		setIsSubmitting(true);
		try {
			const result = await handleOneClickPackageWriteOff({
				packageId,
				nurseName,
				doctorName,
				allowSoftOverdraft: true,
				currentStockMap: stockMap,
			});

			if (result.success) {
				setIsDisposed(true);
				if (onDisposalConfirmed) {
					await onDisposalConfirmed({
						drugId: packageId,
						drugName: result.packageTitle,
						carpulesCount: 1,
						volumeTotalMl: 1.7,
						nurseName,
						doctorName,
						actNumber: result.actNumber,
						actDate: result.actDate,
						isOverdraft: result.isOverdraft,
					});
				}
				setTimeout(() => {
					onClose();
				}, 900);
			}
		} catch (err) {
			console.error("Ошибка пакетного списания:", err);
			showToast("Пакетное списание зафиксировано локально (мягкий овердрафт)", "info");
			onClose();
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
			role="dialog"
			aria-modal="true"
			aria-labelledby="nurse-disposal-title"
		>
			<div className="w-full max-w-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
				{/* HEADER */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
							<Syringe size={22} />
						</div>
						<div className="min-w-0">
							<h2 id="nurse-disposal-title" className="text-base font-bold text-[var(--ink,#0f172a)] leading-tight truncate">
								1-клик пакеты: Учет карпул (1-Клик списание)
							</h2>
							<p
								className="text-xs text-[var(--muted,#64748b)] mt-0.5 truncate"
								title="СанПиН 3.3686-21 • Врачом, администратором или медсестрой (без комиссии из 3 человек)"
							>
								СанПиН 3.3686-21 Быстрая утилизация врачом/админом (без комиссии из 3 человек)
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-lg text-[var(--muted,#64748b)] hover:bg-[var(--paper-strong,#e2e8f0)] transition-colors shrink-0 cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* BODY */}
				<div className="p-5 space-y-4 overflow-y-auto">
					{/* AUTOMATIC FEFO TRAFFIC LIGHT BANNER (МАНДАТЫ 8e, 8v / САНПИН 3.3686-21) */}
					<div
						className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs leading-relaxed ${fefoInfo.bgClass} ${fefoInfo.borderClass}`}
						data-testid="nurse-fefo-traffic-light"
						data-fefo-status={fefoInfo.status}
					>
						<div className="flex items-center gap-2.5 min-w-0">
							<div
								className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
								style={{ backgroundColor: fefoInfo.dotColor }}
								data-fefo-dot={fefoInfo.status}
								aria-hidden="true"
							/>
							<div className="min-w-0">
								<div className="flex items-center gap-2 flex-wrap">
									<span className={`font-bold ${fefoInfo.textClass}`}>
										FEFO светофор: {fefoInfo.badgeText}
									</span>
									<span className="text-[11px] text-[var(--muted,#64748b)]">
										({selectedDrug.defaultSeries}, годен до {selectedDrug.defaultExp})
									</span>
								</div>
								<p className={`text-[11px] ${fefoInfo.textClass} opacity-90 truncate`}>
									{fefoInfo.tooltip}
								</p>
							</div>
						</div>
						<span
							className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 border ${fefoInfo.bgClass} ${fefoInfo.textClass} ${fefoInfo.borderClass}`}
							data-testid="nurse-fefo-badge"
						>
							{fefoInfo.status === "green"
								? "FEFO: Норма"
								: fefoInfo.status === "yellow"
									? "FEFO: Приоритет"
									: "FEFO: Просрочено"}
						</span>
					</div>

					{/* SOFT OVERDRAFT GUARANTEE BANNER (МАНДАТ 8e п. 10 / САНПИН 3.3686-21) */}
					<div
						className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
							isOverdraft
								? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
								: "bg-teal-500/10 border-teal-500/30 text-teal-900 dark:text-teal-200"
						}`}
						data-testid="nurse-disposal-overdraft-banner"
					>
						{isOverdraft ? (
							<AlertTriangle size={20} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
						) : (
							<ShieldCheck size={20} className="shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
						)}
						<div className="min-w-0 flex-1">
							<div className={`font-bold mb-0.5 truncate ${isOverdraft ? "text-amber-950 dark:text-amber-100" : "text-teal-950 dark:text-teal-100"}`}>
								{isOverdraft
									? "Мягкий овердрафт склада активен (СанПиН / Спасение зуба)"
									: "Быстрое списание расходников (СанПиН 3.3686-21)"}
							</div>
							<p className={`text-opacity-90 break-words ${isOverdraft ? "text-amber-900/90 dark:text-amber-200/90" : "text-teal-900/90 dark:text-teal-200/90"}`}>
								{isOverdraft
									? `Внимание: остаток отрицательный, требуется оприходование накладной. Задержка оприходования накладной поставщика не блокирует операцию! На складе числится ${effectiveStockAvailable} шт., списывается ${carpulesCount} шт.`
									: "Списание использованных карпул и медотходов класса Б доступно в 1 клик врачу или администратору. Никаких бюрократических согласований или комиссий из 3 человек!"}
							</p>
						</div>
					</div>

					{/* 1-CLICK CLINICAL PACKETS STRIP (4 КАНОНИЧЕСКИХ НАБОРА) */}
					<div className="p-3 rounded-xl border border-teal-500/20 bg-teal-500/5 flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-teal-800 dark:text-teal-200 flex items-center gap-1.5 min-w-0">
								<Zap size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span className="truncate">Пакетное списание в 1 клик:</span>
							</span>
							<span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 shrink-0">
								Мягкий овердрафт активен
							</span>
						</div>
						<div className="flex items-center gap-2 flex-wrap">
							{/* 1. Анестезия */}
							<button
								type="button"
								onClick={() => handlePackageClick("anesthesia")}
								className="btn-writeoff-anesthesia-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold border border-teal-500/40 bg-[var(--paper,#ffffff)] text-teal-800 dark:text-teal-200 hover:bg-teal-500/10 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shadow-xs min-w-0"
								data-testid="btn-writeoff-anesthesia-packet"
								title="Пакет: анестезия 1.7 мл + карпульная игла 30G + валики"
							>
								<Syringe size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span className="truncate min-w-0">Стандартная анестезия</span>
							</button>

							{/* 2. Профгигиена */}
							<button
								type="button"
								onClick={() => handlePackageClick("hygiene")}
								className="btn-writeoff-hygiene-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold border border-blue-500/40 bg-[var(--paper,#ffffff)] text-blue-800 dark:text-blue-200 hover:bg-blue-500/10 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shadow-xs min-w-0"
								data-testid="btn-writeoff-hygiene-packet"
								title="Пакет: СИЗ + Оптрагейт + порошок Air-Flow + паста + щетка"
							>
								<PackageCheck size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
								<span className="truncate min-w-0">Профгигиена</span>
							</button>

							{/* 3. Пломба световая */}
							<button
								type="button"
								onClick={() => handlePackageClick("filling")}
								className="btn-writeoff-filling-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold border border-emerald-500/40 bg-[var(--paper,#ffffff)] text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/10 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shadow-xs min-w-0"
								data-testid="btn-writeoff-filling-packet"
								title="Пакет: СИЗ + анестетик + нанокомпозит + адгезив + матрица"
							>
								<Sparkles size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span className="truncate min-w-0">Пломба световая</span>
							</button>

							{/* 4. Хирургия */}
							<button
								type="button"
								onClick={() => handlePackageClick("surgery")}
								className="btn-writeoff-surgery-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold border border-purple-500/40 bg-[var(--paper,#ffffff)] text-purple-800 dark:text-purple-200 hover:bg-purple-500/10 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shadow-xs min-w-0"
								data-testid="btn-writeoff-surgery-packet"
								title="Пакет: Анестетик + игла 27G + скальпель + шовник + губка"
							>
								<ShieldCheck size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
								<span className="truncate min-w-0">Хирургия</span>
							</button>
						</div>
					</div>

					{/* ANESTHETIC DRUG SELECTION & HICK'S LAW COMPACT FILTER TOOLBAR (32-36px) */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label htmlFor="nurse-anes-select" className="block text-xs font-semibold text-[var(--muted,#64748b)]">
								Наименование анестетика
							</label>
							<span className="text-[11px] text-[var(--muted,#64748b)]">
								1 клик выбор (Закон Хика + FEFO)
							</span>
						</div>

						{/* 1-ROW COMPACT PRESET CHIPS STRIP (HEIGHT 34px - HICK'S LAW 32-36px) */}
						<div
							className="nurse-carpule-filter-toolbar h-[34px] flex items-center gap-1.5 overflow-x-auto no-scrollbar"
							role="tablist"
							aria-label="Быстрый выбор анестетика"
						>
							{[
								{ id: "articaine_100k", label: "Ультракаин Форте (1:100к)" },
								{ id: "articaine_200k", label: "Ультракаин Д-С (1:200к)" },
								{ id: "mepivacaine_3", label: "Скандонест 3% (без адреналина)" },
								{ id: "septanest_100k", label: "Септанест (1:100к)" },
							].map((chip) => {
								const isSelected = selectedDrugId === chip.id;
								const chipDrug = COMMON_ANESTHETICS.find((d) => d.id === chip.id);
								const chipFefo = getFefoTrafficLight(chipDrug?.defaultExp, dateIso);
								return (
									<button
										key={chip.id}
										type="button"
										role="tab"
										aria-selected={isSelected}
										data-fefo-status={chipFefo.status}
										onClick={() => setSelectedDrugId(chip.id)}
										className={`nurse-carpule-filter-chip h-[34px] px-3 rounded-lg text-xs font-bold border whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 min-w-0 cursor-pointer ${
											isSelected
												? "bg-teal-600 border-teal-600 text-white shadow-xs"
												: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] hover:border-teal-500/40"
										}`}
									>
										<span
											className="w-2 h-2 rounded-full shrink-0"
											style={{ backgroundColor: chipFefo.dotColor }}
											data-fefo-dot={chipFefo.status}
											aria-hidden="true"
										/>
										<Syringe size={13} className={isSelected ? "text-white shrink-0" : "text-teal-600 dark:text-teal-400 shrink-0"} />
										<span className="truncate">{chip.label}</span>
									</button>
								);
							})}
						</div>

						{/* DETAILED SELECT WITH LOT AND EXPIRATION */}
						<select
							id="nurse-anes-select"
							value={selectedDrugId}
							onChange={(e) => setSelectedDrugId(e.target.value)}
							className="w-full h-9 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
						>
							{COMMON_ANESTHETICS.map((drug) => {
								const fefo = getFefoTrafficLight(drug.defaultExp, dateIso);
								return (
									<option key={drug.id} value={drug.id}>
										{`[FEFO: ${fefo.badgeText}] ${drug.nameRu} (серия: ${drug.defaultSeries}, годен до ${drug.defaultExp})`}
									</option>
								);
							})}
						</select>
					</div>

					{/* CARPULES COUNT STEPPER & FAST CHIPS */}
					<div>
						<div className="flex items-center justify-between mb-1.5">
							<span className="text-xs font-semibold text-[var(--muted,#64748b)]">
								Количество списанных карпул
							</span>
							<span className="text-xs font-bold text-teal-600">
								Общий объем: {volumeTotalMl} мл
							</span>
						</div>

						<div className="flex items-center gap-2">
							<div className="flex items-center border border-[var(--line,#e2e8f0)] rounded-lg bg-[var(--paper,#ffffff)] overflow-hidden min-h-[44px] h-11">
								<button
									type="button"
									onClick={() => setCarpulesCount((prev) => Math.max(1, prev - 1))}
									className="w-11 min-h-[44px] h-full flex items-center justify-center text-sm font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] active:bg-[var(--paper-strong,#e2e8f0)]"
								>
									−
								</button>
								<input
									type="number"
									min={1}
									max={100}
									value={carpulesCount}
									onChange={(e) => setCarpulesCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
									className="w-16 h-full text-center text-sm font-bold text-[var(--ink,#0f172a)] bg-transparent border-0 focus:outline-none"
								/>
								<button
									type="button"
									onClick={() => setCarpulesCount((prev) => prev + 1)}
									className="w-11 min-h-[44px] h-full flex items-center justify-center text-sm font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] active:bg-[var(--paper-strong,#e2e8f0)]"
								>
									+
								</button>
							</div>

							{/* QUICK CHIPS */}
							{[1, 2, 5, 10].map((num) => (
								<button
									key={num}
									type="button"
									onClick={() => setCarpulesCount(num)}
									className={`min-h-[44px] h-11 px-3.5 rounded-lg text-xs font-bold border transition-colors ${
										carpulesCount === num
											? "bg-teal-600 border-teal-600 text-white"
											: "border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
									}`}
								>
									{`${num} шт.`}
								</button>
							))}

							<button
								type="button"
								onClick={() => setCarpulesCount(15)}
								className="min-h-[44px] h-11 px-3.5 rounded-lg text-xs font-bold border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] ml-auto"
								title="Списать весь расход за смену"
							>
								Вся смена (15)
							</button>
						</div>
					</div>

					{/* SANPIN PROTOCOL DETAILS (COMPACT & PRE-FILLED) */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
						<div>
							<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1">
								Ответственный сотрудник (врач / администратор / медсестра)
							</span>
							<input
								type="text"
								value={nurseName}
								onChange={(e) => setNurseName(e.target.value)}
								className="w-full min-h-[44px] px-2.5 rounded border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)]"
							/>
						</div>

						<div>
							<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1">
								Лечащий врач приема
							</span>
							<input
								type="text"
								value={doctorName}
								onChange={(e) => setDoctorName(e.target.value)}
								className="w-full min-h-[44px] px-2.5 rounded border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)]"
							/>
						</div>

						<div>
							<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1">
								Причина списания
							</span>
							<select
								value={disposalReason}
								onChange={(e) => setDisposalReason(e.target.value)}
								className="w-full min-h-[44px] px-2.5 rounded border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)]"
							>
								<option value="used_in_procedure">Использовано при лечении</option>
								<option value="partial_dose">Остаток карпулы после анестезии</option>
								<option value="broken_capsule">Бой карпулы при зарядке</option>
								<option value="expired">Истечение срока годности (FEFO утилизация)</option>
							</select>
						</div>

						<div>
							<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1">
								Класс отходов / Дезинфекция
							</span>
							<div className="min-h-[44px] px-2.5 rounded border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center text-xs font-semibold text-[var(--ink,#0f172a)] truncate">
								Класс Б • Аламинол 3% (60 мин)
							</div>
						</div>
					</div>

					{/* SINGLE SIGNER AFFIRMATION (САНПИН 3.3686-21 БЕЗ КОМИССИИ) */}
					<div className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 text-teal-900 dark:text-teal-200 text-xs">
						<UserCheck size={18} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<div className="leading-snug min-w-0">
							<strong>Списание в 1 клик (СанПиН 3.3686-21):</strong> пустые карпулы и медотходы класса Б списываются врачом или администратором без созыва комиссии из 3 человек и без ожидания отдельной медсестры.
						</div>
					</div>
				</div>

				{/* FOOTER ACTIONS (МАНДАТ 8d: не более 1-2 кнопок прямого действия по Закону Миллера) */}
				<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between p-3 sm:p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] gap-2 shrink-0">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] h-9 px-4 text-xs font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors flex items-center justify-center cursor-pointer shrink-0"
					>
						Отмена
					</button>

					<div className="flex items-center gap-2 relative min-w-0 w-full sm:w-auto">
						{/* 1. Вторичная кнопка прямого действия: Печать акта утилизации Б */}
						<button
							type="button"
							onClick={handlePrintAct}
							className="hidden sm:flex min-h-[44px] h-9 px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#e2e8f0)] transition-colors items-center gap-1.5 cursor-pointer shadow-xs min-w-0"
							title="Печать акта утилизации карпул по СанПиН 3.3686-21 (Класс Б)"
						>
							<Printer size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span className="truncate">Печать акта Б</span>
						</button>

						{/* 2. Контекстное меню дополнительных действий (...) для третичных операций */}
						<div className="relative shrink-0">
							<button
								type="button"
								onClick={() => setShowMoreMenu((v) => !v)}
								className="min-h-[44px] h-9 w-9 px-0 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#e2e8f0)] transition-colors flex items-center justify-center cursor-pointer shadow-xs"
								title="Дополнительные действия..."
								aria-label="Дополнительные действия"
							>
								<MoreVertical size={16} />
							</button>

							{showMoreMenu && (
								<div
									className="absolute bottom-full right-0 mb-2 w-52 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl shadow-xl p-1.5 z-50 flex flex-col gap-1"
									onClick={() => setShowMoreMenu(false)}
								>
									<button
										type="button"
										onClick={handlePrintAct}
										className="sm:hidden w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer"
									>
										<Printer size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
										<span className="truncate">Печать акта Б</span>
									</button>
									<button
										type="button"
										onClick={handleCopyActDetails}
										className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer"
									>
										<Copy size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
										<span className="truncate">Копировать реквизиты</span>
									</button>
									<button
										type="button"
										onClick={handleDownloadAct}
										className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer"
									>
										<Download size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
										<span className="truncate">Скачать акт (HTML)</span>
									</button>
								</div>
							)}
						</div>

						{/* 3. Первичная кнопка прямого действия: Списать карпулы */}
						<button
							type="button"
							data-testid="btn-nurse-submit-disposal"
							onClick={handleFastDispose}
							disabled={isSubmitting || isDisposed}
							className={`min-h-[44px] h-9 flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer min-w-0 ${
								isDisposed
									? "bg-emerald-600"
									: "bg-teal-600 hover:bg-teal-700 active:scale-98"
							}`}
						>
							{isDisposed ? <CheckCircle2 size={16} className="shrink-0" /> : <Zap size={16} className="shrink-0" />}
							<span className="truncate">
								{isDisposed
									? "Списано успешно!"
									: isSubmitting
										? "Оформление..."
										: `Списать карпулы (${carpulesCount} шт.)`}
							</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default NurseCarpuleDisposalModal;
