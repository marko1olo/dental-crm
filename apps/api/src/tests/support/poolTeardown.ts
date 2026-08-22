// Ensure test environment variables are properly initialized
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS =
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS || "1";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS =
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS || "1";

