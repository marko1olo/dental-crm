import React, { useEffect, useMemo, useState } from "react";
import { Activity, Clock, DoorOpen, Users, Volume2 } from "lucide-react";
import { AuthArtBackground } from "../auth/AuthArtBackground";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import { QueueBillboardHeader } from "./QueueBillboardHeader";
import { QueueBillboardRow } from "./QueueBillboardRow";
import {
	DEFAULT_BILLBOARD_QUEUE_ITEMS,
	mapShiftAppointmentsToBillboard,
	type QueueBillboardItem,
	type QueueBillboardViewProps,
} from "./queueBillboardTypes";
import "./QueueBillboardView.css";

export type { QueueBillboardItem, QueueBillboardViewProps };
export { DEFAULT_BILLBOARD_QUEUE_ITEMS, mapShiftAppointmentsToBillboard };

export const QueueBillboardView: React.FC<QueueBillboardViewProps> = ({
	clinicName = "Стоматологическая клиника ДЕНТЕ",
	clinicSubtitle = "Электронное табло вызова пациентов",
	items: initialItems,
	appointments,
	className = "",
	overlayAlpha = 0.5,
	announcementText = "Пожалуйста, сохраняйте тишину. Приглашение в кабинет появится на табло.",
	onClose,
}) => {
	const isDemo = isDemoShowcaseMode();
	const [currentTime, setCurrentTime] = useState<string>("00:00:00");
	const [currentDate, setCurrentDate] = useState<string>("");

	useEffect(() => {
		const updateTime = () => {
			const now = new Date();
			setCurrentTime(now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
			setCurrentDate(now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
		};
		updateTime();
		const timer = setInterval(updateTime, 1000);
		return () => clearInterval(timer);
	}, []);

	const effectiveItems = useMemo(() => {
		if (initialItems !== undefined) return initialItems;
		if (appointments && appointments.length > 0) return mapShiftAppointmentsToBillboard(appointments);
		if (isDemo) return DEFAULT_BILLBOARD_QUEUE_ITEMS;
		return [];
	}, [initialItems, appointments, isDemo]);

	const invitedItems = useMemo(() => effectiveItems.filter((i) => i.status === "invited" || i.status === "in_chair"), [effectiveItems]);
	const waitingItems = useMemo(() => effectiveItems.filter((i) => i.status === "waiting"), [effectiveItems]);

	return (
		<main className={`queue-billboard-container ${className}`.trim()} data-testid="queue-billboard-view" role="region" aria-label="Табло электронной очереди">
			<AuthArtBackground settings={{ pack: "nature", dynamicByTimeOfDay: true }} overlayAlpha={overlayAlpha} />
			<QueueBillboardHeader clinicName={clinicName} clinicSubtitle={clinicSubtitle} currentTime={currentTime} currentDate={currentDate} onClose={onClose} />

			<div className="queue-billboard-grid" data-testid="queue-billboard-grid">
				<section className="queue-billboard-column" aria-label="Приглашаются в кабинет">
					<div className="queue-billboard-col-header invited">
						<div className="flex items-center gap-2"><DoorOpen size={20} /><span>Приглашаются в кабинет</span></div>
						<span>{invitedItems.length}</span>
					</div>
					<div className="queue-billboard-items-list" data-testid="billboard-invited-list">
						{invitedItems.length === 0 ? (
							<div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
								<Clock size={24} className="opacity-50" /><span>Кабинеты готовятся к приёму</span>
							</div>
						) : (
							invitedItems.map((item) => <QueueBillboardRow key={item.id} item={item} />)
						)}
					</div>
				</section>

				<section className="queue-billboard-column" aria-label="Ожидают в холле">
					<div className="queue-billboard-col-header waiting">
						<div className="flex items-center gap-2"><Users size={20} /><span>Ожидают вызова</span></div>
						<span>{waitingItems.length}</span>
					</div>
					<div className="queue-billboard-items-list" data-testid="billboard-waiting-list">
						{waitingItems.length === 0 ? (
							<div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
								<Users size={24} className="opacity-50" /><span>Очередь приёма пуста. Ожидайте вызова врача на приём</span>
							</div>
						) : (
							waitingItems.map((item) => <QueueBillboardRow key={item.id} item={item} />)
						)}
					</div>
				</section>
			</div>

			<footer className="queue-billboard-ticker" data-testid="queue-billboard-ticker">
				<div className="queue-billboard-ticker-left">
					<span className="queue-billboard-ticker-dot" aria-hidden="true" />
					<Volume2 size={18} />
					<span>{announcementText}</span>
				</div>
				<div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
					<Activity size={14} /><span>DENTE Billboard</span>
				</div>
			</footer>
		</main>
	);
};

export default QueueBillboardView;
