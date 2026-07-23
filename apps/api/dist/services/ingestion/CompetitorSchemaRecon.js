export class CompetitorSchemaRecon {
    static templates = [
        {
            systemName: "Open Dental",
            tables: {
                patients: {
                    tableName: "patient",
                    columns: {
                        id: "PatNum",
                        firstName: "FName",
                        lastName: "LName",
                        birthDate: "Birthdate",
                        phone: "HmPhone"
                    }
                },
                visits: {
                    tableName: "appointment",
                    columns: {
                        id: "AptNum",
                        patientId: "PatNum",
                        dateTime: "AptDateTime"
                    }
                },
                procedures: {
                    tableName: "procedurelog",
                    columns: {
                        id: "ProcNum",
                        patientId: "PatNum",
                        date: "ProcDate",
                        amount: "ProcFee",
                        tooth: "ToothNum"
                    }
                }
            }
        },
        {
            systemName: "Dentrix",
            tables: {
                patients: {
                    tableName: "Patient",
                    columns: {
                        id: "PatID",
                        firstName: "FirstName",
                        lastName: "LastName",
                        birthDate: "Birthdate",
                        phone: "Phone"
                    }
                },
                visits: {
                    tableName: "Appt",
                    columns: {
                        id: "ApptID",
                        patientId: "PatID",
                        dateTime: "StartDateTime"
                    }
                },
                procedures: {
                    tableName: "Ledger",
                    columns: {
                        id: "ProcCode",
                        patientId: "PatID",
                        date: "Date",
                        amount: "Amount",
                        tooth: "ToothRange"
                    }
                }
            }
        }
    ];
    /**
     * Attempts to match extracted table names and column names to a known competitor schema.
     */
    static matchSchema(extractedTables) {
        const tableNames = Object.keys(extractedTables).map(t => t.toLowerCase());
        for (const template of this.templates) {
            const pTable = template.tables.patients.tableName.toLowerCase();
            const vTable = template.tables.visits.tableName.toLowerCase();
            if (tableNames.includes(pTable) && tableNames.includes(vTable)) {
                return template;
            }
        }
        return null;
    }
}
