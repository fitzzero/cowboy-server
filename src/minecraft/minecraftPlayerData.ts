import * as fs from 'fs'
import * as path from 'path'
import { loadYamlFile } from '../yaml'
import { prisma } from '../cowboy-database/prisma'
import {
  minecraftStatsCreate,
  minecraftStatsUpdateById,
} from '../cowboy-database/minecraftStats'
import { logger } from '../cowboy-database/logger'

interface LocalPlayerData {
  minecraftId: string
  money: number
  online: boolean

  foragingLevel: number
  foragingXp: number

  miningLevel: number
  miningXp: number

  enchantingLevel: number
  enchantingXp: number

  farmingLevel: number
  farmingXp: number

  alchemyLevel: number
  alchemyXp: number

  fightingLevel: number
  fightingXp: number

  defenseLevel: number
  defenseXp: number

  excavationLevel: number
  excavationXp: number

  archeryLevel: number
  archeryXp: number

  fishingLevel: number
  fishingXp: number

  agilityLevel: number
  agilityXp: number

  totalLevel: number
}

export const syncMinecraftPlayerData = async () => {
  logger.start('Syncing Minecraft player data', 'MinecraftPlayerData')
  const localData: LocalPlayerData[] = []

  let files: string[] = []

  // Get essential data
  let userDataDir = path.resolve(
    __dirname,
    '../../minecraft-server/plugins/Essentials/userdata'
  )
  try {
    files = await fs.promises.readdir(userDataDir)
  } catch (e) {
    logger.alert(
      `Failed to read Essentials userdata directory cancelling sync`,
      'MinecraftPlayerData'
    )
    return
  }

  for (const file of files) {
    if (path.extname(file) === '.yml') {
      const filePath = path.join(userDataDir, file)
      const data = await loadYamlFile(filePath)

      if (data) {
        const playerData: LocalPlayerData = {
          minecraftId: file.replace(/-/g, '').replace('.yml', ''), // Remove hyphens and file extension
          money: Number(data.money) || 0,
          online: false,
          foragingLevel: 0,
          foragingXp: 0,
          miningLevel: 0,
          miningXp: 0,
          enchantingLevel: 0,
          enchantingXp: 0,
          farmingLevel: 0,
          farmingXp: 0,
          alchemyLevel: 0,
          alchemyXp: 0,
          fightingLevel: 0,
          fightingXp: 0,
          defenseLevel: 0,
          defenseXp: 0,
          excavationLevel: 0,
          excavationXp: 0,
          archeryLevel: 0,
          archeryXp: 0,
          fishingLevel: 0,
          fishingXp: 0,
          agilityLevel: 0,
          agilityXp: 0,
          totalLevel: 0,
        }

        playerData.online = data.timestamps?.login > data.timestamps?.logout

        localData.push(playerData)
      }
    }
  }

  // Get AuraSkills data
  userDataDir = path.resolve(
    __dirname,
    '../../minecraft-server/plugins/AuraSkills/userdata'
  )
  files = await fs.promises.readdir(userDataDir)
  for (const file of files) {
    if (path.extname(file) === '.yml') {
      const filePath = path.join(userDataDir, file)
      const data = await loadYamlFile(filePath)

      if (data) {
        const minecraftId = file.replace(/-/g, '').replace('.yml', '')
        const index = localData.findIndex(
          player => player.minecraftId === minecraftId
        )
        if (index === -1) continue

        const existingData = localData[index]

        const playerData: LocalPlayerData = {
          ...existingData,
          foragingLevel: data?.skills?.['auraskills/foraging']?.level || 0,
          foragingXp: data?.skills?.['auraskills/foraging']?.xp || 0,
          miningLevel: data?.skills?.['auraskills/mining']?.level || 0,
          miningXp: data?.skills?.['auraskills/mining']?.xp || 0,
          enchantingLevel: data?.skills?.['auraskills/enchanting']?.level || 0,
          enchantingXp: data?.skills?.['auraskills/enchanting']?.xp || 0,
          farmingLevel: data?.skills?.['auraskills/farming']?.level || 0,
          farmingXp: data?.skills?.['auraskills/farming']?.xp || 0,
          alchemyLevel: data?.skills?.['auraskills/alchemy']?.level || 0,
          alchemyXp: data?.skills?.['auraskills/alchemy']?.xp || 0,
          fightingLevel: data?.skills?.['auraskills/fighting']?.level || 0,
          fightingXp: data?.skills?.['auraskills/fighting']?.xp || 0,
          defenseLevel: data?.skills?.['auraskills/defense']?.level || 0,
          defenseXp: data?.skills?.['auraskills/defense']?.xp || 0,
          excavationLevel: data?.skills?.['auraskills/excavation']?.level || 0,
          excavationXp: data?.skills?.['auraskills/excavation']?.xp || 0,
          archeryLevel: data?.skills?.['auraskills/archery']?.level || 0,
          archeryXp: data?.skills?.['auraskills/archery']?.xp || 0,
          fishingLevel: data?.skills?.['auraskills/fishing']?.level || 0,
          fishingXp: data?.skills?.['auraskills/fishing']?.xp || 0,
          agilityLevel: data?.skills?.['auraskills/agility']?.level || 0,
          agilityXp: data?.skills?.['auraskills/agility']?.xp || 0,
        }

        playerData.totalLevel =
          playerData.agilityLevel +
          playerData.archeryLevel +
          playerData.excavationLevel +
          playerData.defenseLevel +
          playerData.fightingLevel +
          playerData.alchemyLevel +
          playerData.farmingLevel +
          playerData.enchantingLevel +
          playerData.miningLevel +
          playerData.foragingLevel +
          playerData.fishingLevel

        localData[index] = { ...localData[index], ...playerData }
      }
    }
  }

  for (const player of localData) {
    const minecraft = await prisma.minecraft.findUnique({
      where: {
        minecraftId: player.minecraftId,
      },
      include: {
        stats: true,
      },
    })
    if (!minecraft) continue

    const newData = {
      ...player,
      minecraftId: undefined,
    }

    if (!minecraft?.stats) {
      try {
        await minecraftStatsCreate({
          ...newData,
          user: { connect: { id: minecraft.userId } },
          minecraft: { connect: { id: minecraft.id } },
        })
        logger.success(
          `Created stats for ${minecraft.minecraftId}`,
          'MinecraftPlayerData'
        )
      } catch (e: any) {
        logger.alert(
          `Failed to create stats for ${minecraft.minecraftId}\n${e?.message}`,
          'MinecraftPlayerData'
        )
      }
    } else {
      // Skip if no substantial changes
      if (
        minecraft.stats.totalLevel === newData.totalLevel &&
        minecraft.stats.money === newData.money &&
        minecraft.stats.online === newData.online
      )
        continue
      try {
        await minecraftStatsUpdateById({
          ...newData,
          id: minecraft.stats.id,
        })
        logger.success(
          `Updated stats for ${minecraft.minecraftId}`,
          'MinecraftPlayerData'
        )
      } catch (e: any) {
        logger.alert(
          `Failed to update stats for ${minecraft.minecraftId}\n${e?.message}`,
          'MinecraftPlayerData'
        )
      }
    }
  }

  logger.success('Sync complete!', 'MinecraftPlayerData')
}

syncMinecraftPlayerData()
