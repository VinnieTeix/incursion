import type { Direction } from '@incursion/dto'

export default class ActionParams {
  public constructor(
    public direction?: Direction,
    public targetEntityId?: string
  ) {}
}
