import {
	AlertOctagon, Box, Calendar, Camera, FlaskConical, Link, MessageSquare, RotateCcw, Trash2,
} from "lucide-react";
import { is3DScanUrl } from "../lab/LabAttachScanModal";
import type { LabOrder } from "./LabOrdersPanel";

interface LabOrderCardMenuProps {
	order: LabOrder;
	setOpenMenuOrderId: (id: string | null | ((prev: string | null) => string | null)) => void;
	onScheduleAppointment: (order: LabOrder) => void;
	onEditOrder: (order: LabOrder) => void;
	onAttachBitePhoto: (order: LabOrder) => void;
	onTechnicianComment: (order: LabOrder) => void;
	onRepeatFitting: (order: LabOrder) => void;
	onReclamation: (order: LabOrder) => void;
	onCopyPortalLink: (token: string) => void;
	onDeleteOrder: (id: string) => void;
	onView3DScan?: ((order: LabOrder) => void) | undefined;
}

export const LabOrderCardMenu: React.FC<LabOrderCardMenuProps> = ({
	order, setOpenMenuOrderId, onScheduleAppointment, onEditOrder, onAttachBitePhoto,
	onTechnicianComment, onRepeatFitting, onReclamation, onCopyPortalLink, onDeleteOrder, onView3DScan,
}) => {
	const close = () => setOpenMenuOrderId(null);

	const actions = [
		{ label: "Запланировать прием", icon: <Calendar className="w-3.5 h-3.5 text-amber-500" />, onClick: () => onScheduleAppointment(order) },
		{ label: "Детали наряда", icon: <FlaskConical className="w-3.5 h-3.5 text-[var(--teal)]" />, onClick: () => onEditOrder(order) },
		{ label: "Прикрепить фото прикуса", icon: <Camera className="w-3.5 h-3.5 text-sky-500" />, onClick: () => onAttachBitePhoto(order) },
		{ label: "Комментарий технику", icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />, onClick: () => onTechnicianComment(order) },
		{ label: "Повторная примерка", icon: <RotateCcw className="w-3.5 h-3.5 text-purple-500" />, onClick: () => onRepeatFitting(order) },
	];

	return (
		<div
			className="absolute right-0 bottom-full mb-1 w-56 p-1.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#cbd5e1)] shadow-xl z-50 flex flex-col gap-1 text-xs text-[var(--ink,#0f172a)] backdrop-blur-md"
			role="menu"
			aria-label="Меню действий наряда"
		>
			{actions.map((act) => (
				<button
					key={act.label}
					type="button"
					onClick={() => { close(); act.onClick(); }}
					className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
					role="menuitem"
				>
					{act.icon}
					<span>{act.label}</span>
				</button>
			))}

			{order.attachedImageUrl && is3DScanUrl(order.attachedImageUrl) && (
				<button
					type="button"
					onClick={() => { close(); onView3DScan?.(order); }}
					className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold transition-colors cursor-pointer"
					role="menuitem"
					data-testid={`lab-order-card-menu-view-scan-btn-${order.id}`}
				>
					<Box className="w-3.5 h-3.5 text-teal-500" />
					<span>Открыть 3D-скан (STL/PLY)</span>
				</button>
			)}

			<button
				type="button"
				onClick={() => { close(); onReclamation(order); }}
				className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
				role="menuitem"
			>
				<AlertOctagon className="w-3.5 h-3.5" />
				<span>Рекламация / брак</span>
			</button>

			{order.secureToken && (
				<button
					type="button"
					onClick={() => { close(); onCopyPortalLink(order.secureToken); }}
					className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
					role="menuitem"
				>
					<Link className="w-3.5 h-3.5 text-sky-500" />
					<span>Ссылка технику</span>
				</button>
			)}

			<div className="h-[1px] bg-[var(--line,#e2e8f0)] my-0.5" />

			<button
				type="button"
				onClick={() => { close(); onDeleteOrder(order.id); }}
				className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer font-semibold"
				role="menuitem"
			>
				<Trash2 className="w-3.5 h-3.5" />
				<span>Удалить наряд</span>
			</button>
		</div>
	);
};
