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
					<div className="flex items-center gap-2 text-xs flex-wrap">
						<button
							type="button"
							onClick={() => selectQuadrant([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28])}
							className="lab-quadrant-btn"
						>
							Верхняя челюсть
						</button>
						<button
							type="button"
							onClick={() => selectQuadrant([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38])}
							className="lab-quadrant-btn"
						>
							Нижняя челюсть
						</button>
						<button
							type="button"
							onClick={() => setSelectedTeeth([])}
							className="lab-quadrant-clear-btn"
						>
							Очистить
						</button>
					</div>
				</div>

				{/* Quadrant Visual Grid with >= 44x44px touch targets */}
				<div className="space-y-3 select-none pt-2">
					{/* Desktop & Tablet View (16-teeth horizontal arch per jaw) */}
					<div className="hidden sm:block space-y-3">
						{/* Upper Maxilla */}
						<div className="overflow-x-auto pb-1.5 scrollbar-none">
							<div className="flex items-center gap-1 sm:gap-1.5 min-w-fit justify-center">
								<span className="text-xs uppercase font-bold text-slate-400 w-16 text-right pr-2 shrink-0">
									Верх (Q1-Q2)
								</span>
								{[18, 17, 16, 15, 14, 13, 12, 11].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
									>
										{t}
									</button>
								))}
								<div className="w-px h-10 bg-slate-300 dark:bg-slate-700 mx-1.5 shrink-0" />
								{[21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
									>
										{t}
									</button>
								))}
							</div>
						</div>

						{/* Lower Mandible */}
						<div className="overflow-x-auto pb-1.5 scrollbar-none">
							<div className="flex items-center gap-1 sm:gap-1.5 min-w-fit justify-center">
								<span className="text-xs uppercase font-bold text-slate-400 w-16 text-right pr-2 shrink-0">
									Низ (Q4-Q3)
								</span>
								{[48, 47, 46, 45, 44, 43, 42, 41].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
									>
										{t}
									</button>
								))}
								<div className="w-px h-10 bg-slate-300 dark:bg-slate-700 mx-1.5 shrink-0" />
								{[31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn shrink-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
									>
										{t}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Mobile View (Clean Quadrant-by-Quadrant Breakdown Q1, Q2, Q4, Q3) */}
					<div className="block sm:hidden space-y-2.5">
						{/* Upper Maxilla: Q1 (18-11) */}
						<div className="flex items-center gap-1.5">
							<span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 w-7 shrink-0 text-center">Q1</span>
							<div className="grid grid-cols-8 gap-1 flex-1">
								{[18, 17, 16, 15, 14, 13, 12, 11].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn min-w-0 !w-full !px-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
									>
										{t}
									</button>
								))}
							</div>
						</div>

						{/* Upper Maxilla: Q2 (21-28) */}
						<div className="flex items-center gap-1.5">
							<span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 w-7 shrink-0 text-center">Q2</span>
							<div className="grid grid-cols-8 gap-1 flex-1">
								{[21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn min-w-0 !w-full !px-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
									>
										{t}
									</button>
								))}
							</div>
						</div>

						{/* Lower Mandible: Q4 (48-41) */}
						<div className="flex items-center gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
							<span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 w-7 shrink-0 text-center">Q4</span>
							<div className="grid grid-cols-8 gap-1 flex-1">
								{[48, 47, 46, 45, 44, 43, 42, 41].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn min-w-0 !w-full !px-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
									>
										{t}
									</button>
								))}
							</div>
						</div>

						{/* Lower Mandible: Q3 (31-38) */}
						<div className="flex items-center gap-1.5">
							<span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 w-7 shrink-0 text-center">Q3</span>
							<div className="grid grid-cols-8 gap-1 flex-1">
								{[31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										className={`lab-tooth-btn min-w-0 !w-full !px-0 ${selectedTeeth.includes(t) ? "is-selected" : ""}`}
									>
										{t}
									</button>
								))}
							</div>
						</div>
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
