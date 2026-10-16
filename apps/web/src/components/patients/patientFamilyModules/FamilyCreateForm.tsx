import React from "react";

interface FamilyCreateFormProps {
	readonly newFamilyName: string;
	readonly setNewFamilyName: (name: string) => void;
	readonly loading: boolean;
	readonly onCreate: () => void;
	readonly onCancel: () => void;
}

export const FamilyCreateForm: React.FC<FamilyCreateFormProps> = ({
	newFamilyName,
	setNewFamilyName,
	loading,
	onCreate,
	onCancel,
}) => (
	<div className="flex flex-col gap-3">
		<input
			type="text"
			className="w-full p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] outline-none text-xs"
			placeholder="Название семьи (напр. Семья Ивановых)"
			value={newFamilyName}
			onChange={(e) => setNewFamilyName(e.target.value)}
		/>
		<div className="flex gap-2">
			<button
				type="button"
				className="flex-1 bg-[var(--teal,var(--brand-primary))] hover:brightness-110 text-white p-2 min-h-[44px] sm:min-h-[32px] text-xs rounded-xl font-semibold cursor-pointer border-0 inline-flex items-center justify-center transition-all"
				onClick={onCreate}
				disabled={loading}
			>
				{loading ? "Создание..." : "Создать"}
			</button>
			<button
				type="button"
				className="flex-1 bg-[var(--paper-soft)] text-[var(--ink)] p-2 min-h-[44px] sm:min-h-[32px] text-xs rounded-xl font-semibold cursor-pointer border border-[var(--line)] inline-flex items-center justify-center"
				onClick={onCancel}
				disabled={loading}
			>
				Отмена
			</button>
		</div>
	</div>
);
