import { z } from "zod";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ФОРМА № 043-1/у — МЕДИЦИНСКАЯ КАРТА ОРТОДОНТИЧЕСКОГО ПАЦИЕНТА
 * Приказ Минздрава РФ / Стандарты оказания ортодонтической помощи
 * ═══════════════════════════════════════════════════════════════════════════
 */
/** Тип лица по антропометрии */
export declare const facialMorphologicalTypeSchema: z.ZodEnum<["leptoprosopic", "mesoprosopic", "euryprosopic"]>;
export type FacialMorphologicalType = z.infer<typeof facialMorphologicalTypeSchema>;
export declare const facialMorphologicalTypeLabels: Record<FacialMorphologicalType, string>;
/** Профиль лица */
export declare const facialProfileTypeSchema: z.ZodEnum<["straight", "convex", "concave"]>;
export type FacialProfileType = z.infer<typeof facialProfileTypeSchema>;
/** Антропометрия и фотометрия лица */
export declare const facialAnthropometrySchema: z.ZodObject<{
    facialType: z.ZodDefault<z.ZodEnum<["leptoprosopic", "mesoprosopic", "euryprosopic"]>>;
    profileType: z.ZodDefault<z.ZodEnum<["straight", "convex", "concave"]>>;
    facialSymmetry: z.ZodDefault<z.ZodEnum<["symmetric", "chin_deviation_left", "chin_deviation_right"]>>;
    chinDeviationMm: z.ZodDefault<z.ZodNumber>;
    nasolabialAngleDegrees: z.ZodDefault<z.ZodNumber>;
    mentolabialSulcus: z.ZodDefault<z.ZodEnum<["normal", "deep_pronounced", "smoothed"]>>;
    lipCompetenceAtRest: z.ZodDefault<z.ZodEnum<["competent_closed", "incompetent_open", "closed_with_strain"]>>;
    incisalDisplayAtSmileMm: z.ZodDefault<z.ZodNumber>;
    gummySmileMm: z.ZodDefault<z.ZodNumber>;
    photoProtocolCompleted: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    facialType: "leptoprosopic" | "mesoprosopic" | "euryprosopic";
    profileType: "straight" | "convex" | "concave";
    facialSymmetry: "symmetric" | "chin_deviation_left" | "chin_deviation_right";
    chinDeviationMm: number;
    nasolabialAngleDegrees: number;
    mentolabialSulcus: "normal" | "deep_pronounced" | "smoothed";
    lipCompetenceAtRest: "competent_closed" | "incompetent_open" | "closed_with_strain";
    incisalDisplayAtSmileMm: number;
    gummySmileMm: number;
    photoProtocolCompleted: boolean;
}, {
    facialType?: "leptoprosopic" | "mesoprosopic" | "euryprosopic" | undefined;
    profileType?: "straight" | "convex" | "concave" | undefined;
    facialSymmetry?: "symmetric" | "chin_deviation_left" | "chin_deviation_right" | undefined;
    chinDeviationMm?: number | undefined;
    nasolabialAngleDegrees?: number | undefined;
    mentolabialSulcus?: "normal" | "deep_pronounced" | "smoothed" | undefined;
    lipCompetenceAtRest?: "competent_closed" | "incompetent_open" | "closed_with_strain" | undefined;
    incisalDisplayAtSmileMm?: number | undefined;
    gummySmileMm?: number | undefined;
    photoProtocolCompleted?: boolean | undefined;
}>;
export type FacialAnthropometry = z.infer<typeof facialAnthropometrySchema>;
/** Цефалометрия ТРГ (Телерентгенография черепа в боковой проекции) */
export declare const cephalometricTrgAnalysisSchema: z.ZodObject<{
    snaAngle: z.ZodDefault<z.ZodNumber>;
    snbAngle: z.ZodDefault<z.ZodNumber>;
    anbAngle: z.ZodDefault<z.ZodNumber>;
    witsAppraisalMm: z.ZodDefault<z.ZodNumber>;
    fmaAngle: z.ZodDefault<z.ZodNumber>;
    snGoGnAngle: z.ZodDefault<z.ZodNumber>;
    upperIncisorToNaAngle: z.ZodDefault<z.ZodNumber>;
    upperIncisorToNaMm: z.ZodDefault<z.ZodNumber>;
    lowerIncisorToNbAngle: z.ZodDefault<z.ZodNumber>;
    lowerIncisorToNbMm: z.ZodDefault<z.ZodNumber>;
    interincisalAngle: z.ZodDefault<z.ZodNumber>;
    growthPattern: z.ZodDefault<z.ZodEnum<["normodivergent", "hyperdivergent_vertical", "hypodivergent_horizontal"]>>;
    skeletalClass: z.ZodDefault<z.ZodEnum<["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]>>;
}, "strip", z.ZodTypeAny, {
    snaAngle: number;
    snbAngle: number;
    anbAngle: number;
    witsAppraisalMm: number;
    fmaAngle: number;
    snGoGnAngle: number;
    upperIncisorToNaAngle: number;
    upperIncisorToNaMm: number;
    lowerIncisorToNbAngle: number;
    lowerIncisorToNbMm: number;
    interincisalAngle: number;
    growthPattern: "normodivergent" | "hyperdivergent_vertical" | "hypodivergent_horizontal";
    skeletalClass: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2";
}, {
    snaAngle?: number | undefined;
    snbAngle?: number | undefined;
    anbAngle?: number | undefined;
    witsAppraisalMm?: number | undefined;
    fmaAngle?: number | undefined;
    snGoGnAngle?: number | undefined;
    upperIncisorToNaAngle?: number | undefined;
    upperIncisorToNaMm?: number | undefined;
    lowerIncisorToNbAngle?: number | undefined;
    lowerIncisorToNbMm?: number | undefined;
    interincisalAngle?: number | undefined;
    growthPattern?: "normodivergent" | "hyperdivergent_vertical" | "hypodivergent_horizontal" | undefined;
    skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
}>;
export type CephalometricTrgAnalysis = z.infer<typeof cephalometricTrgAnalysisSchema>;
/** Расчет индекса Тона (Tonn index) */
export interface TonnIndexResult {
    sumUpperIncisorsMm: number;
    sumLowerIncisorsMm: number;
    tonnRatio: number;
    ratio: number;
    isDeciduous: boolean;
    normRatio: number;
    normReference: number;
    discrepancyType: "normal" | "upper_macrodontia" | "lower_macrodontia";
    interpretation: string;
    deviationInterpretation: string;
}
export declare function calculateTonnIndex(upperIncisors: [number, number, number, number] | number, lowerIncisors: [number, number, number, number] | number, isDeciduous?: boolean): TonnIndexResult;
/** Расчет индекса Пона (Pont index) */
export interface PontIndexResult {
    sumUpperIncisorsMm: number;
    calculatedPremolarWidthMm: number;
    calculatedMolarWidthMm: number;
    measuredPremolarWidthMm: number;
    measuredMolarWidthMm: number;
    premolarDiscrepancyMm: number;
    molarDiscrepancyMm: number;
    premolars: {
        expectedWidthMm: number;
        actualWidthMm: number;
        discrepancyMm: number;
        status: "narrowed" | "widened" | "normal";
    };
    molars: {
        expectedWidthMm: number;
        actualWidthMm: number;
        discrepancyMm: number;
        status: "narrowed" | "widened" | "normal";
    };
    interpretation: string;
}
export declare function calculatePontIndex(sumUpperIncisorsMm: number, measuredPremolarWidthMm: number, measuredMolarWidthMm: number): PontIndexResult;
/** Расчет индекса Болтона (Bolton index) */
export interface BoltonIndexResult {
    sumUpper6Mm: number;
    sumLower6Mm: number;
    anteriorRatio: number;
    anteriorRatioPercent: number;
    anteriorDiscrepancyInterpretation: string;
    sumUpper12Mm: number;
    sumLower12Mm: number;
    overallRatio: number;
    overallRatioPercent: number;
    overallDiscrepancyMm: number;
    overallDiscrepancyInterpretation: string;
}
export declare function calculateBoltonIndex(upperInput: number[] | number, // массив 12 ширины или sumUpper6
lowerInput: number[] | number, // массив 12 ширины или sumLower6
overallUpperSum?: number, overallLowerSum?: number): BoltonIndexResult;
/** План ортодонтического аппаратурного лечения */
export declare const orthodonticAppliancePlanSchema: z.ZodObject<{
    applianceType: z.ZodDefault<z.ZodEnum<["metal_braces_standard", "metal_braces_self_ligating", "ceramic_braces_aesthetic", "lingual_braces", "clear_aligners", "rapid_palatal_expander_haas", "functional_twin_block", "plate_removable_orthodontic", "skeletal_anchorage_miniscrews"]>>;
    alignerStepsCount: z.ZodDefault<z.ZodNumber>;
    extractionPlan: z.ZodDefault<z.ZodEnum<["non_extraction", "premolars_extraction", "wisdom_teeth_extraction", "asymmetric_extraction"]>>;
    treatmentStages: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    estimatedDurationMonths: z.ZodDefault<z.ZodNumber>;
    retentionProtocol: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    applianceType: "metal_braces_standard" | "metal_braces_self_ligating" | "ceramic_braces_aesthetic" | "lingual_braces" | "clear_aligners" | "rapid_palatal_expander_haas" | "functional_twin_block" | "plate_removable_orthodontic" | "skeletal_anchorage_miniscrews";
    alignerStepsCount: number;
    extractionPlan: "non_extraction" | "premolars_extraction" | "wisdom_teeth_extraction" | "asymmetric_extraction";
    treatmentStages: string[];
    estimatedDurationMonths: number;
    retentionProtocol: string;
}, {
    applianceType?: "metal_braces_standard" | "metal_braces_self_ligating" | "ceramic_braces_aesthetic" | "lingual_braces" | "clear_aligners" | "rapid_palatal_expander_haas" | "functional_twin_block" | "plate_removable_orthodontic" | "skeletal_anchorage_miniscrews" | undefined;
    alignerStepsCount?: number | undefined;
    extractionPlan?: "non_extraction" | "premolars_extraction" | "wisdom_teeth_extraction" | "asymmetric_extraction" | undefined;
    treatmentStages?: string[] | undefined;
    estimatedDurationMonths?: number | undefined;
    retentionProtocol?: string | undefined;
}>;
export type OrthodonticAppliancePlan = z.infer<typeof orthodonticAppliancePlanSchema>;
/** Полный структурированный Payload формы № 043-1/у */
export declare const orthodonticCard043_1uPayloadSchema: z.ZodObject<{
    formNumber: z.ZodLiteral<"043-1/у">;
    clinicLegalName: z.ZodString;
    clinicAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicOgrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicInn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicLicenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicLicenseDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicLicenseIssuer: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    medicalCardNumber: z.ZodString;
    cardOpenedDate: z.ZodString;
    patientFullName: z.ZodString;
    patientBirthDate: z.ZodString;
    patientSex: z.ZodDefault<z.ZodEnum<["male", "female"]>>;
    patientPhone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    patientAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    legalRepresentativeFullName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    orthodontistFullName: z.ZodString;
    orthodonticDiagnosis: z.ZodString;
    icd10DiagnosisCode: z.ZodDefault<z.ZodString>;
    angleMolarClassRight: z.ZodDefault<z.ZodEnum<["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]>>;
    angleMolarClassLeft: z.ZodDefault<z.ZodEnum<["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]>>;
    angleCanineClassRight: z.ZodDefault<z.ZodEnum<["class_1", "class_2", "class_3"]>>;
    angleCanineClassLeft: z.ZodDefault<z.ZodEnum<["class_1", "class_2", "class_3"]>>;
    anthropometry: z.ZodDefault<z.ZodObject<{
        facialType: z.ZodDefault<z.ZodEnum<["leptoprosopic", "mesoprosopic", "euryprosopic"]>>;
        profileType: z.ZodDefault<z.ZodEnum<["straight", "convex", "concave"]>>;
        facialSymmetry: z.ZodDefault<z.ZodEnum<["symmetric", "chin_deviation_left", "chin_deviation_right"]>>;
        chinDeviationMm: z.ZodDefault<z.ZodNumber>;
        nasolabialAngleDegrees: z.ZodDefault<z.ZodNumber>;
        mentolabialSulcus: z.ZodDefault<z.ZodEnum<["normal", "deep_pronounced", "smoothed"]>>;
        lipCompetenceAtRest: z.ZodDefault<z.ZodEnum<["competent_closed", "incompetent_open", "closed_with_strain"]>>;
        incisalDisplayAtSmileMm: z.ZodDefault<z.ZodNumber>;
        gummySmileMm: z.ZodDefault<z.ZodNumber>;
        photoProtocolCompleted: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        facialType: "leptoprosopic" | "mesoprosopic" | "euryprosopic";
        profileType: "straight" | "convex" | "concave";
        facialSymmetry: "symmetric" | "chin_deviation_left" | "chin_deviation_right";
        chinDeviationMm: number;
        nasolabialAngleDegrees: number;
        mentolabialSulcus: "normal" | "deep_pronounced" | "smoothed";
        lipCompetenceAtRest: "competent_closed" | "incompetent_open" | "closed_with_strain";
        incisalDisplayAtSmileMm: number;
        gummySmileMm: number;
        photoProtocolCompleted: boolean;
    }, {
        facialType?: "leptoprosopic" | "mesoprosopic" | "euryprosopic" | undefined;
        profileType?: "straight" | "convex" | "concave" | undefined;
        facialSymmetry?: "symmetric" | "chin_deviation_left" | "chin_deviation_right" | undefined;
        chinDeviationMm?: number | undefined;
        nasolabialAngleDegrees?: number | undefined;
        mentolabialSulcus?: "normal" | "deep_pronounced" | "smoothed" | undefined;
        lipCompetenceAtRest?: "competent_closed" | "incompetent_open" | "closed_with_strain" | undefined;
        incisalDisplayAtSmileMm?: number | undefined;
        gummySmileMm?: number | undefined;
        photoProtocolCompleted?: boolean | undefined;
    }>>;
    cephalometry: z.ZodDefault<z.ZodObject<{
        snaAngle: z.ZodDefault<z.ZodNumber>;
        snbAngle: z.ZodDefault<z.ZodNumber>;
        anbAngle: z.ZodDefault<z.ZodNumber>;
        witsAppraisalMm: z.ZodDefault<z.ZodNumber>;
        fmaAngle: z.ZodDefault<z.ZodNumber>;
        snGoGnAngle: z.ZodDefault<z.ZodNumber>;
        upperIncisorToNaAngle: z.ZodDefault<z.ZodNumber>;
        upperIncisorToNaMm: z.ZodDefault<z.ZodNumber>;
        lowerIncisorToNbAngle: z.ZodDefault<z.ZodNumber>;
        lowerIncisorToNbMm: z.ZodDefault<z.ZodNumber>;
        interincisalAngle: z.ZodDefault<z.ZodNumber>;
        growthPattern: z.ZodDefault<z.ZodEnum<["normodivergent", "hyperdivergent_vertical", "hypodivergent_horizontal"]>>;
        skeletalClass: z.ZodDefault<z.ZodEnum<["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]>>;
    }, "strip", z.ZodTypeAny, {
        snaAngle: number;
        snbAngle: number;
        anbAngle: number;
        witsAppraisalMm: number;
        fmaAngle: number;
        snGoGnAngle: number;
        upperIncisorToNaAngle: number;
        upperIncisorToNaMm: number;
        lowerIncisorToNbAngle: number;
        lowerIncisorToNbMm: number;
        interincisalAngle: number;
        growthPattern: "normodivergent" | "hyperdivergent_vertical" | "hypodivergent_horizontal";
        skeletalClass: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2";
    }, {
        snaAngle?: number | undefined;
        snbAngle?: number | undefined;
        anbAngle?: number | undefined;
        witsAppraisalMm?: number | undefined;
        fmaAngle?: number | undefined;
        snGoGnAngle?: number | undefined;
        upperIncisorToNaAngle?: number | undefined;
        upperIncisorToNaMm?: number | undefined;
        lowerIncisorToNbAngle?: number | undefined;
        lowerIncisorToNbMm?: number | undefined;
        interincisalAngle?: number | undefined;
        growthPattern?: "normodivergent" | "hyperdivergent_vertical" | "hypodivergent_horizontal" | undefined;
        skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    }>>;
    tonnIndexNotes: z.ZodDefault<z.ZodString>;
    pontIndexNotes: z.ZodDefault<z.ZodString>;
    boltonIndexNotes: z.ZodDefault<z.ZodString>;
    korkhausIndexNotes: z.ZodDefault<z.ZodString>;
    appliancePlan: z.ZodDefault<z.ZodObject<{
        applianceType: z.ZodDefault<z.ZodEnum<["metal_braces_standard", "metal_braces_self_ligating", "ceramic_braces_aesthetic", "lingual_braces", "clear_aligners", "rapid_palatal_expander_haas", "functional_twin_block", "plate_removable_orthodontic", "skeletal_anchorage_miniscrews"]>>;
        alignerStepsCount: z.ZodDefault<z.ZodNumber>;
        extractionPlan: z.ZodDefault<z.ZodEnum<["non_extraction", "premolars_extraction", "wisdom_teeth_extraction", "asymmetric_extraction"]>>;
        treatmentStages: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        estimatedDurationMonths: z.ZodDefault<z.ZodNumber>;
        retentionProtocol: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        applianceType: "metal_braces_standard" | "metal_braces_self_ligating" | "ceramic_braces_aesthetic" | "lingual_braces" | "clear_aligners" | "rapid_palatal_expander_haas" | "functional_twin_block" | "plate_removable_orthodontic" | "skeletal_anchorage_miniscrews";
        alignerStepsCount: number;
        extractionPlan: "non_extraction" | "premolars_extraction" | "wisdom_teeth_extraction" | "asymmetric_extraction";
        treatmentStages: string[];
        estimatedDurationMonths: number;
        retentionProtocol: string;
    }, {
        applianceType?: "metal_braces_standard" | "metal_braces_self_ligating" | "ceramic_braces_aesthetic" | "lingual_braces" | "clear_aligners" | "rapid_palatal_expander_haas" | "functional_twin_block" | "plate_removable_orthodontic" | "skeletal_anchorage_miniscrews" | undefined;
        alignerStepsCount?: number | undefined;
        extractionPlan?: "non_extraction" | "premolars_extraction" | "wisdom_teeth_extraction" | "asymmetric_extraction" | undefined;
        treatmentStages?: string[] | undefined;
        estimatedDurationMonths?: number | undefined;
        retentionProtocol?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    patientFullName: string;
    formNumber: "043-1/у";
    clinicLegalName: string;
    medicalCardNumber: string;
    cardOpenedDate: string;
    patientBirthDate: string;
    patientSex: "male" | "female";
    orthodontistFullName: string;
    orthodonticDiagnosis: string;
    icd10DiagnosisCode: string;
    angleMolarClassRight: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2";
    angleMolarClassLeft: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2";
    angleCanineClassRight: "class_1" | "class_2" | "class_3";
    angleCanineClassLeft: "class_1" | "class_2" | "class_3";
    anthropometry: {
        facialType: "leptoprosopic" | "mesoprosopic" | "euryprosopic";
        profileType: "straight" | "convex" | "concave";
        facialSymmetry: "symmetric" | "chin_deviation_left" | "chin_deviation_right";
        chinDeviationMm: number;
        nasolabialAngleDegrees: number;
        mentolabialSulcus: "normal" | "deep_pronounced" | "smoothed";
        lipCompetenceAtRest: "competent_closed" | "incompetent_open" | "closed_with_strain";
        incisalDisplayAtSmileMm: number;
        gummySmileMm: number;
        photoProtocolCompleted: boolean;
    };
    cephalometry: {
        snaAngle: number;
        snbAngle: number;
        anbAngle: number;
        witsAppraisalMm: number;
        fmaAngle: number;
        snGoGnAngle: number;
        upperIncisorToNaAngle: number;
        upperIncisorToNaMm: number;
        lowerIncisorToNbAngle: number;
        lowerIncisorToNbMm: number;
        interincisalAngle: number;
        growthPattern: "normodivergent" | "hyperdivergent_vertical" | "hypodivergent_horizontal";
        skeletalClass: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2";
    };
    tonnIndexNotes: string;
    pontIndexNotes: string;
    boltonIndexNotes: string;
    korkhausIndexNotes: string;
    appliancePlan: {
        applianceType: "metal_braces_standard" | "metal_braces_self_ligating" | "ceramic_braces_aesthetic" | "lingual_braces" | "clear_aligners" | "rapid_palatal_expander_haas" | "functional_twin_block" | "plate_removable_orthodontic" | "skeletal_anchorage_miniscrews";
        alignerStepsCount: number;
        extractionPlan: "non_extraction" | "premolars_extraction" | "wisdom_teeth_extraction" | "asymmetric_extraction";
        treatmentStages: string[];
        estimatedDurationMonths: number;
        retentionProtocol: string;
    };
    clinicAddress?: string | null | undefined;
    clinicOgrn?: string | null | undefined;
    clinicInn?: string | null | undefined;
    clinicLicenseNumber?: string | null | undefined;
    clinicLicenseDate?: string | null | undefined;
    clinicLicenseIssuer?: string | null | undefined;
    patientPhone?: string | null | undefined;
    patientAddress?: string | null | undefined;
    legalRepresentativeFullName?: string | null | undefined;
}, {
    patientFullName: string;
    formNumber: "043-1/у";
    clinicLegalName: string;
    medicalCardNumber: string;
    cardOpenedDate: string;
    patientBirthDate: string;
    orthodontistFullName: string;
    orthodonticDiagnosis: string;
    clinicAddress?: string | null | undefined;
    clinicOgrn?: string | null | undefined;
    clinicInn?: string | null | undefined;
    clinicLicenseNumber?: string | null | undefined;
    clinicLicenseDate?: string | null | undefined;
    clinicLicenseIssuer?: string | null | undefined;
    patientSex?: "male" | "female" | undefined;
    patientPhone?: string | null | undefined;
    patientAddress?: string | null | undefined;
    legalRepresentativeFullName?: string | null | undefined;
    icd10DiagnosisCode?: string | undefined;
    angleMolarClassRight?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    angleMolarClassLeft?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    angleCanineClassRight?: "class_1" | "class_2" | "class_3" | undefined;
    angleCanineClassLeft?: "class_1" | "class_2" | "class_3" | undefined;
    anthropometry?: {
        facialType?: "leptoprosopic" | "mesoprosopic" | "euryprosopic" | undefined;
        profileType?: "straight" | "convex" | "concave" | undefined;
        facialSymmetry?: "symmetric" | "chin_deviation_left" | "chin_deviation_right" | undefined;
        chinDeviationMm?: number | undefined;
        nasolabialAngleDegrees?: number | undefined;
        mentolabialSulcus?: "normal" | "deep_pronounced" | "smoothed" | undefined;
        lipCompetenceAtRest?: "competent_closed" | "incompetent_open" | "closed_with_strain" | undefined;
        incisalDisplayAtSmileMm?: number | undefined;
        gummySmileMm?: number | undefined;
        photoProtocolCompleted?: boolean | undefined;
    } | undefined;
    cephalometry?: {
        snaAngle?: number | undefined;
        snbAngle?: number | undefined;
        anbAngle?: number | undefined;
        witsAppraisalMm?: number | undefined;
        fmaAngle?: number | undefined;
        snGoGnAngle?: number | undefined;
        upperIncisorToNaAngle?: number | undefined;
        upperIncisorToNaMm?: number | undefined;
        lowerIncisorToNbAngle?: number | undefined;
        lowerIncisorToNbMm?: number | undefined;
        interincisalAngle?: number | undefined;
        growthPattern?: "normodivergent" | "hyperdivergent_vertical" | "hypodivergent_horizontal" | undefined;
        skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    } | undefined;
    tonnIndexNotes?: string | undefined;
    pontIndexNotes?: string | undefined;
    boltonIndexNotes?: string | undefined;
    korkhausIndexNotes?: string | undefined;
    appliancePlan?: {
        applianceType?: "metal_braces_standard" | "metal_braces_self_ligating" | "ceramic_braces_aesthetic" | "lingual_braces" | "clear_aligners" | "rapid_palatal_expander_haas" | "functional_twin_block" | "plate_removable_orthodontic" | "skeletal_anchorage_miniscrews" | undefined;
        alignerStepsCount?: number | undefined;
        extractionPlan?: "non_extraction" | "premolars_extraction" | "wisdom_teeth_extraction" | "asymmetric_extraction" | undefined;
        treatmentStages?: string[] | undefined;
        estimatedDurationMonths?: number | undefined;
        retentionProtocol?: string | undefined;
    } | undefined;
}>;
export type OrthodonticCard043_1uPayload = z.infer<typeof orthodonticCard043_1uPayloadSchema>;
