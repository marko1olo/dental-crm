import React, { useState, useMemo, useEffect } from "react";
import { Check, Receipt, Stethoscope, Zap } from "lucide-react";
import { money } from "../../AppHelpers";
import { countLabel } from "../../lib/russianPlural";
import { showToast } from "../GlobalToast";
import { loadStoredTeethData } from "../odontogram/odontogramStorage";
import {
	CANONICAL_DIAGNOSIS_BUNDLES,
	CARIES_DIAGNOSIS_BUNDLE,
	getDiagnosisBundleByToothState,
	createCustomizedBundle,
	exportCustomizedBundleToCashier54Fz,
	type CanonicalDiagnosisBundle,
	type Cashier54FzBundleExport,
} from "@dental/shared";

export interface ChairsideDiagnosisPackageCardProps {
	selectedTooth: string | null;
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	catalog?: readonly any[] | undefined;
	onApplyPackageToPlan?: ((formattedLines: string[], invoicePayload: any) => void) | undefined;
	onExportDirectToCashier?: ((exportData: Cashier54FzBundleExport) => void) | undefined;
}

export const ChairsideDiagnosisPackageCard: React.FC<ChairsideDiagnosisPackageCardProps> = ({
	selectedTooth,
	patientId,
	visitId,
	catalog = [],
	onApplyPackageToPlan,
	onExportDirectToCashier,
}) => {
	// 1. Определение активного диагноза зуба из одонтограммы
	const toothNumber = selectedTooth ? Number(selectedTooth) : null;
	const detectedToothState = useMemo(() => {
		if (!patientId || !toothNumber) return null;
		const cached = loadStoredTeethData(patientId);
		const tooth = cached?.find((t) => t.toothNumber === toothNumber);
		return tooth?.state ?? null;
	}, [patientId, toothNumber]);

	// По умолчанию выбираем пакет по диагнозу одонтограммы или кариес
	const initialBundle = useMemo(() => {
		if (detectedToothState) {
			const found = getDiagnosisBundleByToothState(detectedToothState);
			if (found) return found;
		}
		return CARIES_DIAGNOSIS_BUNDLE;
	}, [detectedToothState]);

	const [activeBundle, setActiveBundle] = useState<CanonicalDiagnosisBundle>(initialBundle);

	// При смене выбранного зуба обновляем предлагаемый пакет по его реальному состоянию
	useEffect(() => {
		if (detectedToothState) {
			const found = getDiagnosisBundleByToothState(detectedToothState);
			if (found) {
				setActiveBundle(found);
				setCheckedCodes(new Set(found.services.map((s) => s.code804n)));
				return;
			}
		}
		setActiveBundle(CARIES_DIAGNOSIS_BUNDLE);
		setCheckedCodes(new Set(CARIES_DIAGNOSIS_BUNDLE.services.map((s) => s.code804n)));
	}, [detectedToothState, selectedTooth]);

	// 2. Отмеченные галочками услуги (врач может снять/добавить услугу)
	const [checkedCodes, setCheckedCodes] = useState<Set<string>>(() => {
		return new Set(initialBundle.services.map((s) => s.code804n));
	});

	const handleToggleCode = (code: string) => {
		setCheckedCodes((prev) => {
			const next = new Set(prev);
			if (next.has(code)) {
				next.delete(code);
			} else {
				next.add(code);
			}
			return next;
		});
	};

	// 3. Расчёт сметы пакета в точных целых копейках
	const customized = useMemo(() => {
		return createCustomizedBundle(activeBundle, {
			toothCode: selectedTooth,
			checkedServiceCodes: Array.from(checkedCodes),
			catalog,
		});
	}, [activeBundle, selectedTooth, checkedCodes, catalog]);

	// 4. Внести пакет в карту и счёт
	const handleApplyToPlan = () => {
		const activeItems = customized.items.filter((it) => it.checked);
		if (activeItems.length === 0) {
			showToast("Выберите хотя бы одну услугу из пакета", "warning", 2500);
			return;
		}

		const toothSuffix = selectedTooth ? ` (зуб ${selectedTooth})` : "";
		const lines = activeItems.map(
			(it) => `Выполнено: [${it.code804n}] ${it.title}${toothSuffix} — ${money(it.priceRub)}`,
		);

		const invoicePayload = {
			bundleId: activeBundle.id,
			bundleTitle: activeBundle.title,
			diagnosisIcd10: activeBundle.diagnosisIcd10,
			toothNumber: toothNumber ?? undefined,
			toothCode: selectedTooth ?? undefined,
			patientId: patientId ?? undefined,
			visitId: visitId ?? undefined,
			source: "chairside_diagnosis_package",
			services: activeItems.map((it, idx) => ({
				id: `srv_${patientId || "pat"}_tooth_${selectedTooth || "no"}_${activeBundle.id}_${it.code804n}_${idx}`,
				code: it.code804n,
				code804n: it.code804n,
				title: it.title,
				price: it.priceRub,
				priceRub: it.priceRub,
				unitPriceRub: it.priceRub,
				priceKopecks: it.priceKopecks,
				quantity: 1,
				toothCode: selectedTooth ?? undefined,
				toothNumber: toothNumber ?? undefined,
			})),
		};

		if (onApplyPackageToPlan) {
			onApplyPackageToPlan(lines, invoicePayload);
		} else {
			// Fallback direct event dispatch
			try {
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-add-services-to-invoice", {
							detail: invoicePayload,
						}),
					);
				}
			} catch (err) {
				console.warn("dente-add-services-to-invoice dispatch error:", err);
			}
		}

		const toothMsg = selectedTooth ? ` для зуба ${selectedTooth}` : "";
		showToast(
			`Пакет «${activeBundle.title}»${toothMsg} (${countLabel(activeItems.length, "услуга", "услуги", "услуг")} на ${money(customized.totalRub)}) внесен в карту и счёт`,
			"success",
			3500,
		);
	};

	// 5. Передать в кассу
	const handleExportToCashier = () => {
		const activeItems = customized.items.filter((it) => it.checked);
		if (activeItems.length === 0) {
			showToast("Нет выбранных услуг для передачи в кассу", "warning", 2500);
			return;
		}

		const exportPayload = exportCustomizedBundleToCashier54Fz(customized, {
			patientId: patientId ?? undefined,
			visitId: visitId ?? undefined,
			toothNumber: selectedTooth ?? undefined,
		});

		if (onExportDirectToCashier) {
			onExportDirectToCashier(exportPayload);
		}

		try {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: {
							source: "chairside_diagnosis_package",
							bundleId: exportPayload.bundleId,
							diagnosisIcd10: exportPayload.diagnosisIcd10,
							toothCode: selectedTooth ?? undefined,
							toothNumber: toothNumber ?? undefined,
							patientId: patientId ?? undefined,
							visitId: visitId ?? undefined,
							totalAmountRub: exportPayload.totalRub,
							totalKopecks: exportPayload.totalKopecks,
							services: exportPayload.receiptItems.map((r, idx) => ({
								id: `srv_54fz_${patientId || "pat"}_${r.code804n}_${idx}`,
								code: r.code804n,
								code804n: r.code804n,
								title: r.name,
								price: r.priceKopecks / 100,
								priceRub: r.priceKopecks / 100,
								unitPriceRub: r.priceKopecks / 100,
								priceKopecks: r.priceKopecks,
								quantity: r.quantity,
								toothCode: selectedTooth ?? undefined,
								toothNumber: toothNumber ?? undefined,
							})),
						},
					}),
				);
			}
		} catch (err) {
			console.warn("dente-add-services-to-invoice dispatch error:", err);
		}

		showToast(
			`Счёт «${activeBundle.title}» (${money(customized.totalRub)} / ${customized.totalKopecks.toLocaleString("ru-RU")} коп.) передан в кассу`,
			"success",
			3500,
		);
	};

	return (
		<div
			data-testid="chairside-diagnosis-package-card"
			className="mb-3 p-3 rounded-xl bg-gradient-to-r from-teal-50/70 via-indigo-50/50 to-slate-50/60 dark:from-teal-950/20 dark:via-indigo-950/20 dark:to-slate-900/40 border border-teal-200/80 dark:border-teal-800/60 shadow-xs"
		>
			{/* Шапка пакета: Быстрый выбор клинического пакета */}
			<div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
				<div className="flex items-center gap-2">
					<div className="w-6 h-6 rounded-md bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shrink-0">
						<Zap className="w-3.5 h-3.5" />
					</div>
					<div>
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-xs font-bold text-slate-900 dark:text-slate-100">
								Готовый чек-лист клинических услуг
							</span>
							<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700">
								{activeBundle.diagnosisIcd10}
							</span>
							{selectedTooth && (
								<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
									Зуб {selectedTooth}
								</span>
							)}
						</div>
						<div className="text-[11px] text-slate-500 dark:text-slate-400">
							{activeBundle.diagnosisTitle} у кресла без ручного поиска по позициям
						</div>
					</div>
				</div>

				{/* Переключатель 6 базовых клинических пакетов */}
				<div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
					{CANONICAL_DIAGNOSIS_BUNDLES.map((b) => {
						const isSelected = b.id === activeBundle.id;
						return (
							<button
								key={b.id}
								type="button"
								onClick={() => {
									setActiveBundle(b);
									setCheckedCodes(new Set(b.services.map((s) => s.code804n)));
								}}
								className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 min-h-[32px] sm:min-h-[28px] ${
									isSelected
										? "bg-teal-600 text-white font-bold shadow-2xs"
										: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-300"
								}`}
							>
								{b.diagnosisTitle.split(" ")[0]} ({b.diagnosisIcd10})
							</button>
						);
					})}
				</div>
			</div>

			{/* Список услуг Номенклатуры 804н с индивидуальными чекбоксами */}
			<div className="space-y-1 mb-3 bg-white/90 dark:bg-slate-900/90 rounded-lg p-2 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60">
				{customized.items.map((svc) => (
					<label
						key={svc.code804n}
						className="flex items-center justify-between gap-2.5 py-1.5 px-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer select-none min-h-[36px]"
					>
						<div className="flex items-center gap-2 min-w-0 flex-1">
							<input
								type="checkbox"
								checked={svc.checked}
								onChange={() => handleToggleCode(svc.code804n)}
								className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 shrink-0"
							/>
							<span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
								[{svc.code804n}]
							</span>
							<span className={`text-xs ${svc.checked ? "text-slate-900 dark:text-slate-100 font-medium" : "text-slate-400 dark:text-slate-500 line-through"} truncate`}>
								{svc.title}
							</span>
						</div>
						<span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200 shrink-0">
							{money(svc.priceRub)}
						</span>
					</label>
				))}
			</div>

			{/* Подвал пакета: Итого в целых копейках и 2 кнопки мгновенного действия */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-teal-200/50 dark:border-teal-800/40">
				<div className="text-xs text-slate-700 dark:text-slate-300">
					<span>
						Выбрано: <strong>{countLabel(customized.checkedCount, "услуга", "услуги", "услуг")}</strong>.
						Сумма:{" "}
						<strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400 ml-1">
							{money(customized.totalRub)}
						</strong>{" "}
						<span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
							({customized.totalKopecks.toLocaleString("ru-RU")} коп.)
						</span>
					</span>
				</div>

				<div className="flex items-center gap-2 w-full sm:w-auto">
					<button
						type="button"
						onClick={handleApplyToPlan}
						data-testid="apply-diagnosis-bundle-btn"
						className="flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0"
						title="Дописать выбранный пакет в карту приёма и передать в счёт"
					>
						<Check className="w-4 h-4" />
						Внести в карту и счёт ({money(customized.totalRub)})
					</button>

					<button
						type="button"
						onClick={handleExportToCashier}
						data-testid="export-diagnosis-bundle-cashier-btn"
						className="flex-1 sm:flex-initial min-h-[44px] px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0"
						title="Передать пакет услуг в кассу с точным расчётом в копейках"
					>
						<Receipt className="w-4 h-4" />
						В кассу
					</button>
				</div>
			</div>
		</div>
	);
};
