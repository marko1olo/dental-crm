/**
 * fiscalReceiptEngine.test.ts — Master Test Runner for Fiscal Engine
 * Decomposed into atomic test suites <= 120 lines (Mandate 8b).
 */

import "./fiscal/taxDeductionAndNames.test.js";
import "./fiscal/fiscalMappingAndTotals.test.js";
import "./fiscal/splitPaymentAllocation.test.js";
import "./fiscal/sbpAndReceiptGeneration.test.js";
import "./fiscal/taxCertificateAndRefund.test.js";
import "./fiscal/correctionAndDmsInsurance.test.js";
import "./fiscal/zReportAndWarranty.test.js";
