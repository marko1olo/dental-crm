/**
 * paidContract/crypto.ts
 * Facade for SHA-256 and PEP OTP signatures (Mandate 8b <= 120 lines)
 */

export { generateSha256 } from "./sha256Digest";
export {
	generateSmsSignOtp,
	verifySmsSignOtp,
	generatePaidContractIntegrityHash,
} from "./contractSignHash";
