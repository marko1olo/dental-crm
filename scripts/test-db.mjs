import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";

async function main() {
    console.log("Starting embedded postgres...");
    const pg = new EmbeddedPostgres({
        databaseDir: ".local-pg-data",
        user: "dental",
        password: "ЗАМЕНИТЕ_НА_СВОЙ_ПАРОЛЬ",
        database: "dental_crm",
        port: 5432
    });
    
    await pg.initialise();
    await pg.start();
    console.log("Postgres started on 5432!");
    
    // Test connection
    const { Client } = await import("pg");
    const client = new Client({
        connectionString: "postgres://dental:ЗАМЕНИТЕ_НА_СВОЙ_ПАРОЛЬ@127.0.0.1:5432/dental_crm"
    });
    await client.connect();
    const res = await client.query("SELECT 1 as result");
    console.log("Query result:", res.rows[0].result);
    await client.end();
    
    await pg.stop();
    console.log("Stopped.");
}
main().catch(console.error);
