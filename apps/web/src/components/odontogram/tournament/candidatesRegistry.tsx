/**
 * DENTE Odontogram Tournament — Candidates Registry
 * Connects 10 competitor implementations into a unified showcase.
 */

import React from "react";
import type { CompetitorStyleDefinition, BenchmarkToothProps } from "./tournamentTypes";
import {
	Candidate06_Incisor,
	Candidate06_Premolar,
	Candidate06_Molar,
	Candidate06_Implant,
} from "./Candidate06_ScandinavianBio";
import {
	Candidate01_Incisor,
	Candidate01_Premolar,
	Candidate01_Molar,
	Candidate01_Implant,
} from "./Candidate01_AppleGlass";
import {
	Candidate08_Incisor,
	Candidate08_Premolar,
	Candidate08_Molar,
	Candidate08_Implant,
} from "./Candidate08_SvgSpecularShader";
import {
	Candidate07_Incisor,
	Candidate07_Premolar,
	Candidate07_Molar,
	Candidate07_Implant,
} from "./Candidate07_ApexEvolution";
import {
	Candidate05_Incisor,
	Candidate05_Premolar,
	Candidate05_Molar,
	Candidate05_Implant,
} from "./Candidate05_CyberClinic";
import {
	Candidate04_Incisor,
	Candidate04_Premolar,
	Candidate04_Molar,
	Candidate04_Implant,
} from "./Candidate04_CadCamPrecision";
import {
	Candidate09_Incisor,
	Candidate09_Premolar,
	Candidate09_Molar,
	Candidate09_Implant,
} from "./Candidate09_SinelnikovRealism";
import {
	Candidate03_Incisor,
	Candidate03_Premolar,
	Candidate03_Molar,
	Candidate03_Implant,
} from "./Candidate03_NeoIsometric";
import {
	Candidate02_Incisor,
	Candidate02_Premolar,
	Candidate02_Molar,
	Candidate02_Implant,
} from "./Candidate02_NetterAtlas";
import {
	Candidate10_Incisor,
	Candidate10_Premolar,
	Candidate10_Molar,
	Candidate10_Implant,
} from "./Candidate10_DenteSignature";

// Placeholder component until competitor delivers their file
const StubBenchmark: React.FC<BenchmarkToothProps & { label: string }> = ({ label }) => (
	<div className="w-[120px] h-[160px] rounded-xl border border-dashed border-[var(--line,#e2e8f0)] flex flex-col items-center justify-center p-2 text-center text-xs text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f8fafc)]">
		<span className="text-[10px] uppercase font-bold text-teal-600">В разработке</span>
		<span className="mt-1 font-mono text-[11px] font-medium">{label}</span>
	</div>
);

