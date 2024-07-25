import {
  ANINIX_NODE_KEY,
  ANINIX_PROJECT_KEY,
  ANINIX_WORKSPACE_KEY,
} from './constants'
import { generateId } from './generate-id'
import { getNormalNodeName } from './get-normal-node-name'
import { getPageBackgroundColor } from './get-page-background-color'
import { isProjectAttachedToNode } from './is-project-attached-to-node'
import { mapCreateRenderJobResourceToHash } from './map-create-render-job-resource-to-hash'
import {
  Options,
  defaultGetNodeId,
  defaultGetProjectId,
  snapshot,
} from './snapshot'
import type { AninixSnapshot } from './types'

// @NOTE: using a class here improves performance in case of high mapper utilization
/**
 * @todo add test
 */
class Bind {
  constructor(
    private readonly node: SceneNode,
    private readonly options?: Options
  ) {}

  /**
   * @deprecated Use `.snapshot()` instead. It provides more clear API.
   */
  getSnapshot = async (): Promise<AninixSnapshot> => this.snapshot()

  snapshot = () => snapshot(this.node, this.options)
}

export const bind = (node: SceneNode, options?: Options) =>
  new Bind(node, options)
export {
  ANINIX_NODE_KEY,
  ANINIX_PROJECT_KEY,
  ANINIX_WORKSPACE_KEY,
  generateId,
  defaultGetNodeId as getNodeId,
  getNormalNodeName,
  getPageBackgroundColor,
  defaultGetProjectId as getProjectId,
  isProjectAttachedToNode,
  mapCreateRenderJobResourceToHash,
}
