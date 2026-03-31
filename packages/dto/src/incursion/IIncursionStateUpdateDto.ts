import type { IIncursionInstanceEntityDto } from '../entity/IIncursionInstanceEntityDto'
import type { IIncursionEventDto } from './IIncursionEventDto'

export interface IIncursionStateUpdateDto {
  entities: IIncursionInstanceEntityDto[]
  events: IIncursionEventDto[]
}
