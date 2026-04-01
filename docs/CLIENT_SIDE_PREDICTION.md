# Client-Side Prediction Architecture

## Problem

The client sends a move action, waits for the server tick (up to 50ms at 20 ticks/sec), then receives the state update. This creates perceptible input lag, especially on higher-latency connections.

## Approach: Optimistic Prediction with Server Reconciliation

### 1. Sequence Numbering

Each action gets a monotonically increasing sequence number so the server can tell the client which actions it has processed.

**DTO changes:**

```ts
// IIncursionActionDto — add seq
interface IIncursionActionDto {
  abilityId: AbilityId
  targetPosition?: IPositionDto
  targetEntityId?: string
  seq?: number  // NEW: client-assigned sequence number
}

// IIncursionStateUpdateDto — add per-entity acknowledgment
interface IIncursionStateUpdateDto {
  entities: IIncursionInstanceEntityDto[]
  events: IIncursionEventDto[]
  lastProcessedSeq?: Record<string, number>  // NEW: entityId -> last processed seq
}
```

### 2. Client-Side Prediction Store

In `IncursionStore.ts`, add:

```ts
state: {
  // ...existing state
  pendingActions: Array<{
    seq: number
    targetPosition: { x: number, y: number }
  }>
  nextSeq: number
}
```

**Modified `sendAction()` flow:**

1. Increment `nextSeq`
2. Compute predicted position locally (same validation as server: in bounds, not occupied, within range)
3. Push to `pendingActions` with seq and predicted position
4. Optimistically update the local player entity position
5. Re-highlight valid move tiles based on predicted position
6. Send action to server with `seq` field

### 3. Server-Side Seq Tracking

In the socket handler (`incursion.ts`):
- Store the latest `seq` per socket/entity when receiving actions
- Pass `seq` through to `ActionParams`

In `Incursion.ts`:
- Store `lastProcessedSeq` per entity when processing queued actions

In `IncursionManager.ts`:
- Include `lastProcessedSeq` map in the `incursion:stateUpdate` emit

### 4. Reconciliation on State Update

When `incursion:stateUpdate` is received:

1. Read `lastProcessedSeq` for the player entity
2. Remove all entries from `pendingActions` where `seq <= lastProcessedSeq`
3. Compare server-authoritative position with current local position
4. **If positions match:** No correction needed (prediction was correct)
5. **If positions differ:** Snap to server position, then re-apply any remaining unprocessed predictions on top
6. Update highlights based on final reconciled position

### 5. Rendering Interpolation

When a correction occurs (server disagrees with prediction), avoid jarring snaps:

In `IncursionSceneBuilder.ts`:
- Track a "visual position" separate from "logical position" for the player
- When a correction happens, set logical position immediately but interpolate visual position over ~100ms
- In `Renderer.animate()`, lerp visual position toward logical position each frame

### 6. Edge Cases

- **Collision prediction:** Client must replicate server collision checks (occupied tile, out of bounds) using its local entity list. The entity list comes from state updates so it may be slightly stale.
- **Stale predictions:** If the player clicks faster than ticks, multiple predictions queue up. Reconciliation must re-apply all unconfirmed predictions on top of the server's confirmed state.
- **Non-player entities:** Only predict the local player. All other entities use server-authoritative positions directly.
- **State-only emit:** Currently the server only emits `stateUpdate` when `events.length > 0`. For prediction, consider always emitting (or sending a lightweight ack) so the client can reconcile even when its action was rejected.

## Files to Modify

| File | Change |
|------|--------|
| `packages/dto/.../IIncursionActionDto.ts` | Add `seq` field |
| `packages/dto/.../IIncursionStateUpdateDto.ts` | Add `lastProcessedSeq` |
| `apps/web/src/stores/IncursionStore.ts` | Prediction queue, optimistic updates, reconciliation |
| `apps/api/src/socket/handlers/incursion.ts` | Track seq per entity |
| `apps/api/src/managers/IncursionManager.ts` | Include seq in state broadcasts |
| `apps/api/src/models/domain/incursion/Incursion.ts` | Store last-processed seq per entity |
| `apps/web/src/rendering/scene-builders/IncursionSceneBuilder.ts` | Visual interpolation for corrections |
| `apps/web/src/rendering/Renderer.ts` | Pass delta time for interpolation |
