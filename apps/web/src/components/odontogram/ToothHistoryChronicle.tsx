import {
	Activity,
	Calendar,
	ChevronRight,
	FileText,
	History,
	X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";

interface ToothEvent {
	type: "diary" | "plan" | "state_change";
	date: string;
	description: string;
	authorId: string;
}

interface Props {
	patientId: string;
	toothNumber: number;
	onClose: () => void;
}

export function ToothHistoryChronicle({
	patientId,
	toothNumber,
	onClose,
}: Props) {
	const [events, setEvents] = useState<ToothEvent[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;
		const fetchHistory = async () => {
			setLoading(true);
			try {
				const res = await fetch(
					`/api/odontogram/tooth-history/${patientId}/${toothNumber}`,
					{
						headers: denteAdminSecretRequestHeaders(),
					},
				);
				if (res.ok) {
					const data = await res.json();
					if (active) setEvents(data.events || []);
				}
			} catch (e) {
				console.error(e);
			} finally {
				if (active) setLoading(false);
			}
		};
		fetchHistory();
		return () => {
			active = false;
		};
	}, [patientId, toothNumber]);

	return (
		<div className="history-panel">
			<div className="history-header">
				<div className="history-title">
					<History style={{ width: 20, height: 20, color: "#6366f1" }} />
					<h3>История зуба {toothNumber}</h3>
				</div>
				<button onClick={onClose} className="history-close-btn">
					<X className="w-5 h-5" />
				</button>
			</div>

			<div className="history-body">
				{loading ? (
					<div className="history-loading">
						<div className="spinner" />
					</div>
				) : events.length === 0 ? (
					<div className="history-empty">История пуста</div>
				) : (
					<div className="history-timeline">
						{events.map((evt, idx) => (
							<div key={idx} className="timeline-item">
								<div className="timeline-icon">
									{evt.type === "diary" && (
										<FileText style={{ width: 16, height: 16, color: "#10b981" }} />
									)}
									{evt.type === "plan" && (
										<Calendar style={{ width: 16, height: 16, color: "#3b82f6" }} />
									)}
									{evt.type === "state_change" && (
										<Activity style={{ width: 16, height: 16, color: "#f59e0b" }} />
									)}
								</div>
								<div className="timeline-content">
									<div className="timeline-date">
										{new Date(evt.date).toLocaleDateString()}
									</div>
									<div className="timeline-desc">{evt.description}</div>
									{evt.authorId && (
										<div className="timeline-author">
											Автор: {evt.authorId.substring(0, 8)}...
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
