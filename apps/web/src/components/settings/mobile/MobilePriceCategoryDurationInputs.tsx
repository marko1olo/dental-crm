import React from "react";
import { Clock } from "lucide-react";
import { DEFAULT_CATEGORIES, DEFAULT_SPECIALTIES, DURATION_PRESETS } from "./mobilePriceDrawerConstants";

interface MobilePriceCategoryDurationInputsProps {
	category: string;
	setCategory: (val: string) => void;
	specialty: string;
	setSpecialty: (val: string) => void;
	durationMinutes: number;
	setDurationMinutes: (val: number) => void;
	serviceCategoryLabels: Record<string, string>;
	specialtyLabels: Record<string, string>;
}

export const MobilePriceCategoryDurationInputs: React.FC<MobilePriceCategoryDurationInputsProps> = ({
	category,
	setCategory,
	specialty,
	setSpecialty,
	durationMinutes,
	setDurationMinutes,
	serviceCategoryLabels,
	specialtyLabels,
}) => {
	return (
		<>
			<div className="space-y-1.5">
				<label htmlFor="drawer-service-category" className="text-[13px] font-medium text-[var(--muted)]">
					Клиническая категория
				</label>
				<select
					id="drawer-service-category"
					value={category}
					onChange={(e) => setCategory(e.target.value)}
					className="w-full h-11 px-3 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all cursor-pointer"
					data-testid="select-drawer-service-category"
				>
					{DEFAULT_CATEGORIES.map((cat) => (
						<option key={cat.id} value={cat.id}>
							{serviceCategoryLabels[cat.id] || cat.label}
						</option>
					))}
				</select>
			</div>

			<div className="space-y-1.5">
				<label htmlFor="drawer-service-specialty" className="text-[13px] font-medium text-[var(--muted)]">
					Специализация врача
				</label>
				<select
					id="drawer-service-specialty"
					value={specialty}
					onChange={(e) => setSpecialty(e.target.value)}
					className="w-full h-11 px-3 text-[14px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] transition-all cursor-pointer"
					data-testid="select-drawer-service-specialty"
				>
					{DEFAULT_SPECIALTIES.map((spec) => (
						<option key={spec.id} value={spec.id}>
							{specialtyLabels[spec.id] || spec.label}
						</option>
					))}
				</select>
			</div>

			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<span className="text-[13px] font-medium text-[var(--muted)] flex items-center gap-1">
						<Clock size={13} /> Длительность приёма:
					</span>
					<span className="text-[13px] font-semibold text-[var(--ink)] font-mono">
						{durationMinutes} мин
					</span>
				</div>
				<div className="grid grid-cols-6 gap-1.5">
					{DURATION_PRESETS.map((dur) => (
						<button
							key={dur}
							type="button"
							onClick={() => setDurationMinutes(dur)}
							className={`min-h-[38px] py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center ${
								durationMinutes === dur
									? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs font-bold"
									: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)]"
							}`}
						>
							{dur}м
						</button>
					))}
				</div>
			</div>
		</>
	);
};
