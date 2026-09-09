import React, { useState, useEffect } from "react";
import { Plus, X, Check, Armchair, Copy } from "lucide-react";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export interface ChairColorPreset {
	id: string;
	label: string;
	hex: string;
	lightHex: string;
	darkHex: string;
}

export const CHAIR_COLOR_PRESETS: readonly ChairColorPreset[] = [
	{ id: "teal", label: "Бирюзовый", hex: "#0d9488", lightHex: "#ccfbf1", darkHex: "#115e59" },
	{ id: "sapphire", label: "Сапфировый", hex: "#1d4ed8", lightHex: "#dbeafe", darkHex: "#1e3a8a" },
	{ id: "emerald", label: "Изумрудный", hex: "#059669", lightHex: "#d1fae5", darkHex: "#065f46" },
	{ id: "indigo", label: "Индиго", hex: "#4f46e5", lightHex: "#e0e7ff", darkHex: "#3730a3" },
	{ id: "amber", label: "Янтарный", hex: "#d97706", lightHex: "#fef3c7", darkHex: "#92400e" },
	{ id: "coral", label: "Коралловый", hex: "#f43f5e", lightHex: "#ffe4e6", darkHex: "#9f1239" },
	{ id: "amethyst", label: "Аметистовый", hex: "#7c3aed", lightHex: "#ede9fe", darkHex: "#5b21b6" },
	{ id: "azure", label: "Лазурный", hex: "#0284c7", lightHex: "#e0f2fe", darkHex: "#075985" },
	{ id: "olive", label: "Оливковый", hex: "#65a30d", lightHex: "#ecfccb", darkHex: "#3f6212" },
	{ id: "terracotta", label: "Терракотовый", hex: "#c2410c", lightHex: "#ffedd5", darkHex: "#7c2d12" },
	{ id: "slate", label: "Сланцевый", hex: "#475569", lightHex: "#f1f5f9", darkHex: "#1e293b" },
	{ id: "mint", label: "Мятный", hex: "#14b8a6", lightHex: "#e6fffa", darkHex: "#0f766e" },
	{ id: "rose", label: "Розовый", hex: "#db2777", lightHex: "#fce7f3", darkHex: "#9d174d" },
	{ id: "graphite", label: "Графитовый", hex: "#334155", lightHex: "#e2e8f0", darkHex: "#0f172a" },
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
	{ id: "hygienist", label: "Гигиена" },
	{ id: "general", label: "Общее" },
];

export const CHAIR_NAME_SUGGESTIONS: readonly string[] = [
	"Кресло 1",
	"Кресло 2 (Хирургия)",
	"Кресло 3 (Терапия)",
	"Кабинет 1",
];

export interface ChairArchetypePreset {
	id: string;
	label: string;
	specialty: string;
	colorHex: string;
	description: string;
}

export const CHAIR_ARCHETYPE_PRESETS: readonly ChairArchetypePreset[] = [
	{
		id: "therapy",
		label: "Терапевтическое",
		specialty: "therapist",
		colorHex: "#0d9488",
		description: "Терапия и эндодонтия",
	},
	{
		id: "surgery",
		label: "Хирургическое",
		specialty: "surgeon",
		colorHex: "#2563eb",
		description: "Хирургия/имплантология",
	},
	{
		id: "orthodontics",
		label: "Ортодонтическое",
		specialty: "orthodontist",
		colorHex: "#6366f1",
		description: "Ортодонтия и прикус",
	},
	{
		id: "pediatric",
		label: "Детское",
		specialty: "pediatric",
		colorHex: "#f59e0b",
		description: "Детская стоматология",
	},
	{
		id: "hygiene",
		label: "Гигиеническое",
		specialty: "hygienist",
		colorHex: "#10b981",
		description: "Профгигиена и уход",
	},
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
	defaultDoctorId?: string | null;
}

