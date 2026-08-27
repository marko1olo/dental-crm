import React from "react";
import { CheckCircle2 } from "lucide-react";
import { CONSTRUCTION_TYPES, LAB_MATERIALS } from "./labMath";

export interface DentalLabRestorationTabProps {
	selectedTeeth: number[];
	setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	toggleTooth: (tooth: number) => void;
	selectQuadrant: (teeth: number[]) => void;
	constructionType: string;
	setConstructionType: (type: string) => void;
	material: string;
	setMaterial: (mat: string) => void;
	dueDate: string;
	setDueDate: (date: string) => void;
	clinicalNotes: string;
	setClinicalNotes: (notes: string) => void;
}

export function DentalLabRestorationTab({
	selectedTeeth,
	setSelectedTeeth,
	toggleTooth,
	selectQuadrant,
	constructionType,
	setConstructionType,
	material,
	setMaterial,
	dueDate,
	setDueDate,
	clinicalNotes,
	setClinicalNotes,
}: DentalLabRestorationTabProps) {
	return (
		<div className="space-y-6">
			{/* FDI Odontogram Mini-Picker */}
			<div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-3">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2">
						<span className="font-bold text-sm text-slate-900 dark:text-slate-100">
							Зубная формула (FDI ISO 3950)
						</span>
						<span className="text-xs px-2.5 py-1 rounded-full bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)] font-bold">
							{selectedTeeth.length > 0
								? `Выбрано: ${selectedTeeth.join(", ")} (${selectedTeeth.length} ед.)`
								: "Выберите зубы для наряда"}
						</span>
					</div>
					<div className="flex items-center gap-2 text-xs">
						<button
							type="button"
							onClick={() => selectQuadrant([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28])}
							className="min-h-[44px] px-3 py-2 rounded-xl font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
						>
							Верхняя челюсть
						</button>
						<button
							type="button"
							onClick={() => selectQuadrant([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38])}
							className="min-h-[44px] px-3 py-2 rounded-xl font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
						>
							Нижняя челюсть
						</button>
						<button
							type="button"
							onClick={() => setSelectedTeeth([])}
							className="min-h-[44px] px-3 py-2 rounded-xl font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors"
						>
							Очистить
						</button>
					</div>
				</div>

				{/* Quadrant Visual Grid with >= 44x44px touch targets */}
				<div className="space-y-3 select-none pt-2">
					{/* Upper Maxilla */}
					<div className="flex justify-center items-center gap-1 sm:gap-1.5 flex-wrap">
						<span className="text-xs uppercase font-bold text-slate-400 w-16 text-right pr-2">
							Верх (Q1-Q2)
						</span>
						{[18, 17, 16, 15, 14, 13, 12, 11].map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => toggleTooth(t)}
								className={`lab-tooth-btn ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
							>
								{t}
							</button>
						))}
						<div className="w-px h-10 bg-slate-300 dark:bg-slate-700 mx-1.5" />
						{[21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => toggleTooth(t)}
								className={`lab-tooth-btn ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
							>
								{t}
							</button>
						))}
					</div>

					{/* Lower Mandible */}
					<div className="flex justify-center items-center gap-1 sm:gap-1.5 flex-wrap">
						<span className="text-xs uppercase font-bold text-slate-400 w-16 text-right pr-2">
							Низ (Q4-Q3)
						</span>
						{[48, 47, 46, 45, 44, 43, 42, 41].map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => toggleTooth(t)}
								className={`lab-tooth-btn ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
							>
								{t}
							</button>
						))}
						<div className="w-px h-10 bg-slate-300 dark:bg-slate-700 mx-1.5" />
						{[31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => toggleTooth(t)}
								className={`lab-tooth-btn ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
							>
								{t}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Construction Type Grid with >= 44px touch targets */}
			<div className="space-y-3">
				<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
					Тип ортопедической конструкции (Анатомический вид)
				</label>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{CONSTRUCTION_TYPES.map((c) => {
						const isSelected = constructionType === c.id;
						return (
							<button
								key={c.id}
								type="button"
								onClick={() => setConstructionType(c.id)}
								className={`lab-construct-card ${isSelected ? "is-active" : ""}`}
							>
								<span className="text-3xl flex-shrink-0">{c.icon}</span>
								<div className="space-y-1 flex-1">
									<div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
										<span>{c.name}</span>
										{isSelected && (
											<CheckCircle2 className="w-4 h-4 text-[var(--teal)] flex-shrink-0 ml-1" />
										)}
									</div>
									<div className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
										{c.desc}
									</div>
									<span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 mt-1">
										{c.category}
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Material Selection with >= 44px touch targets */}
			<div className="space-y-3">
				<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
					Материал изготовления (CAD/CAM & Керамика)
				</label>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{LAB_MATERIALS.map((m) => {
						const isSelected = material === m.id;
						return (
							<button
								key={m.id}
								type="button"
								onClick={() => setMaterial(m.id)}
								className={`min-h-[52px] p-3.5 text-left rounded-xl border transition-all flex items-center justify-between gap-3 ${
									isSelected
										? "bg-[var(--teal-surface)] border-[var(--teal)] shadow-sm ring-2 ring-[var(--teal-soft)]"
										: "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
								}`}
							>
								<div className="space-y-1">
									<div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
										{m.name}
									</div>
									<div className="text-xs text-slate-500 dark:text-slate-400">
										{m.desc}
									</div>
								</div>
								<div className="flex flex-col items-end gap-1 flex-shrink-0">
									<span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 whitespace-nowrap">
										{m.tag}
									</span>
									<span className="text-[11px] font-mono font-bold text-[var(--teal)]">
										{(m as any).unitCostRub ? `${(m as any).unitCostRub.toLocaleString("ru-RU")} ₽/ед.` : "6 500 ₽/ед."}
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Due Date & General Clinical Notes */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="space-y-1.5">
					<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
						Срок сдачи работы (Дедлайн лаборатории)
					</label>
					<input
						type="date"
						value={dueDate}
						onChange={(e) => setDueDate(e.target.value)}
						className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-[var(--teal)] focus:outline-none"
					/>
				</div>
				<div className="space-y-1.5">
					<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
						Особые пожелания врачу / технику
					</label>
					<input
						type="text"
						placeholder="Напр. Пациент уезжает 25 числа, примерка на воске..."
						value={clinicalNotes}
						onChange={(e) => setClinicalNotes(e.target.value)}
						className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-[var(--teal)] focus:outline-none"
					/>
				</div>
			</div>
		</div>
	);
}
