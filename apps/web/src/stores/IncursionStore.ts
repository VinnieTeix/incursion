import type { IIncursionActionDto, IIncursionDto, IIncursionEventDto, IIncursionStateUpdateDto } from '@incursion/dto'
import type Incursion from '@/datatypes/business/incursion/Incursion'
import type IncursionInstanceEntity from '@/datatypes/business/entity/IncursionInstanceEntity'
import type { Result } from '@/datatypes/util/Result'
import type CommunicationManager from '@/managers/CommunicationManager'
import { defineStore } from 'pinia'
import NotificationManager from '@/managers/NotificationManager'
import IncursionInstanceEntityMapper from '@/mappers/IncursionInstanceEntityMapper'
import IncursionMapper from '@/mappers/IncursionMapper'

export const useIncursionStore = defineStore('incursion', {
  state: () => {
    return {
      isViewingIncursion: false,
      incursion: undefined as Incursion | undefined,
      lastEvents: [] as IIncursionEventDto[]
    }
  },

  actions: {
    async beginIncursion(comm: CommunicationManager): Promise<Result<Incursion, Error>> {
      try {
        const incursionData = await comm.socketEmit<IIncursionDto>('incursion:begin')

        if (!incursionData) {
          NotificationManager.error('Could not begin incursion. Incursion data missing.')
          return {
            success: false,
            error: new Error('Could not begin incursion, incursion data missing.')
          }
        }

        const result = IncursionMapper.toDomain(incursionData)
        this.incursion = result
        this.isViewingIncursion = true

        return {
          success: true,
          result
        }
      } catch (err) {
        return {
          success: false,
          error: err as Error
        }
      }
    },

    sendAction(comm: CommunicationManager, action: IIncursionActionDto) {
      comm.socketEmit('incursion:action', action)
    },

    registerStateUpdateHandler(comm: CommunicationManager, onUpdate: (entities: IncursionInstanceEntity[]) => void) {
      comm.onSocket<IIncursionStateUpdateDto>('incursion:stateUpdate', (data) => {
        if (!this.incursion) return

        this.incursion.currentRoom.entities = data.entities.map(
          e => IncursionInstanceEntityMapper.toDomain(e)
        )
        this.lastEvents = data.events
        onUpdate(this.incursion.currentRoom.entities)
      })
    },

    unregisterStateUpdateHandler(comm: CommunicationManager) {
      comm.offSocket('incursion:stateUpdate')
    }
  }
})
