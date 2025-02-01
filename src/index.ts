import { startExpress } from './express'
import { minecraftServer } from './minecraft/minecraftServer'
import { startPrismaPulse } from './prismaPulse'

startExpress()
startPrismaPulse()
minecraftServer.launchServer()
