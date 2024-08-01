import * as math from 'mathjs'
import {
  ANINIX_MAIN_NODE_KEY,
  ANINIX_NODE_KEY,
  ANINIX_PROJECT_KEY,
  ANINIX_WORKSPACE_KEY,
} from './constants'
import { decomposedMatrix } from './decomposed-matrix'
import { generateId } from './generate-id'
import { getNormalNodeName } from './get-normal-node-name'
import { getPageBackgroundColor } from './get-page-background-color'
import { Relations } from './relations'
import { round } from './round'
import type {
  AninixSnapshot,
  BackgroundBlur,
  BlendMode,
  ChildrenExpanded,
  ClipContent,
  CornerRadius,
  DropShadow,
  Ellipse,
  EntityType,
  Frame,
  Group,
  ImagePaint,
  InitialNodeId,
  InnerShadow,
  Instance,
  LayerBlur,
  Line,
  LinearGradientPaint,
  Locked,
  MainNodeComponentId,
  Mask,
  MatrixTransformKey,
  Metadata,
  ColorStop as ModelColorStop,
  Name,
  NodeColor,
  NodeType,
  NumberKey,
  Point2DKey,
  Polygon,
  PropertiesExpanded,
  RadialGradientPaint,
  Rectangle,
  RgbaKey,
  Root,
  SmoothCornerRadius,
  SolidPaint,
  Solo,
  SpatialPoint2DKey,
  Star,
  Text,
  Vector,
  VisibleInViewport,
} from './types'

type ModelNode =
  | Ellipse
  | Frame
  | Group
  | Instance
  | Line
  | Polygon
  | Rectangle
  | Star
  | Vector
  | Text
type Entity =
  | ModelColorStop
  | SolidPaint
  | LinearGradientPaint
  | RadialGradientPaint
  | ImagePaint
  | BackgroundBlur
  | DropShadow
  | InnerShadow
  | LayerBlur
  | ModelNode
  | NumberKey
  | Point2DKey
  | SpatialPoint2DKey
  | RgbaKey
  | MatrixTransformKey
  | Root

type Context = {
  projectId: string
  nodeId: string
  initialNodeId?: string
  parentNodeId?: string
}
type FigmaNode = {
  id: string
  name: string
  parent: FigmaNode | null
  getPluginData: (key: string) => string
  setPluginData: (key: string, value: string) => void
  getSharedPluginData: (workspace: string, key: string) => string
  setSharedPluginData: (workspace: string, key: string, value: string) => void
}
type GetNodeId = (node: FigmaNode, projectId: string) => string
type GetProjectId = (node: FigmaNode) => string
/**
 * @mutates node
 */
type SetNodeId = (node: FigmaNode, projectId: string, nodeId: string) => void

/// mappers

/**
 * @todo add test
 */
const mapColorStops = (
  entities: Entity[],
  entityId: string,
  colorStops: readonly ColorStop[]
): string[] => {
  return colorStops.map((colorStop, idx) => {
    const colorStopId = `${entityId}cs${idx}`

    entities.push({
      id: colorStopId,
      tag: 'colorStop',
      schemaVersion: 1,
      components: {
        entityType: 'COLOR_STOP',
        blendMode: 'NORMAL',
        visibleInViewport: true,
        propertiesExpanded: false,
        rgba: [
          round(colorStop.color.r * 255, 0),
          round(colorStop.color.g * 255, 0),
          round(colorStop.color.b * 255, 0),
          colorStop.color.a,
        ],
        progress: colorStop.position,
      },
    })

    return colorStopId
  })
}

/**
 * Undefined returned in cases when paint is not supported.
 * This case should be handled outside of this function.
 * @todo add test
 */
const mapPaint = (
  entities: Entity[],
  relations: Relations,
  entityId: string,
  paint: Paint,
  type: 'f' | 's', // fill | stroke
  index: number
): string | undefined => {
  const paintId = `${entityId}p${type}${index}`
  const paintType = paint.type

  switch (paintType) {
    case 'SOLID': {
      entities.push({
        id: paintId,
        tag: 'solidPaint',
        schemaVersion: 1,
        components: {
          entityType: 'PAINT',
          blendMode: paint.blendMode ?? 'NORMAL',
          visibleInViewport: paint.visible ?? true,
          propertiesExpanded: false,
          rgba: [
            round(paint.color.r * 255, 0),
            round(paint.color.g * 255, 0),
            round(paint.color.b * 255, 0),
            paint.opacity ?? 1,
          ],
          paintType: 'SOLID',
        },
      } satisfies SolidPaint)
      break
    }

    case 'GRADIENT_LINEAR': {
      entities.push({
        id: paintId,
        tag: 'linearGradientPaint',
        schemaVersion: 1,
        components: {
          entityType: 'PAINT',
          blendMode: paint.blendMode ?? 'NORMAL',
          visibleInViewport: paint.visible ?? true,
          propertiesExpanded: false,
          opacity: paint.opacity ?? 1,
          gradientTransform: paint.gradientTransform,
          paintType: 'GRADIENT_LINEAR',
        },
      } satisfies LinearGradientPaint)

      const colorStopIds = mapColorStops(entities, paintId, paint.gradientStops)

      for (const colorStopId of colorStopIds) {
        relations.addRelation(`${paintId}/colorStops`, `${colorStopId}/parent`)
      }

      break
    }

    case 'GRADIENT_RADIAL': {
      entities.push({
        id: paintId,
        tag: 'radialGradientPaint',
        schemaVersion: 1,
        components: {
          entityType: 'PAINT',
          blendMode: paint.blendMode ?? 'NORMAL',
          visibleInViewport: paint.visible ?? true,
          propertiesExpanded: false,
          opacity: paint.opacity ?? 1,
          gradientTransform: paint.gradientTransform,
          paintType: 'GRADIENT_RADIAL',
        },
      } satisfies RadialGradientPaint)

      const colorStopIds = mapColorStops(entities, paintId, paint.gradientStops)

      for (const colorStopId of colorStopIds) {
        relations.addRelation(`${paintId}/colorStops`, `${colorStopId}/parent`)
      }

      break
    }

    case 'IMAGE': {
      entities.push({
        id: paintId,
        tag: 'imagePaint',
        schemaVersion: 1,
        components: {
          entityType: 'PAINT',
          blendMode: paint.blendMode ?? 'NORMAL',
          visibleInViewport: paint.visible ?? true,
          propertiesExpanded: false,
          hash: paint.imageHash ?? '',
          scaleType: paint.scaleMode,
          imageTransform: paint.imageTransform ?? [
            [1, 0, 0],
            [0, 1, 0],
          ],
          scalingFactor: paint.scalingFactor ?? 1,
          rotation: paint.rotation ?? 0,
          opacity: paint.opacity ?? 1,
          paintType: 'IMAGE',
        },
      } satisfies ImagePaint)
      break
    }

    // @TODO: add support of the rest of paints.
    default:
      return undefined
  }

  return paintId
}

