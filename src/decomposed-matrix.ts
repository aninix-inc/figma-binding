import { round } from './round'

type DecomposedMatrix = {
  translation: {
    x: number
    y: number
  }
  rotation: {
    x: number
  }
  scaling: {
    x: number
    y: number
  }
  skewing: {
    x: number
    y: number
  }
}

// http://dev.w3.org/csswg/css3-2d-transforms/#matrix-decomposition
// http://www.maths-informatique-jeux.com/blog/frederic/?post/2013/12/01/Decomposition-of-2D-transform-matrices
// https://github.com/wisec/DOMinator/blob/master/layout/style/nsStyleAnimation.cpp#L946
export const decomposedMatrix = (
  matrix: [[number, number, number], [number, number, number]]
): DecomposedMatrix => {
  const a = matrix[0][0]
  const b = matrix[0][1]
  const c = matrix[1][0]
  const d = matrix[1][1]
  const det = a * d - b * c
  const sqrt = Math.sqrt
  const atan2 = Math.atan2
  const degrees = 180 / Math.PI
  let rotate: number
  let scale: [number, number]
  let skew: [number, number]
  if (a !== 0 || b !== 0) {
    const r = sqrt(a * a + b * b)
    rotate = Math.acos(a / r) * (b > 0 ? 1 : -1)
    scale = [r, det / r]
    skew = [atan2(a * c + b * d, r * r), 0]
    // skew = [atan2(a * c + b * d, det), 0]
  } else if (c !== 0 || d !== 0) {
    const s = sqrt(c * c + d * d)
    // rotate = Math.PI / 2 - (d > 0 ? Math.acos(-c / s) : -Math.acos(c / s))
    rotate = Math.asin(c / s) * (d > 0 ? 1 : -1)
    scale = [det / s, s]
    skew = [0, atan2(a * c + b * d, s * s)]
    // skew = [0, atan2(a * c + b * d, det)]
  } else {
    // a = b = c = d = 0
    rotate = 0
    skew = scale = [0, 0]
  }
  return {
    translation: {
      x: round(matrix[0][2]),
      y: round(matrix[1][2]),
    },
    rotation: {
      x: round(rotate * degrees),
    },
    scaling: {
      x: round(scale[0]),
      y: round(scale[1]),
    },
    skewing: {
      x: round(skew[0] * degrees),
      y: round(skew[1] * degrees),
    },
  }
}
