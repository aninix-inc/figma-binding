const PART_LENGTH = 8
export const generateId = () => {
  const part1 = Date.now()
    .toString(36)
    .slice(0, PART_LENGTH)
    .padEnd(PART_LENGTH, '0')
  const part2 = Math.random()
    .toString(36)
    .substring(2)
    .slice(0, PART_LENGTH)
    .padEnd(PART_LENGTH, '0')
  return part1.concat(part2)
}
