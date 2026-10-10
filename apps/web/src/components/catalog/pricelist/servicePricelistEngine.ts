/**
 * DENTE Dental CRM — Statutory Order 804n Service Catalog & Pricelist Matrix Engine
 *
 * Canonical Facade maintaining 100% backward compatibility with all existing imports.
 * All domain logic is modularized into discrete DAG layers under `./servicePricelist/`.
 *
 * Architecture:
 * - Layer 0: Types & Currency Math (`./servicePricelist/types`, `./servicePricelist/currencyMath`)
 * - Layer 1: Codes, Synonyms & Profitability (`./servicePricelist/serviceCodesAndSynonyms`, `./servicePricelist/profitabilityCalculator`)
 * - Layer 2: Search/Sort, CSV I/O, HTML Print & Smart Parser (`./servicePricelist/pricelistSearchAndSort`, `./servicePricelist/csvPricelistIo`, `./servicePricelist/pricelistHtmlPrinter`, `./servicePricelist/unstructuredPriceParser`)
 * - Layer 5: Module Barrel (`./servicePricelist/index`) & Master Facade (this file, <= 50 lines)
 */

export * from './servicePricelist';
