import type { Vector2, Vector3 } from 'three'
import { Color, Mesh, MeshPhongMaterial } from 'three'
import { Text } from 'troika-three-text'
import GraphicObject from '../GraphicObject'
import OpaqueCuboid from '../shapes/OpaqueCuboid'

const DEFAULT_COLOR = new Color(0xFFFFFF)
const HIGHLIGHT_COLOR = new Color(0x88CCFF)

export default class Tile extends GraphicObject {
  private cuboid!: GraphicObject

  public constructor(
    public size: Vector3,
    public color: Color,
    public coord: Vector2
  ) {
    super()
  }

  public assemble(): GraphicObject {
    this.cuboid = new OpaqueCuboid(this.size, this.color).assemble()
    this.add(this.cuboid)

    const text = new Text()
    text.text = `[${this.coord.x},${this.coord.y}]`
    text.fontSize = 30
    text.color = '#000000'
    text.anchorX = 'center'
    text.anchorY = 'middle'
    text.position.y = this.size.y / 2 + 0.01
    text.rotation.x = -Math.PI / 2
    text.sync()
    this.add(text)

    return this
  }

  public highlight() {
    this.setColor(HIGHLIGHT_COLOR)
  }

  public unhighlight() {
    this.setColor(DEFAULT_COLOR)
  }

  private setColor(color: Color) {
    this.cuboid.traverse((child) => {
      if (child instanceof Mesh && child.material instanceof MeshPhongMaterial) {
        child.material.color.copy(color)
      }
    })
  }
}
