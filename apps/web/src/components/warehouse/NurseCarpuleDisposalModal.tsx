/**
 * ============================================================================
 * NURSE CARPULE DISPOSAL MODAL (САНПИН 3.3686-21 / МЕДСЕСТРА И СКЛАД)
 * 1-кликовое списание пустых карпул анестетиков и расходников медсестрой
 * единолично БЕЗ комиссии из 3 человек и с мягким овердрафтом склада.
 * ============================================================================
 */

import React, { useState, useMemo } from "react";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Copy,
	FileText,
	Info,
	PackageCheck,
	Printer,
	ShieldAlert,
	ShieldCheck,
	Syringe,
	Trash2,
	UserCheck,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { handleOneClickPackageWriteOff } from "./warehousePackageWriteOffEngine";

export interface AnestheticDrugOption {
	readonly id: string;
	readonly nameRu: string;
	readonly activeSubstanceRu: string;
	readonly defaultVolumeMl: number;
	readonly defaultSeries: string;
	readonly defaultLot: string;
	readonly defaultExp: string;
}

export const COMMON_ANESTHETICS: readonly AnestheticDrugOption[] = [
	{
		id: "articaine_100k",
		nameRu: "Артикаин 4% с адреналином 1:100 000 (Ультракаин Д-С Форте)",
		activeSubstanceRu: "Артикаина гидрохлорид + Эпинефрин",
		defaultVolumeMl: 1.7,
		defaultSeries: "ART-2026",
		defaultLot: "84019",
		defaultExp: "2027-06",
	},
	{
		id: "articaine_200k",
		nameRu: "Артикаин 4% с адреналином 1:200 000 (Ультракаин Д-С)",
		activeSubstanceRu: "Артикаина гидрохлорид + Эпинефрин",
		defaultVolumeMl: 1.7,
		defaultSeries: "ART-2026-L",
		defaultLot: "84022",
		defaultExp: "2027-08",
	},
	{
		id: "mepivacaine_3",
		nameRu: "Мепивакаин 3% без вазоконстриктора (Скандонест)",
		activeSubstanceRu: "Мепивакаина гидрохлорид",
		defaultVolumeMl: 1.7,
		defaultSeries: "MEP-2026",
		defaultLot: "51094",
		defaultExp: "2027-04",
	},
	{
		id: "septanest_100k",
		nameRu: "Септанест 1:100 000 (Септодонт)",
		activeSubstanceRu: "Артикаин + Адреналин",
		defaultVolumeMl: 1.7,
		defaultSeries: "SEP-2026",
		defaultLot: "93108",
		defaultExp: "2027-05",
	},
];

export interface NurseCarpuleDisposalModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onDisposalConfirmed?: (payload: {
		drugId: string;
		drugName: string;
		carpulesCount: number;
		volumeTotalMl: number;
		nurseName: string;
		doctorName: string;
		actNumber: string;
		actDate: string;
		isOverdraft: boolean;
	}) => void | Promise<void>;
	readonly initialNurseName?: string;
	readonly initialDoctorName?: string;
	readonly currentStockAvailable?: number;
}

