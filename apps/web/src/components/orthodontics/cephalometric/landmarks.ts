/**
 * DENTE CRM — Cephalometric Anatomical Landmarks & Clinical Presets (Layer 1)
 * Standard lateral cephalometric landmark registry and skeletal malocclusion presets.
 */

import type { LandmarkDefinition, LandmarkMap } from "./types";

export const CEPHALOMETRIC_LANDMARKS: LandmarkDefinition[] = [
	{
		key: "S",
		code: "S",
		nameRu: "Sella (Седло)",
		latinName: "Sella turcica",
		anatomicalDescription: "Турецкое седло (центр гипофизарной ямки)",
		category: "cranial",
		color: "#38bdf8", // PACS Sky Blue
	},
	{
		key: "N",
		code: "N",
		nameRu: "Nasion (Назион)",
		latinName: "Nasion",
		anatomicalDescription: "Лобно-носовой шов (передняя точка сочленения)",
		category: "cranial",
		color: "#38bdf8",
	},
	{
		key: "Or",
		code: "Or",
		nameRu: "Orbitale (Орбитале)",
		latinName: "Orbitale",
		anatomicalDescription: "Орбитале (нижний край глазницы, ориентир FH)",
		category: "cranial",
		color: "#38bdf8",
	},
	{
		key: "Po",
		code: "Po",
		nameRu: "Porion (Порион)",
		latinName: "Porion",
		anatomicalDescription: "Порион (верхний край слухового прохода, ориентир FH)",
		category: "cranial",
		color: "#38bdf8",
	},
	{
		key: "ANS",
		code: "ANS",
		nameRu: "ANS (Передняя носовая ость)",
		latinName: "Spina nasalis anterior",
		anatomicalDescription: "Передняя носовая ость (вершина костного выступа)",
		category: "maxillary",
		color: "#38bdf8",
	},
	{
		key: "PNS",
		code: "PNS",
		nameRu: "PNS (Задняя носовая ость)",
		latinName: "Spina nasalis posterior",
		anatomicalDescription: "Задняя носовая ость (дистальный край твердого нёба)",
		category: "maxillary",
		color: "#38bdf8",
	},
	{
		key: "A",
		code: "A",
		nameRu: "Точка A (Субспинале)",
		latinName: "Subspinale",
		anatomicalDescription: "Точка А (наибольшая вогнутость апикального базиса ВЧ)",
		category: "maxillary",
		color: "#38bdf8",
	},
	{
		key: "B",
		code: "B",
		nameRu: "Точка B (Супраментале)",
		latinName: "Supramentale",
		anatomicalDescription: "Точка В (наибольшая вогнутость апикального базиса НЧ)",
		category: "mandibular",
		color: "#38bdf8",
	},
	{
		key: "Pog",
		code: "Pog",
		nameRu: "Pogonion (Погонион)",
		latinName: "Pogonion",
		anatomicalDescription: "Погонион (наиболее передняя точка подбородка)",
		category: "mandibular",
		color: "#38bdf8",
	},
	{
		key: "Gn",
		code: "Gn",
		nameRu: "Gnathion (Гнатион)",
		latinName: "Gnathion",
		anatomicalDescription: "Гнатион (передне-нижняя точка контура симфиза)",
		category: "mandibular",
		color: "#38bdf8",
	},
	{
		key: "Me",
		code: "Me",
		nameRu: "Menton (Ментон)",
		latinName: "Menton",
		anatomicalDescription: "Ментон (самая нижняя точка подбородочного симфиза)",
		category: "mandibular",
		color: "#38bdf8",
	},
	{
		key: "Go",
		code: "Go",
		nameRu: "Gonion (Гонион)",
		latinName: "Gonion",
		anatomicalDescription: "Гонион (вершина угла нижней челюсти)",
		category: "mandibular",
		color: "#38bdf8",
	},
	{
		key: "U1t",
		code: "U1-tip",
		nameRu: "U1 Tip (Край верхнего резца)",
		latinName: "Incisor superior incisal",
		anatomicalDescription: "Режущий край центрального резца верхней челюсти",
		category: "dental",
		color: "#22c55e", // High-contrast Dolphin Emerald
	},
	{
		key: "U1a",
		code: "U1-apex",
		nameRu: "U1 Apex (Корень верхнего резца)",
		latinName: "Incisor superior apical",
		anatomicalDescription: "Верхушка корня центрального резца верхней челюсти",
		category: "dental",
		color: "#22c55e",
	},
	{
		key: "L1t",
		code: "L1-tip",
		nameRu: "L1 Tip (Край нижнего резца)",
		latinName: "Incisor inferior incisal",
		anatomicalDescription: "Режущий край центрального резца нижней челюсти",
		category: "dental",
		color: "#22c55e",
	},
	{
		key: "L1a",
		code: "L1-apex",
		nameRu: "L1 Apex (Корень нижнего резца)",
		latinName: "Incisor inferior apical",
		anatomicalDescription: "Верхушка корня центрального резца нижней челюсти",
		category: "dental",
		color: "#22c55e",
	},
];

// ─── Sample Cephalometric Presets (Clinically Accurate Lateral Ceph) ───────────

export const DEFAULT_CEPH_LANDMARKS_PRESET: LandmarkMap = {
	S: { x: 280, y: 190 }, // Sella
	N: { x: 440, y: 155 }, // Nasion
	Or: { x: 415, y: 230 }, // Orbitale
	Po: { x: 245, y: 245 }, // Porion
	ANS: { x: 475, y: 310 }, // Anterior Nasal Spine
	PNS: { x: 305, y: 325 }, // Posterior Nasal Spine
	A: { x: 462, y: 342 }, // Point A
	B: { x: 446, y: 440 }, // Point B
	Pog: { x: 452, y: 490 }, // Pogonion
	Gn: { x: 442, y: 520 }, // Gnathion
	Me: { x: 420, y: 540 }, // Menton
	Go: { x: 250, y: 435 }, // Gonion
	U1t: { x: 494, y: 395 }, // Upper Incisor Tip (4.0mm to NA)
	U1a: { x: 456, y: 325 }, // Upper Incisor Apex (22° to NA, 106° to SN)
	L1t: { x: 471, y: 400 }, // Lower Incisor Tip (3.9mm to NB)
	L1a: { x: 428, y: 495 }, // Lower Incisor Apex (25° to NB, 88° to MP)
};

export const CLASS_I_NORMAL_LANDMARKS_PRESET: LandmarkMap = {
	...DEFAULT_CEPH_LANDMARKS_PRESET,
	B: { x: 460, y: 440 },
	Pog: { x: 466, y: 490 },
	Gn: { x: 456, y: 520 },
	Me: { x: 435, y: 540 },
};

export const CLASS_II_DISTAL_LANDMARKS_PRESET: LandmarkMap = {
	...DEFAULT_CEPH_LANDMARKS_PRESET,
	B: { x: 440, y: 440 },
	Pog: { x: 446, y: 490 },
	Gn: { x: 436, y: 520 },
	Me: { x: 415, y: 540 },
};

export const CLASS_III_MESIAL_LANDMARKS_PRESET: LandmarkMap = {
	...DEFAULT_CEPH_LANDMARKS_PRESET,
	B: { x: 485, y: 440 },
	Pog: { x: 491, y: 490 },
	Gn: { x: 480, y: 520 },
	Me: { x: 460, y: 540 },
};
