/**
 * DENTE Odontogram Tournament Types
 * Common contracts for 10 subagent competitors.
 */

import type React from "react";

export type TournamentBenchmarkType =
	| "incisor" // 1. Центральный резец (11/21) — эталон чистой эмали
	| "premolar" // 2. Премоляр с каналами (14/24) — эталон эндодонтии
	| "molar" // 3. Моляр с каналами и гранулемой (16/46) — эталон тяжелой патологии
	| "implant"; // 4. Имплант с формирователем десны — эталон биомеханики

export interface BenchmarkToothProps {
	readonly theme?: "light" | "dark";
	readonly scale?: number;
	readonly className?: string;
}

export interface CompetitorStyleDefinition {
	readonly id: number;
	readonly slug: string;
	readonly nameRu: string;
	readonly subtitleRu: string;
	readonly aestheticConcept: string;
	readonly authorAgent: string;
	readonly IncisorComponent: React.ComponentType<BenchmarkToothProps>;
	readonly PremolarComponent: React.ComponentType<BenchmarkToothProps>;
	readonly MolarComponent: React.ComponentType<BenchmarkToothProps>;
	readonly ImplantComponent: React.ComponentType<BenchmarkToothProps>;
}
