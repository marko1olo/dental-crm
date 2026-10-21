/**
 * apps/web/src/components/settings/clinic/chairsModules/ClinicChairEditModal.tsx
 *
 * Layer 4: Chair detail configuration modal:
 * - Room / Cabinet designation
 * - Color marker badge for calendar timeline visual distinction
 * - Active / Inactive operational status
 * - Clinical specialization focus
 */

import React, { useState, useEffect } from "react";
import { Check, ShieldCheck, X } from "lucide-react";
import type { Chair } from "@dental/shared";
import type { ClinicChairEditModalProps } from "./clinicChairsTypes";

const CHAIR_PALETTE = [
	{ name: "Лаванда", value: "#AEA7D3" },
	{ name: "Небо (Терапия)", value: "#91B9E9" },
	{ name: "Мята (Гигиена)", value: "#7EC8BA" },
	{ name: "Коралл (Хирургия)", value: "#FFB5A7" },
	{ name: "Песок (Ортопедия)", value: "#FCD581" },
	{ name: "Медицинский тил", value: "#0d9488" },
];

export const ClinicChairEditModal: React.FC<ClinicChairEditModalProps> = ({
	isOpen,
	chair,
	onClose,
	onSave,
	specialtyLabels,
}) => {
	const [name, setName] = useState("");
	const [room, setRoom] = useState("");
	const [color, setColor] = useState(CHAIR_PALETTE[0]?.value ?? "#0d9488");
	const [specialization, setSpecialization] = useState("");
	const [isActive, setIsActive] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (chair) {
			setName(chair.name || "");
			setRoom(chair.room || "");
			// biome-ignore lint/suspicious/noExplicitAny: chair color tag
			setColor((chair as any).color || CHAIR_PALETTE[0]?.value || "#0d9488");
			setSpecialization(chair.specialization || "");
			// biome-ignore lint/suspicious/noExplicitAny: active flag
			setIsActive((chair as any).isActive !== false);
		}
	}, [chair]);

	if (!isOpen || !chair) return null;

	const handleFormSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		setIsSaving(true);
		try {
			await onSave(chair.id, {
				name: name.trim(),
				room: room.trim() || undefined,
				specialization: specialization || undefined,
				// biome-ignore lint/suspicious/noExplicitAny: color and isActive properties
				...({ color, isActive } as any),
			});
			onClose();
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
			data-testid="clinic-chair-edit-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="chair-edit-modal-title"
		>
			<div className="w-full max-w-md rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden flex flex-col">
				{/* Header */}
				<div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<span
							className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
							style={{ backgroundColor: color }}
						/>
						<h3 id="chair-edit-modal-title" className="text-base font-bold text-[var(--ink)] m-0">
							Параметры кресла
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Body */}
				<form onSubmit={handleFormSubmit} className="p-5 space-y-4">
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
								<option key={key} value={key}>
									{label}
								</option>
							))}
						</select>
					</div>

					{/* Color Marker for Timeline */}
					<div>
						<span className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
							Цвет маркера в расписании
						</span>
						<div className="flex items-center gap-2 flex-wrap">
							{CHAIR_PALETTE.map((c) => (
								<button
									key={c.value}
									type="button"
									onClick={() => setColor(c.value)}
									className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
										color === c.value ? "ring-2 ring-offset-2 ring-teal-500 scale-110" : "opacity-80 hover:opacity-100"
									}`}
									style={{ backgroundColor: c.value }}
									title={c.name}
								>
									{color === c.value && <Check size={14} className="text-white" />}
								</button>
							))}
						</div>
					</div>

					{/* Status Toggle */}
					<div className="pt-2 border-t border-[var(--line)] flex items-center justify-between">
						<div>
							<span className="text-xs font-bold text-[var(--ink)] block">Статус установки</span>
							<p className="text-[11px] text-[var(--muted)] m-0">
								{isActive ? "Активно в расписании" : "Скрыто из выбора для новых визитов"}
							</p>
						</div>
						<label className="relative inline-flex items-center cursor-pointer shrink-0" title={isActive ? "Активно в расписании" : "Скрыто из выбора"}>
							<input
								type="checkbox"
								checked={isActive}
								onChange={() => setIsActive((prev) => !prev)}
								className="sr-only peer"
								aria-label="Активность кресла"
							/>
							<div className="w-[51px] h-[31px] bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-[27px] after:w-[27px] after:transition-all peer-checked:bg-teal-600"></div>
						</label>
					</div>

					{/* Modal Footer */}
					<div className="pt-3 border-t border-[var(--line)] flex items-center justify-end gap-2">
						<button
							type="button"
							onClick={onClose}
							className="h-9 px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="submit"
							disabled={isSaving}
							className="h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
						>
							<ShieldCheck size={14} />
							<span>{isSaving ? "Сохраняю..." : "Сохранить"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
