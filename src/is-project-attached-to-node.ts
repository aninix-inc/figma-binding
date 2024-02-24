import { ANINIX_PROJECT_KEY, ANINIX_WORKSPACE_KEY } from './constants'

export const isProjectAttachedToNode = (node: SceneNode): boolean =>
  !!node.getSharedPluginData(ANINIX_WORKSPACE_KEY, ANINIX_PROJECT_KEY)
