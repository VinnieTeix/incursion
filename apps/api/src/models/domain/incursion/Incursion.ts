import type { IIncursionEventDto, IncursionId, IncursionTheme } from '@incursion/dto'
import type Ability from '../ability/Ability'
import type Entity from '../entity/Entity'
import type IncursionInstanceEntity from '../entity/IncursionInstanceEntity'
import type ActionParams from './ActionParams'
import type IncursionRoom from './IncursionRoom'
import Position from './Position'

export default class Incursion {
  private queuedActions: {
    user: Entity
    action: Ability
    params: ActionParams
  }[] = []

  public constructor(
    public incursionId: IncursionId,
    public name: string,
    public level: number,
    public rooms: IncursionRoom[],
    public currentRoom: IncursionRoom,
    public theme: IncursionTheme
  ) {}

  public tick(delta: number): IIncursionEventDto[] {
    const events = this.processQueuedActions()
    this.processCooldowns(delta)
    return events
  }

  public queueAction(user: Entity, action: Ability, params: ActionParams) {
    // Deduplicate: one action per entity per tick
    const existing = this.queuedActions.findIndex(qa => qa.user.entityId === user.entityId)
    if (existing !== -1) {
      this.queuedActions[existing] = { user, action, params }
    } else if (action.canUse(user, this, params)) {
      this.queuedActions.push({ user, action, params })
    } else {
      console.warn(`${user.entityId} tried to use ${action.abilityId} but can't use it.`)
    }
  }

  public processQueuedActions(): IIncursionEventDto[] {
    const events: IIncursionEventDto[] = []
    if (this.queuedActions.length > 0) console.log('Processing', this.queuedActions.length, 'queued actions')
    for (const qa of this.queuedActions) {
      const event = qa.action.execute(qa.user, this, qa.params)
      console.log('Action result:', event)
      if (event) {
        events.push(event)
      }
    }
    this.queuedActions = []
    return events
  }

  public processCooldowns(delta: number) {
    for (const iie of this.currentRoom.entities) {
      // reduce cooldown timer
      // TODO: add AbilityInstance to iie
    }
  }

  public findEntityById(entityId: string): IncursionInstanceEntity | undefined {
    return this.currentRoom.entities.find(iie => iie.entity.entityId === entityId)
  }

  public getEntityAt(position: Position): IncursionInstanceEntity | undefined {
    return this.currentRoom.entities.find(
      iie => iie.position.x === position.x && iie.position.y === position.y
    )
  }

  public isInBounds(position: Position): boolean {
    return position.x >= 0
      && position.x < this.currentRoom.width
      && position.y >= 0
      && position.y < this.currentRoom.height
  }

  public removeEntity(entityId: string): void {
    this.currentRoom.entities = this.currentRoom.entities.filter(
      iie => iie.entity.entityId !== entityId
    )
  }
}
