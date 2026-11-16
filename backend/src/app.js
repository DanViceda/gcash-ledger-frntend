import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config/env.js'
import { authRouter } from './modules/auth/router.js'
import { customersRouter } from './modules/customers/router.js'
import { transactionsRouter } from './modules/transactions/router.js'
import { balancesRouter } from './modules/balances/router.js'
import { reportsRouter } from './modules/reports/router.js'
import { csrf } from './middleware/csrf.js'
import { requireAuth } from './middleware/auth.js'
import { errorHandler, notFound } from './middleware/errors.js'

export const app=express()
app.disable('x-powered-by')
if(config.TRUST_PROXY_HOPS>0) app.set('trust proxy',config.TRUST_PROXY_HOPS)
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}))
app.use(cors({origin:(origin,cb)=>{if(!origin||config.corsOrigins.includes(origin))return cb(null,true);cb(new Error('Origin is not allowed by CORS.'))},credentials:true,methods:['GET','POST','PUT','OPTIONS'],allowedHeaders:['Content-Type','X-XSRF-TOKEN','Idempotency-Key']}))
app.use(express.json({limit:'64kb'}));app.use(cookieParser())
app.use((req,res,next)=>{if(req.path==='/health'){if(req.method!=='GET')return res.sendStatus(405);return res.json({status:'ok'})}next()})
app.use(csrf)
app.use('/auth',authRouter)
app.use('/customers',requireAuth,customersRouter)
app.use('/transactions',requireAuth,transactionsRouter)
app.use('/balances',requireAuth,balancesRouter)
app.use('/reports',requireAuth,reportsRouter)
app.use(notFound);app.use(errorHandler)
