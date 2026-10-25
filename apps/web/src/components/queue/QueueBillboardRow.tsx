import React from "react";
import { CheckCircle2, Clock, DoorOpen, User } from "lucide-react";
import type { QueueBillboardItem } from "./queueBillboardTypes";
import "./QueueBillboardRow.css";

export interface QueueBillboardRowProps {
	readonly item: QueueBillboardItem;
}

export const QueueBillboardRow: React.FC<QueueBillboardRowProps> = ({ item }) => {
	const isInvited = item.status === "invited";
	const isInChair = item.status === "in_chair";

	return (
		<article
			className={`queue-ticket-card ${isInvited ? "invited" : "waiting"}`}
			data-testid={`billboard-card-${item.id}`}
		>
			<div className="queue-ticket-main">
				<div className="queue-ticket-cabinet-badge">
					<DoorOpen size={20} />
					<span>{item.cabinetName}</span>
				</div>

				{item.patientInitials && (
					<div className="queue-ticket-patient">
						<span className="text-xs uppercase text-slate-400 dark:text-slate-500 mr-1.5">Пациент:</span>
						<span>{item.patientInitials}</span>
					</div>
				)}

				<div className={`queue-ticket-status-pill ${isInvited ? "invited" : "waiting"}`}>
					{isInvited ? (
						<>
							<CheckCircle2 size={14} />
							<span>Приглашается в кабинет</span>
						</>
					) : isInChair ? (
						<>
							<CheckCircle2 size={14} />
							<span>Идет прием</span>
						</>
					) : (
						<>
							<Clock size={13} />
							<span>Ожидает вызова {item.timeInfo ? `(${item.timeInfo})` : ""}</span>
						</>
					)}
				</div>
			</div>

			<div className="queue-ticket-destination">
				<div className="queue-ticket-doctor flex items-center gap-1.5">
					<User size={15} className="opacity-60" />
					<span>{item.doctorName}</span>
				</div>
				{item.doctorSpecialty && (
					<div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
						{item.doctorSpecialty}
					</div>
				)}
			</div>
		</article>
	);
};
