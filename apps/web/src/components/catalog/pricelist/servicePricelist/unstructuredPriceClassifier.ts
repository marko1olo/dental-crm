/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Unstructured Price Text: Category & Specialty Classifier
 */

import type { DoctorSpecialty, ServiceCategory } from "../servicePricelistPresets";
import { detectCategoryFromServiceCode } from "./serviceCodesAndSynonyms";

export interface ClassificationResult {
	finalCode: string;
	category: ServiceCategory;
	specialty: DoctorSpecialty;
	confidence: "exact_code" | "keyword_match" | "fallback";
}

export function classifyUnstructuredLine(
	title: string,
	detectedCode: string | null,
): ClassificationResult {
	if (detectedCode) {
		const category = detectCategoryFromServiceCode(detectedCode);
		let specialty: DoctorSpecialty = "therapist";
		if (category === "surgery") specialty = "surgeon";
		else if (category === "orthopedics") specialty = "orthopedist";
		else if (category === "orthodontics") specialty = "orthodontist";
		else if (category === "hygiene") specialty = "hygienist";
		else if (category === "pediatric") specialty = "pediatric";

		return {
			finalCode: detectedCode,
			category,
			specialty,
			confidence: "exact_code",
		};
	}

	const lowerTitle = title.toLowerCase();

	if (/пульпит|периодонтит|каналы?|эндодонт|депульпир|гуттаперч/i.test(lowerTitle)) {
		return { finalCode: "A16.07.008", category: "therapy", specialty: "therapist", confidence: "keyword_match" };
	}
	if (/кариес|пломб|реставрац|эмаль|герметизац|композит/i.test(lowerTitle)) {
		return { finalCode: "A16.07.002", category: "therapy", specialty: "therapist", confidence: "keyword_match" };
	}
	if (/имплант|синус|аугментац|остеотоми|формировател/i.test(lowerTitle)) {
		return { finalCode: "A16.07.054", category: "surgery", specialty: "surgeon", confidence: "keyword_match" };
	}
	if (/удалени|экстракц|резекц|альвеол|зуб\s*мудрости/i.test(lowerTitle)) {
		return { finalCode: "A16.07.001", category: "surgery", specialty: "surgeon", confidence: "keyword_match" };
	}
	if (/коронк|мостовид|протез|винир|слепок|оттиск|вкладк|бюгел/i.test(lowerTitle)) {
		return { finalCode: "A16.07.004", category: "orthopedics", specialty: "orthopedist", confidence: "keyword_match" };
	}
	if (/брекет|дуг|элайнер|активаци|ретейнер|ортодонт/i.test(lowerTitle)) {
		return { finalCode: "A16.07.048", category: "orthodontics", specialty: "orthodontist", confidence: "keyword_match" };
	}
	if (/анестези|инфильтрац|проводников|убистезин|септанест/i.test(lowerTitle)) {
		return { finalCode: "A11.07.012", category: "anesthesia", specialty: "therapist", confidence: "keyword_match" };
	}
	if (/гигиен|чистк|air\s*flow|ультразвук|паст|камен|налет/i.test(lowerTitle)) {
		return { finalCode: "A16.07.051", category: "hygiene", specialty: "hygienist", confidence: "keyword_match" };
	}
	if (/снимок|кт|клкт|оптг|прицельн|радиовизиограф/i.test(lowerTitle)) {
		return { finalCode: "A06.07.003", category: "radiology", specialty: "therapist", confidence: "keyword_match" };
	}
	if (/консультаци|осмотр|прием\s*первичн/i.test(lowerTitle)) {
		return { finalCode: "B01.065.001", category: "consultation", specialty: "therapist", confidence: "keyword_match" };
	}

	return { finalCode: "A16.07.002", category: "therapy", specialty: "therapist", confidence: "fallback" };
}
