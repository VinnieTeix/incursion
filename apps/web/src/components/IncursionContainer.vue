<script lang="ts">
import type CommunicationManager from '@/managers/CommunicationManager'
import type Renderer from '@/rendering/Renderer'
import { AbilityId, EntityKind } from '@incursion/dto'
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
      onKeyDown: null as ((e: KeyboardEvent) => void) | null,
      onClick: null as ((e: MouseEvent) => void) | null
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
    }
    window.addEventListener('keydown', this.onKeyDown)

    this.onClick = (e: MouseEvent) => {
      const tileCoord = this.renderer.raycastTile(e)
      if (!tileCoord) return

      const player = this.incursionStore.incursion?.currentRoom.entities.find(
        ent => ent.entity.kind === EntityKind.CHARACTER
      )
      if (!player) return

      const dx = tileCoord.x - player.position.x
      const dy = tileCoord.y - player.position.y
      if (dx === 0 && dy === 0) return

      // Must be a straight line (cardinal or diagonal)
      if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return

      this.incursionStore.sendAction(this.comm, {
        abilityId: AbilityId.MOVE,
        targetPosition: { x: tileCoord.x, y: tileCoord.y }
      })
    }
    canvas.addEventListener('click', this.onClick)
  },

  unmounted() {
    if (this.onKeyDown) {
      window.removeEventListener('keydown', this.onKeyDown)
    }
    if (this.onClick) {
      const canvas = this.$refs.canvas as HTMLCanvasElement
      canvas?.removeEventListener('click', this.onClick)
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
