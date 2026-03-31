<script lang="ts">
import type CommunicationManager from '@/managers/CommunicationManager'
import type Renderer from '@/rendering/Renderer'
import { AbilityId, Direction, EntityKind } from '@incursion/dto'
import { defineComponent, inject } from 'vue'
import NotificationManager from '@/managers/NotificationManager'
import { useCharacterStore } from '@/stores/CharacterStore'
import { useIncursionStore } from '@/stores/IncursionStore'

export default defineComponent({
  name: 'IncursionContainer',

  setup() {
    const characterStore = useCharacterStore()
    const incursionStore = useIncursionStore()
    const renderer = inject('renderer') as Renderer
    const comm = inject('communicationManager') as CommunicationManager

    return { characterStore, incursionStore, renderer, comm }
  },

  data() {
    return {
      onKeyDown: null as ((e: KeyboardEvent) => void) | null
    }
  },

  mounted() {
    const canvas = this.$refs.canvas as HTMLCanvasElement

    if (!canvas) {
      NotificationManager.error('Canvas element not found.')
      return
    }

    this.renderer.init(canvas)

    const incursion = this.incursionStore.incursion

    if (!incursion) {
      NotificationManager.error('No current incursion exists.')
      return
    }
    this.renderer.buildIncursionScene(incursion)
    this.renderer.startRendering()

    // Register state update handler to re-render entities
    this.incursionStore.registerStateUpdateHandler(this.comm, (entities) => {
      this.renderer.updateEntityPositions(entities)
    })

    this.onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault()
        this.renderer.toggleDebugHelpers()
        return
      }

      const key = e.key.toLowerCase()
      console.log('Key pressed:', key)

      // WASD movement
      if (key === 'w') {
        this.incursionStore.sendAction(this.comm, { abilityId: AbilityId.MOVE, direction: Direction.UP })
      } else if (key === 's') {
        this.incursionStore.sendAction(this.comm, { abilityId: AbilityId.MOVE, direction: Direction.DOWN })
      } else if (key === 'a') {
        this.incursionStore.sendAction(this.comm, { abilityId: AbilityId.MOVE, direction: Direction.LEFT })
      } else if (key === 'd') {
        this.incursionStore.sendAction(this.comm, { abilityId: AbilityId.MOVE, direction: Direction.RIGHT })
      }

      // Space for attack
      if (key === ' ') {
        e.preventDefault()
        const targetId = this.findAdjacentEnemy()
        if (targetId) {
          this.incursionStore.sendAction(this.comm, { abilityId: AbilityId.SWIFT_STRIKE, targetEntityId: targetId })
        }
      }
    }
    window.addEventListener('keydown', this.onKeyDown)
  },

  unmounted() {
    if (this.onKeyDown) {
      window.removeEventListener('keydown', this.onKeyDown)
    }
    this.incursionStore.unregisterStateUpdateHandler(this.comm)
  },

  methods: {
    findAdjacentEnemy(): string | undefined {
      const incursion = this.incursionStore.incursion
      if (!incursion) return undefined

      const player = incursion.currentRoom.entities.find(
        e => e.entity.kind === EntityKind.CHARACTER
      )
      if (!player) return undefined

      for (const iie of incursion.currentRoom.entities) {
        if (iie.entity.kind === EntityKind.ADVERSARY) {
          const dx = Math.abs(player.position.x - iie.position.x)
          const dy = Math.abs(player.position.y - iie.position.y)
          if (dx + dy === 1) {
            return iie.entity.entityId
          }
        }
      }

      return undefined
    }
  }
})
</script>

<template>
  <div class="incursion-container full">
    <canvas ref="canvas" class="canvas" />
  </div>
</template>

<style scoped>
.full {
  width: calc(100% - 20px);
  height: calc(100% - 20px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas {
  width: 100%;
  height: 100%;
  border-radius: 20px;
}

.canvas:focus {
  outline: none;
}
</style>
