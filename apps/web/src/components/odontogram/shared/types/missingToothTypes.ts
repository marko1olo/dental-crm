import type { ToothBounds } from "./sharedGeometryTypes";

export interface MissingToothCrossProps {
	readonly crossLine1?: string | undefined;
	readonly crossLine2?: string | undefined;
	readonly ghostRootPath?: string | undefined;
	readonly bounds?: ToothBounds | undefined;
	readonly strokeWidth?: number | undefined;
	readonly color?: string | undefined;
	readonly isDark?: boolean | undefined;
	readonly className?: string | undefined;
}