export const mapEntityEntryProperties = <Out extends Frame>(
  context: Context
): Pick<Out['components'], 'entry'> => {
  // @NOTE: nodeParentId would be available for children nodes only
  if (context.parentNodeId == null) {
    return {
      entry: true,
    }
  }

  return {}
}

export const mapEntityBaseProperties = (
  relations: Relations,
  node: {
    id: string
    name: string
    type:
      | EllipseNode['type']
      | BooleanOperationNode['type']
      | FrameNode['type']
      | GroupNode['type']
      | ComponentSetNode['type']
      | ComponentNode['type']
      | InstanceNode['type']
      | LineNode['type']
      | PolygonNode['type']
      | RectangleNode['type']
      | StarNode['type']
      | VectorNode['type']
      | TextNode['type']
  },
  context: Context
): {
  name: Name
  entityType: EntityType
  nodeType: NodeType
  metadata: Metadata
  initialNodeId?: InitialNodeId
  parent?: string
} => {
  if (context.parentNodeId !== undefined) {
    relations.addRelation(
      `${context.parentNodeId}/children`,
      `${context.nodeId}/parent`
    )
  }

  // @NOTE: Currently we are not supporting COMPONENT_SET and COMPONENT nodes
  // so we treat them as regular Frames.
  const nodeType = (() => {
    if (node.type === 'COMPONENT_SET' || node.type === 'COMPONENT') {
      return 'FRAME'
    }

    return node.type
  })()

  return {
    name: getNormalNodeName(node.name),
    entityType: 'NODE',
    metadata: JSON.stringify({ figmaNodeId: node.id }),
    nodeType,
    ...(context.initialNodeId != null && {
      initialNodeId: context.initialNodeId,
    }),
  }
}

export const mapEntitySceneProperties = (node: {
  locked: boolean
  visible: boolean
}): {
  nodeColor: NodeColor
  solo: Solo
  locked: Locked
  propertiesExpanded: PropertiesExpanded
  visibleInViewport: VisibleInViewport
} => ({
  nodeColor: 'BLUE',
  solo: 'NONE',
  locked: node.locked,
  propertiesExpanded: false,
  visibleInViewport: node.visible,
})

/**
 * @mutates entities
 * @mutates relations
 */
export const mapEntityBlendProperties = (
  entities: Entity[],
  relations: Relations,
  node: {
    blendMode: BlendMixin['blendMode']
    isMask: BlendMixin['isMask']
    effects: BlendMixin['effects']
  },
  nodeId: string
): {
  blendMode: BlendMode
  mask: Mask
} => {
  const effectIds = node.effects.map((effect, idx) => {
    const effectId = `${nodeId}e${idx}`

    switch (effect.type) {
      case 'DROP_SHADOW': {
        entities.push({
          id: effectId,
          tag: 'dropShadow',
          schemaVersion: 1,
          components: {
            entityType: 'EFFECT',
            propertiesExpanded: false,
            visibleInViewport: effect.visible,
            shadowRadius: effect.radius,
            shadowColor: [
              round(effect.color.r * 255, 0),
              round(effect.color.g * 255, 0),
              round(effect.color.b * 255, 0),
              effect.color.a,
            ],
            shadowOffset: [effect.offset.x, effect.offset.y],
            shadowSpread: effect.spread ?? 0,
            effectType: effect.type,
            blendMode: effect.blendMode,
          },
        } satisfies DropShadow)
        break
      }

      case 'INNER_SHADOW': {
        entities.push({
          id: effectId,
          tag: 'innerShadow',
          schemaVersion: 1,
          components: {
            entityType: 'EFFECT',
            propertiesExpanded: false,
            visibleInViewport: effect.visible,
            shadowRadius: effect.radius,
            shadowColor: [
              round(effect.color.r * 255, 0),
              round(effect.color.g * 255, 0),
              round(effect.color.b * 255, 0),
              effect.color.a,
            ],
            shadowOffset: [effect.offset.x, effect.offset.y],
            shadowSpread: effect.spread ?? 0,
            effectType: effect.type,
            blendMode: effect.blendMode,
          },
        } satisfies InnerShadow)
        break
      }

      case 'LAYER_BLUR': {
        entities.push({
          id: effectId,
          tag: 'layerBlur',
          schemaVersion: 1,
          components: {
            entityType: 'EFFECT',
            propertiesExpanded: false,
            visibleInViewport: effect.visible,
            blurRadius: effect.radius,
            effectType: effect.type,
          },
        } satisfies LayerBlur)
        break
      }

      case 'BACKGROUND_BLUR': {
        entities.push({
          id: effectId,
          tag: 'backgroundBlur',
          schemaVersion: 1,
          components: {
            entityType: 'EFFECT',
            propertiesExpanded: false,
            visibleInViewport: effect.visible,
            blurRadius: effect.radius,
            effectType: effect.type,
          },
        } satisfies BackgroundBlur)
        break
      }
    }

    return effectId
  })

  for (const effectId of effectIds) {
    relations.addRelation(`${nodeId}/effects`, `${effectId}/parent`)
  }

  return {
    blendMode: node.blendMode,
    mask: node.isMask,
  }
}

