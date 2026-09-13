import React from "react";
import { VisitView } from "../../VisitView";

/**
 * ChairsiderPerspectiveView — чистый фасад стерильного режима у кресла.
 * Делегирует рендер каноническому VisitView (Мандат 8s: Закон Единого Неделимого Авторитета).
 */
export function ChairsiderPerspectiveView() {
	return <VisitView />;
}
