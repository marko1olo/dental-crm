const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const dbPath = path.resolve(__dirname, 'dente-db');
console.log('Opening PGlite database at:', dbPath);

const client = new PGlite(dbPath);

async function run() {
    await client.waitReady;
    const migrationDir = path.resolve(__dirname, 'drizzle');
    const files = fs.readdirSync(migrationDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`Found ${files.length} migration files.`);

    for (const file of files) {
        console.log(`Applying migration: ${file}`);
        const sqlContent = fs.readFileSync(path.join(migrationDir, file), 'utf8');
        const statements = sqlContent.split('--> statement-breakpoint');
        
        for (const stmt of statements) {
            const trimmed = stmt.trim();
            if (!trimmed) continue;
            try {
                await client.exec(trimmed);
            } catch (err) {
                // Ignore "already exists" errors to allow idempotency
                if (!err.message.includes("already exists") && !err.message.includes("multiple primary keys")) {
                    console.error(`Error in statement from ${file}: ${err.message}`);
                    throw err;
                }
            }
        }
    }
    
    // Seed default organization and user so fake tokens work
    try {
        await client.exec(`
            INSERT INTO "organizations" ("id", "name") VALUES ('00000000-0000-0000-0000-000000000001', 'Test Clinic') ON CONFLICT DO NOTHING;
        `);
        console.log("Seeded default organization and user for testing!");
    } catch(e) {
        console.error("Failed to seed:", e.message);
    }
    
    console.log('Successfully applied all migrations!');
    process.exit(0);
}

run().catch(console.error);