/**
 * @mutates entities
 * @mutates relations
 * @todo add test
 */
const mapEntityChildrenProperties = <
  In extends
    | FrameNode
    | GroupNode
    | ComponentSetNode
    | ComponentNode
    | InstanceNode,
>(
  entities: Entity[],
  relations: Relations,
  node: In,
  context: Context,
  mapper: (
    entities: Entity[],
    relations: Relations,
    entity: In
  ) => string | undefined | Promise<string | undefined>
):
  | {
      childrenExpanded: ChildrenExpanded
    }
  | Promise<{
      childrenExpanded: ChildrenExpanded
    }> => {
  const promises: Promise<string | undefined>[] = new Array()
  const childrenIds: string[] = new Array()

  for (const child of node.children) {
    const result = mapper(entities, relations, child as any)

    if (result == null) {
      continue
    }

    if (result instanceof Promise) {
      promises.push(result)
      continue
    }

    childrenIds.push(result)
  }

  if (promises.length > 0) {
    return Promise.all(promises)
      .then((childrenIdsFromPromises) => {
        for (const childIdFromPromises of childrenIdsFromPromises) {
          if (childIdFromPromises == null) {
            continue
          }

          childrenIds.push(childIdFromPromises)
        }
      })
      .then(() => {
        for (const childId of childrenIds) {
          relations.addRelation(
            `${context.nodeId}/children`,
            `${childId}/parent`
          )
        }

        return {
          childrenExpanded: false,
        }
      })
  }

  for (const childId of childrenIds) {
    relations.addRelation(`${context.nodeId}/children`, `${childId}/parent`)
  }

  return {
    childrenExpanded: false,
  }
}

export const mapEntityCornerProperties = (node: {
  cornerRadius: CornerMixin['cornerRadius']
  cornerSmoothing: CornerMixin['cornerSmoothing']
}): {
  cornerRadius: CornerRadius
  smoothCornerRadius: SmoothCornerRadius
} => ({
  cornerRadius: node.cornerRadius === figma.mixed ? 0 : node.cornerRadius,
  smoothCornerRadius: node.cornerSmoothing !== 0,
})

/**
 * @todo add test
 */
const mapEntityIndividualCornerProperties = <
  In extends
    | FrameNode
    | InstanceNode
    | RectangleNode
    | ComponentSetNode
    | ComponentNode,
  Out extends Frame | Instance | Rectangle,
>(
  node: In
): Pick<
  Out['components'],
  | 'individualCornerRadius'
  | 'topLeftCornerRadius'
  | 'topRightCornerRadius'
  | 'bottomRightCornerRadius'
  | 'bottomLeftCornerRadius'
> => ({
  individualCornerRadius: node.cornerRadius === figma.mixed,
  topLeftCornerRadius: round(node.topLeftRadius),
  topRightCornerRadius: round(node.topRightRadius),
  bottomRightCornerRadius: round(node.bottomRightRadius),
  bottomLeftCornerRadius: round(node.bottomLeftRadius),
})

/**
 * @mutates entities
 * @mutates relations
 * @todo add test
 */
const mapEntityGeometryProperties = <
  In extends
    | EllipseNode
    | BooleanOperationNode
    | FrameNode
    | InstanceNode
    | ComponentSetNode
    | ComponentNode
    | LineNode
    | PolygonNode
    | RectangleNode
    | StarNode
    | VectorNode
    | TextNode,
  Out extends
    | Ellipse
    | Frame
    | Instance
    | Line
    | Polygon
    | Rectangle
    | Star
    | Vector
    | Text,
>(
  entities: Entity[],
  relations: Relations,
  node: In,
  nodeId: string
): Pick<
  Out['components'],
  | 'strokeAlign'
  | 'strokeCapStart'
  | 'strokeCapEnd'
  | 'strokeJoin'
  | 'strokeWeight'
  | 'dash'
  | 'dashOffset'
  | 'gap'
  | 'trimStart'
  | 'trimEnd'
  | 'trimOffset'
  | 'pathReversed'
> => {
  const fillIds =
    node.fills !== figma.mixed
      ? node.fills
          .map((child, idx) =>
            mapPaint(entities, relations, nodeId, child, 'f', idx)
          )
          .filter((id) => id !== undefined)
      : []

  for (const fillId of fillIds) {
    relations.addRelation(`${nodeId}/fills`, `${fillId}/parent`)
  }

  const strokeIds = node.strokes
    .map((child, idx) => mapPaint(entities, relations, nodeId, child, 's', idx))
    .filter((id) => id !== undefined)

  for (const strokeId of strokeIds) {
    relations.addRelation(`${nodeId}/strokes`, `${strokeId}/parent`)
  }

  const properties: Pick<
    Out['components'],
    | 'strokeAlign'
    | 'strokeCapStart'
    | 'strokeCapEnd'
    | 'strokeJoin'
    | 'strokeWeight'
    | 'dash'
    | 'dashOffset'
    | 'gap'
    | 'trimStart'
    | 'trimEnd'
    | 'trimOffset'
    | 'pathReversed'
  > = {
    strokeCapStart: 'NONE',
    strokeCapEnd: 'NONE',
    strokeJoin: 'MITER',
    strokeWeight:
      node.strokeWeight === figma.mixed ? 1 : round(node.strokeWeight),
    dash: round(node.dashPattern[0] ?? 0),
    gap: round(node.dashPattern[1] ?? 0),
    dashOffset: 0,
    strokeAlign: node.strokeAlign,
  }

  if (node.type === 'VECTOR') {
    properties.strokeCapStart =
      node.vectorNetwork.vertices[0]?.strokeCap ?? 'NONE'
    properties.strokeCapEnd =
      node.vectorNetwork.vertices[node.vectorNetwork.vertices.length - 1]
        ?.strokeCap ?? 'NONE'
  } else if (node.strokeCap !== figma.mixed) {
    properties.strokeCapStart = node.strokeCap
    properties.strokeCapEnd = node.strokeCap
  }

  if (node.strokeJoin !== figma.mixed) {
    switch (node.strokeJoin) {
      case 'MITER':
        properties.strokeJoin = 'MITER'
        break
      case 'BEVEL':
        properties.strokeJoin = 'BEVEL'
        break
      case 'ROUND':
        properties.strokeJoin = 'ROUND'
        break
    }
  }

  return properties
}

