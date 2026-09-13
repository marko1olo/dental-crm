import React from "react";
import { VisitView } from "../../VisitView";

export interface PediatricPerspectiveViewProps {
	readonly onBackToSchedule?: () => void;
}

/**
 * PediatricPerspectiveView — чистый фасад детского приема (молочный прикус).
 * Делегирует рендер каноническому VisitView (Мандат 8s: Закон Единого Неделимого Авторитета),
 * где детская зубная формула (51–85) активируется автоматически через store.
 */
export function PediatricPerspectiveView({
	onBackToSchedule,
}: PediatricPerspectiveViewProps = {}) {
	return <VisitView />;
}
