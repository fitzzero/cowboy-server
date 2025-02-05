import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import * as readline from 'readline'
import * as path from 'path'
import * as schedule from 'node-schedule'
import { logger } from '../cowboy-database/logger'
import { syncMinecraftPlayerData } from './minecraftPlayerData'

class MinecraftServer {
  private serverProcess: ChildProcessWithoutNullStreams | null = null
  private rl: readline.Interface | null = null
  private isReady: boolean = false
  private isStopping: boolean = false
  private isStopped: boolean = false
  private heartbeatInterval: NodeJS.Timeout | null = null
  private restartOnClose: boolean = true

  constructor() {
    this.scheduleDailyRestart()
  }

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
      const content = data.toString().split(':')?.[3]
      // Notice that server is ready
      if (content?.includes('For help, type "help"')) {
        this.onReady()
      }
      // Notice that server is stopping
      if (content?.includes('Stopping server')) {
        this.noticeStop()
      }
    })

    this.serverProcess.stderr.on('data', data => {
      console.error(`MC Err: ${data}`)
    })

    this.serverProcess.on('close', code => {
      console.log(`MC: Minecraft server process exited with code ${code}`)
      this.handleStopComplete()
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

  // Stop
  async stop() {
    if (!this.isStopping) {
      logger.start('Issuing stop command', 'MinecraftServer')
      this.writeCommand('stop')
    }
  }

  async noticeStop() {
    logger.start('Detected server stopping', 'MinecraftServer')
    this.isStopping = true
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
      logger.success('Cleared heartbeat', 'MinecraftServer')
    }
  }

  async handleStopComplete() {
    logger.success('Server stopped', 'MinecraftServer')
    this.isStopping = false
    this.isStopped = true
    this.serverProcess = null // Clear the serverProcess reference
    this.rl?.close() // Clear the readline interface reference
    if (!this.restartOnClose) return
    setTimeout(() => {
      this.launchServer()
      logger.start('Restarting server', 'MinecraftServer')
    }, 30000)
  }

  async scheduleStop() {
    logger.start('Scheduling server stop', 'MinecraftServer')
    this.say('Server will initiate its daily restart in 2 minutes!')
    setTimeout(() => {
      this.say('Server will initiate its daily restart in 1 minute!')
    }, 60000)
    setTimeout(() => {
      this.say('Server will initiate its daily restart in 30 seconds!')
    }, 90000)
    setTimeout(() => {
      this.stop()
      this.restartOnClose = true
    }, 120000)
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
    if (this.isStopped || this.isStopping || !this.isReady) return
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
    this.isReady = true
    this.isStopped = false
    this.isStopping = false
    this.restartOnClose = true
    this.writeCommand('save-off') // Disable auto-saving
    logger.success('Server is ready!', 'MinecraftServer')

    // 1 minute in dev, 10 minutes in prod
    const interval = process.env.NODE_ENV === 'development' ? 60000 : 600000
    // Set the heartbeat interval and store the interval ID
    this.heartbeatInterval = setInterval(() => {
      this.heartbeat()
    }, interval) // Adjust the interval as needed
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

  private scheduleDailyRestart() {
    // Schedule the server to restart every day at 4:00 AM
    schedule.scheduleJob('0 4 * * *', () => {
      this.scheduleStop()
    })
  }

  private writeCommand(command: string) {
    // If this.ready is false, await wait for 30s then check again
    if (!this.isReady) {
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
