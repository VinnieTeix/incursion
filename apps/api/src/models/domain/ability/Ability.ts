import type { AbilityId, IIncursionEventDto, TargetType } from '@incursion/dto'
import type Entity from '../entity/Entity'
import type Incursion from '../incursion/Incursion'
import type ActionParams from '../incursion/ActionParams'
import type IAbilityConfig from './IAbilityConfig'

// DOES NOT need conversion, as the mapper does that
export default class Ability {
  public abilityId: AbilityId
  public name: string
  public description: string
  public cooldown: number
  public targetType: TargetType
  public effect: (user: Entity, context: Incursion, params: ActionParams) => IIncursionEventDto | null
  public condition: (user: Entity, context: Incursion, params: ActionParams) => boolean

  public constructor(config: IAbilityConfig) {
    this.abilityId = config.abilityId
    this.name = config.name
    this.description = config.description
    this.cooldown = config.cooldown
    this.targetType = config.targetType
    this.effect = config.effect
    this.condition = config.condition
  }

  public canUse(user: Entity, context: Incursion, params: ActionParams): boolean {
    if (this.condition(user, context, params) === true) {
      return true
    }

    return false
  }

  public execute(user: Entity, context: Incursion, params: ActionParams): IIncursionEventDto | null {
    return this.effect(user, context, params)
  }
}
