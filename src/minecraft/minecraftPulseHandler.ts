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
  minecraftServer.whitelistAdd(event.created.name)
}

const handleUpdate = async (event: UpdateEvent) => {
  //@ts-ignore before exists
  minecraftServer.whitelistRemove(event.before.name)
  minecraftServer.whitelistAdd(event.after.name)
}

const handleDelete = async (event: DeleteEvent) => {
  minecraftServer.whitelistRemove(event.deleted.name)
}
