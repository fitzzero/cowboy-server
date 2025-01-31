import { Minecraft } from '@prisma/client'
import {
  PulseCreateEvent,
  PulseDeleteEvent,
  PulseUpdateEvent,
} from '@prisma/extension-pulse'
import { minecraftServer } from './minecraftServer'

type CreateEvent = PulseCreateEvent<Minecraft>
type DeleteEvent = PulseDeleteEvent<Minecraft>
type UpdateEvent = PulseUpdateEvent<Minecraft>

export type MinecraftPulseEvent = CreateEvent | DeleteEvent | UpdateEvent

export const minecraftPulseHandler = async (event: MinecraftPulseEvent) => {
  switch (event.action) {
    case 'create':
      await handleCreate(event)
      break
    case 'update':
      await handleUpdate(event)
      break
    case 'delete':
      await handleDelete(event)
      break
  }
}

const handleCreate = async (event: CreateEvent) => {
  const whitelist = await minecraftServer.fetchWhitelist()
  if (whitelist) {
    whitelist.push({
      uuid: event.created.minecraftId,
      name: event.created.name,
    })
    await minecraftServer.setWhitelist(whitelist)
  }
}

const handleUpdate = async (event: UpdateEvent) => {
  const whitelist = await minecraftServer.fetchWhitelist()
  if (!whitelist) return
  const index = whitelist.findIndex(
    // @ts-ignore: event.before should exist
    (player: { uuid: string }) => player.uuid === event.before.minecraftId
  )
  if (index !== -1) {
    whitelist[index].uuid = event.after.minecraftId
    whitelist[index].name = event.after.name
    await minecraftServer.setWhitelist(whitelist)
  } else {
    whitelist.push({
      uuid: event.after.minecraftId,
      name: event.after.name,
    })
    await minecraftServer.setWhitelist(whitelist)
  }
}

const handleDelete = async (event: DeleteEvent) => {
  console.log(event)
  const whitelist = await minecraftServer.fetchWhitelist()
  if (!whitelist) return
  const index = whitelist.findIndex(
    (player: { uuid: string }) => player.uuid === event.deleted.minecraftId
  )
  if (index !== -1) {
    whitelist.splice(index, 1)
    await minecraftServer.setWhitelist(whitelist)
  }
}
