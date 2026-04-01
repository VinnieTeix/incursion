import type { IIncursionEventDto } from '@incursion/dto'
import type Entity from '../../entity/Entity'
import type Incursion from '../../incursion/Incursion'
import type ActionParams from '../../incursion/ActionParams'
import type IAbilityConfig from '../IAbilityConfig'
import { AbilityId, EntityStatId, TargetType } from '@incursion/dto'
import Ability from '../Ability'

export default class AbilitySwiftStrike extends Ability {
  public constructor() {
    const config: IAbilityConfig = {
      abilityId: AbilityId.SWIFT_STRIKE,
      name: 'SWIFT STRIKE',
      description: 'Strike an adjacent enemy with a swift blow.',
      cooldown: 0,
      targetType: TargetType.OTHER,
      effect: function (user: Entity, context: Incursion, params: ActionParams): IIncursionEventDto | null {
        if (!params.targetEntityId) return null

        const userIie = context.findEntityById(user.entityId)
        const targetIie = context.findEntityById(params.targetEntityId)
        if (!userIie || !targetIie) return null

        const strengthStat = user.stats.find(s => s.statId === EntityStatId.STRENGTH)
        const damage = strengthStat ? strengthStat.currentValue : 1

        const healthStat = targetIie.entity.stats.find(s => s.statId === EntityStatId.HEALTH)
        if (!healthStat) return null

        healthStat.baseValue -= damage

        if (healthStat.baseValue <= 0) {
          context.removeEntity(targetIie.entity.entityId)
          return {
            type: 'death',
            sourceEntityId: user.entityId,
            targetEntityId: targetIie.entity.entityId,
            value: damage
          }
        }

        return {
          type: 'damage',
          sourceEntityId: user.entityId,
          targetEntityId: targetIie.entity.entityId,
          value: damage
        }
      },
      condition: function (user: Entity, context: Incursion, params: ActionParams): boolean {
        if (!params.targetEntityId) return false

        const userIie = context.findEntityById(user.entityId)
        const targetIie = context.findEntityById(params.targetEntityId)
        if (!userIie || !targetIie) return false

        // Check adjacency (Manhattan distance 1)
        const dx = Math.abs(userIie.position.x - targetIie.position.x)
        const dy = Math.abs(userIie.position.y - targetIie.position.y)
        if (dx + dy !== 1) return false

        // Check target has health
        const healthStat = targetIie.entity.stats.find(s => s.statId === EntityStatId.HEALTH)
        if (!healthStat || healthStat.currentValue <= 0) return false

        return true
      }
    }

    super(config)
  }
}
