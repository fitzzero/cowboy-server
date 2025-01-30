import express, { Express } from 'express'
import * as http from 'http'
import { Server } from 'socket.io'
import bodyParser from 'body-parser'
import { logger } from './cowboy-database/logger'
import dotenv from 'dotenv'

export const ioServer: Server = new Server()

export const startExpress = async (): Promise<void> => {
  try {
    const isProd = process.env.NODE_ENV === 'production'
    if (!isProd) {
      dotenv.config({ path: '.env' })
    }
    const port = isProd ? 8080 : 3001
    const app: Express = express()
    app.use(bodyParser.json())

    const server: http.Server = http.createServer(app)
    ioServer.attach(server)

    // Events
    server.listen(port, () => {
      logger.success(
        `Ready on port ${port} (${process.env.NODE_ENV})`,
        'Express'
      )
    })
  } catch (e: any) {
    logger.alert(e, 'express')
  }
}

startExpress()