export interface QuickAddChairModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly existingChairsCount?: number | undefined;
	readonly onAddChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	readonly initialData?: QuickAddChairData | null | undefined;
	readonly onUpdateChair?: ((chairData: QuickAddChairData) => Promise<void> | void) | undefined;
	readonly branches?: any;
	readonly doctors?:
		| Array<{
				id: string;
				fullName: string;
				role?: string;
				specialties?: string[];
				active?: boolean;
		  }>
		| undefined;
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
	doctors,
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
	const [selectedArchetypeId, setSelectedArchetypeId] = useState<string | null>(null);
	const [isActive, setIsActive] = useState<boolean>(true);
	const [branchId, setBranchId] = useState<string>("");
	const [defaultDoctorId, setDefaultDoctorId] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSelectArchetype = (archetype: ChairArchetypePreset) => {
		setSelectedArchetypeId(archetype.id);
		setSelectedSpecialty(archetype.specialty);
		setSelectedColor(archetype.colorHex);
		const chairNumber = existingChairsCount + 1;
		setChairName(`Кресло ${chairNumber}`);
		if (!roomNumber) {
			setRoomNumber(`Кабинет ${chairNumber}`);
		}
		showToast(`Применен архетип «${archetype.label}» (${archetype.colorHex})`, "info", 2500);
	};

	useEffect(() => {
		if (isOpen) {
			setSelectedArchetypeId(null);
			if (initialData) {
				setChairName(initialData.name || "");
				setRoomNumber(initialData.room || "");
				setSelectedSpecialty(initialData.specialization || "therapist");
				setSelectedColor(initialData.color || "#0d9488");
				setIsActive(initialData.isActive !== false);
				setBranchId(initialData.branchId || "");
				setDefaultDoctorId((initialData as any).defaultDoctorId || "");
			} else {
				setChairName("");
				setRoomNumber("");
				setSelectedSpecialty("therapist");
				setSelectedColor("#0d9488");
				setIsActive(true);
				setBranchId("");
				setDefaultDoctorId("");
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
				defaultDoctorId: defaultDoctorId.trim() || null,
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
						defaultDoctorId: defaultDoctorId.trim() || null,
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

	const handleDuplicateChair = async () => {
		if (isSubmitting) return;
		const baseName = chairName.trim() || defaultChairName;
		const duplicatedName = `${baseName} (копия)`;
		const finalRoom = roomNumber.trim() || defaultRoomName;

		setIsSubmitting(true);
		try {
			const payload: QuickAddChairData = {
				name: duplicatedName,
				room: finalRoom,
				specialization: selectedSpecialty,
				color: selectedColor,
				isActive,
				defaultDoctorId: defaultDoctorId.trim() || null,
				...(branchId ? { branchId } : {}),
			};

			if (onAddChair) {
				await Promise.resolve(onAddChair(payload));
			} else {
				const endpoint = "/api/settings/chairs";
				await fetch(endpoint, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						name: duplicatedName,
						room: finalRoom,
						specialization: selectedSpecialty,
						color: selectedColor,
						active: isActive,
						defaultDoctorId: defaultDoctorId.trim() || null,
						...(branchId ? { branchId } : {}),
					}),
				}).catch(() => {});
			}
			showToast(`Создана копия кресла «${duplicatedName}»`, "success", 3500);
			onClose();
		} catch {
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
					{/* 1-Click Chair Archetype Presets (StomX / DentalPRO parity, Mandates 8e, 8k) */}
					<div className="space-y-1.5">
						<span
							id="quick-add-chair-archetypes-label"
							className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]"
						>
							1-клик архетипы кресел (StomX / DentalPRO)
						</span>
						<div
							className="grid grid-cols-2 sm:grid-cols-3 gap-2"
							role="radiogroup"
							aria-labelledby="quick-add-chair-archetypes-label"
						>
							{CHAIR_ARCHETYPE_PRESETS.map((arch) => {
								const isSelected =
									selectedArchetypeId === arch.id ||
									(selectedSpecialty === arch.specialty &&
										selectedColor.toLowerCase() === arch.colorHex.toLowerCase());
								return (
									<button
										key={arch.id}
										type="button"
										onClick={() => handleSelectArchetype(arch)}
										className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 select-none text-left ${
											isSelected
												? "border-[var(--teal,var(--brand-primary))] ring-2 ring-[var(--teal,#0d9488)]/40 bg-[var(--teal-soft,#f0fdfa)] text-[var(--ink,#0f172a)] shadow-xs"
												: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,var(--brand-primary))]"
										}`}
										data-testid={`quick-add-chair-archetype-${arch.id}`}
										role="radio"
										aria-checked={isSelected}
										style={{ minHeight: "44px" }}
										title={`${arch.label}: ${arch.description}`}
									>
										<span
											className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/15 shadow-xs"
											style={{ backgroundColor: arch.colorHex }}
											aria-hidden="true"
										/>
										<div className="min-w-0 flex-1 leading-tight">
											<div className="truncate font-bold text-[12px]">{arch.label}</div>
											<div className="text-[10px] text-[var(--muted,#64748b)] font-normal truncate">
												{arch.description}
											</div>
										</div>
									</button>
								);
							})}
						</div>
					</div>

					{/* Field: Chair Name */}
					<div className="space-y-1.5">
						<div className="flex items-center justify-between flex-wrap gap-1">
							<label
								htmlFor="quick-add-chair-name-input"
								className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]"
							>
								Название кресла
							</label>
							<div className="flex items-center gap-1 flex-wrap">
								{CHAIR_NAME_SUGGESTIONS.map((sugg, idx) => (
									<button
										key={sugg}
										type="button"
										data-testid={`quick-add-chair-name-suggestion-${idx}`}
										onClick={() => setChairName(sugg)}
										className="min-h-[28px] px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--teal-soft,#f0fdfa)] text-[var(--muted,#64748b)] hover:text-[var(--teal,#0d9488)] border border-[var(--line,#e2e8f0)] hover:border-[var(--teal,#0d9488)] transition-all cursor-pointer"
										title={`Подставить «${sugg}»`}
									>
										{sugg}
									</button>
								))}
							</div>
						</div>
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

					{/* Field: Default Doctor (StomX / DentalPRO parity, Mandates 8e, 8n) */}
					<div className="space-y-1.5">
						<label
							htmlFor="quick-add-chair-doctor-select"
							className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]"
						>
							Дежурный / основной врач кресла по умолчанию (StomX / DentalPRO)
						</label>
						<select
							id="quick-add-chair-doctor-select"
							value={defaultDoctorId}
							onChange={(e) => setDefaultDoctorId(e.target.value)}
							className="w-full min-h-[44px] px-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-sm font-medium focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))] focus:outline-hidden transition-all"
							data-testid="quick-add-chair-doctor-select"
							style={{ minHeight: "44px" }}
						>
							<option value="">-- Без привязки (по графику смен) --</option>
							{doctors?.map((doc) => (
								<option key={doc.id} value={doc.id}>
									{doc.fullName} {doc.specialties?.length ? `(${doc.specialties.join(", ")})` : ""}
								</option>
							))}
						</select>
						{doctors && doctors.length > 0 && (
							<div className="flex flex-wrap gap-1.5 pt-1">
								{doctors.map((doc) => (
									<button
										key={doc.id}
										type="button"
										onClick={() => setDefaultDoctorId(doc.id)}
										title={doc.fullName}
										className={`min-h-[44px] px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
											defaultDoctorId === doc.id
												? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs font-bold"
												: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-[var(--teal)]"
										}`}
										data-testid={`quick-add-chair-doc-chip-${doc.id}`}
									>
										<span className="truncate max-w-[140px]">{doc.fullName}</span>
									</button>
								))}
							</div>
						)}
						<p className="text-[11px] text-[var(--muted,#64748b)]">
							При создании записи в этом кресле врач будет предзаполнен автоматически
						</p>
					</div>

					{/* Field: Color picker presets (14 StomX authentic palettes, Mandates 8e, 8k) */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span
								id="quick-add-chair-color-label"
								className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]"
							>
								14 аутентичных палитр StomX (цвет кресла)
							</span>
							<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">
								{CHAIR_COLOR_PRESETS.find(
									(c) => c.hex.toLowerCase() === selectedColor.toLowerCase(),
								)?.label || "Выбран цвет"}{" "}
								({selectedColor})
							</span>
						</div>
						<div
							className="grid grid-cols-7 gap-2"
							role="radiogroup"
							aria-labelledby="quick-add-chair-color-label"
						>
							{CHAIR_COLOR_PRESETS.map((colorPreset) => {
								const isSelected =
									selectedColor.toLowerCase() === colorPreset.hex.toLowerCase() ||
									(colorPreset.id === "sapphire" && selectedColor.toLowerCase() === "#2563eb");
								return (
									<button
										key={colorPreset.id}
										type="button"
										onClick={() => setSelectedColor(colorPreset.hex)}
										className={`min-h-[44px] min-w-[44px] rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border-2 shadow-xs relative overflow-hidden ${
											isSelected
												? "border-[var(--ink,#0f172a)] ring-2 ring-offset-2 ring-[var(--teal,#0d9488)] scale-105"
												: "border-transparent hover:scale-105 opacity-90 hover:opacity-100"
										}`}
										style={{
											backgroundColor: colorPreset.hex,
											minHeight: "44px",
											minWidth: "44px",
										}}
										title={`${colorPreset.label} (светлый: ${colorPreset.lightHex}, тёмный: ${colorPreset.darkHex})`}
										data-testid={`quick-add-chair-color-${colorPreset.id}`}
										role="radio"
										aria-checked={isSelected}
										aria-label={`Цвет: ${colorPreset.label}`}
									>
										{/* Paired light indicator strip at bottom for dual-tone preview */}
										<div
											className="w-full h-1.5 absolute bottom-0 left-0 right-0 opacity-80"
											style={{ backgroundColor: colorPreset.lightHex }}
										/>
										{isSelected && (
											<Check className="w-5 h-5 text-white drop-shadow-sm" aria-hidden="true" />
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* 1-Click Chair Live Preview Card (StomX / DentalPRO parity, Mandates 8e, 8k) */}
					<div
						className="p-3.5 rounded-2xl border transition-all"
						style={{
							borderColor: selectedColor,
							backgroundColor: "var(--paper-soft,#f8fafc)",
						}}
						data-testid="quick-add-chair-live-preview"
					>
						<div
							className="h-1.5 w-full rounded-full mb-2.5"
							style={{ backgroundColor: selectedColor }}
							data-testid="quick-add-chair-preview-accent-strip"
						/>
						<div className="flex items-center justify-between gap-2">
							<div className="flex items-center gap-2 min-w-0">
								<span
									className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
									style={{ backgroundColor: selectedColor }}
								/>
								<span
									className="text-sm font-bold text-[var(--ink,#0f172a)] truncate"
									title={chairName.trim() || defaultChairName}
								>
									{chairName.trim() || defaultChairName}
								</span>
								<span
									className="text-xs text-[var(--muted,#64748b)] truncate"
									title={roomNumber.trim() || defaultRoomName}
								>
									({roomNumber.trim() || defaultRoomName})
								</span>
							</div>
							<span
								className="text-xs px-2.5 py-1 rounded-lg font-bold shrink-0 border"
								style={{
									backgroundColor:
										CHAIR_COLOR_PRESETS.find(
											(c) => c.hex.toLowerCase() === selectedColor.toLowerCase(),
										)?.lightHex ?? `${selectedColor}20`,
									color:
										CHAIR_COLOR_PRESETS.find(
											(c) => c.hex.toLowerCase() === selectedColor.toLowerCase(),
										)?.darkHex ?? selectedColor,
									borderColor: `${selectedColor}40`,
								}}
								data-testid="quick-add-chair-preview-color-name"
							>
								{CHAIR_COLOR_PRESETS.find(
									(c) => c.hex.toLowerCase() === selectedColor.toLowerCase(),
								)?.label || "Цвет кресла"}
							</span>
						</div>
						<div
							className="mt-2.5 pt-2 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between text-xs"
							data-testid="quick-add-chair-preview-doctor-block"
						>
							<span className="text-[var(--muted,#64748b)]">Основной врач установки:</span>
							<span className="font-bold text-[var(--ink,#0f172a)]" data-testid="quick-add-chair-preview-doctor">
								{doctors?.find((d) => d.id === defaultDoctorId)?.fullName || "По графику смен (без привязки)"}
							</span>
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
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
					<div>
						{(isEditMode || Boolean(initialData)) && (
							<button
								type="button"
								onClick={handleDuplicateChair}
								disabled={false}
								className="min-h-[44px] px-3.5 sm:px-4 rounded-xl border border-[var(--teal,#0d9488)]/40 bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] hover:bg-[var(--teal,#0d9488)]/20 text-xs sm:text-sm font-bold transition-colors cursor-pointer inline-flex items-center gap-2 select-none"
								data-testid="quick-add-chair-duplicate-btn"
								style={{ minHeight: "44px" }}
								title="Дублировать текущие параметры в новое кресло"
							>
								<Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
								<span>+ Дублировать как новое кресло</span>
							</button>
						)}
					</div>
					<div className="flex items-center gap-2.5 ml-auto">
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
		</div>
	);
}
