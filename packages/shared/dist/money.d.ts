import { z } from "zod";
export declare const moneyRubSchema: z.ZodEffects<z.ZodNumber, number, number>;
export declare const positiveMoneyRubSchema: z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>;
export declare const nonNegativeMoneyRubSchema: z.ZodEffects<z.ZodEffects<z.ZodNumber, number, number>, number, number>;
/**
 * Форматирует целые копейки в строку рублей с двумя знаками ("150.00").
 */
export declare function formatKopecksToRubles(kopecks: number): string;
export * from "./utils/money.js";
