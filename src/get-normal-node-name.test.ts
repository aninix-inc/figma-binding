import { describe, expect, test } from 'bun:test'
import { ANINIX_NAME_PART } from './constants'
import { getNormalNodeName } from './get-normal-node-name'

describe('getNormalNodeName', () => {
  test('regular name', () => {
    expect(getNormalNodeName('some name')).toEqual('some name')
  })

  test('modified name', () => {
    expect(getNormalNodeName(`${ANINIX_NAME_PART}some name`)).toEqual(
      'some name'
    )
  })
})
