import * as path from 'path'
import { loadJsonFile, writeJsonFile } from './json'

class MinecraftServer {
  private serverDirectory: string
  private whitelistPath: string

  constructor() {
    this.serverDirectory = process.env.MINECRAFT_DIRECTORY as string
    if (!this.serverDirectory) {
      throw new Error('MINECRAFT_DIRECTORY environment variable not set')
    }
    this.whitelistPath = path.join(this.serverDirectory, 'whitelist.json')
  }

  fetchWhitelist = async (): Promise<any> => {
    return await loadJsonFile(this.whitelistPath)
  }

  setWhitelist = async (whitelist: any): Promise<void> => {
    await writeJsonFile(this.whitelistPath, whitelist)
  }
}

export const minecraftServer = new MinecraftServer()
