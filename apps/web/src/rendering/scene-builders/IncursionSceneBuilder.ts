import type Renderer from '../Renderer'
import type Character from '@/datatypes/business/entity/Character'
import type Incursion from '@/datatypes/business/incursion/Incursion'
import type IncursionInstanceEntity from '@/datatypes/business/entity/IncursionInstanceEntity'
import { AmbientLight, Color, DirectionalLight, Vector2, Vector3 } from 'three'
import { EntityKind, EntityStatId } from '@incursion/dto'
import CharacterModel from '../game-objects/character-models.ts/CharacterModel'
import EntityModel from '../game-objects/character-models.ts/EntityModel'
import type GraphicObject from '../GraphicObject'
import Grid from '../Grid'
import TransparentCuboid from '../shapes/TransparentCuboid'
import SceneBuilder from './SceneBuilder'

export default class IncursionSceneBuilder extends SceneBuilder {
  private FLOOR_HEIGHT = 800
  private grid: Grid
  private floorSize = 150
  private entityModels: Map<string, GraphicObject> = new Map()

  public constructor(renderer: Renderer, public incursion: Incursion) {
    super(renderer)
    this.grid = new Grid(
      incursion.currentRoom.width,
      incursion.currentRoom.height
    )
  }

  public buildScene(): void {
    // LIGHTING
    const ambient = new AmbientLight(0xFFFFFF, 1)
    this.scene.add(ambient)
    const directional = new DirectionalLight(0xFFD861, 1)
    directional.position.set(20, 50, 0)
    this.scene.add(directional)

    // FLOOR
    const floorWidth = this.floorSize * this.incursion.currentRoom.width
    const floorDepth = this.floorSize * this.incursion.currentRoom.height
    const cuboid = new TransparentCuboid(
      new Vector3(floorWidth, this.FLOOR_HEIGHT, floorDepth),
      new Color(0xFFFFFF)
    )
    this.scene.add(cuboid.assemble())
    cuboid.position.set(0, -this.FLOOR_HEIGHT / 2, 0)

    // TILES
    this.grid.assemble()
    this.scene.add(this.grid)
    this.renderer.currentScene.add(this.grid)
    this.buildEntities()
  }

  private buildEntities() {
    for (const iie of this.incursion.currentRoom.entities) {
      if (iie.entity.kind === EntityKind.CHARACTER) {
        const characterModel = new CharacterModel(iie as unknown as Character).assemble()
        this.grid.add(characterModel)
        this.grid.placeAt(characterModel, new Vector2(iie.position.x, iie.position.y))
        this.entityModels.set(iie.entity.entityId, characterModel)
      } else {
        const entityModel = new EntityModel(iie.entity).assemble()
        this.grid.add(entityModel)
        this.grid.placeAt(entityModel, new Vector2(iie.position.x, iie.position.y))
        this.entityModels.set(iie.entity.entityId, entityModel)
      }
    }
  }

  public updateEntityPositions(entities: IncursionInstanceEntity[]) {
    const currentIds = new Set(entities.map(e => e.entity.entityId))

    // Remove models for dead entities
    for (const [entityId, model] of this.entityModels) {
      if (!currentIds.has(entityId)) {
        this.grid.remove(model)
        this.entityModels.delete(entityId)
      }
    }

    // Update positions for existing entities
    for (const iie of entities) {
      const model = this.entityModels.get(iie.entity.entityId)
      if (model) {
        this.grid.placeAt(model, new Vector2(iie.position.x, iie.position.y))
      }
    }
  }

  public highlightValidMoves(entities: IncursionInstanceEntity[]) {
    const player = entities.find(e => e.entity.kind === EntityKind.CHARACTER)
    if (!player) {
      this.grid.clearHighlights()
      return
    }

    const moveRange = player.entity.stats.find(s => s.statId === EntityStatId.MOVE_RANGE)?.currentValue ?? 1
    const px = player.position.x
    const py = player.position.y
    const validTiles: Vector2[] = []

    // 8 directions: cardinal + diagonal
    const directions = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
      { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
    ]

    for (const dir of directions) {
      for (let dist = 1; dist <= moveRange; dist++) {
        const tx = px + dir.dx * dist
        const ty = py + dir.dy * dist

        // Out of bounds — stop in this direction
        if (tx < 0 || tx >= this.incursion.currentRoom.width || ty < 0 || ty >= this.incursion.currentRoom.height) break

        // Occupied — stop in this direction
        const occupied = entities.some(e => e.position.x === tx && e.position.y === ty)
        if (occupied) break

        validTiles.push(new Vector2(tx, ty))
      }
    }

    this.grid.highlightTiles(validTiles)
  }

  public animateScene(): void {
  }
}
