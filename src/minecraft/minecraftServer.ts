import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import * as readline from 'readline'
import * as path from 'path'
import { logger } from '../cowboy-database/logger'

class MinecraftServer {
  private serverProcess: ChildProcessWithoutNullStreams | null = null
  private rl: readline.Interface | null = null
  private ready: boolean = false

  constructor() {}

  launchServer() {
    const jarPath = path.resolve(
      __dirname,
      '../../minecraft-server/paper-1.21.4-134.jar'
    )
    const serverDir = path.resolve(__dirname, '../../minecraft-server')

    this.serverProcess = spawn(
      'java',
      ['-Xms4G', '-Xmx4G', '-jar', jarPath, '--nogui'],
      {
        cwd: serverDir,
      }
    )

    this.rl = readline.createInterface({
      input: this.serverProcess.stdout,
      output: this.serverProcess.stdin,
    })

    this.serverProcess.stdout.on('data', data => {
      console.log(`STDOUT: ${data}`)
      if (data.toString().includes('[Vault] Checking for Updates')) {
        this.ready = true
        logger.success('Server is ready!', 'MinecraftServer')
      }
    })

    this.serverProcess.stderr.on('data', data => {
      console.error(`STDERR: ${data}`)
    })

    this.serverProcess.on('close', code => {
      console.log(`Minecraft server process exited with code ${code}`)
      this.rl?.close()
    })
  }

  async whitelistAdd(name: string) {
    this.writeCommand(`whitelist add ${name}`)
  }

  async whitelistRemove(name: string) {
    this.writeCommand(`whitelist remove ${name}`)
  }

  async op(name: string) {
    this.writeCommand(`op ${name}`)
  }

  async deop(name: string) {
    this.writeCommand(`deop ${name}`)
  }

  writeCommand(command: string) {
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

  readOutput(callback: (data: string) => void) {
    if (this.serverProcess) {
      this.serverProcess.stdout.on('data', data => {
        callback(data.toString())
      })
    } else {
      console.error('Server process is not running.')
    }
  }
}

// Example usage:
export const minecraftServer = new MinecraftServer()
