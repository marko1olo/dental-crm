import { Scan, X } from "lucide-react";
import React from "react";

interface DoctorCbctModalHeaderProps {
	titleId: string;
	isCanonical: boolean;
	onClose: () => void;
}

export function DoctorCbctModalHeader({
	titleId,
	isCanonical,
	onClose,
}: DoctorCbctModalHeaderProps) {
	return (
		<div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0f172a]/90">
			<div className="flex items-center gap-2.5">
				<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center border border-teal-500/30">
					<Scan size={18} />
				</div>
				<div>
					<h3 id={titleId} className="m-0 text-sm sm:text-base font-bold text-white flex items-center gap-2">
						<span>Интерактивный тюнер КЛКТ</span>
						{isCanonical ? (
							<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
								Канон (4025/525)
							</span>
						) : (
							<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
								Персональный профиль
							</span>
						)}
					</h3>
					<p className="m-0 text-[11px] text-slate-400">
						Калибровка резкости и контраста срезов для всех КТ-исследований клиники
					</p>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
				aria-label="Закрыть окно тюнера"
			>
				<X size={18} />
			</button>
		</div>
	);
}
