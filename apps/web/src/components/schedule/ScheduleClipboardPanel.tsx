import React from "react";
import { useState } from "react";
import type { ScheduleClipboardPanelProps } from "./clipboard/clipboardTypes";
import { ScheduleClipboardHeading } from "./clipboard/ScheduleClipboardHeading";
import { ScheduleClipboardNotices } from "./clipboard/ScheduleClipboardNotices";
import { ScheduleClipboardTable } from "./clipboard/ScheduleClipboardTable";
import { useScheduleClipboard } from "./clipboard/useScheduleClipboard";

export const ScheduleClipboardPanel: React.FC<ScheduleClipboardPanelProps> = ({
	onPasted,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: preserved prop
	reloadToken = 0,
}) => {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const {
		items,
		error,
		loading,
		pasteStartsAt,
		setPasteStartsAt,
		busyId,
		load,
		clearItem,
		pasteItem,
	} = useScheduleClipboard(onPasted);

	return (
		<section
			className="panel ops-panel"
			data-testid="schedule-clipboard-panel"
			style={{
				position: "fixed",
				bottom: "min(24px, 16px)",
				right: "min(24px, 16px)",
				width: "min(380px, calc(100% - 32px))",
				maxHeight: isCollapsed ? "60px" : "min(500px, calc(100dvh - 48px))",
				overflowY: isCollapsed ? "hidden" : "auto",
				zIndex: 1000,
				boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
				transition: "max-height 0.3s ease",
				border: "1px solid var(--line-strong)",
				backgroundColor: "var(--surface)",
				borderRadius: "12px",
			}}
		>
			<ScheduleClipboardHeading
				isCollapsed={isCollapsed}
				onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
				itemCount={items.length}
			/>

			<ScheduleClipboardNotices
				error={error}
				loading={loading}
				itemCount={items.length}
				onRetry={() => void load()}
			/>

			{!error && items.length > 0 ? (
				<>
					<label
						className="ops-field"
						style={{ display: "block", marginBottom: "12px" }}
					>
						<span className="ops-note">Время вставки для выбранной строки</span>
						<input
							type="datetime-local"
							value={pasteStartsAt}
							onChange={(e) => setPasteStartsAt(e.target.value)}
							data-testid="schedule-clipboard-paste-starts-at"
							style={{
								display: "block",
								width: "100%",
								maxWidth: "280px",
								marginTop: "4px",
							}}
						/>
					</label>

					<ScheduleClipboardTable
						items={items}
						busyId={busyId}
						onPasteItem={(item) => void pasteItem(item)}
						onClearItem={(item) => void clearItem(item)}
					/>

					<p className="ops-hint">
						Вставка создаёт новый приём с тем же пациентом, врачом, креслом и
						поводом. Исходная запись не удаляется. Пересечения по времени
						проверяются так же, как при обычной записи.
					</p>
				</>
			) : null}
		</section>
	);
};

export default ScheduleClipboardPanel;
