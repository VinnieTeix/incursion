import type { IPositionDto } from './IPositionDto'

export interface IIncursionEventDto {
  type: 'move' | 'damage' | 'death'
  sourceEntityId: string
  targetEntityId?: string
  value?: number
  position?: IPositionDto
}