/**
 * @todo add test
 */
const mapEntityIndividualStrokesProperties = <
  In extends
    | FrameNode
    | InstanceNode
    | RectangleNode
    | ComponentSetNode
    | ComponentNode,
  Out extends Frame | Instance | Rectangle,
>(
  node: In
): Pick<
  Out['components'],
  | 'individualStrokeWeight'
  | 'strokeTopWeight'
  | 'strokeRightWeight'
  | 'strokeBottomWeight'
  | 'strokeLeftWeight'
> => ({
  individualStrokeWeight:
    node.strokeTopWeight !== node.strokeWeight ||
    node.strokeBottomWeight !== node.strokeWeight ||
    node.strokeLeftWeight !== node.strokeWeight ||
    node.strokeRightWeight !== node.strokeWeight,
  strokeTopWeight: round(node.strokeTopWeight),
  strokeRightWeight: round(node.strokeRightWeight),
  strokeBottomWeight: round(node.strokeBottomWeight),
  strokeLeftWeight: round(node.strokeLeftWeight),
})

/**
 * @todo add test
 */
const mapEntityLayoutProperties = <
  In extends
    | EllipseNode
    | BooleanOperationNode
    | FrameNode
    | GroupNode
    | InstanceNode
    | ComponentSetNode
    | ComponentNode
    | LineNode
    | PolygonNode
    | RectangleNode
    | StarNode
    | VectorNode
    | TextNode,
  Out extends
    | Ellipse
    | Frame
    | Group
    | Instance
    | Line
    | Polygon
    | Rectangle
    | Star
    | Vector
    | Text,
>(
  node: In
): Pick<
  Out['components'],
  | 'anchorPoint'
  | 'position'
  | 'rotation'
  | 'opacity'
  | 'scale'
  | 'scaleLocked'
  | 'size'
  | 'sizeLocked'
  | 'skew'
> => {
  const nodeTransformMatrix = math.matrix([
    ...node.relativeTransform.map((values) =>
      values.map((number) => round(number))
    ),
    [0, 0, 1],
  ])
  const matrix = decomposedMatrix(node.relativeTransform)
  const sceneProperties: Pick<
    Out['components'],
    | 'anchorPoint'
    | 'position'
    | 'rotation'
    | 'opacity'
    | 'scale'
    | 'scaleLocked'
    | 'size'
    | 'sizeLocked'
    | 'skew'
  > = {
    anchorPoint: [0, 0],
    position: [
      matrix.translation.x,
      matrix.translation.y,
      matrix.translation.x,
      matrix.translation.y,
      matrix.translation.x,
      matrix.translation.y,
    ],
    rotation: matrix.rotation.x,
    opacity: node.opacity,
    scale: [matrix.scaling.x, matrix.scaling.y],
    scaleLocked: true,
    size: [round(node.width), round(node.height)],
    sizeLocked: true,
    skew: [matrix.skewing.x, matrix.skewing.y],
  }

  if (node.parent == null) {
    return sceneProperties
  }

  // @TODO: add support of transformed root frames
  if (node.parent.type === 'PAGE') {
    sceneProperties.position = [0, 0, 0, 0, 0, 0]
    sceneProperties.rotation = 0
    sceneProperties.scale = [1, 1]
    sceneProperties.size = [round(node.width, 0), round(node.height, 0)]
    sceneProperties.skew = [0, 0]
  }

  if (node.parent.type === 'GROUP') {
    const groupMatrix = math.matrix([
      ...node.parent.relativeTransform.map((values) =>
        values.map((number) => round(number))
      ),
      [0, 0, 1],
    ])
    const invertedGroupMatrix = math.multiply(
      math.inv(groupMatrix),
      nodeTransformMatrix
    )
    const decomposedGroupMatrix = decomposedMatrix(
      invertedGroupMatrix.toArray() as [
        [number, number, number],
        [number, number, number],
      ]
    )

    sceneProperties.position = [
      decomposedGroupMatrix.translation.x,
      decomposedGroupMatrix.translation.y,
      decomposedGroupMatrix.translation.x,
      decomposedGroupMatrix.translation.y,
      decomposedGroupMatrix.translation.x,
      decomposedGroupMatrix.translation.y,
    ]
    sceneProperties.rotation =
      Math.sign(decomposedGroupMatrix.scaling.y) *
      decomposedGroupMatrix.rotation.x
    sceneProperties.skew = [
      decomposedGroupMatrix.skewing.x,
      decomposedGroupMatrix.skewing.y,
    ]
    sceneProperties.scale = [
      decomposedGroupMatrix.scaling.x,
      decomposedGroupMatrix.scaling.y,
    ]
  }

  return sceneProperties
}

export const mapEntityFrameProperties = (node: {
  clipsContent: boolean
}): {
  clipContent: ClipContent
} => ({
  clipContent: node.clipsContent,
})

export const mapEntityInstanceProperties = async (
  node: Parameters<GetNodeId>[0] & {
    getMainComponentAsync: () => Promise<Parameters<GetNodeId>[0] | null>
  },
  getNodeId: GetNodeId,
  context: Context
): Promise<{
  mainNodeComponentId: MainNodeComponentId
}> => {
  const mainComponent = await node.getMainComponentAsync()

  if (mainComponent == null) {
    console.warn(
      `Main component should NOT be null. Please check the Figma related code.
Node id "${node.id}", name "${node.name}"`
    )
    return {
      mainNodeComponentId: '',
    }
  }

  return {
    mainNodeComponentId:
      mainComponent != null ? getNodeId(mainComponent, context.projectId) : '',
  }
}

