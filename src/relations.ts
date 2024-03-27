export class Relations {
  private _map = new Map<string, Set<string>>()

  public addRelation = (from: string, to: string): this => {
    let set = this._map.get(from)

    if (set === undefined) {
      set = new Set<string>()
      this._map.set(from, set)
    }

    set.add(to)

    return this
  }

  toJSON = (): Record<string, string[]> => {
    const map: Record<string, string[]> = {}

    for (const key of this._map.keys()) {
      const set = this._map.get(key)

      if (set === undefined) {
        continue
      }

      map[key] = Array.from(set.values())
    }

    return map
  }
}
