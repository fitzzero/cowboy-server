import * as path from 'path'
import axios, { AxiosInstance } from 'axios'
import { logger } from '../cowboy-database/logger'

class MinecraftServer {
  private serverDirectory: string
  private api?: AxiosInstance
  private apiToken?: string

  constructor() {
    this.serverDirectory = process.env.MINECRAFT_DIRECTORY as string
    if (!this.serverDirectory) {
      throw new Error('MINECRAFT_DIRECTORY environment variable not set')
    }
    this.authenticate()
  }

  private async authenticate() {
    try {
      const response = await axios.post(
        `http://localhost:8000/api/authenticate`,
        {
          username: 'admin',
          password: 'local',
        }
      )
      this.apiToken = response.data
      this.api = axios.create({
        baseURL: 'http://localhost:8000/api',
        headers: {
          Authorization: `Bearer ${response.data}`,
          accept: 'application/json',
        },
      })
      const server = await this.server()
      this.api?.post('/whitelist/players/add', { name: 'testuser' })
      logger.success(`Connected to: ${server.motd}`, 'MinecraftServer')
    } catch (error) {
      logger.alert('Error authenticating:' + error, 'MinecraftServer')
    }
  }

  async server() {
    const response = await this.api?.get('/server')
    return response?.data as {
      maxPlayers: number
      name: string
      version: string
      bukkitVersion: string
      address: string
      port: number
      motd: string
    }
  }

  async whitelistAdd(name: string) {
    try {
      const response = await this.api?.post('/whitelist/players/add', { name })
      logger.success('Added player to whitelist.', 'MinecraftServer')
      return response?.data
    } catch (error) {
      logger.alert(
        'Error adding player to whitelist:' + error,
        'MinecraftServer'
      )
    }
  }

  async whitelistRemove(name: string) {
    try {
      const response = await this.api?.post('/whitelist/players/remove', {
        name,
      })
      logger.success('Removed player from whitelist.', 'MinecraftServer')
      return response?.data
    } catch (error) {
      logger.alert(
        'Error removing player from whitelist:' + error,
        'MinecraftServer'
      )
    }
  }
}

export const minecraftServer = new MinecraftServer()
