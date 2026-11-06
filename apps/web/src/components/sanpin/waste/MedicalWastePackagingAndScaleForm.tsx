import { CheckCircle2, PackageCheck, Scale, Sparkles } from "lucide-react";
import type React from "react";
import {
	SANPIN_WASTE_PACKAGING_TYPES,
	type MedicalWasteClassId,
	type MedicalWastePackagingTypeId,
} from "./medicalWastePresets.js";

export interface MedicalWastePackagingAndScaleFormProps {
	readonly selectedClass: MedicalWasteClassId;
	readonly selectedPackaging: MedicalWastePackagingTypeId;
	readonly setSelectedPackaging: (p: MedicalWastePackagingTypeId) => void;
	readonly packageCount: number;
	readonly setPackageCount: (cnt: number) => void;
	readonly grossWeightInput: number;
	readonly setGrossWeightInput: (w: number) => void;
	readonly currentWeights: { grossKg: number; tareKg: number; netKg: number };
	readonly onApplyShiftDefault?: (() => void) | undefined;
	readonly onSelectClass?: ((c: MedicalWasteClassId) => void) | undefined;
}

export const MedicalWastePackagingAndScaleForm: React.FC<MedicalWastePackagingAndScaleFormProps> = ({
	selectedClass,
	selectedPackaging,
	setSelectedPackaging,
	packageCount,
	setPackageCount,
	grossWeightInput,
	setGrossWeightInput,
	currentWeights,
	onApplyShiftDefault,
	onSelectClass,
}) => {
	const handleShiftDefaultClick = () => {
		if (onApplyShiftDefault) {
			onApplyShiftDefault();
			return;
		}
		if (onSelectClass) onSelectClass("class_B");
		setSelectedPackaging("yellow_bag");
		setPackageCount(1);
		setGrossWeightInput(1.5);
	};

	const handleClassQuickSelect = (cls: MedicalWasteClassId, defaultKg: number, defaultPkg: MedicalWastePackagingTypeId) => {
		if (onSelectClass) onSelectClass(cls);
		setSelectedPackaging(defaultPkg);
		setPackageCount(1);
		setGrossWeightInput(defaultKg);
	};

	return (
		<div className="flex flex-col gap-3">
			{/* 1-кликовый дефолт смены СанПиН (Мандаты 8e, 8n) */}
			<div className="p-3 rounded-xl border border-[var(--teal,#0d9488)] bg-teal-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
				<div>
					<div className="font-bold text-xs sm:text-sm text-[var(--ink,#0f172a)] flex items-center gap-1.5">
						<Sparkles size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span>1-Кликовый стандарт смены СанПиН 2.1.3684-21</span>
					</div>
					<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
						Стандартная нормативная масса без процедурного взвешивания ваты по 1 грамму
					</div>
				</div>

				<button
					type="button"
					onClick={handleShiftDefaultClick}
					data-testid="waste-shift-default-btn"
					className="min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] shadow-xs flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all shrink-0"
					title="Зарегистрировать отходы смены (Класс Б, 1 желтый пакет 10 л / 1.5 кг)"
				>
					<CheckCircle2 size={15} />
					<span>Зарегистрировать отходы смены (Класс Б, 1 желтый пакет 10 л / 1.5 кг)</span>
				</button>
			</div>

			{/* Быстрые пресеты классов отходов */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
				<button
					type="button"
					onClick={() => handleClassQuickSelect("class_B", 1.5, "yellow_bag")}
					className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 cursor-pointer touch-manipulation transition-all ${
						selectedClass === "class_B"
							? "border-[var(--teal,#0d9488)] bg-teal-500/10 shadow-2xs"
							: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)]/30"
					}`}
				>
					<div className="flex items-center justify-between">
						<span className="font-bold text-xs text-[var(--ink,#0f172a)]">Класс Б (1.5 кг)</span>
						<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700">Опасные</span>
					</div>
					<span className="text-[11px] text-[var(--muted,#64748b)]">1 желтый пакет 10 л • Вата, салфетки, перчатки</span>
				</button>

				<button
					type="button"
					onClick={() => handleClassQuickSelect("class_A", 2.0, "white_bag")}
					className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 cursor-pointer touch-manipulation transition-all ${
						selectedClass === "class_A"
							? "border-[var(--teal,#0d9488)] bg-teal-500/10 shadow-2xs"
							: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)]/30"
					}`}
				>
					<div className="flex items-center justify-between">
						<span className="font-bold text-xs text-[var(--ink,#0f172a)]">Класс А (2.0 кг)</span>
						<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-700">Неопасные</span>
					</div>
					<span className="text-[11px] text-[var(--muted,#64748b)]">1 белый пакет 10 л • Бумага, картон, бытовые</span>
				</button>

				<button
					type="button"
					onClick={() => handleClassQuickSelect("class_G", 0.5, "marked_container_class_g")}
					className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 cursor-pointer touch-manipulation transition-all ${
						selectedClass === "class_G"
							? "border-[var(--teal,#0d9488)] bg-teal-500/10 shadow-2xs"
							: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)]/30"
					}`}
				>
					<div className="flex items-center justify-between">
						<span className="font-bold text-xs text-[var(--ink,#0f172a)]">Класс Г (0.5 кг)</span>
						<span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700">Токсичные</span>
					</div>
					<span className="text-[11px] text-[var(--muted,#64748b)]">1 контейнер • Лампы, просроченные препараты</span>
				</button>
			</div>

			{/* Параметры тары и веса без граммового микро-симулятора */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)]">
				<div>
					<label htmlFor="waste-packaging-select" className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1">
						Тип тары / Упаковки
					</label>
					<select
						id="waste-packaging-select"
						value={selectedPackaging}
						onChange={(e) => setSelectedPackaging(e.target.value as MedicalWastePackagingTypeId)}
						className="w-full h-10 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					>
						{SANPIN_WASTE_PACKAGING_TYPES.filter((p) => p.wasteClass === selectedClass).map((pkg) => (
							<option key={pkg.id} value={pkg.id}>
								{pkg.nameRu} ({pkg.nominalVolumeLiters} л)
							</option>
						))}
					</select>
				</div>

				<div>
					<label htmlFor="waste-package-count" className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1">
						Количество мест (пакетов/баков)
					</label>
					<input
						id="waste-package-count"
						type="number"
						min={1}
						max={50}
						value={packageCount}
						onChange={(e) => setPackageCount(Math.max(1, Number(e.target.value) || 1))}
						className="w-full h-10 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs sm:text-sm font-bold text-center focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					/>
				</div>

				<div>
					<label htmlFor="waste-gross-weight" className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1">
						Масса партии (кг)
					</label>
					<div className="flex items-center gap-2">
						<Scale size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
						<input
							id="waste-gross-weight"
							type="number"
							step="0.1"
							min="0.1"
							value={grossWeightInput}
							onChange={(e) => setGrossWeightInput(parseFloat(e.target.value) || 0)}
							placeholder="Вес в кг"
							className="flex-1 h-10 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
						/>
						<span className="text-xs font-bold text-[var(--muted,#64748b)] px-2.5 py-1.5 bg-[var(--paper,#ffffff)] rounded-lg border border-[var(--line,#cbd5e1)]">
							кг
						</span>
					</div>
				</div>
			</div>

			{/* Чистая сводка партии без вычитания граммов тары */}
			<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#1e293b)] flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
				<div className="flex items-center gap-2">
					<PackageCheck size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>
						Итого к сдаче: <strong className="text-[var(--ink,#0f172a)]">{grossWeightInput} кг</strong> ({packageCount} мест)
					</span>
				</div>
				<span className="font-semibold text-emerald-700 dark:text-emerald-400">
					Соответствует СанПиН 2.1.3684-21
				</span>
			</div>
		</div>
	);
};
