import * as math from 'mathjs'
import {
  ANINIX_NODE_KEY,
  ANINIX_PROJECT_KEY,
  ANINIX_WORKSPACE_KEY,
} from './constants'
import { decomposedMatrix } from './decomposed-matrix'
import { generateId } from './generate-id'
import { getNormalNodeName } from './get-normal-node-name'
import { getPageBackgroundColor } from './get-page-background-color'
import { isProjectAttachedToNode } from './is-project-attached-to-node'
import { round } from './round'
import type {
  AninixSnapshot,
  BackgroundBlur,
  BlendMode,
  ChildrenExpanded,
  ClipContent,
  CornerRadius,
  DropShadow,
  Effects,
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
type GetNodeId = (
  node: {
    id: string
    name: string
    getPluginData: (key: string) => string
    getSharedPluginData: (workspace: string, key: string) => string
  },
  index: number
) => string

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
 * @todo add test
 */
const mapPaint = (
  entities: Entity[],
  entityId: string,
  paint: Paint,
  type: 'f' | 's', // fill | stroke
  index: number
) => {
  const paintId = `${entityId}p${type}${index}`

  switch (paint.type) {
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
            1,
          ],
          paintType: 'SOLID',
          parent: entityId,
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
          colorStops: mapColorStops(entities, paintId, paint.gradientStops) as [
            string,
          ],
          opacity: paint.opacity ?? 1,
          gradientTransform: paint.gradientTransform,
          paintType: 'GRADIENT_LINEAR',
          parent: entityId,
        },
      } satisfies LinearGradientPaint)
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
          colorStops: mapColorStops(entities, paintId, paint.gradientStops) as [
            string,
          ],
          opacity: paint.opacity ?? 1,
          gradientTransform: paint.gradientTransform,
          paintType: 'GRADIENT_RADIAL',
          parent: entityId,
        },
      } satisfies RadialGradientPaint)
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
          parent: entityId,
        },
      } satisfies ImagePaint)
      break
    }
  }

  return paintId
}

/**
 * @mutates entities
 */
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
  node: {
    name: string
    type:
      | EllipseNode['type']
      | BooleanOperationNode['type']
      | FrameNode['type']
      | GroupNode['type']
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
  initialNodeId?: InitialNodeId
  parent?: string
} => ({
  name: getNormalNodeName(node.name),
  entityType: 'NODE',
  nodeType: node.type,
  ...(context.initialNodeId != null && {
    initialNodeId: context.initialNodeId,
  }),
  ...(context.parentNodeId != null && { parent: context.parentNodeId }),
})

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
 */
