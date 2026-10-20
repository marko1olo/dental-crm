/**
 * Candidate 02: Netter Anatomical Atlas (Классический атлас Неттера)
 * Semi-3D biological vector illustration inspired by Frank H. Netter, MD.
 * Pure vector craft, organic dentin warmth, Sharpey's fibers, and SLA titanium biomechanics.
 * Mandate 8b: Strictly <= 120 lines (paths extracted to Candidate02_Paths.ts).
 */

import React from "react";
import type { BenchmarkToothProps } from "./tournamentTypes";
import {
	NetterIncisorSvg,
	NetterPremolarSvg,
	NetterMolarSvg,
	NetterImplantSvg,
} from "./Candidate02_Paths";

export const Candidate02_Incisor: React.FC<BenchmarkToothProps> = ({
	theme = "light",
	scale = 1,
	className = "",
}) => (
	<div
		className={`candidate-02-netter candidate-02-incisor inline-flex items-center justify-center select-none ${className}`}
		style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
		data-testid="candidate-02-incisor"
		title="Резец 11: анатомическая гравюра Неттера, теплый дентин, режущий край"
	>
		<NetterIncisorSvg isDark={theme === "dark"} />
	</div>
);

export const Candidate02_Premolar: React.FC<BenchmarkToothProps> = ({
	theme = "light",
	scale = 1,
	className = "",
}) => (
	<div
		className={`candidate-02-netter candidate-02-premolar inline-flex items-center justify-center select-none ${className}`}
		style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
		data-testid="candidate-02-premolar"
		title="Премоляр 14: объемная коронка, фиссуры, бифуркация корней, эндо-каналы"
	>
		<NetterPremolarSvg isDark={theme === "dark"} />
	</div>
);

export const Candidate02_Molar: React.FC<BenchmarkToothProps> = ({
	theme = "light",
	scale = 1,
	className = "",
}) => (
	<div
		className={`candidate-02-netter candidate-02-molar inline-flex items-center justify-center select-none ${className}`}
		style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
		data-testid="candidate-02-molar"
		title="Моляр 46: анатомический моляр, 3 корня, каналы, периапикальная гранулема"
	>
		<NetterMolarSvg isDark={theme === "dark"} />
	</div>
);

export const Candidate02_Implant: React.FC<BenchmarkToothProps> = ({
	theme = "light",
	scale = 1,
	className = "",
}) => (
	<div
		className={`candidate-02-netter candidate-02-implant inline-flex items-center justify-center select-none ${className}`}
		style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
		data-testid="candidate-02-implant"
		title="Имплант: винтовой SLA-имплант с анатомическим формирователем десны"
	>
		<NetterImplantSvg isDark={theme === "dark"} />
	</div>
);
