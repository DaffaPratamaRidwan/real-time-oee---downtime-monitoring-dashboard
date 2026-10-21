import postgres from 'postgres'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/oee_factory_db'

async function migrate() {
  console.log(`[DB Migration] Connecting to ${databaseUrl}...`)
  const sql = postgres(databaseUrl, { max: 1 })

  try {
    const schemaPath = join(__dirname, 'schema.sql')
    const schemaSql = readFileSync(schemaPath, 'utf8')

    console.log('[DB Migration] Applying schema.sql...')
    await sql.unsafe(schemaSql)

    console.log('[DB Migration] Schema applied successfully! Verifying tables...')
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `
    console.log('[DB Migration] Created tables:')
    tables.forEach(t => console.log(`  - ${t.table_name}`))

  } catch (err) {
    console.error('[DB Migration] Error applying migration:', err)
    process.exit(1)
  } finally {
    await sql.end()
    console.log('[DB Migration] Connection closed.')
  }
}

migrate()
