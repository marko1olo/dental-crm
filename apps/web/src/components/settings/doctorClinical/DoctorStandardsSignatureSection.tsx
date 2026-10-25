import { Check, ShieldCheck } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast";
import { useDoctorPreferencesStore } from "../../../store/doctorPreferencesStore";

const SIGNATURE_MODES = [
	{
		mode: "simple" as const,
		title: "Простая ЭП (ПЭП)",
		desc: "По СНИЛС и паролю врача. Стандарт для внутреннего документооборота.",
	},
	{
		mode: "ukep" as const,
		title: "УКЭП (КриптоПро)",
		desc: "Усиленная квалифицированная ЭЦП (ГОСТ) для выгрузки в ЕГИСЗ РЭМД.",
	},
	{
		mode: "facsimile" as const,
		title: "Факсимиле + штамп",
		desc: "Графический оттиск личной подписи врача для распечатки медицинской карты.",
	},
] as const;

export function DoctorStandardsSignatureSection() {
	const preferences = useDoctorPreferencesStore((s) => s.preferences);
	const updatePreferences = useDoctorPreferencesStore((s) => s.updatePreferences);

	return (
		<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4" data-testid="doctor-standards-signature-section">
			<div className="p-3.5 rounded-xl bg-[var(--paper-card)] border border-[var(--line)] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal)] text-[var(--on-teal)] flex items-center justify-center shrink-0">
						<ShieldCheck size={18} />
					</div>
					<div>
						<h4 className="m-0 text-sm font-bold text-[var(--ink)]">
							Врачебная автономия (Законодательство РФ)
						</h4>
						<p className="m-0 text-xs text-[var(--muted)]">
							Выбор лечебных протоколов, анестетиков и материалов относится к компетенции врача.
						</p>
					</div>
				</div>
				<span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--teal-soft)] text-[var(--teal-dark)] border border-[var(--line)] shrink-0">
					Защищено законом РФ
				</span>
			</div>

			<div className="space-y-2">
				<label className="text-xs font-bold text-[var(--ink)] block">
					Режим электронной подписи медицинской карты:
				</label>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
					{SIGNATURE_MODES.map((item) => {
						const isCurrent = (preferences.digitalSignatureMode || "simple") === item.mode;
						return (
							<button
								key={item.mode}
								type="button"
								onClick={() => {
									updatePreferences({ digitalSignatureMode: item.mode });
									showToast(`Режим подписи изменён: ${item.title}`, "success");
								}}
								className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
									isCurrent
										? "bg-[var(--paper-card)] border-[var(--teal)] shadow-xs"
										: "bg-[var(--paper-card)] border-[var(--line)] hover:border-[var(--line-strong)]"
								}`}
								data-testid={`signature-mode-${item.mode}`}
							>
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold text-[var(--ink)]">{item.title}</span>
									{isCurrent && <Check size={14} className="text-[var(--teal)] stroke-[3]" />}
								</div>
								<p className="text-[11px] text-[var(--muted)] m-0 leading-normal">{item.desc}</p>
							</button>
						);
					})}
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--line)]">
				<div>
					<label className="text-xs font-bold text-[var(--ink)] block mb-1">
						Должность врача в колонтитуле подписи:
					</label>
					<input
						type="text"
						value={preferences.signatureTitle || "Врач-стоматолог"}
						onChange={(e) => updatePreferences({ signatureTitle: e.target.value })}
						placeholder="Врач-стоматолог-терапевт"
						className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
						data-testid="input-doctor-signature-title"
					/>
				</div>
				<div className="flex items-center">
					<label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[var(--ink)] font-semibold mt-4">
						<input
							type="checkbox"
							checked={preferences.autoStampEmkOnClose !== false}
							onChange={(e) => updatePreferences({ autoStampEmkOnClose: e.target.checked })}
							className="w-4 h-4 rounded border-[var(--line)] text-[var(--teal)] focus:ring-[var(--teal)]"
							data-testid="checkbox-autostamp-emk"
						/>
						<span>Автоматически подписывать дневник при закрытии визита</span>
					</label>
				</div>
			</div>
		</div>
	);
}
