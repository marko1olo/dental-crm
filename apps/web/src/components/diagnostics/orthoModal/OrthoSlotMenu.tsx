import React from "react";
import { RotateCw, FlipHorizontal, ZoomIn, ZoomOut, Trash2 } from "lucide-react";
import type { OrthodonticAngleDefinition, OrthodonticPhotoSlot } from "@dental/shared";

interface OrthoSlotMenuProps {
	angle: OrthodonticAngleDefinition;
	slot?: OrthodonticPhotoSlot | undefined;
	onRotate: (e: React.MouseEvent) => void;
	onFlipHorizontal: (e: React.MouseEvent) => void;
	onZoomChange: (delta: number, e: React.MouseEvent) => void;
	onDelete: (e: React.MouseEvent) => void;
}

export const OrthoSlotMenu: React.FC<OrthoSlotMenuProps> = ({
	angle,
	slot,
	onRotate,
	onFlipHorizontal,
	onZoomChange,
	onDelete,
}) => {
	return (
		<div
			className="absolute right-0 bottom-full mb-1.5 z-40 w-52 p-1 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5"
			role="menu"
			onClick={(e) => e.stopPropagation()}
		>
			<button
				type="button"
				onClick={onRotate}
				className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:text-[var(--teal,#0d9488)] transition-colors flex items-center gap-2 cursor-pointer"
				role="menuitem"
				title="Повернуть на 90°"
			>
				<RotateCw size={13} className="text-[var(--muted,#64748b)] shrink-0" />
				<span className="flex-1">Повернуть на 90°</span>
				{slot?.rotationDegrees ? (
					<span className="text-[10px] text-[var(--muted,#64748b)] font-mono">
						{slot.rotationDegrees}°
					</span>
				) : null}
			</button>

			<button
				type="button"
				onClick={onFlipHorizontal}
				className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
					slot?.flipHorizontal
						? "bg-[var(--teal-surface,#f0fdfa)] text-[var(--teal,#0d9488)]"
						: "text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:text-[var(--teal,#0d9488)]"
				}`}
				role="menuitem"
				title="Отразить по горизонтали"
			>
				<FlipHorizontal size={13} className="text-[var(--muted,#64748b)] shrink-0" />
				<span className="flex-1">Отразить по горизонтали</span>
				{slot?.flipHorizontal ? (
					<span className="text-[10px] font-bold text-[var(--teal,#0d9488)]">Вкл</span>
				) : null}
			</button>

			<button
				type="button"
				onClick={(e) => onZoomChange(0.2, e)}
				className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:text-[var(--teal,#0d9488)] transition-colors flex items-center gap-2 cursor-pointer"
				role="menuitem"
				title="Увеличить (+20%)"
			>
				<ZoomIn size={13} className="text-[var(--muted,#64748b)] shrink-0" />
				<span className="flex-1">Увеличить (+20%)</span>
				<span className="text-[10px] text-[var(--muted,#64748b)] font-mono">
					{Math.round((slot?.zoom || 1) * 100)}%
				</span>
			</button>

			<button
				type="button"
				onClick={(e) => onZoomChange(-0.2, e)}
				className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-subtle,#f8fafc)] hover:text-[var(--teal,#0d9488)] transition-colors flex items-center gap-2 cursor-pointer"
				role="menuitem"
				title="Уменьшить (-20%)"
			>
				<ZoomOut size={13} className="text-[var(--muted,#64748b)] shrink-0" />
				<span className="flex-1">Уменьшить (-20%)</span>
			</button>

			<div className="my-1 border-t border-[var(--line,#e2e8f0)]" />

			<button
				type="button"
				onClick={onDelete}
				className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-2 cursor-pointer"
				role="menuitem"
				title="Удалить снимок"
				data-testid={`delete-btn-${angle.id}`}
			>
				<Trash2 size={13} className="text-rose-500 shrink-0" />
				<span>Удалить снимок</span>
			</button>
		</div>
	);
};
