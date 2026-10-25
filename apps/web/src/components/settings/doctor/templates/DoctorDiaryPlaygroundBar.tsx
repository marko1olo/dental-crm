import React from "react";
import { STATUTORY_DIARY_TEMPLATES } from "../diaryTemplateTags";

interface DoctorDiaryPlaygroundBarProps {
	testTooth: string;
	onToothChange: (t: string) => void;
	testDiagnosis: string;
	onDiagnosisChange: (d: string) => void;
	activeSpecialtyFilter: string;
	onSpecialtyFilterChange: (s: string) => void;
}

const PRESET_TEETH = ["16", "21", "36", "47", "55"] as const;

export function DoctorDiaryPlaygroundBar({
	testTooth,
	onToothChange,
	testDiagnosis,
	onDiagnosisChange,
	activeSpecialtyFilter,
	onSpecialtyFilterChange,
}: DoctorDiaryPlaygroundBarProps) {
	return (
		<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] grid grid-cols-1 sm:grid-cols-3 gap-3">
			<div>
				<label className="text-xs font-bold text-[var(--ink)] block mb-1">
					Тестовый зуб (FDI):
				</label>
				<div className="flex items-center gap-1.5">
					{PRESET_TEETH.map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => onToothChange(t)}
							className={`flex-1 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
								testTooth === t
									? "bg-teal-600 text-white border-teal-600 shadow-2xs"
									: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
							}`}
						>
							{t}
						</button>
					))}
				</div>
			</div>

			<div>
				<label className="text-xs font-bold text-[var(--ink)] block mb-1">
					Тестовый диагноз:
				</label>
				<input
					type="text"
					value={testDiagnosis}
					onChange={(e) => onDiagnosisChange(e.target.value)}
					placeholder="К02.1 Кариес дентина"
					className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:outline-none focus:border-teal-600"
				/>
			</div>

			<div>
				<label className="text-xs font-bold text-[var(--ink)] block mb-1">
					Фильтр по направлению:
				</label>
				<select
					value={activeSpecialtyFilter}
					onChange={(e) => onSpecialtyFilterChange(e.target.value)}
					className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] focus:outline-none focus:border-teal-600"
				>
					<option value="all">Все направления ({STATUTORY_DIARY_TEMPLATES.length})</option>
					<option value="therapist">Терапия</option>
					<option value="surgeon">Хирургия-имплантология</option>
					<option value="orthopedist">Ортопедия</option>
					<option value="orthodontist">Ортодонтия</option>
					<option value="periodontist">Пародонтология</option>
					<option value="pediatric">Детство</option>
				</select>
			</div>
		</div>
	);
}
