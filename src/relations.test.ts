import { beforeEach, describe, expect, test } from 'bun:test'
import { Relations } from './relations'

describe('relations', () => {
  let relations: Relations

  beforeEach(() => {
    relations = new Relations()
    relations.addRelation('123', '456')
  })

  test('json', () => {
    expect(relations.toJSON()).toEqual({
      '123': ['456'],
    })
  })
})
