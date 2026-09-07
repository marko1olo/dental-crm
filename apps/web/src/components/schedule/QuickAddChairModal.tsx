import React, { useState, useEffect } from "react";
import { Plus, X, Check, Armchair } from "lucide-react";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export interface ChairColorPreset {
	id: string;
	label: string;
	hex: string;
}

export const CHAIR_COLOR_PRESETS: readonly ChairColorPreset[] = [
	{ id: "teal", label: "Бирюзовый", hex: "#0d9488" },
	{ id: "blue", label: "Синий", hex: "#2563eb" },
	{ id: "emerald", label: "Изумрудный", hex: "#059669" },
	{ id: "indigo", label: "Индиго", hex: "#4f46e5" },
	{ id: "amber", label: "Янтарный", hex: "#d97706" },
	{ id: "rose", label: "Розовый", hex: "#e11d48" },
];

export interface ChairSpecialtyPreset {
	id: string;
	label: string;
}

export const CHAIR_SPECIALTY_PRESETS: readonly ChairSpecialtyPreset[] = [
	{ id: "therapist", label: "Терапия" },
	{ id: "surgeon", label: "Хирургия" },
	{ id: "orthopedist", label: "Ортопедия" },
	{ id: "orthodontist", label: "Ортодонтия" },
	{ id: "pediatric", label: "Детская" },
	{ id: "general", label: "Общее" },
];

export interface QuickAddChairData {
	id?: string;
	name: string;
	room?: string;
	roomNumber?: string;
	specialization?: string;
	color?: string;
	isActive?: boolean;
	branchId?: string;
}

export interface QuickAddChairModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly existingChairsCount?: number | undefined;
	readonly onAddChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	readonly initialData?: QuickAddChairData | null | undefined;
	readonly onUpdateChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	readonly branches?: any;
}

/**
 * QuickAddChairModal component (StomX / DentalPRO parity).
 *
 * Mandate 8d (Anti-Matryoshka, max modal depth 1).
 * Mandate 8e (Doctor & Staff Autonomy: submit button NEVER disabled, auto-generates safe defaults).
 * Mandate 8k (CRM != Reality simulator: 1-click frictionless setup).
 * Mandate 8n (Solo Doctor & Small Clinic Sovereignty: default chair count + 1).
 * Touch Ergonomics: All interactive targets >= 44px.
 */