/**
 * @mutates entities
 * @mutates relations
 * @todo add test
 */
const mapEllipse = (
  entities: Entity[],
  relations: Relations,
  node: EllipseNode,
  context: Context
) => {
  entities.push({
    id: context.nodeId,
    tag: 'ellipse',
    schemaVersion: 1,
    components: {
      startAngle: (node.arcData.startingAngle / Math.PI) * 180,
      endAngle:
        (node.arcData.endingAngle - node.arcData.startingAngle) / (2 * Math.PI),
      innerRadius: node.arcData.innerRadius,
      ...mapEntityBaseProperties(relations, node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, relations, node, context.nodeId),
      ...mapEntityCornerProperties(node),
      ...mapEntityGeometryProperties(entities, relations, node, context.nodeId),
      ...mapEntityLayoutProperties(node),
    },
  } satisfies Ellipse)
}

/**
 * @mutates entities
 * @mutates relations
 * @todo add test
 */
const mapBooleanOperation = (
  entities: Entity[],
  relations: Relations,
  node: BooleanOperationNode,
  context: Context
): void => {
  entities.push({
    id: context.nodeId,
    tag: 'vector',
    schemaVersion: 1,
    components: {
      vectorPaths: node.fillGeometry.map((v) => ({
        windingRule: v.windingRule,
        data: v.data,
        // @TODO: FIXME check why we have wrong types here
      })) as any,
      sizeBehaviour: 'FILL',
      ...mapEntityBaseProperties(relations, node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, relations, node, context.nodeId),
      ...mapEntityCornerProperties(node),
      ...mapEntityGeometryProperties(entities, relations, node, context.nodeId),
      ...mapEntityLayoutProperties(node),
    },
  } satisfies Vector)
}

/**
 * @mutates entities
 * @mutates relations
 * @todo add test
 */
const mapFrame = (
  entities: Entity[],
  relations: Relations,
  node: FrameNode,
  getNodeId: GetNodeId,
  setNodeId: SetNodeId,
  context: Context
): void | Promise<void> => {
  const baseProperties = mapEntityBaseProperties(relations, node, context)

  const childrenOrPromise = mapEntityChildrenProperties(
    entities,
    relations,
    node,
    context,
    (_entities, _relations, _node) =>
      mapNode(
        _entities,
        _relations,
        _node,
        context.projectId,
        getNodeId,
        setNodeId,
        context.nodeId
      )
  )

  if (childrenOrPromise instanceof Promise) {
    return childrenOrPromise.then((children) => {
      entities.push({
        id: context.nodeId,
        tag: 'frame',
        schemaVersion: 1,
        components: {
          ...mapEntityFrameProperties(node),
          ...mapEntityEntryProperties(context),
          ...baseProperties,
          ...mapEntitySceneProperties(node),
          ...mapEntityBlendProperties(
            entities,
            relations,
            node,
            context.nodeId
          ),
          ...children,
          ...mapEntityCornerProperties(node),
          ...mapEntityIndividualCornerProperties(node),
          ...mapEntityGeometryProperties(
            entities,
            relations,
            node,
            context.nodeId
          ),
          ...mapEntityIndividualStrokesProperties(node),
          ...mapEntityLayoutProperties(node),
        },
      } satisfies Frame)
    })
  }

  entities.push({
    id: context.nodeId,
    tag: 'frame',
    schemaVersion: 1,
    components: {
      ...mapEntityFrameProperties(node),
      ...mapEntityEntryProperties(context),
      ...baseProperties,
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, relations, node, context.nodeId),
      ...childrenOrPromise,
      ...mapEntityCornerProperties(node),
      ...mapEntityIndividualCornerProperties(node),
      ...mapEntityGeometryProperties(entities, relations, node, context.nodeId),
      ...mapEntityIndividualStrokesProperties(node),
      ...mapEntityLayoutProperties(node),
    },
  } satisfies Frame)
}

/**
 * @mutates entities
 * @mutates relations
 * @todo add test
 */
const mapGroup = (
  entities: Entity[],
  relations: Relations,
  node: GroupNode,
  getNodeId: GetNodeId,
  setNodeId: SetNodeId,
  context: Context
): void | Promise<void> => {
  const baseProperties = mapEntityBaseProperties(relations, node, context)

  const childrenOrPromise = mapEntityChildrenProperties(
    entities,
    relations,
    node,
    context,
    (_entities, _relations, _node) =>
      mapNode(
        _entities,
        _relations,
        _node,
        context.projectId,
        getNodeId,
        setNodeId,
        context.nodeId
      )
  )

  if (childrenOrPromise instanceof Promise) {
    return childrenOrPromise.then((children) => {
      entities.push({
        id: context.nodeId,
        tag: 'group',
        schemaVersion: 1,
        components: {
          ...baseProperties,
          ...mapEntitySceneProperties(node),
          ...mapEntityBlendProperties(
            entities,
            relations,
            node,
            context.nodeId
          ),
          ...children,
          ...mapEntityLayoutProperties(node),
        },
      } satisfies Group)
    })
  }

  entities.push({
    id: context.nodeId,
    tag: 'group',
    schemaVersion: 1,
    components: {
      ...baseProperties,
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, relations, node, context.nodeId),
      ...childrenOrPromise,
      ...mapEntityLayoutProperties(node),
    },
  } satisfies Group)
}

/**
 * @mutates entities
 * @mutates relations
 * @todo add test
 */
