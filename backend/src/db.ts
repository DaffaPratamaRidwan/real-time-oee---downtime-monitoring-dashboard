import postgres from 'postgres'
import * as dotenv from 'dotenv'

dotenv.config()

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/oee_factory_db'

export const sql = postgres(databaseUrl, {
  max: 15,
  idle_timeout: 30,
  connect_timeout: 10,
})

export default sql
