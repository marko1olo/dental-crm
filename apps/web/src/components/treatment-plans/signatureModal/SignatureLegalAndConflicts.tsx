import React from "react";
import { AlertCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import type { ConflictToothGroup } from "../validation/starProtocolValidationEngine";

export interface SignatureLegalAndConflictsProps {
	readonly clinicName: string;
	readonly doctorFullName: string;
	readonly conflicts: readonly ConflictToothGroup[];
	readonly termsAccepted: boolean;
	readonly setTermsAccepted: (val: boolean) => void;
	readonly errorText: string | null;
}

export const SignatureLegalAndConflicts: React.FC<SignatureLegalAndConflictsProps> = ({
	clinicName,
	doctorFullName,
	conflicts,
	termsAccepted,
	setTermsAccepted,
	errorText,
}) => {
	return (
		<>
			<div className="p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--border)] text-xs text-[var(--muted)] space-y-2 leading-relaxed max-h-36 overflow-y-auto">
				<div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
					<ShieldCheck size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>Информированное согласие на стоматологическое лечение:</span>
				</div>
				<p className="m-0">
					1. Я подтверждаю, что ознакомлен(а) с диагнозом, перечнем этапов лечения, используемыми материалами, ожидаемыми сроками и общей стоимостью.
				</p>
				<p className="m-0">
					2. Мне разъяснены альтернативные методы лечения, возможные риски и гарантийные обязательства клиники «{clinicName}».
				</p>
				<p className="m-0">
					3. Я даю свое информированное добровольное согласие на проведение запланированных медицинских вмешательств лечащим врачом ({doctorFullName}).
				</p>
			</div>

			{conflicts.length > 0 && (
				<div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-3" data-testid="clinical-conflict-alert">
					<AlertTriangle size={20} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
					<div className="space-y-1.5 flex-1">
						<div className="font-bold text-sm">Клиническое предупреждение: взаимоисключающие манипуляции</div>
						<div className="space-y-1">
							{conflicts.map((c, idx) => (
								<div key={idx} className="text-xs leading-relaxed">
									• <strong>Зуб №{c.toothNumber}:</strong> {c.descriptionRu}
								</div>
							))}
						</div>
						<div className="text-[11px] text-amber-700/90 dark:text-amber-300/90 font-semibold pt-1 border-t border-amber-500/20">
							Внимание: в плане назначены взаимоисключающие манипуляции. Врач вправе утвердить план под личную клиническую ответственность.
						</div>
					</div>
				</div>
			)}

			<label className="flex items-start gap-2.5 pt-1 text-xs text-[var(--ink)] cursor-pointer select-none">
				<input
					type="checkbox"
					checked={termsAccepted}
					onChange={(e) => setTermsAccepted(e.target.checked)}
					className="mt-0.5 w-4 h-4 rounded text-[var(--teal,var(--brand-primary))] border-[var(--border)] focus:ring-[var(--teal)] cursor-pointer"
				/>
				<span>Подтверждаю правильность выбранного плана и даю согласие на начало лечения.</span>
			</label>

			{errorText && (
				<div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-medium">
					<AlertCircle size={14} className="shrink-0" />
					<span>{errorText}</span>
				</div>
			)}
		</>
	);
};