const mapInstance = async (
  entities: Entity[],
  relations: Relations,
  node: InstanceNode,
  getNodeId: GetNodeId,
  setNodeId: SetNodeId,
  context: Context
): Promise<void> => {
  const baseProperties = mapEntityBaseProperties(relations, node, context)

  const instanceProperties = await mapEntityInstanceProperties(
    node,
    getNodeId,
    context
  )
  const children = await mapEntityChildrenProperties(
    entities,
    relations,
    node,
    context,
    (_entities, _relations, _node) =>
      mapNode(
        _entities,
        _relations,
        _node,
        context.projectId,
        getNodeId,
        setNodeId,
        context.nodeId
      )
  )
  entities.push({
    id: context.nodeId,
    tag: 'instance',
    schemaVersion: 1,
    components: {
      ...instanceProperties,
      ...mapEntityEntryProperties(context),
      ...mapEntityFrameProperties(node),
      ...baseProperties,
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, relations, node, context.nodeId),
      ...children,
      ...mapEntityCornerProperties(node),
      ...mapEntityIndividualCornerProperties(node),
      ...mapEntityGeometryProperties(entities, relations, node, context.nodeId),
      ...mapEntityIndividualStrokesProperties(node),
      ...mapEntityLayoutProperties(node),
    },
  } satisfies Instance)
}

/**
 * @mutates entities
 * @mutates relations
 * @todo add test
 */
const mapComponentSet = (
  entities: Entity[],
  relations: Relations,
  node: ComponentSetNode,
  getNodeId: GetNodeId,
  setNodeId: SetNodeId,
  context: Context
): void | Promise<void> => {
  const baseProperties = mapEntityBaseProperties(relations, node, context)

  const childrenOrPromise = mapEntityChildrenProperties(
    entities,
    relations,
    node,
    context,
    (_entities, _relations, _node) =>
      mapNode(
        _entities,
        _relations,
        _node,
        context.projectId,
        getNodeId,
        setNodeId,
        context.nodeId
      )
  )

  if (childrenOrPromise instanceof Promise) {
    return childrenOrPromise.then((children) => {
      entities.push({
        id: context.nodeId,
        tag: 'frame',
        schemaVersion: 1,
        components: {
          ...mapEntityEntryProperties(context),
          ...mapEntityFrameProperties(node),
          ...baseProperties,
          ...mapEntitySceneProperties(node),
          ...mapEntityBlendProperties(
            entities,
            relations,
            node,
            context.nodeId
          ),
          ...children,
          ...mapEntityCornerProperties(node),
          ...mapEntityIndividualCornerProperties(node),
          ...mapEntityGeometryProperties(
            entities,
            relations,
            node,
            context.nodeId
          ),
          ...mapEntityIndividualStrokesProperties(node),
          ...mapEntityLayoutProperties(node),
        },
      } satisfies Frame)
    })
  }

  entities.push({
    id: context.nodeId,
    tag: 'frame',
    schemaVersion: 1,
    components: {
      ...mapEntityEntryProperties(context),
      ...mapEntityFrameProperties(node),
      ...baseProperties,
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, relations, node, context.nodeId),
      ...childrenOrPromise,
      ...mapEntityCornerProperties(node),
      ...mapEntityIndividualCornerProperties(node),
      ...mapEntityGeometryProperties(entities, relations, node, context.nodeId),
      ...mapEntityIndividualStrokesProperties(node),
      ...mapEntityLayoutProperties(node),
    },
  } satisfies Frame)
}

/**
 * @mutates entities
 * @mutates relations
 * @todo add test
 */
const mapComponent = (
  entities: Entity[],
  relations: Relations,
  node: ComponentNode,
  getNodeId: GetNodeId,
  setNodeId: SetNodeId,
  context: Context
): void | Promise<void> => {
  const baseProperties = mapEntityBaseProperties(relations, node, context)

  const childrenOrPromise = mapEntityChildrenProperties(
    entities,
    relations,
    node,
    context,
    (_entities, _relations, _node) =>
      mapNode(
        _entities,
        _relations,
        _node,
        context.projectId,
        getNodeId,
        setNodeId,
        context.nodeId
      )
  )

  if (childrenOrPromise instanceof Promise) {
    return childrenOrPromise.then((children) => {
      entities.push({
        id: context.nodeId,
        tag: 'frame',
        schemaVersion: 1,
        components: {
          ...mapEntityEntryProperties(context),
          ...mapEntityFrameProperties(node),
          ...baseProperties,
          ...mapEntitySceneProperties(node),
          ...mapEntityBlendProperties(
            entities,
            relations,
            node,
            context.nodeId
          ),
          ...children,
          ...mapEntityCornerProperties(node),
          ...mapEntityIndividualCornerProperties(node),
          ...mapEntityGeometryProperties(
            entities,
            relations,
            node,
            context.nodeId
          ),
          ...mapEntityIndividualStrokesProperties(node),
          ...mapEntityLayoutProperties(node),
        },
      } satisfies Frame)
    })
  }

  entities.push({
    id: context.nodeId,
    tag: 'frame',
    schemaVersion: 1,
    components: {
      ...mapEntityEntryProperties(context),
      ...mapEntityFrameProperties(node),
      ...baseProperties,
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, relations, node, context.nodeId),
      ...childrenOrPromise,
      ...mapEntityCornerProperties(node),
      ...mapEntityIndividualCornerProperties(node),
      ...mapEntityGeometryProperties(entities, relations, node, context.nodeId),
      ...mapEntityIndividualStrokesProperties(node),
      ...mapEntityLayoutProperties(node),
    },
  } satisfies Frame)
}

/**
 * @mutates entities
 * @mutates relations
 * @todo add test
 */
const mapLine = (
  entities: Entity[],
  relations: Relations,
  node: LineNode,
  context: Context
): void => {
  entities.push({
    id: context.nodeId,
    tag: 'line',
    schemaVersion: 1,
    components: {
      ...mapEntityBaseProperties(relations, node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, relations, node, context.nodeId),
      ...mapEntityGeometryProperties(entities, relations, node, context.nodeId),
      ...mapEntityLayoutProperties(node),
    },
  } satisfies Line)
}

/**
 * @mutates entities
 * @mutates relations
 * @todo add test
 */
