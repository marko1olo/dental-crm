/**
 * deepDemoSeeder.ts — Canonical Facade for Deep Demo Seeder Subsystem (Mandate 8b).
 *
 * All clinical demo seeder logic is decomposed into modular DAG components
 * under `./deepSeeder/`. This facade preserves 100% AST export parity
 * and backward compatibility with existing call sites across apps/api.
 */

export * from "./deepSeeder/index.js";