export function QuickAddChairModal({
	isOpen,
	onClose,
	existingChairsCount = 0,
	onAddChair,
	initialData,
	onUpdateChair,
}: QuickAddChairModalProps): React.ReactElement | null {
	const isEditMode = Boolean(initialData && initialData.id);
	const defaultChairName = isEditMode
		? initialData?.name || `Кресло ${existingChairsCount + 1}`
		: `Кресло ${existingChairsCount + 1}`;
	const defaultRoomName = isEditMode
		? initialData?.room || `Кабинет ${existingChairsCount + 1}`
		: `Кабинет ${existingChairsCount + 1}`;

	const [chairName, setChairName] = useState("");
	const [roomNumber, setRoomNumber] = useState("");
	const [selectedSpecialty, setSelectedSpecialty] = useState<string>("therapist");
	const [selectedColor, setSelectedColor] = useState<string>("#0d9488");
	const [isActive, setIsActive] = useState<boolean>(true);
	const [branchId, setBranchId] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (isOpen) {
			if (initialData) {
				setChairName(initialData.name || "");
				setRoomNumber(initialData.room || "");
				setSelectedSpecialty(initialData.specialization || "therapist");
				setSelectedColor(initialData.color || "#0d9488");
				setIsActive(initialData.isActive !== false);
				setBranchId(initialData.branchId || "");
			} else {
				setChairName("");
				setRoomNumber("");
				setSelectedSpecialty("therapist");
				setSelectedColor("#0d9488");
				setIsActive(true);
				setBranchId("");
			}
			setIsSubmitting(false);
		}
	}, [isOpen, initialData]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		if (isOpen) {
			window.addEventListener("keydown", handleKeyDown);
		}
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onClose]);

	if (!isOpen) {
		return null;
	}

	const handleSubmit = async (e?: React.FormEvent) => {
		if (e) {
			e.preventDefault();
		}
		if (isSubmitting) return;
		const finalName = chairName.trim() || defaultChairName;
		const finalRoom = roomNumber.trim() || defaultRoomName;

		if (!chairName.trim() && !isEditMode) {
			showToast(`Название не указано. Создано «${finalName}» (${finalRoom})`, "info", 4000);
		}

		setIsSubmitting(true);
		try {
			const payload: QuickAddChairData = {
				...(initialData?.id ? { id: initialData.id } : {}),
				name: finalName,
				room: finalRoom,
				specialization: selectedSpecialty,
				color: selectedColor,
				isActive,
				...(branchId ? { branchId } : {}),
			};

			if (isEditMode && onUpdateChair) {
				await Promise.resolve(onUpdateChair(payload));
				showToast(`Кресло «${finalName}» успешно обновлено`, "success", 3000);
			} else if (onAddChair) {
				await Promise.resolve(onAddChair(payload));
			} else {
				// Fallback to direct API call if no callback provided
				const endpoint = isEditMode && initialData?.id
					? `/api/settings/chairs/${initialData.id}`
					: "/api/settings/chairs";
				const method = isEditMode ? "PUT" : "POST";

				await fetch(endpoint, {
					method,
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						name: finalName,
						room: finalRoom,
						specialization: selectedSpecialty,
						color: selectedColor,
						active: isActive,
					}),
				}).catch(() => {});
			}
			setChairName("");
			setRoomNumber("");
			onClose();
		} catch {
			// Mandate 8e: Doctor Autonomy - never block the interface on background network errors
			onClose();
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div
			className="quick-add-chair-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="quick-add-chair-modal-title"
			data-testid="quick-add-chair-modal-backdrop"
		>
			<div
				className="quick-add-chair-modal w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[var(--ink,#0f172a)] animate-in zoom-in-95 duration-150"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-2xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] flex items-center justify-center border border-[var(--teal,#0d9488)]/20 shrink-0">
							<Armchair className="w-5 h-5" aria-hidden="true" />
						</div>
						<div>
							<h2
								id="quick-add-chair-modal-title"
								className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] leading-tight"
							>
								{isEditMode ? "Редактировать кресло" : "Добавить кресло в расписание"}
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
								{isEditMode
									? "Параметры рабочего места и активность (StomX / DentalPRO parity)"
									: "Быстрое добавление рабочего места (StomX / DentalPRO parity)"}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] border border-transparent hover:border-[var(--line,#e2e8f0)] transition-all cursor-pointer shrink-0"
						aria-label="Закрыть окно"
						data-testid="quick-add-chair-close-btn"
						style={{ minHeight: "44px", minWidth: "44px" }}
					>
						<X className="w-5 h-5" aria-hidden="true" />
					</button>
				</div>

				{/* Modal Body / Form */}
				<form
					onSubmit={handleSubmit}
					className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1"
				>
					{/* Field: Chair Name */}
					<div className="space-y-1.5">
						<label
							htmlFor="quick-add-chair-name-input"
							className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]"
						>
							Название кресла
						</label>
						<input
							id="quick-add-chair-name-input"
							type="text"
							value={chairName}
							onChange={(e) => setChairName(e.target.value)}
							placeholder={defaultChairName}
							className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-sm font-medium focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-hidden transition-all"
							data-testid="quick-add-chair-name-input"
							style={{ minHeight: "44px" }}
						/>
						<p className="text-[11px] text-[var(--muted,#64748b)]">
							По умолчанию: <span className="font-semibold text-[var(--ink)]">{defaultChairName}</span> (при пустом вводе сохранится автоматически)
						</p>
					</div>

					{/* Field: Cabinet / Room */}
					<div className="space-y-1.5">
						<label
							htmlFor="quick-add-chair-room-input"
							className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]"
						>
							Кабинет / Помещение
						</label>
						<input
							id="quick-add-chair-room-input"
							type="text"
							value={roomNumber}
							onChange={(e) => setRoomNumber(e.target.value)}
							placeholder={defaultRoomName}
							className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-sm font-medium focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-hidden transition-all"
							data-testid="quick-add-chair-room-input"
							style={{ minHeight: "44px" }}
						/>
					</div>

					{/* Field: Specialization selector */}
					<div className="space-y-1.5">
						<span
							id="quick-add-chair-spec-label"
							className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]"
						>
							Специализация (профиль)
						</span>
						<div
							className="grid grid-cols-2 sm:grid-cols-3 gap-2"
							role="radiogroup"
							aria-labelledby="quick-add-chair-spec-label"
						>
							{CHAIR_SPECIALTY_PRESETS.map((spec) => {
								const isSelected = selectedSpecialty === spec.id;
								return (
									<button
										key={spec.id}
										type="button"
										onClick={() => setSelectedSpecialty(spec.id)}
										className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none ${
											isSelected
												? "bg-[var(--teal,var(--brand-primary))] text-white border-transparent shadow-xs"
												: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,var(--brand-primary))]"
										}`}
										data-testid={`quick-add-chair-spec-${spec.id}`}
										role="radio"
										aria-checked={isSelected}
										style={{ minHeight: "44px" }}
									>
										<span>{spec.label}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Field: Color picker presets */}
					<div className="space-y-1.5">
						<span
							id="quick-add-chair-color-label"
							className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]"
						>
							Цветовой маркер в расписании
						</span>
						<div
							className="flex items-center gap-2.5 flex-wrap"
							role="radiogroup"
							aria-labelledby="quick-add-chair-color-label"
						>
							{CHAIR_COLOR_PRESETS.map((colorPreset) => {
								const isSelected = selectedColor === colorPreset.hex;
								return (
									<button
										key={colorPreset.id}
										type="button"
										onClick={() => setSelectedColor(colorPreset.hex)}
										className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-all cursor-pointer border-2 shadow-xs ${
											isSelected
												? "border-[var(--ink,#0f172a)] ring-2 ring-offset-2 ring-[var(--teal,#0d9488)] scale-105"
												: "border-transparent hover:scale-105 opacity-85 hover:opacity-100"
										}`}
										style={{
											backgroundColor: colorPreset.hex,
											minHeight: "44px",
											minWidth: "44px",
										}}
										title={`${colorPreset.label} (${colorPreset.hex})`}
										data-testid={`quick-add-chair-color-${colorPreset.id}`}
										role="radio"
										aria-checked={isSelected}
										aria-label={`Цвет: ${colorPreset.label}`}
									>
										{isSelected && (
											<Check className="w-5 h-5 text-white drop-shadow-sm" aria-hidden="true" />
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* Field: Activity Status (Active vs Archived) */}
					<div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
						<div className="space-y-0.5">
							<span className="block text-xs font-bold text-[var(--ink,#0f172a)]">
								Активность в расписании
							</span>
							<span className="text-[11px] text-[var(--muted,#64748b)]">
								{isActive
									? "Кресло активно и отображается в сетке расписания"
									: "Кресло в архиве (скрыто из ежедневного расписания)"}
							</span>
						</div>
						<button
							type="button"
							onClick={() => setIsActive(!isActive)}
							className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none flex items-center gap-1.5 ${
								isActive
									? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40"
									: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30"
							}`}
							data-testid="quick-add-chair-active-toggle"
							style={{ minHeight: "44px" }}
						>
							<span
								className={`w-2 h-2 rounded-full ${
									isActive ? "bg-emerald-500" : "bg-slate-400"
								}`}
							/>
							<span>{isActive ? "Активно" : "В архиве"}</span>
						</button>
					</div>
				</form>

				{/* Modal Footer */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-end gap-2.5 shrink-0">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs sm:text-sm font-bold hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
						data-testid="quick-add-chair-cancel-btn"
						style={{ minHeight: "44px" }}
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={() => handleSubmit()}
						disabled={false}
						className="min-h-[44px] px-5 rounded-xl bg-[var(--teal,var(--brand-primary))] text-white text-xs sm:text-sm font-bold hover:opacity-90 active:scale-98 transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
						data-testid="quick-add-chair-submit-btn"
						style={{ minHeight: "44px" }}
						title={
							isEditMode
								? "Сохранить изменения параметров кресла"
								: "Добавить кресло в расписание (автогенерация имени при пустом вводе)"
						}
					>
						{isEditMode ? (
							<Check className="w-4 h-4 shrink-0" aria-hidden="true" />
						) : (
							<Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
						)}
						<span>
							{isSubmitting
								? isEditMode
									? "Сохранение..."
									: "Добавление..."
								: isEditMode
									? "Сохранить изменения"
									: "+ Добавить кресло"}
						</span>
					</button>
				</div>
			</div>
		</div>
	);
}
