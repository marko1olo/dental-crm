import React from "react";
import {
	EmkControlBoardView,
	useEmkControlBoard,
	type EmkControlBoardProps,
} from "./emkControlBoard/index";

export type { EmkControlBoardProps };

/**
 * EmkControlBoard — Master Coordinator & Canonical Facade (Layer 5).
 *
 * Preserves 100% backward compatibility for all CRM routes and test suites.
 * Guaranteed Doctor Autonomy (Mandate 8e):
 * - Revision button is guarded by disabled={isSubmitting} without blocking doctors.
 * - Soft-guided verification: Укажите причину отправки на доработку.
 */
export function EmkControlBoard({ dashboard }: EmkControlBoardProps) {
	const board = useEmkControlBoard();
	return <EmkControlBoardView board={board} />;
}

// Re-export modular domain items for seamless downstream consumption:
export * from "./emkControlBoard/index";