const mapPolygon = (
  entities: Entity[],
  relations: Relations,
  node: PolygonNode,
  context: Context
): void => {
  entities.push({
    id: context.nodeId,
    tag: 'polygon',
    schemaVersion: 1,
    components: {
      pointCount: node.pointCount,
      ...mapEntityBaseProperties(relations, node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, relations, node, context.nodeId),
      ...mapEntityCornerProperties(node),
      ...mapEntityGeometryProperties(entities, relations, node, context.nodeId),
      ...mapEntityLayoutProperties(node),
    },
  } satisfies Polygon)
}

/**
 * @mutates entities
 * @mutates relations
 * @todo add test
 */
const mapRectangle = (
  entities: Entity[],
  relations: Relations,
  node: RectangleNode,
  context: Context
): void => {
  entities.push({
    id: context.nodeId,
    tag: 'rectangle',
    schemaVersion: 1,
    components: {
      ...mapEntityBaseProperties(relations, node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, relations, node, context.nodeId),
      ...mapEntityCornerProperties(node),
      ...mapEntityIndividualCornerProperties(node),
      ...mapEntityGeometryProperties(entities, relations, node, context.nodeId),
      ...mapEntityIndividualStrokesProperties(node),
      ...mapEntityLayoutProperties(node),
    },
  } satisfies Rectangle)
}

/**
 * @mutates entities
 * @mutates relations
 * @todo add test
 */
const mapStar = (
  entities: Entity[],
  relations: Relations,
  node: StarNode,
  context: Context
): void => {
  entities.push({
    id: context.nodeId,
    tag: 'star',
    schemaVersion: 1,
    components: {
      pointCount: node.pointCount,
      innerRadius: node.innerRadius,
      ...mapEntityBaseProperties(relations, node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, relations, node, context.nodeId),
      ...mapEntityCornerProperties(node),
      ...mapEntityGeometryProperties(entities, relations, node, context.nodeId),
      ...mapEntityLayoutProperties(node),
    },
  } satisfies Star)
}

/**
 * @mutates entities
 * @mutates relations
 * @todo add test
 */
const mapVector = (
  entities: Entity[],
  relations: Relations,
  node: VectorNode,
  context: Context
): void => {
  entities.push({
    id: context.nodeId,
    tag: 'vector',
    schemaVersion: 1,
    components: {
      vectorPaths: node.vectorPaths.map((v) => ({
        windingRule: v.windingRule,
        data: v.data,
      })) as any,
      sizeBehaviour: 'FILL',
      ...mapEntityBaseProperties(relations, node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, relations, node, context.nodeId),
      ...mapEntityCornerProperties(node),
      ...mapEntityGeometryProperties(entities, relations, node, context.nodeId),
      ...mapEntityLayoutProperties(node),
    },
  } satisfies Vector)
}

/**
 * @todo add test
 */
const mapText = (
  entities: Entity[],
  relations: Relations,
  node: TextNode,
  context: Context
): void => {
  entities.push({
    id: context.nodeId,
    tag: 'text',
    schemaVersion: 1,
    components: {
      vectorPaths: node.fillGeometry.map((v) => ({
        windingRule: v.windingRule,
        data: v.data,
      })) as any,
      sizeBehaviour: 'IGNORE',
      ...mapEntityBaseProperties(relations, node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, relations, node, context.nodeId),
      ...mapEntityGeometryProperties(entities, relations, node, context.nodeId),
      ...mapEntityLayoutProperties(node),
    },
  } satisfies Text)
}

/**
 * Undefined returned in cases when node is not supported.
 * This case should be handled outside of this function.
 * @todo add test
 */
const mapNode = (
  entities: Entity[],
  relations: Relations,
  node: SceneNode,
  projectId: string,
  getNodeId: GetNodeId,
  setNodeId: SetNodeId,
  parentNodeId?: string
): string | undefined | Promise<string | undefined> => {
  const [storedNodeId, storedProjectId] = getNodeId(node, projectId).split('@')
  const isNodeLinkedToAnotherProject =
    storedProjectId !== undefined && storedProjectId !== projectId
  // @NOTE: can happen when user copied/duplicated layer
  // @TODO: refactor to use map instead of array search
  // @TODO: add test for such case.
  // To reproduce you can run plugin inside of figma, create project and then duplicate layer a few times.
  const hasEntityWithSuchId =
    entities.find((e) => e.id === storedNodeId) !== undefined
  const nodeId =
    isNodeLinkedToAnotherProject || hasEntityWithSuchId
      ? generateId()
      : storedNodeId
  setNodeId(node, projectId, nodeId)

  // @NOTE: in case when node copied between frames/pages
  const context: Context =
    isNodeLinkedToAnotherProject || hasEntityWithSuchId
      ? {
          projectId,
          nodeId,
          initialNodeId: `${storedNodeId}@${storedProjectId}`,
          parentNodeId,
        }
      : {
          projectId,
          nodeId,
          parentNodeId,
        }

  switch (node.type) {
    case 'ELLIPSE': {
      mapEllipse(entities, relations, node, context)
      return context.nodeId
    }
    case 'BOOLEAN_OPERATION': {
      mapBooleanOperation(entities, relations, node, context)
      return context.nodeId
    }
    case 'FRAME': {
      const result = mapFrame(
        entities,
        relations,
        node,
        getNodeId,
        setNodeId,
        context
      )
      if (result instanceof Promise) {
        return result.then(() => context.nodeId)
      }
      return context.nodeId
    }
    case 'GROUP': {
      const result = mapGroup(
        entities,
        relations,
        node,
        getNodeId,
        setNodeId,
        context
      )
      if (result instanceof Promise) {
        return result.then(() => context.nodeId)
      }
      return context.nodeId
    }
    case 'INSTANCE': {
      return new Promise<string | undefined>(async (resolve) => {
        const currentMainNodeId =
          node.type === 'INSTANCE'
            ? await (async () => {
                const mainComponent = await node.getMainComponentAsync()

                if (mainComponent == null) {
                  return undefined
                }

                return getNodeId(mainComponent, projectId)
              })()
            : undefined

        if (currentMainNodeId != null) {
          const storedMainNodeId = node.getSharedPluginData(
            ANINIX_WORKSPACE_KEY,
            ANINIX_MAIN_NODE_KEY
          )

          if (!!storedMainNodeId && storedMainNodeId !== currentMainNodeId) {
            context.nodeId = generateId()
            setNodeId(node, projectId, context.nodeId)
          }

          node.setSharedPluginData(
            ANINIX_WORKSPACE_KEY,
            ANINIX_MAIN_NODE_KEY,
            currentMainNodeId
          )
        }

        resolve(
          mapInstance(
            entities,
            relations,
            node,
            getNodeId,
            setNodeId,
            context
          ).then(() => context.nodeId)
        )
      })
    }
    case 'COMPONENT_SET': {
      const result = mapComponentSet(
        entities,
        relations,
        node,
        getNodeId,
        setNodeId,
        context
      )
      if (result instanceof Promise) {
        return result.then(() => context.nodeId)
      }
      return context.nodeId
    }
    case 'COMPONENT': {
      const result = mapComponent(
        entities,
        relations,
        node,
        getNodeId,
        setNodeId,
        context
      )
      if (result instanceof Promise) {
        return result.then(() => context.nodeId)
      }
      return context.nodeId
    }
    case 'LINE': {
      mapLine(entities, relations, node, context)
      return context.nodeId
    }
    case 'POLYGON': {
      mapPolygon(entities, relations, node, context)
      return context.nodeId
    }
    case 'RECTANGLE': {
      mapRectangle(entities, relations, node, context)
      return context.nodeId
    }
    case 'STAR': {
      mapStar(entities, relations, node, context)
      return context.nodeId
    }
    case 'VECTOR': {
      mapVector(entities, relations, node, context)
      return context.nodeId
    }
    case 'TEXT': {
      mapText(entities, relations, node, context)
      return context.nodeId
    }
    default:
      return undefined
  }
}

