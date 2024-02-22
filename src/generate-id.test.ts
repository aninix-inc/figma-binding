import { describe, test, expect } from 'bun:test'
import { generateId } from './generate-id'

describe('generateId', () => {
  test('length', () => {
    const result = generateId()
    console.log({ result })
    expect(result.length).toEqual(16)
  })

  test('uniqness', () => {
    const result1 = generateId()
    const result2 = generateId()
    expect(result1).not.toEqual(result2)
  })
})
