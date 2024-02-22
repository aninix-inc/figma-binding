import { ANINIX_NAME_PART } from './constants'

/**
 * Check if name should be modified and return updated name if so.
 */
export const getNormalNodeName = (nodeName: string): string =>
  nodeName.includes(ANINIX_NAME_PART)
    ? nodeName.replace(ANINIX_NAME_PART, '')
    : nodeName