/**
 * @todo add test
 */
const mapRoot = (
  entities: Entity[],
  node: SceneNode,
  projectId: string
): void => {
  const { color, isVisible } = getPageBackgroundColor()

  entities.push({
    id: `${projectId}r`,
    tag: 'root',
    schemaVersion: 1,
    // @NOTE: default values provided here
    components: {
      name: getNormalNodeName(node.name),
      entityType: 'ROOT',
      startTime: 0,
      duration: 5,
      rgba: [
        // @NOTE: for some reason those colors are in range 0...255 instead of 0...1 like others
        round(color.r, 0),
        round(color.g, 0),
        round(color.b, 0),
        color.a,
      ],
      visibleInViewport: isVisible,
      fps: 60,
    },
  } satisfies Root)
}

export const defaultGetProjectId: GetProjectId = (node) => {
  const storedProjectId = node.getSharedPluginData(
    ANINIX_WORKSPACE_KEY,
    ANINIX_PROJECT_KEY
  )
  return !!storedProjectId ? storedProjectId : generateId()
}

export const defaultGetNodeId: GetNodeId = (node, projectId) => {
  const storedNodeId = node.getSharedPluginData(
    ANINIX_WORKSPACE_KEY,
    ANINIX_NODE_KEY
  )
  return !!storedNodeId ? storedNodeId : `${generateId()}@${projectId}`
}
const defaultSetNodeId: SetNodeId = (node, projectId, nodeId) => {
  // @NOTE: in the case of trying to access a remote node, a try/catch is required here.
  // For example, the user has an instance and needs to read the remote master component.
  // In this case, a direct attempt to install plugin data will fail because
  // the remote components are read-only.
  try {
    node.setPluginData(ANINIX_NODE_KEY, `${nodeId}@${projectId}`)
    node.setSharedPluginData(
      ANINIX_WORKSPACE_KEY,
      ANINIX_NODE_KEY,
      `${nodeId}@${projectId}`
    )
  } catch (err) {
    console.warn(
      `Attempt to set plugin data on the node with ID "${node.id}" failed, details:`,
      err
    )
  }
}

export type Options = {
  /**
   * A middleware function to retrieve node IDs.
   * By default, it will try to get the public node ID or generate a new one.
   * You can change the behavior by providing a custom function.
   *
   * This is useful for internal use of the Aninix Connect plugin.
   * To add an extra layer of access protection.
   * You can ignore it when using it publicly and use `shared` data.
   *
   * ---
   *
   * By default, a shared nodeId will only include a regular string identifier, such as `lrdfgi9a94579347r`.
   * But for advanced use, Aninix can include `{nodeId}@{projectId}` in a string like this `lrdfgi9a94579347r@lrdfgi9a9457979347`.
   * That's why we are retrieving nodeId as `const [nodeId, projectId] = storedNodeId.split('@').
   *
   * ---
   *
   * @example
   * (node: SceneNode) => {
   *   const attachedNodeId = node.getPluginData('NODE_KEY') // or any other key you have used
   *   return !!attachedNodeId ? attachedNodeId : generateId()
   * }
   */
  getNodeId?: GetNodeId

  /**
   * A middleware function to persist node ID.
   * By default, it will try to set the public node ID after generation.
   */
  setNodeId?: (node: FigmaNode, nodeId: string) => void

  /**
   * A middleware function to retrieve project ID. It works similar to `getNodeId`.
   */
  getProjectId?: GetProjectId
}

export const snapshot = async (
  node: SceneNode,
  options?: Options
): Promise<AninixSnapshot> => {
  const getProjectId: GetProjectId =
    options?.getProjectId ?? defaultGetProjectId
  const projectId = getProjectId(node)
  const entities: Entity[] = []
  const relations = new Relations()
  mapRoot(entities, node, projectId)
  await mapNode(
    entities,
    relations,
    node,
    projectId,
    options?.getNodeId ?? defaultGetNodeId,
    options?.setNodeId ?? defaultSetNodeId
  )
  return {
    id: projectId,
    schemaVersion: 2,
    entities: Object.fromEntries(entities.map((entity) => [entity.id, entity])),
    relations: relations.toJSON(),
  } satisfies AninixSnapshot
}
