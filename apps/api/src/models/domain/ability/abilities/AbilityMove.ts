import type { IIncursionEventDto } from '@incursion/dto'
import type Entity from '../../entity/Entity'
import type Incursion from '../../incursion/Incursion'
import type ActionParams from '../../incursion/ActionParams'
import type IAbilityConfig from '../IAbilityConfig'
import { AbilityId, Direction, TargetType } from '@incursion/dto'
import Position from '../../incursion/Position'
import Ability from '../Ability'

function directionToOffset(direction: Direction): { dx: number, dy: number } {
  switch (direction) {
    case Direction.UP: return { dx: 0, dy: -1 }
    case Direction.DOWN: return { dx: 0, dy: 1 }
    case Direction.LEFT: return { dx: -1, dy: 0 }
    case Direction.RIGHT: return { dx: 1, dy: 0 }
  }
}

export default class AbilityMove extends Ability {
  public constructor() {
    const config: IAbilityConfig = {
      abilityId: AbilityId.MOVE,
      name: 'MOVE',
      description: 'Move 1 unit up, down, left or right.',
      cooldown: 1,
      targetType: TargetType.SELF,
      effect: function (user: Entity, context: Incursion, params: ActionParams): IIncursionEventDto | null {
        if (params.direction == null) return null

        const iie = context.findEntityById(user.entityId)
        if (!iie) return null

        const { dx, dy } = directionToOffset(params.direction)
        iie.position.x += dx
        iie.position.y += dy

        return {
          type: 'move',
          sourceEntityId: user.entityId,
          position: { x: iie.position.x, y: iie.position.y }
        }
      },
      condition: function (user: Entity, context: Incursion, params: ActionParams): boolean {
        if (params.direction == null) return false

        const iie = context.findEntityById(user.entityId)
        if (!iie) return false

        const { dx, dy } = directionToOffset(params.direction)
        const targetPos = new Position(iie.position.x + dx, iie.position.y + dy)

        if (!context.isInBounds(targetPos)) return false
        if (context.getEntityAt(targetPos)) return false

        return true
      }
    }

    super(config)
  }
}
