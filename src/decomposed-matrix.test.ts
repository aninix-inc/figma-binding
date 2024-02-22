import { describe, test, expect } from 'bun:test'
import {
  decomposedMatrix,
  type DecomposedMatrix,
  unflatten,
} from './decomposed-matrix'
import { round } from './round'

export type ComponentMatrices = {
  translationMatrix: number[]
  rotationMatrix: number[]
  scalingMatrix: number[]
  skewingMatrix: number[]
}

const multiplyMatrices = (...matrices: number[][]): number[] => {
  return matrices.reduce(
    (result, matrix) => {
      const [a, b, c, d, e, f] = result
      const [g, h, i, j, k, l] = matrix

      result[0] = a * g + b * i
      result[1] = a * h + b * j
      result[2] = c * g + d * i
      result[3] = c * h + d * j
      result[4] = e * g + f * i + k
      result[5] = e * h + f * j + l

      return result
    },
    [1, 0, 0, 1, 0, 0]
  )
}

const composeMatrix = (components: DecomposedMatrix): number[] => {
  const { translation, rotation, scaling, skewing } = components

  const rads = Math.PI / 180
  const translationMatrix = [1, 0, 0, 1, translation.x, translation.y]
  const rotationMatrix = [
    Math.cos(rotation.x * rads),
    -Math.sin(rotation.x * rads),
    Math.sin(rotation.x * rads),
    Math.cos(rotation.x * rads),
    0,
    0,
  ]
  const scalingMatrix = [scaling.x, 0, 0, scaling.y, 0, 0]
  const skewingMatrix = [
    1,
    Math.tan(skewing.y * rads),
    Math.tan(skewing.x * rads),
    1,
    0,
    0,
  ]

  return multiplyMatrices(
    rotationMatrix,
    skewingMatrix,
    scalingMatrix,
    translationMatrix
  )
}

const testMatrix = [
  [0.87, 0.87, 72.99],
  [0.5, -0.5, 62.38],
] as [[number, number, number], [number, number, number]]

describe('decomposedMatrix', () => {
  test('decomposedMatrix', () => {
    const components = decomposedMatrix(testMatrix)
    const result = composeMatrix(components).map((i) => round(i, { fixed: 2 }))
    expect(unflatten(result as any)).toMatchSnapshot()
    expect(result).toMatchSnapshot()
  })
})
