// Centralized LLM Prompt Router
// Groups prompts by domain (Schedule, Medical, Patient) to avoid spaghetti string literals.

export const Prompts = {
  System: {
    Base: "You are a highly skilled AI assistant for a modern dental clinic.",
    StrictJSON: "You must return valid JSON only, without markdown wrapping.",
  },
  Patient: {
    ExtractDetails: (input: string) => `
      Parse the following raw text into structured patient data.
      Text: "${input}"
      Return JSON: { "fullName": string, "phone": string, "birthDate": "YYYY-MM-DD" }
    `,
  },
  Schedule: {
    AnalyzeNote: (input: string) => `
      Parse the following appointment dictation into structured data.
      Text: "${input}"
      Return JSON: { "dateTime": "YYYY-MM-DD HH:mm", "patientName": string, "service": string, "doctorRole": string }
    `,
  },
  Medical: {
    StructureEmk: (input: string, fieldContext: string) => `
      You are structuring a medical note for the dental EMK field: ${fieldContext}.
      Doctor's dictation: "${input}"
      Format it clearly, use professional terminology.
    `,
    GenerateTreatmentPlan: (diagnosis: string, tooth: string) => `
      Create a standard treatment plan for ${diagnosis} on tooth ${tooth}.
      Include 3-4 steps.
    `,
  }
};
