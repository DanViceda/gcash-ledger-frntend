import { app } from './app.js'
import { config } from './config/env.js'
import { pool } from './database/pool.js'
import { bootstrapAdmin } from './modules/auth/router.js'

await pool.query('SELECT 1')
await bootstrapAdmin()
const server=app.listen(config.PORT,()=>console.log(JSON.stringify({level:'info',message:'Express API listening',port:config.PORT})))
let closing=false
async function shutdown(signal){if(closing)return;closing=true;console.log(JSON.stringify({level:'info',message:'Shutting down server',signal}));server.close(async()=>{await pool.end();process.exit(0)});setTimeout(()=>process.exit(1),10_000).unref()}
process.on('SIGINT',()=>shutdown('SIGINT'));process.on('SIGTERM',()=>shutdown('SIGTERM'))
