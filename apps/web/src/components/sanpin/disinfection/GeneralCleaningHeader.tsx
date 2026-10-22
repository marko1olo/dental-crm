import React from "react";
import { Droplets, Sparkles, X } from "lucide-react";

interface GeneralCleaningHeaderProps {
	onClose: () => void;
	onApplyNormPreset: () => void;
}

export function GeneralCleaningHeader({ onClose, onApplyNormPreset }: GeneralCleaningHeaderProps) {
	return (
		<>
			<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-4">
				<div className="flex items-center gap-3">
					<div className="p-2.5 rounded-xl bg-teal-50 text-[var(--teal,#0d9488)] border border-teal-200">
						<Droplets size={24} />
					</div>
					<div>
						<h2 className="text-lg font-extrabold text-[var(--ink,#0f172a)] flex items-center gap-2">
							<span>Генеральная уборка и расчет дезраствора</span>
							<span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold uppercase tracking-wide">
								Стандарт дезинфекции
							</span>
						</h2>
						<div className="text-xs text-[var(--muted,#64748b)]">
							Нормативный расчет концентрации, расхода средства и график каждые 7 дней
						</div>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="p-2 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors"
					aria-label="Закрыть"
				>
					<X size={20} />
				</button>
			</div>

			<div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200 flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-2 text-xs text-teal-900">
					<Sparkles size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span><strong>Стандартная норма:</strong> Операционная, Аламинол 5% (вирулицидный режим), экспозиция 60 мин, УФ 120 мин.</span>
				</div>
				<button
					type="button"
					onClick={onApplyNormPreset}
					className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[var(--teal,#0d9488)] text-white text-xs font-bold hover:bg-teal-700 transition-colors shadow-sm cursor-pointer"
				>
					Заполнить по норме
				</button>
			</div>
		</>
	);
}
