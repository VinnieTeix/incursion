import type { AbilityId } from '../enums/AbilityId'
import type { Direction } from '../enums/Direction'

export interface IIncursionActionDto {
  abilityId: AbilityId
  direction?: Direction
  targetEntityId?: string
}
