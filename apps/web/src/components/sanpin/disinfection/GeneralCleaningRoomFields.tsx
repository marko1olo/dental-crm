import React from "react";
import type { DisinfectionApplicationMethod, DisinfectionRoomType } from "./disinfectionTypes.js";

interface GeneralCleaningRoomFieldsProps {
	roomType: DisinfectionRoomType;
	onRoomChange: (type: DisinfectionRoomType) => void;
	roomName: string;
	setRoomName: (name: string) => void;
	logDate: string;
	setLogDate: (date: string) => void;
	treatedAreaM2: number;
	setTreatedAreaM2: (area: number) => void;
	applicationMethod: DisinfectionApplicationMethod;
	setApplicationMethod: (method: DisinfectionApplicationMethod) => void;
}

export function GeneralCleaningRoomFields(p: GeneralCleaningRoomFieldsProps) {
	return (
		<>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div>
					<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
						Тип кабинета
					</label>
					<select
						value={p.roomType}
						onChange={(e) => p.onRoomChange(e.target.value as DisinfectionRoomType)}
						className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-semibold"
					>
						<option value="surgical">Хирургия / Операционная</option>
						<option value="therapeutic">Терапевтический кабинет</option>
						<option value="orthopedic">Ортопедический кабинет</option>
						<option value="sterilization_cso">ЦСО (Стерилизационная)</option>
						<option value="xray">Рентген-кабинет</option>
					</select>
				</div>

				<div>
					<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
						Наименование кабинета
					</label>
					<input
						type="text"
						value={p.roomName}
						onChange={(e) => p.setRoomName(e.target.value)}
						className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm"
						required
					/>
				</div>

				<div>
					<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
						Дата проведения
					</label>
					<input
						type="date"
						value={p.logDate}
						onChange={(e) => p.setLogDate(e.target.value)}
						className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-bold"
						required
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
						Обрабатываемая площадь пола и стен (м²)
					</label>
					<input
						type="number"
						step="0.1"
						min="1"
						max="200"
						value={p.treatedAreaM2}
						onChange={(e) => p.setTreatedAreaM2(parseFloat(e.target.value) || 0)}
						className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-extrabold"
						required
					/>
				</div>

				<div>
					<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
						Способ применения
					</label>
					<select
						value={p.applicationMethod}
						onChange={(e) => p.setApplicationMethod(e.target.value as DisinfectionApplicationMethod)}
						className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-semibold"
					>
						<option value="wiping">Двукратное протирание ветошью (100 мл/м²)</option>
						<option value="spraying">Орошение гидропультом / распылителем (200 мл/м²)</option>
					</select>
				</div>
			</div>
		</>
	);
}
