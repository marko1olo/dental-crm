import type React from "react";

interface QuickAddChairDoctorSelectProps {
	readonly defaultDoctorId: string;
	readonly setDefaultDoctorId: (id: string) => void;
	readonly doctors?:
		| Array<{
				id: string;
				fullName: string;
		  }>
		| undefined;
}

export function QuickAddChairDoctorSelect({
	defaultDoctorId,
	setDefaultDoctorId,
	doctors,
}: QuickAddChairDoctorSelectProps): React.ReactElement {
	return (
		<div className="space-y-1.5">
			<label
				htmlFor="chair-default-doctor"
				className="block text-xs font-semibold text-[var(--ink,#0f172a)]"
			>
				Закрепленный врач (опционально)
			</label>
			<select
				id="chair-default-doctor"
				data-testid="quick-add-chair-doctor-select"
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
			{doctors && doctors.length > 0 && (
				<div className="flex flex-wrap gap-1.5 pt-1">
					{doctors.map((doc) => {
						const isSelected = defaultDoctorId === doc.id;
						return (
							<button
								key={doc.id}
								type="button"
								onClick={() => setDefaultDoctorId(isSelected ? "" : doc.id)}
								title={doc.fullName}
								className={`min-h-[44px] px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
									isSelected
										? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-2xs font-bold"
										: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-[var(--teal,#0d9488)]"
								}`}
								data-testid={`quick-add-chair-doc-chip-${doc.id}`}
							>
								<span className="truncate max-w-[140px]">{doc.fullName}</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
