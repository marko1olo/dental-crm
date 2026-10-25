import React from "react";
import { Check } from "lucide-react";

export const CHAIR_PALETTE = [
	{ name: "Лаванда", value: "#AEA7D3" },
	{ name: "Небо (Терапия)", value: "#91B9E9" },
	{ name: "Мята (Гигиена)", value: "#7EC8BA" },
	{ name: "Коралл (Хирургия)", value: "#FFB5A7" },
	{ name: "Песок (Ортопедия)", value: "#FCD581" },
	{ name: "Медицинский тил", value: "#0d9488" },
];

interface ClinicChairEditFormFieldsProps {
	name: string;
	setName: (val: string) => void;
	room: string;
	setRoom: (val: string) => void;
	color: string;
	setColor: (val: string) => void;
	specialization: string;
	setSpecialization: (val: string) => void;
	isActive: boolean;
	setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
	specialtyLabels: Record<string, string>;
}

export const ClinicChairEditFormFields: React.FC<ClinicChairEditFormFieldsProps> = ({
	name, setName, room, setRoom, color, setColor,
	specialization, setSpecialization, isActive, setIsActive, specialtyLabels,
}) => {
	return (
		<>
			<div>
				<label htmlFor="chair-name-input" className="block text-xs font-semibold text-[var(--ink)] mb-1">
					Название установки / кресла
				</label>
				<input
					id="chair-name-input"
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
					className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
					placeholder="Например: Кабинет №1 (Терапия)"
				/>
			</div>

			<div>
				<label htmlFor="chair-room-input" className="block text-xs font-semibold text-[var(--ink)] mb-1">
					Кабинет или этаж
				</label>
				<input
					id="chair-room-input"
					type="text"
					value={room}
					onChange={(e) => setRoom(e.target.value)}
					className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
					placeholder="Кабинет 104, 2 этаж"
				/>
			</div>

			<div>
				<label htmlFor="chair-spec-select" className="block text-xs font-semibold text-[var(--ink)] mb-1">
					Специализация
				</label>
				<select
					id="chair-spec-select"
					value={specialization}
					onChange={(e) => setSpecialization(e.target.value)}
					className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
				>
					<option value="">Универсальное кресло (Все приёмы)</option>
					{Object.entries(specialtyLabels).map(([key, label]) => (
						<option key={key} value={key}>{label}</option>
					))}
				</select>
			</div>

			<div>
				<span className="block text-xs font-semibold text-[var(--ink)] mb-1.5">Цвет маркера в расписании</span>
				<div className="flex items-center gap-2 flex-wrap">
					{CHAIR_PALETTE.map((c) => (
						<button
							key={c.value}
							type="button"
							onClick={() => setColor(c.value)}
							className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${color === c.value ? "ring-2 ring-offset-2 ring-teal-500 scale-110" : "opacity-80 hover:opacity-100"}`}
							style={{ backgroundColor: c.value }}
							title={c.name}
						>
							{color === c.value && <Check size={14} className="text-white" />}
						</button>
					))}
				</div>
			</div>

			<div className="pt-2 border-t border-[var(--line)] flex items-center justify-between">
				<div>
					<span className="text-xs font-bold text-[var(--ink)] block">Статус установки</span>
					<p className="text-[11px] text-[var(--muted)] m-0">
						{isActive ? "Активно в расписании" : "Скрыто из выбора для новых визитов"}
					</p>
				</div>
				<label className="relative inline-flex items-center cursor-pointer shrink-0" title={isActive ? "Активно в расписании" : "Скрыто из выбора"}>
					<input type="checkbox" checked={isActive} onChange={() => setIsActive((prev) => !prev)} className="sr-only peer" aria-label="Активность кресла" />
					<div className="w-[51px] h-[31px] bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-[27px] after:w-[27px] after:transition-all peer-checked:bg-teal-600" />
				</label>
			</div>
		</>
	);
};