export const COMPETITOR_STYLES: CompetitorStyleDefinition[] = [
	{
		id: 1,
		slug: "apple-glass",
		nameRu: "№1: Apple Glass & Ceramic",
		subtitleRu: "Купертиновский премиум, жемчужные блики, мягкий рассеянный свет",
		aestheticConcept: "Ультрачистый псевдо-3D вектор, нежные перламутровые градиенты, полупрозрачность керамики, полированный медицинский титан.",
		authorAgent: "Competitor-01",
		IncisorComponent: Candidate01_Incisor,
		PremolarComponent: Candidate01_Premolar,
		MolarComponent: Candidate01_Molar,
		ImplantComponent: Candidate01_Implant,
	},
	{
		id: 2,
		slug: "netter-atlas",
		nameRu: "№2: Netter Anatomical Atlas",
		subtitleRu: "Классический медицинский атлас, акварельная органика, живой дентин",
		aestheticConcept: "Художественная медицинская иллюстрация по Неттеру: выразительные тени, анатомическая точность фиссур и цемента корня.",
		authorAgent: "Competitor-02",
		IncisorComponent: Candidate02_Incisor,
		PremolarComponent: Candidate02_Premolar,
		MolarComponent: Candidate02_Molar,
		ImplantComponent: Candidate02_Implant,
	},
	{
		id: 3,
		slug: "neo-isometric",
		nameRu: "№3: Neo-Isometric 2.5D",
		subtitleRu: "Легкая 4° изометрия, тактильный объем, ощущение зуба на ладони",
		aestheticConcept: "Псевдо-3D изометрическая проекция 4°, подчеркивающая вестибулярный и окклюзионный рельеф, матовый титан.",
		authorAgent: "Competitor-03",
		IncisorComponent: Candidate03_Incisor,
		PremolarComponent: Candidate03_Premolar,
		MolarComponent: Candidate03_Molar,
		ImplantComponent: Candidate03_Implant,
	},
	{
		id: 4,
		slug: "cad-cam-precision",
		nameRu: "№4: CAD/CAM Bio-Engineering",
		subtitleRu: "Инженерная фотореалистичность Straumann/Bicon, микрорезьба",
		aestheticConcept: "Микроскопическая детализация витков резьбы титана, фаски абатмента, четкая граница эмаль-цемент (CEJ).",
		authorAgent: "Competitor-04",
		IncisorComponent: Candidate04_Incisor,
		PremolarComponent: Candidate04_Premolar,
		MolarComponent: Candidate04_Molar,
		ImplantComponent: Candidate04_Implant,
	},
	{
		id: 5,
		slug: "cyber-clinic",
		nameRu: "№5: High-Tech Cyber-Clinic",
		subtitleRu: "Нео-контраст, чистый вектор Безье, люминесцентные каналы",
		aestheticConcept: "Высококонтрастная векторная геометрия, идеальные математические кривые, неоновая подсветка патологий и каналов.",
		authorAgent: "Competitor-05",
		IncisorComponent: Candidate05_Incisor,
		PremolarComponent: Candidate05_Premolar,
		MolarComponent: Candidate05_Molar,
		ImplantComponent: Candidate05_Implant,
	},
	{
		id: 6,
		slug: "scandinavian-bio",
		nameRu: "№6: Scandinavian Bio-Minimalism",
		subtitleRu: "Теплые тона VITA A2/B1, мягкий рассеянный свет ambient occlusion",
		aestheticConcept: "Мягкие органические формы, отсутствие резких контуров, рассеянные тени через SVG-фильтры, спокойный клинический комфорт.",
		authorAgent: "Competitor-06",
		IncisorComponent: Candidate06_Incisor,
		PremolarComponent: Candidate06_Premolar,
		MolarComponent: Candidate06_Molar,
		ImplantComponent: Candidate06_Implant,
	},
	{
		id: 7,
		slug: "apex-evolution",
		nameRu: "№7: Apex Evolution V3",
		subtitleRu: "Доведенный до идеала векторный рендеринг, золотое сечение 1:1.618",
		aestheticConcept: "Строгие клинические пропорции корней и коронки по золотому сечению, выразительное сияющее гало.",
		authorAgent: "Competitor-07",
		IncisorComponent: Candidate07_Incisor,
		PremolarComponent: Candidate07_Premolar,
		MolarComponent: Candidate07_Molar,
		ImplantComponent: Candidate07_Implant,
	},
	{
		id: 8,
		slug: "svg-specular-shader",
		nameRu: "№8: Multi-Layer SVG Shader",
		subtitleRu: "Анатомический векторный шейдер, мягкий градиентный рельеф",
		aestheticConcept: "Нативные SVG фильтры рельефа бугров и бликов, эффект объемной керамики под бестеневым хирургическим светильником.",
		authorAgent: "Competitor-08",
		IncisorComponent: Candidate08_Incisor,
		PremolarComponent: Candidate08_Premolar,
		MolarComponent: Candidate08_Molar,
		ImplantComponent: Candidate08_Implant,
	},
	{
		id: 9,
		slug: "sinelnikov-realism",
		nameRu: "№9: Sinelnikov Academic Realism",
		subtitleRu: "Строгая анатомия Синельникова, кривизна корней, бугор Карабелли",
		aestheticConcept: "Академическая остеологическая достоверность: правильная конусность корней, анатомическая борозда, естественный цвет цемента.",
		authorAgent: "Competitor-09",
		IncisorComponent: Candidate09_Incisor,
		PremolarComponent: Candidate09_Premolar,
		MolarComponent: Candidate09_Molar,
		ImplantComponent: Candidate09_Implant,
	},
	{
		id: 10,
		slug: "dente-signature",
		nameRu: "№10: DENTE Signature Master",
		subtitleRu: "Кинематографический синтез анатомии, света и бескомпромиссной читаемости",
		aestheticConcept: "Флагманский эксклюзив DENTE: идеальный контраст в Dark и Light, мощные раздельные корни, сочная гранулема, титановый винт.",
		authorAgent: "Competitor-10",
		IncisorComponent: Candidate10_Incisor,
		PremolarComponent: Candidate10_Premolar,
		MolarComponent: Candidate10_Molar,
		ImplantComponent: Candidate10_Implant,
	},
];
