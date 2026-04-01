import type { AbilityId } from '../enums/AbilityId'
import type { Direction } from '../enums/Direction'
import type { IPositionDto } from './IPositionDto'

export interface IIncursionActionDto {
  abilityId: AbilityId
  direction?: Direction
  targetPosition?: IPositionDto
  targetEntityId?: string
}
