import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PatientRiskIndexEngine } from "./PatientRiskIndexEngine.js";

describe("PatientRiskIndexEngine", () => {
  it("should calculate low risk for a healthy patient", () => {
    const anamnesis = {
      hasCardiovascularDisease: false,
      isTakingAnticoagulants: false,
      isTakingAntiplatelets: false,
      hasDiabetes: false,
      isDiabetesDecompensated: false,
      hasAllergies: false,
      hasOsteoporosis: false,
      isTakingBisphosphonates: false,
    };
    const profile = PatientRiskIndexEngine.calculateRisk(anamnesis);
    assert.strictEqual(profile.riskIndex, "low");
    assert.strictEqual(profile.alerts.length, 0);
  });

  it("should calculate high risk for patient on bisphosphonates", () => {
    const anamnesis = {
      hasCardiovascularDisease: true, // +2
      isTakingAnticoagulants: false,
      isTakingAntiplatelets: false,
      hasDiabetes: false,
      isDiabetesDecompensated: false,
      hasAllergies: false,
      hasOsteoporosis: true,
      isTakingBisphosphonates: true, // +3 => 5 points total
    };
    const profile = PatientRiskIndexEngine.calculateRisk(anamnesis);
    assert.strictEqual(profile.riskIndex, "high");
    assert.ok(profile.alerts.some((a) => a.type === "osteonecrosis"));
  });

  it("should calculate critical risk for complex patient", () => {
    const anamnesis = {
      hasCardiovascularDisease: true,
      isTakingAnticoagulants: true,
      isTakingAntiplatelets: false,
      hasDiabetes: true,
      isDiabetesDecompensated: true,
      hasAllergies: false,
      hasOsteoporosis: false,
      isTakingBisphosphonates: false,
    };
    const profile = PatientRiskIndexEngine.calculateRisk(anamnesis);
    assert.strictEqual(profile.riskIndex, "critical");
    assert.ok(profile.alerts.length > 0);
  });
});
