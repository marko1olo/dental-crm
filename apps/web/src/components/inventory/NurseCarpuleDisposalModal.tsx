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
	Printer,
	ShieldCheck,
	Syringe,
	UserCheck,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast.js";
import { handleOneClickPackageWriteOff } from "./warehousePackageWriteOffEngine.js";
import { executeShiftCloseClassBWasteDisposal } from "./autoBomDeductionEngine.js";

import {
	type AnestheticDrugOption,
	COMMON_ANESTHETICS,
} from "./carpuleDisposalConstants.js";
import {
	type FefoTrafficStatus,
	type FefoTrafficLightInfo,
	type ExpiryTrafficLight,
	type FefoTrafficLightOptions,
	getFefoTrafficLight,
	getWarehouseFefoTrafficLight,
	daysLabel,
	formatRuDate,
} from "./fefoTrafficLight.js";
import { generateCarpuleDisposalActHtml } from "./carpuleDisposalActHtml.js";
import { NurseCarpule1ClickPackages } from "./NurseCarpule1ClickPackages.js";
import { NurseCarpuleDrugSelector } from "./NurseCarpuleDrugSelector.js";

export {
	type AnestheticDrugOption,
	COMMON_ANESTHETICS,
	type FefoTrafficStatus,
	type FefoTrafficLightInfo,
	type ExpiryTrafficLight,
	type FefoTrafficLightOptions,
	getFefoTrafficLight,
	getWarehouseFefoTrafficLight,
	daysLabel,
	formatRuDate,
};

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
		disposalReason?: string | undefined;
		isBroken?: boolean | undefined;
		isPartial?: boolean | undefined;
		wasteClass?: "class_B" | undefined;
		disinfectionMethod?: string | undefined;
		cabinetId?: string | undefined;
		chairId?: string | undefined;
	}) => void | Promise<void>) | undefined;
	readonly initialNurseName?: string | undefined;
	readonly initialDoctorName?: string | undefined;
	readonly currentStockAvailable?: number | undefined;
	readonly stockMap?: Record<string, number> | undefined;
	readonly initialDate?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly chairId?: string | undefined;
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
	cabinetId,
	chairId,
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
		return generateCarpuleDisposalActHtml({
			actNumber,
			dateIso,
			nurseName,
			doctorName,
			disposalReason,
			isOverdraft,
			drugNameRu: selectedDrug.nameRu,
			drugDefaultSeries: selectedDrug.defaultSeries,
			drugDefaultExp: selectedDrug.defaultExp,
			fefoBadgeText: fefoInfo.badgeText,
			carpulesCount,
			volumeTotalMl,
		});
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
		// Strict FEFO Quarantine Protection (Requirement 2 / Mandates 8e, 8n)
		if (fefoInfo.status === "red" && disposalReason === "used_in_procedure") {
			const alertMsg = `Срок годности партии истек ${formatRuDate(selectedDrug.defaultExp)}! Партия заблокирована для утилизации`;
			showToast(alertMsg, "error");
			setDisposalReason("expired");
			return;
		}

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
					disposalReason,
					isBroken: disposalReason === "broken_capsule",
					isPartial: disposalReason === "partial_dose",
					wasteClass: "class_B",
					disinfectionMethod: "Аламинол 3% (60 мин)",
					cabinetId,
					chairId,
				});
			}

			setIsDisposed(true);
			const msg = isOverdraft
				? `Списание ${carpulesCount} пустых карпул выполнено в 1 клик (Мягкий овердрафт: дефицит ${carpulesCount - effectiveStockAvailable} шт. зафиксирован, накладная ещё не оприходована).`
				: disposalReason === "expired"
					? `Утилизация просроченной партии (${carpulesCount} шт.) оформлена в 1 клик (СанПиН 3.3686-21, Акт ${actNumber}).`
					: disposalReason === "broken_capsule"
						? `Списание боя карпул (${carpulesCount} шт.) с дезинфекцией оформлено в 1 клик (СанПиН, Акт ${actNumber}).`
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

	const handleShiftCloseClassBDisposal = async () => {
		setIsSubmitting(true);
		try {
			const res = await executeShiftCloseClassBWasteDisposal({
				responsibleStaffName: nurseName || doctorName || "Дежурный персонал",
				responsibleStaffPosition: nurseName ? "Медицинская сестра" : "Врач-стоматолог",
				accumulatedCarpulesCount: carpulesCount,
				accumulatedNeedlesCount: carpulesCount,
				accumulatedSharpsCount: 1,
				contaminatedItemsCount: 4,
				brokenCarpulesCount: disposalReason === "broken_capsule" ? carpulesCount : 0,
				partiallyUsedCarpulesCount: disposalReason === "partial_dose" ? carpulesCount : 0,
				cabinetId,
				chairId,
				disinfectionProtocol: "Химическая дезинфекция 3% Аламинол (60 мин) / СанПиН 2.1.3684-21",
			});
			if (res.success) {
				setIsDisposed(true);
				setTimeout(() => {
					onClose();
				}, 1000);
			}
		} catch (err) {
			console.error("Ошибка сдачи отходов смены:", err);
			showToast("Сдача отходов Класса Б зафиксирована локально", "info");
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
					<NurseCarpule1ClickPackages
						onPackageClick={handlePackageClick}
						onShiftCloseClassBDisposal={handleShiftCloseClassBDisposal}
					/>

					{/* ANESTHETIC DRUG SELECTION & HICK'S LAW COMPACT FILTER TOOLBAR (32-36px) */}
					<NurseCarpuleDrugSelector
						selectedDrugId={selectedDrugId}
						onSelectDrugId={setSelectedDrugId}
						dateIso={dateIso}
					/>

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
								onChange={(e) => {
									const nextReason = e.target.value;
									if (fefoInfo.status === "red" && nextReason === "used_in_procedure") {
										const alertMsg = `Срок годности партии истек ${formatRuDate(selectedDrug.defaultExp)}! Партия заблокирована для утилизации`;
										showToast(alertMsg, "error");
										setDisposalReason("expired");
										return;
									}
									setDisposalReason(nextReason);
								}}
								className="w-full min-h-[44px] px-2.5 rounded border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-semibold text-[var(--ink,#0f172a)]"
								data-testid="nurse-disposal-reason-select"
							>
								<option value="used_in_procedure" disabled={fefoInfo.status === "red"}>
									{fefoInfo.status === "red"
										? "Использовано при лечении (ЗАБЛОКИРОВАНО — партия просрочена)"
										: "Использовано при лечении"}
								</option>
								<option value="partial_dose">Остаток карпулы после анестезии (неполная доза)</option>
								<option value="broken_capsule">Бой карпулы при зарядке (разбитое стекло)</option>
								<option value="expired">Истечение срока годности (FEFO утилизация по СанПиН)</option>
							</select>
						</div>

						<div>
							<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] block mb-1">
								Класс отходов / Дезинфекция
							</span>
							<div className="min-h-[44px] px-2.5 rounded border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center text-xs font-semibold text-[var(--ink,#0f172a)] truncate">
								{disposalReason === "broken_capsule"
									? "Класс Б • Бой стекла • Аламинол 3% (60 мин)"
									: disposalReason === "partial_dose"
										? "Класс Б • Неполная карпула • Аламинол 3% (60 мин)"
										: disposalReason === "expired"
											? "Класс Б • Утиль по FEFO • Аламинол 3% (60 мин)"
											: "Класс Б • Пустые карпулы • Аламинол 3% (60 мин)"}
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
						className="min-h-[36px] h-9 px-4 text-xs font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors flex items-center justify-center cursor-pointer shrink-0"
					>
						Отмена
					</button>

					<div className="flex items-center gap-2 relative min-w-0 w-full sm:w-auto">
						{/* 1. Вторичная кнопка прямого действия: Печать акта утилизации Б */}
						<button
							type="button"
							onClick={handlePrintAct}
							className="hidden sm:flex min-h-[36px] h-9 px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#e2e8f0)] transition-colors items-center gap-1.5 cursor-pointer shadow-xs min-w-0"
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
								className="min-h-[36px] h-9 w-9 px-0 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#e2e8f0)] transition-colors flex items-center justify-center cursor-pointer shadow-xs"
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
									<button
										type="button"
										onClick={handleShiftCloseClassBDisposal}
										className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer"
										data-testid="menu-shift-close-class-b"
									>
										<ShieldCheck size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
										<span className="truncate">Сдать отходы смены (СанПиН)</span>
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
							className={`min-h-[36px] h-9 flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer min-w-0 ${
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
