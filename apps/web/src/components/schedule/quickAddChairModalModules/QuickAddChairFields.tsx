import { CHAIR_NAME_SUGGESTIONS } from "./chairPresets";
import { QuickAddChairDoctorSelect } from "./QuickAddChairDoctorSelect";
import { QuickAddChairSpecialtyPicker } from "./QuickAddChairSpecialtyPicker";
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
						data-testid="quick-add-chair-name-input"
						type="text"
						value={chairName}
						onChange={(e) => setChairName(e.target.value)}
						placeholder={defaultChairName}
						style={{ minHeight: "44px" }}
						className="w-full min-h-[44px] h-11 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
					/>
					<div className="flex flex-wrap gap-1.5 mt-2">
						{CHAIR_NAME_SUGGESTIONS.map((suggestion, idx) => (
							<button
								key={suggestion}
								type="button"
								data-testid={`quick-add-chair-name-suggestion-${idx}`}
								onClick={() => setChairName(suggestion)}
								className="text-[11px] px-2 py-1 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-[var(--ink-muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] transition-colors cursor-pointer"
							>
								{suggestion}
							</button>
						))}
					</div>
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
						data-testid="quick-add-chair-room-input"
						type="text"
						value={roomNumber}
						onChange={(e) => setRoomNumber(e.target.value)}
						placeholder={defaultRoomName}
						style={{ minHeight: "44px" }}
						className="w-full min-h-[44px] h-11 px-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
					/>
				</div>
			</div>

			<QuickAddChairSpecialtyPicker
				selectedSpecialty={selectedSpecialty}
				setSelectedSpecialty={setSelectedSpecialty}
			/>

			<div>
				<QuickAddChairDoctorSelect
					defaultDoctorId={defaultDoctorId}
					setDefaultDoctorId={setDefaultDoctorId}
					doctors={doctors}
				/>
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
