/**
 * @description optimized version of rounding
 */
export const round = (number: number, fixed = 4): number => {
  if (fixed === 0) {
    // Use bitwise OR to perform a fast flooring operation
    return (number + 0.5) | 0
  }

  const multiplier = 10 ** fixed
  const rounded = (number * multiplier + 0.5) | 0
  return rounded / multiplier
}
