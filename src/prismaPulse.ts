import { PrismaClient } from '@prisma/client'
import { withPulse } from '@prisma/extension-pulse'
import { logger } from './cowboy-database/logger'
import { minecraftPulseHandler } from './minecraft/minecraftPulseHandler'

const pulse = new PrismaClient().$extends(
  withPulse({ apiKey: process.env.PULSE_API_KEY || '' })
)

export const startPrismaPulse = async () => {
  try {
    const minecraft = await pulse.minecraft.stream()
    for await (const event of minecraft) {
      minecraftPulseHandler(event)
    }
    logger.success('Ready', 'PrismaPulse')
  } catch (err: any) {
    logger.alert(`Error starting Prisma Pulse: ${err.message}`, 'PrismaPulse')
  }
}
