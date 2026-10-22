import React from "react";
import { Upload } from "lucide-react";
import type { OrthodonticAngleId } from "@dental/shared";

interface OrthoSideBySideViewProps {
	selectedAngleId: OrthodonticAngleId;
	beforeImageUrl: string | null;
	currentImageUrl: string | null;
	onUploadAngle: (angleId: OrthodonticAngleId) => void;
}

export const OrthoSideBySideView: React.FC<OrthoSideBySideViewProps> = ({
	selectedAngleId,
	beforeImageUrl,
	currentImageUrl,
	onUploadAngle,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[280px]">
			{/* Before */}
			<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col items-center justify-between gap-2 text-center">
				<div className="w-full flex items-center justify-between">
					<span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
						ДО ЛЕЧЕНИЯ (ИСХОДНОЕ)
					</span>
					<span className="text-[11px] text-[var(--muted)]">Этап 1: Старт</span>
				</div>
				<div className="w-full h-52 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] overflow-hidden flex items-center justify-center relative">
					{beforeImageUrl ? (
						<img src={beforeImageUrl} alt="До лечения" className="w-full h-full object-cover" />
					) : (
						<div className="flex flex-col items-center gap-2 p-4 text-[var(--muted)]">
							<Upload size={24} />
							<span className="text-xs">Снимок «До» отсутствует</span>
							<button
								type="button"
								onClick={() => onUploadAngle(selectedAngleId)}
								className="secondary-button text-xs !rounded-lg px-2.5 py-1"
							>
								Загрузить фото До
							</button>
						</div>
					)}
				</div>
				<span className="text-xs text-[var(--muted)]">
					Исходное положение зубных рядов и профиля
				</span>
			</div>

			{/* After / Current */}
			<div className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col items-center justify-between gap-2 text-center">
				<div className="w-full flex items-center justify-between">
					<span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
						ТЕКУЩИЙ ЭТАП / ПОСЛЕ
					</span>
					<span className="text-[11px] text-[var(--muted)]">Активный результат</span>
				</div>
				<div className="w-full h-52 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] overflow-hidden flex items-center justify-center relative">
					{currentImageUrl ? (
						<img src={currentImageUrl} alt="Текущий этап" className="w-full h-full object-cover" />
					) : (
						<div className="flex flex-col items-center gap-2 p-4 text-[var(--muted)]">
							<Upload size={24} />
							<span className="text-xs">Снимок текущего визита не загружен</span>
							<button
								type="button"
								onClick={() => onUploadAngle(selectedAngleId)}
								className="primary-button text-xs !rounded-lg px-2.5 py-1"
							>
								Загрузить фото После
							</button>
						</div>
					)}
				</div>
				<span className="text-xs text-[var(--muted)]">
					Результат нивелирования, выравнивания и коррекции прикуса
				</span>
			</div>
		</div>
	);
};
