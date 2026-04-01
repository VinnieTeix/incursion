import type { Server } from 'socket.io'
import type Incursion from '../models/domain/incursion/Incursion'
import IncursionInstanceEntityMapper from '../mappers/entity/IncursionInstanceEntityMapper'

const TICK_RATE = 20
const TICK_INTERVAL = 1000 / TICK_RATE

export default class IncursionManager {
  private incursions: Map<string, Incursion> = new Map()
  private intervalId: ReturnType<typeof setInterval> | null = null
  private lastTime = Date.now()

  public constructor(private io: Server) {}

  public addIncursion(id: string, incursion: Incursion) {
    this.incursions.set(id, incursion)

    if (!this.intervalId) {
      this.start()
    }
  }

  public removeIncursion(id: string) {
    this.incursions.delete(id)

    if (this.incursions.size === 0) {
      this.stop()
    }
  }

  public getIncursion(id: string): Incursion | undefined {
    return this.incursions.get(id)
  }

  private start() {
    this.lastTime = Date.now()
    this.intervalId = setInterval(() => {
      const now = Date.now()
      const delta = now - this.lastTime
      this.lastTime = now

      this.tick(delta)
    }, TICK_INTERVAL)
  }

  private stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private tick(delta: number) {
    for (const [id, incursion] of this.incursions) {
      const events = incursion.tick(delta)

      if (events.length > 0) {
        this.io.to(id).emit('incursion:stateUpdate', {
          entities: incursion.currentRoom.entities.map(e => IncursionInstanceEntityMapper.toDto(e)),
          events
        })
      }
    }
  }
}
