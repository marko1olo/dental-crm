import React from "react";
import { Camera, Check, CheckCircle2 } from "lucide-react";

export interface PhotoProtocolOptionalityBannerProps {
	readonly isPhotoProtocolCompleted: boolean;
	readonly onOpenPhotoProtocol: () => void;
	readonly onTogglePhotoProtocolCompleted: () => void;
}

export const PhotoProtocolOptionalityBanner: React.FC<PhotoProtocolOptionalityBannerProps> = ({
	isPhotoProtocolCompleted,
	onOpenPhotoProtocol,
	onTogglePhotoProtocolCompleted,
}) => {
	return (
		<div
			data-testid="photo-protocol-optional-badge"
			className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex-wrap gap-2"
		>
			<div className="flex items-center gap-1.5 text-[var(--ink)] font-bold text-[11px]">
				<CheckCircle2 size={14} className="text-[var(--primary)] shrink-0" />
				<span>Клинический фотопротокол опционален</span>
			</div>
			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={onOpenPhotoProtocol}
					data-testid="ortho-open-photo-protocol-btn"
					className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer min-h-[36px] transition-colors"
					title="Открыть фотопротокол ортодонтии (8 ракурсов ABO: анфас, профиль, улыбка, окклюзия)"
				>
					<Camera size={14} className="text-[var(--primary)]" />
					<span>{isPhotoProtocolCompleted ? "Фотопротокол (8/8)" : "Фотопротокол (8 ракурсов ABO)"}</span>
				</button>
				<button
					type="button"
					onClick={onTogglePhotoProtocolCompleted}
					data-testid="ortho-confirm-photos-1click-btn"
					className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer min-h-[36px] transition-colors ${
						isPhotoProtocolCompleted
							? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs"
							: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
					}`}
					title="Подтверждение съемки фотопротокола"
				>
					<Check size={13} />
					<span>{isPhotoProtocolCompleted ? "Снято" : "Подтвердить"}</span>
				</button>
			</div>
		</div>
	);
};
