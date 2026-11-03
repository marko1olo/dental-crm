import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_CHAIRSIDE_CLINIC,
	createChairsideConsentPackage,
	hashDoctorPin,
	isValidPinFormat,
	renderChairsidePackageHtml,
	sendChairsideSmsOtpToPatient,
	signPackageWithPaperPhysical,
	signPackageWithSmsPep,
	verifyDoctorPin,
	type ChairsideDoctorProfile,
	type ChairsidePatientProfile,
	type ChairsideTreatmentItem,
} from "../chairsideConsentEngine.js";

describe("Chairside Consent Engine: Doctor PIN Security & Document Rendering", () => {
	const mockPatient: ChairsidePatientProfile = {
		fullName: "Смирнова Елена Александровна",
		birthDate: "12.08.1990",
		passport: "Паспорт РФ 4515 № 654321",
		phone: "+7 (916) 777-88-12",
		snils: "112-233-445 95",
		cardNumber: "ЭМК-9921",
	};

	const mockDoctor: ChairsideDoctorProfile = {
		fullName: "Барабаш Сергей Владимирович",
		specialty: "Врач-стоматолог-терапевт",
		licenseNumber: "ЛО-77-01-012345",
	};

	const mockItems: ChairsideTreatmentItem[] = [
		{
			id: "item-1",
			serviceCode: "A16.07.002.001",
			title: "Препарирование твердых тканей зуба 1.6",
			toothNumber: "16",
			stageTitle: "Этап 1: Терапия",
			quantity: 1,
			unitPriceKopecks: 350000,
			discountPercent: 0,
			totalKopecks: 350000,
		},
		{
			id: "item-2",
			serviceCode: "A16.07.008.002",
			title: "Пломбирование зуба 1.6 композитом",
			toothNumber: "16",
			stageTitle: "Этап 1: Терапия",
			quantity: 2,
			unitPriceKopecks: 400000,
			discountPercent: 10,
			totalKopecks: 720000,
		},
	];

	// 1. Защита выхода PIN-кодом врача
	describe("1. Doctor Exit PIN Security", () => {
		it("hashDoctorPin and verifyDoctorPin manage PIN authentication", () => {
			const hash = hashDoctorPin("7890");
			assert.equal(verifyDoctorPin("7890", hash), true);
			assert.equal(verifyDoctorPin("0000", hash), false);
			assert.equal(verifyDoctorPin("", hash), false);
			assert.equal(verifyDoctorPin("1234", undefined), true);
			assert.equal(verifyDoctorPin("9999", undefined), false);
		});

		it("isValidPinFormat validates 4-6 digit codes", () => {
			assert.equal(isValidPinFormat("1234"), true);
			assert.equal(isValidPinFormat("123456"), true);
			assert.equal(isValidPinFormat("123"), false);
			assert.equal(isValidPinFormat("1234567"), false);
			assert.equal(isValidPinFormat("abcd"), false);
			assert.equal(isValidPinFormat(""), false);
		});
	});

	// 2. Генерация готового PDF/HTML документа без бюрократического канцелярита
	describe("2. Clean PDF / HTML Document Rendering (Zero Bureaucratic Slime)", () => {
		it("renderChairsidePackageHtml generates clean HTML with electronic signature stamp", () => {
			const pkg = createChairsideConsentPackage({
				patient: mockPatient,
				doctor: mockDoctor,
				treatmentItems: mockItems,
			});

			const pkgWithSms = sendChairsideSmsOtpToPatient(pkg, "+7 (916) 777-88-12", "7842");
			const { signedPackage } = signPackageWithSmsPep(pkgWithSms, {
				inputCode: "7842",
				form043uChartNumber: "ЭМК-9921",
				signedAtIso: "2026-08-28T14:30:00.000Z",
			});

			const html = renderChairsidePackageHtml(signedPackage!);
			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("Смирнова Елена Александровна"));
			assert.ok(html.includes("Барабаш Сергей Владимирович"));
			assert.ok(html.includes("ИДС-Базовое"));
			assert.ok(html.includes("СОГЛ-ПДН"));
			assert.ok(html.includes("СМЕТА-ПЛАН"));
			assert.ok(html.includes("10 700,00 ₽"));
			assert.ok(html.includes("Десять тысяч семьсот рублей 00 копеек"));
			assert.ok(html.includes("ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
			assert.ok(html.includes("ЭМК-9921"));
			assert.ok(html.includes(signedPackage!.signature!.integrityHash));
			assert.ok(html.includes("+7 (***) ***-**-12"));
			// Zero raw regulatory clutter
			assert.equal(html.includes("ИДС-1051н"), false, "Must not contain 'ИДС-1051н'");
			assert.equal(html.includes("043/у"), false, "Must not contain '043/у'");
		});

		it("renderChairsidePackageHtml generates clean HTML with paper signature stamp", () => {
			const pkg = createChairsideConsentPackage({
				patient: mockPatient,
				doctor: mockDoctor,
				treatmentItems: mockItems,
			});

			const signed = signPackageWithPaperPhysical(pkg, {
				form043uChartNumber: "ЭМК-9921",
			});

			const html = renderChairsidePackageHtml(signed);
			assert.ok(html.includes("ДОКУМЕНТЫ ОФОРМЛЕНЫ НА БУМАГЕ"));
			assert.ok(html.includes("Подписано на бумаге. Личная подпись пациента в медицинской карте"));
			assert.equal(html.includes("043/у"), false, "Must not contain '043/у'");
		});

		it("renderChairsidePackageHtml handles unsigned package with manual signature lines", () => {
			const pkg = createChairsideConsentPackage({
				patient: mockPatient,
				doctor: mockDoctor,
				treatmentItems: mockItems,
			});

			const html = renderChairsidePackageHtml(pkg, { includeSignatures: false });
			assert.ok(html.includes("Врач: ____________________ / Барабаш Сергей Владимирович /"));
			assert.ok(html.includes("Пациент: ____________________ / Смирнова Елена Александровна /"));
		});
	});
});
