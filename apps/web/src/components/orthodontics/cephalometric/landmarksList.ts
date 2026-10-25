import type { LandmarkDefinition } from "./types";

export const CEPHALOMETRIC_LANDMARKS: LandmarkDefinition[] = [
	{ key: "S", code: "S", nameRu: "Sella (Седло)", latinName: "Sella turcica", anatomicalDescription: "Турецкое седло", category: "cranial", color: "#38bdf8" },
	{ key: "N", code: "N", nameRu: "Nasion (Назион)", latinName: "Nasion", anatomicalDescription: "Лобно-носовой шов", category: "cranial", color: "#38bdf8" },
	{ key: "Or", code: "Or", nameRu: "Orbitale (Орбитале)", latinName: "Orbitale", anatomicalDescription: "Орбитале (нижний край глазницы, FH)", category: "cranial", color: "#38bdf8" },
	{ key: "Po", code: "Po", nameRu: "Porion (Порион)", latinName: "Porion", anatomicalDescription: "Порион (верхний край слухового прохода, FH)", category: "cranial", color: "#38bdf8" },
	{ key: "ANS", code: "ANS", nameRu: "ANS (Передняя носовая ость)", latinName: "Spina nasalis anterior", anatomicalDescription: "Передняя носовая ость", category: "maxillary", color: "#38bdf8" },
	{ key: "PNS", code: "PNS", nameRu: "PNS (Задняя носовая ость)", latinName: "Spina nasalis posterior", anatomicalDescription: "Задняя носовая ость (край твердого нёба)", category: "maxillary", color: "#38bdf8" },
	{ key: "A", code: "A", nameRu: "Точка A (Субспинале)", latinName: "Subspinale", anatomicalDescription: "Точка А (вогнутость базиса ВЧ)", category: "maxillary", color: "#38bdf8" },
	{ key: "B", code: "B", nameRu: "Точка B (Супраментале)", latinName: "Supramentale", anatomicalDescription: "Точка В (вогнутость базиса НЧ)", category: "mandibular", color: "#38bdf8" },
	{ key: "Pog", code: "Pog", nameRu: "Pogonion (Погонион)", latinName: "Pogonion", anatomicalDescription: "Погонион (передняя точка подбородка)", category: "mandibular", color: "#38bdf8" },
	{ key: "Gn", code: "Gn", nameRu: "Gnathion (Гнатион)", latinName: "Gnathion", anatomicalDescription: "Гнатион (передне-нижняя точка симфиза)", category: "mandibular", color: "#38bdf8" },
	{ key: "Me", code: "Me", nameRu: "Menton (Ментон)", latinName: "Menton", anatomicalDescription: "Ментон (нижняя точка подбородочного симфиза)", category: "mandibular", color: "#38bdf8" },
	{ key: "Go", code: "Go", nameRu: "Gonion (Гонион)", latinName: "Gonion", anatomicalDescription: "Гонион (вершина угла нижней челюсти)", category: "mandibular", color: "#38bdf8" },
	{ key: "U1t", code: "U1-tip", nameRu: "U1 Tip (Край верхнего резца)", latinName: "Incisor superior incisal", anatomicalDescription: "Режущий край центрального резца ВЧ", category: "dental", color: "#22c55e" },
	{ key: "U1a", code: "U1-apex", nameRu: "U1 Apex (Корень верхнего резца)", latinName: "Incisor superior apical", anatomicalDescription: "Верхушка корня центрального резца ВЧ", category: "dental", color: "#22c55e" },
	{ key: "L1t", code: "L1-tip", nameRu: "L1 Tip (Край нижнего резца)", latinName: "Incisor inferior incisal", anatomicalDescription: "Режущий край центрального резца НЧ", category: "dental", color: "#22c55e" },
	{ key: "L1a", code: "L1-apex", nameRu: "L1 Apex (Корень нижнего резца)", latinName: "Incisor inferior apical", anatomicalDescription: "Верхушка корня центрального резца НЧ", category: "dental", color: "#22c55e" },
];