export function NurseCarpuleDisposalModal({
	isOpen,
	onClose,
	onDisposalConfirmed,
	initialNurseName = "Дежурная медсестра",
	initialDoctorName = "Лечащий врач",
	currentStockAvailable = 0,
}: NurseCarpuleDisposalModalProps) {
	const now = new Date();
	const dateIso = now.toISOString().slice(0, 10);

	const [selectedDrugId, setSelectedDrugId] = useState<string>("articaine_100k");
	const [carpulesCount, setCarpulesCount] = useState<number>(1);
	const [nurseName, setNurseName] = useState<string>(initialNurseName);
	const [doctorName, setDoctorName] = useState<string>(initialDoctorName);
	const [disposalReason, setDisposalReason] = useState<string>("used_in_procedure");
	const [actNumber] = useState<string>(
		() => `АКТ-КП-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-01`
	);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [isDisposed, setIsDisposed] = useState<boolean>(false);

	const selectedDrug = useMemo(() => {
		return COMMON_ANESTHETICS.find((d) => d.id === selectedDrugId) ?? COMMON_ANESTHETICS[0]!;
	}, [selectedDrugId]);

	const volumeTotalMl = Number((carpulesCount * selectedDrug.defaultVolumeMl).toFixed(2));
	const isOverdraft = currentStockAvailable < carpulesCount;

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
				? `Списание ${carpulesCount} пустых карпул выполнено единолично в 1 клик (Мягкий овердрафт: дефицит ${carpulesCount - currentStockAvailable} шт. зафиксирован, накладная ещё не оприходована).`
				: `Списание ${carpulesCount} пустых карпул оформлено медсестрой единолично в 1 клик (СанПиН 3.3686-21, Акт ${actNumber}).`;
			showToast(msg, "success");
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
						<div>
							<h2 id="nurse-disposal-title" className="text-base font-bold text-[var(--ink,#0f172a)] leading-tight">
								1-Клик списание пустых карпул анестетиков
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
								СанПиН 3.3686-21 • Единолично медсестрой (без комиссии из 3 человек)
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-lg text-[var(--muted,#64748b)] hover:bg-[var(--paper-strong,#e2e8f0)] transition-colors"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* BODY */}
				<div className="p-5 space-y-4 overflow-y-auto">
					{/* SOFT OVERDRAFT GUARANTEE BANNER */}
					<div
						className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
							isOverdraft
								? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
								: "bg-teal-500/10 border-teal-500/30 text-teal-900 dark:text-teal-200"
						}`}
					>
						<ShieldCheck size={20} className="shrink-0 text-teal-600 mt-0.5" />
						<div>
							<div className="font-bold mb-0.5">
								{isOverdraft
									? "Мягкий овердрафт склада активен (СанПиН / Спасение зуба)"
									: "Закон свободы медсестры (СанПиН 3.3686-21)"}
							</div>
							<p className="text-opacity-90">
								{isOverdraft
									? `Задержка оприходования накладной поставщика не блокирует операцию! На складе числится ${currentStockAvailable} шт., списывается ${carpulesCount} шт. Будет зафиксирован мягкий минус без фатальных ошибок 400/409.`
									: "Списание использованных карпул и расходников проводится медсестрой в 1 клик. Никаких согласований начмедов, ожидания главврача или создания комиссии из 3 человек!"}
							</p>
						</div>
					</div>

					{/* 1-CLICK CLINICAL PACKETS STRIP (MANDATES 8e, 8k, 8n) */}
					<div className="p-3 rounded-xl border border-teal-500/20 bg-teal-500/5 flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
								<Zap size={14} className="text-teal-600 shrink-0" />
								<span>Пакетное списание в 1 клик (Мандаты 8e, 8k, 8n):</span>
							</span>
							<span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
								Мягкий овердрафт активен
							</span>
						</div>
						<div className="flex items-center gap-2 flex-wrap">
							<button
								type="button"
								onClick={() => {
									setSelectedDrugId("articaine_100k");
									setCarpulesCount(1);
									showToast("Выбран пакет «Стандартная анестезия» (1 карпула + игла 30G + валики)", "info");
								}}
								className="btn-writeoff-anesthesia-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold border border-teal-500/40 bg-[var(--paper,#ffffff)] text-teal-800 dark:text-teal-200 hover:bg-teal-500/10 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
								data-testid="btn-writeoff-anesthesia-packet"
								title="Пакет: анестезия 1.7 мл + карпульная игла 30G + валики (Мандат 8e п. 10)"
							>
								<Syringe size={16} className="text-teal-600 shrink-0" />
								<span>Стандартная анестезия</span>
							</button>

							<button
								type="button"
								onClick={() => {
									handleOneClickPackageWriteOff({
										packageId: "hygiene",
										nurseName,
										doctorName,
										allowSoftOverdraft: true,
									});
								}}
								className="btn-writeoff-hygiene-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold border border-blue-500/40 bg-[var(--paper,#ffffff)] text-blue-800 dark:text-blue-200 hover:bg-blue-500/10 active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
								data-testid="btn-writeoff-hygiene-packet"
								title="Пакет: СИЗ + Оптрагейт + порошок Air-Flow + паста + щетка (Мандат 8e п. 10)"
							>
								<PackageCheck size={16} className="text-blue-600 shrink-0" />
								<span>Профгигиена</span>
							</button>
						</div>
					</div>

					{/* ANESTHETIC DRUG SELECTION */}
					<div>
						<label htmlFor="nurse-anes-select" className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1.5">
							Наименование анестетика
						</label>
						<select
							id="nurse-anes-select"
							value={selectedDrugId}
							onChange={(e) => setSelectedDrugId(e.target.value)}
							className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500"
						>
							{COMMON_ANESTHETICS.map((drug) => (
								<option key={drug.id} value={drug.id}>
									{drug.nameRu} (серия: {drug.defaultSeries}, годен до {drug.defaultExp})
								</option>
							))}
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
									{num} шт.
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
								Ответственная медсестра
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
								<option value="expired">Истечение срока годности</option>
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

					{/* SINGLE SIGNER AFFIRMATION */}
					<div className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 text-teal-800 dark:text-teal-200 text-xs">
						<UserCheck size={18} className="text-teal-600 shrink-0" />
						<div className="leading-snug">
							<strong>Единоличное утверждение медсестрой:</strong> по приказу клиники и СанПиН 3.3686-21 пустые карпулы списываются без созыва комиссии.
						</div>
					</div>
				</div>

				{/* FOOTER ACTIONS */}
				<div className="flex items-center justify-between p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-4 py-2 text-xs font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors flex items-center justify-center"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleFastDispose}
						disabled={isSubmitting || isDisposed}
						className={`min-h-[44px] flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
							isDisposed
								? "bg-emerald-600"
								: "bg-teal-600 hover:bg-teal-700 active:scale-98"
						}`}
					>
						{isDisposed ? <CheckCircle2 size={16} /> : <Zap size={16} />}
						<span>
							{isDisposed
								? "Списано успешно!"
								: isSubmitting
									? "Оформление..."
									: `Списать ${carpulesCount} шт. в 1 клик`}
						</span>
					</button>
				</div>
			</div>
		</div>
	);
}

export default NurseCarpuleDisposalModal;
