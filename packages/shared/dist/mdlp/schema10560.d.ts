import type { MdlpDisposalParams, MdlpSchema10560Document } from "./types.js";
/**
 * Escapes XML special characters and strips non-printable control characters for MDLP schemas.
 */
export declare function escapeMdlpXml(unsafe: unknown): string;
/**
 * Validates parameters for MDLP Schema 10560.
 */
export declare function validateMdlpSchema10560Params(params: MdlpDisposalParams): {
    isValid: boolean;
    errors: string[];
};
/**
 * Generates an official MDLP Schema 10560 Document
 * "Регистрация в ИС МДЛП сведений о выводе из оборота лекарственных препаратов для оказания медицинской помощи"
 * (Схема 10560, withdrawal_type = 13 или 6).
 */
export declare function generateMdlpSchema10560Payload(params: MdlpDisposalParams, options?: {
    version?: "1.37" | "1.38" | undefined;
    defaultWithdrawalType?: number | undefined;
}): MdlpSchema10560Document;
/**
 * Parses an MDLP Schema 10560 XML document back into structured parameters.
 */
export declare function parseMdlpSchema10560Xml(xml: string): MdlpDisposalParams;
export type SafeParseMdlpSchema10560Result = {
    success: true;
    data: MdlpDisposalParams;
} | {
    success: false;
    errors: string[];
};
/**
 * Gracefully parses an MDLP Schema 10560 XML document without throwing exceptions.
 */
export declare function safeParseMdlpSchema10560Xml(xml: unknown): SafeParseMdlpSchema10560Result;
