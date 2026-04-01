import type { IIncursionEventDto } from '@incursion/dto'
import type Entity from '../../entity/Entity'
import type Incursion from '../../incursion/Incursion'
import type ActionParams from '../../incursion/ActionParams'
import type IAbilityConfig from '../IAbilityConfig'
import { AbilityId, EntityStatId, TargetType } from '@incursion/dto'
import Position from '../../incursion/Position'
import Ability from '../Ability'

/**
 * Returns all integer grid positions along the line from (x0,y0) to (x1,y1),
 * excluding the start position.
 */
function getLineTiles(x0: number, y0: number, x1: number, y1: number): Position[] {
  const tiles: Position[] = []
  const dx = Math.sign(x1 - x0)
  const dy = Math.sign(y1 - y0)
  let x = x0 + dx
  let y = y0 + dy

  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let i = 0; i < steps; i++) {
    tiles.push(new Position(x, y))
    x += dx
    y += dy
  }

  return tiles
}

export default class AbilityMove extends Ability {
  public constructor() {
    const config: IAbilityConfig = {
      abilityId: AbilityId.MOVE,
      name: 'MOVE',
      description: 'Move up to your move range in a straight line (cardinal or diagonal).',
      cooldown: 1,
      targetType: TargetType.SELF,

      effect: function (user: Entity, context: Incursion, params: ActionParams): IIncursionEventDto | null {
        if (!params.targetPosition) return null

        const iie = context.findEntityById(user.entityId)
        if (!iie) return null

        iie.position.x = params.targetPosition.x
        iie.position.y = params.targetPosition.y

        return {
          type: 'move',
          sourceEntityId: user.entityId,
          position: { x: iie.position.x, y: iie.position.y }
        }
      },

      condition: function (user: Entity, context: Incursion, params: ActionParams): boolean {
        if (!params.targetPosition) return false

        const iie = context.findEntityById(user.entityId)
        if (!iie) return false

        const dx = params.targetPosition.x - iie.position.x
        const dy = params.targetPosition.y - iie.position.y
        if (dx === 0 && dy === 0) return false

        // Must be a straight line (cardinal or diagonal)
        if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return false

        // Check move range (Chebyshev distance)
        const distance = Math.max(Math.abs(dx), Math.abs(dy))
        const moveRange = user.getStat(EntityStatId.MOVE_RANGE)?.currentValue ?? 1
        if (distance > moveRange) return false

        // Validate target is in bounds
        const targetPos = new Position(params.targetPosition.x, params.targetPosition.y)
        if (!context.isInBounds(targetPos)) return false

        // Validate every tile along the path is in bounds and unoccupied
        const pathTiles = getLineTiles(iie.position.x, iie.position.y, params.targetPosition.x, params.targetPosition.y)
        for (const tile of pathTiles) {
          if (!context.isInBounds(tile)) return false
          if (context.getEntityAt(tile)) return false
        }

        return true
      }
    }

    super(config)
  }
}
