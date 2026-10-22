export type TabKind = "logs" | "network" | "offline" | "system";

export interface DiagnosticDrawerProps {
	readonly organizationId?: string | null;
	readonly userId?: string | null;
	readonly userRole?: string | null;
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly showTriggerButton?: boolean;
}
