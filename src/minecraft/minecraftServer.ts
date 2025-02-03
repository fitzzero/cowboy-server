import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import * as readline from 'readline'
import * as path from 'path'
import { logger } from '../cowboy-database/logger'
import { syncMinecraftPlayerData } from './minecraftPlayerData'

class MinecraftServer {
  private serverProcess: ChildProcessWithoutNullStreams | null = null
  private rl: readline.Interface | null = null
  private ready: boolean = false

  constructor() {}

  launchServer() {
    const jarPath = path.resolve(
      __dirname,
      '../../minecraft-server/paper-1.21.4-136.jar'
    )
    const serverDir = path.resolve(__dirname, '../../minecraft-server')

    this.serverProcess = spawn(
      'java',
      ['-Xms24G', '-Xmx24G', '-jar', jarPath, '--nogui'],
      {
        cwd: serverDir,
      }
    )

    this.rl = readline.createInterface({
      input: this.serverProcess.stdout,
      output: this.serverProcess.stdin,
    })

    this.serverProcess.stdout.on('data', data => {
      console.log(`MC: ${data}`)
      if (data.toString().includes('For help, type "help"')) {
        this.onReady()
      }
    })

    this.serverProcess.stderr.on('data', data => {
      console.error(`MC Err: ${data}`)
    })

    this.serverProcess.on('close', code => {
      console.log(`Minecraft server process exited with code ${code}`)
      this.rl?.close()
    })
  }

  // Message
  async say(message: string) {
    this.writeCommand(`say ${message}`)
  }

  // LuckPerms
  async luckPermsReload() {
    this.writeCommand('lp reload')
  }

  async luckPermsUserSetGroup(username: string, group: string) {
    this.writeCommand(`lp user ${username} parent set ${group}`)
  }

  async luckPermsUserRemoveGroup(username: string, group: string) {
    this.writeCommand(`lp user ${username} parent remove ${group}`)
  }

  // OP
  async op(name: string) {
    this.writeCommand(`op ${name}`)
  }

  async deop(name: string) {
    this.writeCommand(`deop ${name}`)
  }

  // Whitelist
  async whitelistAdd(name: string) {
    this.writeCommand(`whitelist add ${name}`)
  }

  async whitelistRemove(name: string) {
    this.writeCommand(`whitelist remove ${name}`)
  }

  // World
  async saveAll() {
    this.writeCommand('save-all')
  }

  // Private
  private async heartbeat() {
    logger.start('Heartbeat', 'MinecraftServer')
    this.say('Saving world & updating stats...')
    this.saveAll()
    try {
      await syncMinecraftPlayerData()
    } catch (e) {
      logger.alert('Failed to sync player data', 'MinecraftServer')
    }
    logger.success('Heartbeat complete!', 'MinecraftServer')
  }

  private onReady() {
    this.ready = true
    this.writeCommand('save-off') // Disable auto-saving
    logger.success('Server is ready!', 'MinecraftServer')

    const interval = process.env.NODE_ENV === 'development' ? 60000 : 600000 // 1 minute in dev, 10 minutes in prod
    setInterval(() => {
      this.heartbeat()
    }, interval)
  }

  private readOutput(callback: (data: string) => void) {
    if (this.serverProcess) {
      this.serverProcess.stdout.on('data', data => {
        callback(data.toString())
      })
    } else {
      console.error('Server process is not running.')
    }
  }

  private writeCommand(command: string) {
    // If this.ready is false, await wait for 30s then check again
    if (!this.ready) {
      logger.alert(
        'Server not ready, delaying command for 30s...',
        'MinecraftServer'
      )
      setTimeout(() => {
        this.writeCommand(command)
      }, 30000)
      return
    }

    if (this.serverProcess) {
      this.serverProcess.stdin.write(`${command}\n`)
    } else {
      console.error('Server process is not running.')
    }
  }
}

// Example usage:
export const minecraftServer = new MinecraftServer()