export const mapEntityBlendProperties = (
  entities: Entity[],
  node: {
    blendMode: BlendMixin['blendMode']
    isMask: BlendMixin['isMask']
    effects: BlendMixin['effects']
  },
  context: Context
): {
  blendMode: BlendMode
  mask: Mask
  effects: Effects
} => {
  const effectIds = node.effects.map((effect, idx) => {
    const effectId = `${context.nodeId}e${idx}`

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

  return {
    blendMode: node.blendMode,
    mask: node.isMask,
    effects: effectIds as Effects,
  }
}

/**
 * @mutates entities
 * @todo add test
 */
const mapEntityChildrenProperties = <
  In extends FrameNode | GroupNode | InstanceNode,
>(
  entities: Entity[],
  node: In,
  mapper: (entities: Entity[], entity: In) => string
): {
  childrenExpanded: ChildrenExpanded
  children: [string]
} => ({
  childrenExpanded: false,
  children: node.children
    // @TODO: remove ignorance once all nodes are implemented
    // @ts-ignore
    .map((child) => mapper(entities, child)) as [string],
})

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
  In extends FrameNode | InstanceNode | RectangleNode,
  Out extends Frame | Instance | Rectangle,
>(
  entities: Entity[],
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
 * @todo add test
 */
const mapEntityGeometryProperties = <
  In extends
    | EllipseNode
    | BooleanOperationNode
    | FrameNode
    | InstanceNode
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
  node: In,
  context: Context
): Pick<
  Out['components'],
  | 'fills'
  | 'strokes'
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
  const properties: Pick<
    Out['components'],
    | 'fills'
    | 'strokes'
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
    fills: (node.fills !== figma.mixed
      ? node.fills.map((child, idx) =>
          mapPaint(entities, context.nodeId, child, 'f', idx)
        )
      : []) as [string],
    strokes: node.strokes.map((child, idx) =>
      mapPaint(entities, context.nodeId, child, 's', idx)
    ) as [string],
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
    properties.strokeCapStart = 'NONE'
    properties.strokeCapEnd = 'NONE'
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
 * @mutates entities
 * @todo add test
 */
const mapEntityIndividualStrokesProperties = <
  In extends FrameNode | InstanceNode | RectangleNode,
  Out extends Frame | Instance | Rectangle,
>(
  entities: Entity[],
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
 * @mutates entities
 * @todo add test
 */
const mapEntityLayoutProperties = <
  In extends
    | EllipseNode
    | BooleanOperationNode
    | FrameNode
    | GroupNode
    | InstanceNode
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
  entities: Entity[],
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

export const mapEntityInstanceProperties = (
  entities: Entity[],
  node: Parameters<GetNodeId>[0] & {
    mainComponent: Parameters<GetNodeId>[0] | null
  },
  getNodeId: GetNodeId
): {
  mainNodeComponentId: MainNodeComponentId
} => {
  if (node.mainComponent == null) {
    throw new Error(
      `Main component should NOT be null. Please check the Figma related code.
Node id "${node.id}", name "${node.name}"`
    )
  }

  return {
    mainNodeComponentId:
      node.mainComponent != null
        ? getNodeId(
            node.mainComponent,
            entities.length === 0 ? 0 : entities.length - 1
          )
        : '',
  }
}

/**
 * @mutates entities
 * @todo add test
 */
const mapEllipse = (
  entities: Entity[],
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
      ...mapEntityBaseProperties(node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, node, context),
      ...mapEntityCornerProperties(node),
      ...mapEntityGeometryProperties(entities, node, context),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Ellipse)
}

/**
 * @mutates entities
 * @todo add test
 */
const mapBooleanOperation = (
  entities: Entity[],
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
      ...mapEntityBaseProperties(node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, node, context),
      ...mapEntityCornerProperties(node),
      ...mapEntityGeometryProperties(entities, node, context),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Vector)
}

/**
 * @mutates entities
 * @todo add test
 */
const mapFrame = (
  entities: Entity[],
  node: FrameNode,
  getNodeId: GetNodeId,
  context: Context
): void => {
  entities.push({
    id: context.nodeId,
    tag: 'frame',
    schemaVersion: 1,
    components: {
      ...mapEntityFrameProperties(node),
      ...mapEntityEntryProperties(context),
      ...mapEntityBaseProperties(node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, node, context),
      ...mapEntityChildrenProperties(entities, node, (_entities, _node) =>
        mapNode(_entities, _node, context.projectId, getNodeId, context.nodeId)
      ),
      ...mapEntityCornerProperties(node),
      ...mapEntityIndividualCornerProperties(entities, node),
      ...mapEntityGeometryProperties(entities, node, context),
      ...mapEntityIndividualStrokesProperties(entities, node),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Frame)
}

/**
 * @mutates entities
 * @todo add test
 */
const mapGroup = (
  entities: Entity[],
  node: GroupNode,
  getNodeId: GetNodeId,
  context: Context
): void => {
  entities.push({
    id: context.nodeId,
    tag: 'group',
    schemaVersion: 1,
    components: {
      ...mapEntityBaseProperties(node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, node, context),
      ...mapEntityChildrenProperties(entities, node, (_entities, _node) =>
        mapNode(_entities, _node, context.projectId, getNodeId, context.nodeId)
      ),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Group)
}

/**
 * @mutates entities
 * @todo add test
 */
const mapInstance = (
  entities: Entity[],
  node: InstanceNode,
  getNodeId: GetNodeId,
  context: Context
): void => {
  entities.push({
    id: context.nodeId,
    tag: 'instance',
    schemaVersion: 1,
    components: {
      ...mapEntityInstanceProperties(entities, node, getNodeId),
      ...mapEntityFrameProperties(node),
      ...mapEntityBaseProperties(node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, node, context),
      ...mapEntityChildrenProperties(entities, node, (_entities, _node) =>
        mapNode(_entities, _node, context.projectId, getNodeId, context.nodeId)
      ),
      ...mapEntityCornerProperties(node),
      ...mapEntityIndividualCornerProperties(entities, node),
      ...mapEntityGeometryProperties(entities, node, context),
      ...mapEntityIndividualStrokesProperties(entities, node),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Instance)
}

/**
 * @mutates entities
 * @todo add test
 */
const mapLine = (
  entities: Entity[],
  node: LineNode,
  context: Context
): void => {
  entities.push({
    id: context.nodeId,
    tag: 'line',
    schemaVersion: 1,
    components: {
      ...mapEntityBaseProperties(node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, node, context),
      ...mapEntityGeometryProperties(entities, node, context),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Line)
}

/**
 * @mutates entities
 * @todo add test
 */
const mapPolygon = (
  entities: Entity[],
  node: PolygonNode,
  context: Context
): void => {
  entities.push({
    id: context.nodeId,
    tag: 'polygon',
    schemaVersion: 1,
    components: {
      pointCount: node.pointCount,
      ...mapEntityBaseProperties(node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, node, context),
      ...mapEntityCornerProperties(node),
      ...mapEntityGeometryProperties(entities, node, context),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Polygon)
}

/**
 * @mutates entities
 * @todo add test
 */
const mapRectangle = (
  entities: Entity[],
  node: RectangleNode,
  context: Context
): void => {
  entities.push({
    id: context.nodeId,
    tag: 'rectangle',
    schemaVersion: 1,
    components: {
      ...mapEntityBaseProperties(node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, node, context),
      ...mapEntityCornerProperties(node),
      ...mapEntityIndividualCornerProperties(entities, node),
      ...mapEntityGeometryProperties(entities, node, context),
      ...mapEntityIndividualStrokesProperties(entities, node),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Rectangle)
}

/**
 * @mutates entities
 * @todo add test
 */
const mapStar = (
  entities: Entity[],
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
      ...mapEntityBaseProperties(node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, node, context),
      ...mapEntityCornerProperties(node),
      ...mapEntityGeometryProperties(entities, node, context),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Star)
}

/**
 * @mutates entities
 * @todo add test
 */
const mapVector = (
  entities: Entity[],
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
      ...mapEntityBaseProperties(node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, node, context),
      ...mapEntityCornerProperties(node),
      ...mapEntityGeometryProperties(entities, node, context),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Vector)
}

/**
 * @todo add test
 */
const mapText = (
  entities: Entity[],
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
      ...mapEntityBaseProperties(node, context),
      ...mapEntitySceneProperties(node),
      ...mapEntityBlendProperties(entities, node, context),
      ...mapEntityGeometryProperties(entities, node, context),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Text)
}

/**
 * @todo add test
 */
const mapNode = (
  entities: Entity[],
  node: SceneNode,
  projectId: string,
  getNodeId: GetNodeId,
  parentNodeId?: string
): string => {
  const nodeIndex = entities.length === 0 ? 0 : entities.length - 1
  const [storedNodeId, storedProjectId] = getNodeId(node, nodeIndex).split('@')

  // @NOTE: in case when node copied between frames/pages
  const context: Context =
    storedProjectId != null && storedProjectId !== projectId
      ? {
          projectId,
          nodeId: generateId(),
          initialNodeId: storedNodeId,
          parentNodeId,
        }
      : {
          projectId,
          nodeId: storedNodeId,
          parentNodeId,
        }

  switch (node.type) {
    case 'ELLIPSE': {
      mapEllipse(entities, node, context)
      break
    }
    case 'BOOLEAN_OPERATION': {
      mapBooleanOperation(entities, node, context)
      break
    }
    case 'FRAME': {
      mapFrame(entities, node, getNodeId, context)
      break
    }
    case 'GROUP': {
      mapGroup(entities, node, getNodeId, context)
      break
    }
    case 'INSTANCE': {
      mapInstance(entities, node, getNodeId, context)
      break
    }
    case 'LINE': {
      mapLine(entities, node, context)
      break
    }
    case 'POLYGON': {
      mapPolygon(entities, node, context)
      break
    }
    case 'RECTANGLE': {
      mapRectangle(entities, node, context)
      break
    }
    case 'STAR': {
      mapStar(entities, node, context)
      break
    }
    case 'VECTOR': {
      mapVector(entities, node, context)
      break
    }
    case 'TEXT': {
      mapText(entities, node, context)
      break
    }
    default: {
      throw new Error(`Node with type "${node.type}" is not supported yet`)
    }
  }

  return context.nodeId
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

const defaultGetProjectId = (node: SceneNode): string => {
  const storedProjectId = node.getSharedPluginData(
    ANINIX_WORKSPACE_KEY,
    ANINIX_PROJECT_KEY
  )
  return !!storedProjectId ? storedProjectId : generateId()
}

const defaultGetNodeId: GetNodeId = (node): string => {
  const storedNodeId = node.getSharedPluginData(
    ANINIX_WORKSPACE_KEY,
    ANINIX_NODE_KEY
  )
  return !!storedNodeId ? storedNodeId : generateId()
}

type Options = {
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
}

// @NOTE: using a class here improves performance in case of high mapper utilization
/**
 * @todo add test
 */
class Bind {
  constructor(
    private readonly node: SceneNode,
    private readonly options?: Options
  ) {}

  getSnapshot = (): AninixSnapshot => {
    return {
      id: defaultGetProjectId(this.node),
      schemaVersion: 2,
      entities: Object.fromEntries(
        this.getEntities().map((entity) => [entity.id, entity])
      ),
    }
  }

  getEntities = (): Entity[] => {
    const projectId = defaultGetProjectId(this.node)
    const entities: Entity[] = []
    mapRoot(entities, this.node, projectId)
    mapNode(
      entities,
      this.node,
      projectId,
      this.options?.getNodeId ?? defaultGetNodeId
    )
    return entities
  }
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
}
