import * as path from 'path'
import { loadJsonFile, writeJsonFile } from '../json'
import axios from 'axios'
import { logger } from '../cowboy-database/logger'

class MinecraftServer {
  private serverDirectory: string
  private whitelistPath: string
  private api: string
  private apiToken?: string

  constructor() {
    this.serverDirectory = process.env.MINECRAFT_DIRECTORY as string
    if (!this.serverDirectory) {
      throw new Error('MINECRAFT_DIRECTORY environment variable not set')
    }
    this.whitelistPath = path.join(this.serverDirectory, 'whitelist.json')
    this.api = 'http://localhost:8000/api'
    this.authenticate()
  }

  private async authenticate() {
    try {
      const response = await axios.post(`${this.api}/authenticate`, {
        username: 'admin',
        password: 'local',
      })
      this.apiToken = response.data.token
      logger.success('Authenticated successfully.', 'MinecraftServer')
    } catch (error) {
      logger.alert('Error authenticating:' + error, 'MinecraftServer')
    }
  }

  fetchWhitelist = async (): Promise<any> => {
    return await loadJsonFile(this.whitelistPath)
  }

  setWhitelist = async (whitelist: any): Promise<void> => {
    await writeJsonFile(this.whitelistPath, whitelist)
  }
}

export const minecraftServer = new MinecraftServer()
