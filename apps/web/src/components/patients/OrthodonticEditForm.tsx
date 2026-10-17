import React from "react";
import { motion } from "framer-motion";
import { Save, X } from "lucide-react";

interface OrthodonticEditFormProps {
	formCurrent: number;
	setFormCurrent: (v: number) => void;
	formTotal: number;
	setFormTotal: (v: number) => void;
	formStart: string;
	setFormStart: (v: string) => void;
	saving: boolean;
	hasActiveTracker: boolean;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
	onReset: () => void;
}

export const OrthodonticEditForm: React.FC<OrthodonticEditFormProps> = ({
	formCurrent,
	setFormCurrent,
	formTotal,
	setFormTotal,
	formStart,
	setFormStart,
	saving,
	hasActiveTracker,
	onSubmit,
	onCancel,
	onReset,
}) => (
	<motion.form
		key="edit"
		onSubmit={onSubmit}
		initial={{ opacity: 0, x: -10 }}
		animate={{ opacity: 1, x: 0 }}
		exit={{ opacity: 0, x: 10 }}
		style={{ display: "flex", flexDirection: "column", gap: "12px" }}
	>
		<div className="flex justify-between items-center mb-2">
			<span className="text-sm font-semibold text-[var(--ink)]">
				Сколько капп пройдено
			</span>
			<button
				type="button"
				onClick={onCancel}
				className="bg-transparent border-0 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer p-0"
			>
				<X size={18} />
			</button>
		</div>

		<div className="grid grid-cols-2 gap-3">
			<label className="flex flex-col gap-1.5 text-xs text-[var(--muted)]">
				Текущая каппа
				<input
					type="number"
					min={1}
					max={formTotal}
					value={formCurrent}
					onChange={(e) => setFormCurrent(Math.max(1, Number(e.target.value)))}
					className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--glass-border)] text-[var(--ink)] text-sm outline-none"
				/>
			</label>
			<label className="flex flex-col gap-1.5 text-xs text-[var(--muted)]">
				Всего капп
				<input
					type="number"
					min={1}
					value={formTotal}
					onChange={(e) => setFormTotal(Math.max(1, Number(e.target.value)))}
					className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--glass-border)] text-[var(--ink)] text-sm outline-none"
				/>
			</label>
		</div>

		<label className="flex flex-col gap-1.5 text-xs text-[var(--muted)]">
			Дата начала
			<input
				type="date"
				value={formStart}
				onChange={(e) => setFormStart(e.target.value)}
				className="p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--glass-border)] text-[var(--ink)] text-sm w-full outline-none"
			/>
		</label>

		<div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
			<button
				type="submit"
				disabled={saving}
				className="flex-1 min-h-[44px] sm:min-h-[32px] bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] rounded-xl p-2.5 font-semibold text-xs flex justify-center items-center gap-2 border-0 cursor-pointer transition-all"
			>
				{saving ? "Сохранение..." : <><Save size={16} /> Сохранить</>}
			</button>
			{hasActiveTracker && (
				<button
					type="button"
					disabled={saving}
					onClick={onReset}
					className="px-4 py-2.5 min-h-[44px] sm:min-h-[32px] rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-xs cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors inline-flex items-center justify-center"
				>
					Удалить
				</button>
			)}
		</div>
	</motion.form>
);
