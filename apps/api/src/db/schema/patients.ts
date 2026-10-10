/**
 * @file patients.ts
 * @description Канонический фасад схемы базы данных пациентов (Drizzle ORM).
 * Реализация декомпозирована в модули директории ./patientsSchema/ согласно Мандату 8b:
 * - patientIndexes.ts: составные и GIN-индексы
 * - patientCore.ts: таблица patients, недавняя история, дубликаты, задачи
 * - patientPassportAndLegal.ts: согласия, рекламации, 323-ФЗ архив и черный список
 * - patientMedicalData.ts: аллергостатус и график профосмотров/реколлов
 * - patientLoyaltyAndFamily.ts: семейные группы, лояльность, бонусы и рефералы
 * - patientRelations.ts: Drizzle relations (организация, визиты, записи, согласия)
 */

export * from "./patientsSchema/index.js";
