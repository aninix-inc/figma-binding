import { describe, expect, test } from 'bun:test'
import { round } from './round'

describe('round', () => {
  test('performance', () => {
    const start = Date.now()

    for (let i = 0; i < 10000; i += 1) {
      round(150.500515, 4)
    }

    const end = Date.now()
    const runngiTimeMs = end - start
    console.log('runningTimeMs', runngiTimeMs)
    expect(runngiTimeMs).toBeLessThan(15)
  })

  test('round', () => {
    expect(round(150.500515)).toEqual(150.5005)
  })

  test('round to zero numbers', () => {
    expect(round(150.500515, 0)).toEqual(151)
  })
})
