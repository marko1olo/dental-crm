import { CHAIR_SPECIALTY_PRESETS } from "./chairPresets";
import type { QuickAddChairFieldsProps } from "./types";

export function QuickAddChairFields({
	chairName,
	setChairName,
	defaultChairName,
	roomNumber,
	setRoomNumber,
	defaultRoomName,
	selectedSpecialty,
	setSelectedSpecialty,
	defaultDoctorId,
	setDefaultDoctorId,
	isActive,
	setIsActive,
	doctors,
}: QuickAddChairFieldsProps) {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<label
						htmlFor="chair-name-input"
						className="block text-xs font-semibold text-[var(--ink,#0f172a)] mb-1"
					>
						Название кресла
					</label>
					<input
						id="chair-name-input"
						type="text"
						value={chairName}
						onChange={(e) => setChairName(e.target.value)}
						placeholder={defaultChairName}
						className="w-full h-10 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
					/>
				</div>
				<div>
					<label
						htmlFor="room-number-input"
						className="block text-xs font-semibold text-[var(--ink,#0f172a)] mb-1"
					>
						Кабинет / Помещение
					</label>
					<input
						id="room-number-input"
						type="text"
						value={roomNumber}
						onChange={(e) => setRoomNumber(e.target.value)}
						placeholder={defaultRoomName}
						className="w-full h-10 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<label
						htmlFor="chair-specialty-select"
						className="block text-xs font-semibold text-[var(--ink,#0f172a)] mb-1"
					>
						Специализация
					</label>
					<select
						id="chair-specialty-select"
						value={selectedSpecialty}
						onChange={(e) => setSelectedSpecialty(e.target.value)}
						className="w-full h-10 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
					>
						{CHAIR_SPECIALTY_PRESETS.map((spec) => (
							<option key={spec.id} value={spec.id}>
								{spec.label}
							</option>
						))}
					</select>
				</div>
				<div>
					<label
						htmlFor="chair-default-doctor"
						className="block text-xs font-semibold text-[var(--ink,#0f172a)] mb-1"
					>
						Закрепленный врач (опционально)
					</label>
					<select
						id="chair-default-doctor"
						value={defaultDoctorId}
						onChange={(e) => setDefaultDoctorId(e.target.value)}
						className="w-full h-10 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
					>
						<option value="">-- Без постоянного врача --</option>
						{(doctors ?? []).map((doc) => (
							<option key={doc.id} value={doc.id}>
								{doc.fullName}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="flex items-center gap-2 pt-1">
				<input
					id="chair-is-active"
					type="checkbox"
					checked={isActive}
					onChange={(e) => setIsActive(e.target.checked)}
					className="w-4 h-4 rounded text-[var(--teal,#0d9488)] focus:ring-[var(--teal,#0d9488)] border-[var(--line,#e2e8f0)]"
				/>
				<label htmlFor="chair-is-active" className="text-xs text-[var(--ink,#0f172a)] select-none">
					Кресло активно и доступно в расписании
				</label>
			</div>
		</div>
	);
}
