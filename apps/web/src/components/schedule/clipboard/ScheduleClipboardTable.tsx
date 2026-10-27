import type React from "react";
import type { ClipboardItem } from "./clipboardTypes";
import { formatCopiedAt, formatDuration } from "./clipboardUtils";

interface ScheduleClipboardTableProps {
	items: ClipboardItem[];
	busyId: string | null;
	onPasteItem: (item: ClipboardItem) => void;
	onClearItem: (item: ClipboardItem) => void;
}

export const ScheduleClipboardTable: React.FC<ScheduleClipboardTableProps> = ({
	items,
	busyId,
	onPasteItem,
	onClearItem,
}) => {
	return (
		<div className="ops-table-wrap">
			<table className="ops-table">
				<caption className="sr-only">Скопированные приёмы для вставки</caption>
				<thead>
					<tr>
						<th scope="col">Пациент</th>
						<th scope="col">Врач</th>
						<th scope="col">Повод</th>
						<th scope="col">Длительность</th>
						<th scope="col">Скопировано</th>
						<th scope="col">Действия</th>
					</tr>
				</thead>
				<tbody>
					{items.map((item) => (
						<tr key={item.id} data-testid={`clipboard-item-${item.id}`}>
							<td className="ops-strong" data-label="Пациент">
								{item.patientName}
							</td>
							<td data-label="Врач">{item.doctorName}</td>
							<td data-label="Повод">{item.serviceTitle}</td>
							<td data-label="Длительность">
								{formatDuration(item.durationMinutes)}
							</td>
							<td data-label="Скопировано">
								<span className="ops-note">{formatCopiedAt(item.copiedAt)}</span>
							</td>
							<td data-label="Действия">
								<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
									<button
										className="primary-button pointer-coarse:min-h-[44px]"
										type="button"
										aria-busy={busyId === item.id || undefined}
										onClick={() => onPasteItem(item)}
										aria-label={`Вставить приём: ${item.patientName}`}
									>
										{busyId === item.id ? "…" : "Вставить"}
									</button>
									<button
										className="secondary-button pointer-coarse:min-h-[44px]"
										type="button"
										aria-busy={busyId === item.id || undefined}
										onClick={() => onClearItem(item)}
										aria-label={`Убрать из буфера: ${item.patientName}`}
									>
										Убрать
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
