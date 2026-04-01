import type { IIncursionActionDto } from '@incursion/dto'
import type { Server, Socket } from 'socket.io'
import type IncursionManager from '../../managers/IncursionManager'
import { AbilityId } from '@incursion/dto'
import IncursionGenerator from '../../generators/IncursionGenerator'
import CharacterMapper from '../../mappers/entity/CharacterMapper'
import IncursionMapper from '../../mappers/incursion/IncursionMapper'
import IncursionTemplateMapper from '../../mappers/incursion/IncursionTemplateMapper'
import type Ability from '../../models/domain/ability/Ability'
import AbilityMove from '../../models/domain/ability/abilities/AbilityMove'
import AbilitySwiftStrike from '../../models/domain/ability/abilities/AbilitySwiftStrike'
import ActionParams from '../../models/domain/incursion/ActionParams'
import { CharacterModel } from '../../models/schemas/entity/CharacterSchema'
import { IncursionInstanceModel } from '../../models/schemas/incursion/IncursionInstanceSchema'
import { IncursionTemplateModel } from '../../models/schemas/incursion/IncursionTemplateSchema'
import { safeHandler } from './safeHandler'

function resolveAbility(abilityId: AbilityId): Ability | undefined {
  switch (abilityId) {
    case AbilityId.MOVE: return new AbilityMove()
    case AbilityId.SWIFT_STRIKE: return new AbilitySwiftStrike()
    default: return undefined
  }
}

export function registerIncursionHandlers(io: Server, socket: Socket, incursionManager: IncursionManager) {
  socket.on('incursion:begin', safeHandler(async (_data, callback) => {
    const characterDoc = await CharacterModel.findOne({
      owner: socket.data.userId
    }).lean()

    if (characterDoc == null) {
      console.error('Failed to find character when beginning incursion')
      callback()
      return
    }

    const character = await CharacterMapper.toDomain(characterDoc)

    // temporarily just take the first template
    const templateDoc = await IncursionTemplateModel.findOne().lean()

    if (templateDoc == null) {
      console.error('Failed to find suitable template when beginning incursion')
      callback()
      return
    }

    const template = IncursionTemplateMapper.toDomain(templateDoc)
    const result = IncursionGenerator.generateIncursion(template, character)
    const toDb = IncursionMapper.toDb(result)

    try {
      const saved = await IncursionInstanceModel.create({
        incursionId: toDb.incursionId,
        name: toDb.name,
        level: toDb.level,
        rooms: toDb.rooms,
        currentRoom: toDb.currentRoom,
        theme: toDb.theme
      })

      await CharacterModel.updateOne(
        { _id: characterDoc._id },
        { $set: {
          currentIncursion: saved._id
        } }
      )

      const incursionId = saved._id.toString()
      incursionManager.addIncursion(incursionId, result)
      socket.join(incursionId)
      socket.data.incursionId = incursionId

      callback(toDb)
    } catch (err) {
      console.error('Failed to save incursion', err)
      callback()
    }
  }))

  socket.on('incursion:join', safeHandler(async (_data, callback) => {
    const characterDoc = await CharacterModel.findOne({
      owner: socket.data.userId
    }).lean()

    if (!characterDoc?.currentIncursion) {
      callback?.()
      return
    }

    const incursionId = characterDoc.currentIncursion.toString()

    // Load into manager if not already present
    if (!incursionManager.getIncursion(incursionId)) {
      const incursionDoc = await IncursionInstanceModel.findById(incursionId).lean()
      if (!incursionDoc) {
        callback?.()
        return
      }
      const incursion = IncursionMapper.toDomain(incursionDoc)
      incursionManager.addIncursion(incursionId, incursion)
    }

    socket.join(incursionId)
    socket.data.incursionId = incursionId
    callback?.({ joined: true })
  }))

  socket.on('incursion:action', safeHandler(async (data: IIncursionActionDto, callback) => {
    console.log('Received action:', data)
    const incursionId = socket.data.incursionId as string | undefined
    if (!incursionId) {
      console.log('No incursionId on socket')
      callback?.()
      return
    }

    const incursion = incursionManager.getIncursion(incursionId)
    if (!incursion) {
      console.log('Incursion not found in manager for id:', incursionId)
      callback?.()
      return
    }

    const userEntity = incursion.findEntityById('character')
    if (!userEntity) {
      console.log('Could not find character entity. Entities:', incursion.currentRoom.entities.map(e => e.entity.entityId))
      callback?.()
      return
    }
    console.log('Found character at:', userEntity.position.x, userEntity.position.y)

    const ability = resolveAbility(data.abilityId)
    if (!ability) {
      callback?.()
      return
    }

    const params = new ActionParams(data.direction, data.targetEntityId)
    incursion.queueAction(userEntity.entity, ability, params)
    callback?.({ queued: true })
  }))
}
