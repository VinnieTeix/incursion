import type { AbilityId, IIncursionEventDto, TargetType } from '@incursion/dto'
import type Entity from '../entity/Entity'
import type Incursion from '../incursion/Incursion'
import type ActionParams from '../incursion/ActionParams'

export default interface IAbilityConfig {
  abilityId: AbilityId
  name: string
  description: string
  cooldown: number
  targetType: TargetType
  effect: (user: Entity, context: Incursion, params: ActionParams) => IIncursionEventDto | null
  condition: (user: Entity, context: Incursion, params: ActionParams) => boolean
}
