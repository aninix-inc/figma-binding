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
  DropShadow,
  Ellipse,
  Frame,
  Group,
  ImagePaint,
  InnerShadow,
  Instance,
  LayerBlur,
  Line,
  LinearGradientPaint,
  MatrixTransformKey,
  ColorStop as ModelColorStop,
  NumberKey,
  Point2DKey,
  Polygon,
  RadialGradientPaint,
  Rectangle,
  RgbaKey,
  Root,
  SolidPaint,
  SpatialPoint2DKey,
  Star,
  Text,
  Vector,
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

/// mappers

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
const mapEntityEntryProperties = <In extends FrameNode, Out extends Frame>(
  entities: Entity[],
  entity: In,
  nodeParentId?: string
): Pick<Out['components'], 'entry'> => {
  // @NOTE: nodeParentId would be available for children nodes only
  if (nodeParentId == null) {
    return {
      entry: true,
    }
  }

  return {}
}

/**
 * @mutates entities
 */
const mapEntityBaseProperties = <
  In extends
    | EllipseNode
    | BooleanOperationNode
    | FrameNode
    | GroupNode
    | ComponentNode
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
  node: In,
  nodeParentId?: string
): Pick<
  Out['components'],
  'name' | 'entityType' | 'nodeType' | 'externalNodeId'
> => ({
  name: getNormalNodeName(node.name),
  entityType: 'NODE',
  nodeType: node.type,
  externalNodeId: node.id,
  ...(nodeParentId != null && { parent: nodeParentId }),
})

/**
 * @mutates entities
 */
const mapEntitySceneProperties = <
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
  'nodeColor' | 'solo' | 'locked' | 'visibleInViewport' | 'propertiesExpanded'
> => ({
  nodeColor: 'BLUE',
  solo: 'NONE',
  locked: node.locked,
  propertiesExpanded: false,
  visibleInViewport: node.visible,
})

/**
 * @mutates entities
 */
const mapEntityBlendProperties = <
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
  node: In,
  nodeId: string
): Pick<Out['components'], 'blendMode' | 'mask' | 'effects'> => {
  const effectIds = node.effects.map((effect, idx) => {
    const effectId = `${nodeId}e${idx}`

    switch (effect.type) {
      case 'DROP_SHADOW': {
        entities.push({
          // id: effect.id,
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
          // id: effect.id,
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
          // id: effect.id,
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
          // id: effect.id,
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
    effects: effectIds as [string],
  }
}

/**
 * @mutates entities
 */
const mapEntityChildrenProperties = <
  In extends FrameNode | GroupNode | InstanceNode,
>(
  entities: Entity[],
  node: In,
  mapper: (entities: Entity[], entity: In) => string
): { children: [string] } => ({
  children: node.children
    // @TODO: remove ignorance once all nodes are implemented
    // @ts-ignore
    .map((child) => mapper(entities, child)) as [string],
})

const mapEntityCornerProperties = <
  In extends
    | EllipseNode
    | BooleanOperationNode
    | FrameNode
    | InstanceNode
    | PolygonNode
    | RectangleNode
    | StarNode
    | VectorNode,
  Out extends Ellipse | Frame | Instance | Polygon | Rectangle | Star | Vector,
>(
  entities: Entity[],
  node: In
): Pick<Out['components'], 'cornerRadius' | 'smoothCornerRadius'> => ({
  cornerRadius: node.cornerRadius === figma.mixed ? 0 : node.cornerRadius,
  smoothCornerRadius: node.cornerSmoothing !== 0,
})

/**
 * @mutates entities
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
  nodeId: string
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
          mapPaint(entities, nodeId, child, 'f', idx)
        )
      : []) as [string],
    strokes: node.strokes.map((child, idx) =>
      mapPaint(entities, nodeId, child, 's', idx)
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

/**
 * @mutates entities
 */
const mapEllipse = (
  entities: Entity[],
  node: EllipseNode,
  nodeId: string,
  nodeParentId?: string
) => {
  entities.push({
    id: nodeId,
    tag: 'ellipse',
    schemaVersion: 1,
    components: {
      startAngle: (node.arcData.startingAngle / Math.PI) * 180,
      endAngle:
        (node.arcData.endingAngle - node.arcData.startingAngle) / (2 * Math.PI),
      innerRadius: node.arcData.innerRadius,
      ...mapEntityBaseProperties(entities, node, nodeParentId),
      ...mapEntitySceneProperties(entities, node),
      ...mapEntityBlendProperties(entities, node, nodeId),
      ...mapEntityCornerProperties(entities, node),
      ...mapEntityGeometryProperties(entities, node, nodeId),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Ellipse)
}

/**
 * @mutates entities
 */
const mapBooleanOperation = (
  entities: Entity[],
  node: BooleanOperationNode,
  nodeId: string,
  nodeParentId?: string
): void => {
  entities.push({
    id: nodeId,
    tag: 'vector',
    schemaVersion: 1,
    components: {
      vectorPaths: node.fillGeometry.map((v) => ({
        windingRule: v.windingRule,
        data: v.data,
      })) as any,
      sizeBehaviour: 'FILL',
      ...mapEntityBaseProperties(entities, node, nodeParentId),
      ...mapEntitySceneProperties(entities, node),
      ...mapEntityBlendProperties(entities, node, nodeId),
      ...mapEntityCornerProperties(entities, node),
      ...mapEntityGeometryProperties(entities, node, nodeId),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Vector)
}

/**
 * @mutates entities
 */
const mapFrame = (
  entities: Entity[],
  node: FrameNode,
  nodeId: string,
  getNodeId: (node: SceneNode) => string,
  nodeParentId?: string
): void => {
  entities.push({
    id: nodeId,
    tag: 'frame',
    schemaVersion: 1,
    components: {
      clipContent: node.clipsContent,
      childrenExpanded: false,
      ...mapEntityEntryProperties(entities, node, nodeParentId),
      ...mapEntityBaseProperties(entities, node, nodeParentId),
      ...mapEntitySceneProperties(entities, node),
      ...mapEntityBlendProperties(entities, node, nodeId),
      ...mapEntityChildrenProperties(entities, node, (_entities, _node) =>
        mapNode(_entities, _node, getNodeId, nodeId)
      ),
      ...mapEntityCornerProperties(entities, node),
      ...mapEntityIndividualCornerProperties(entities, node),
      ...mapEntityGeometryProperties(entities, node, nodeId),
      ...mapEntityIndividualStrokesProperties(entities, node),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Frame)
}

/**
 * @mutates entities
 */
const mapGroup = (
  entities: Entity[],
  node: GroupNode,
  nodeId: string,
  getNodeId: (node: SceneNode) => string,
  nodeParentId?: string
): void => {
  entities.push({
    id: nodeId,
    tag: 'group',
    schemaVersion: 1,
    components: {
      childrenExpanded: false,
      ...mapEntityBaseProperties(entities, node, nodeParentId),
      ...mapEntitySceneProperties(entities, node),
      ...mapEntityBlendProperties(entities, node, nodeId),
      ...mapEntityChildrenProperties(entities, node, (_entities, _node) =>
        mapNode(_entities, _node, getNodeId, nodeId)
      ),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Group)
}

/**
 * @mutates entities
 */
const mapInstance = (
  entities: Entity[],
  node: InstanceNode,
  nodeId: string,
  getNodeId: (node: SceneNode) => string,
  nodeParentId?: string
): void => {
  entities.push({
    id: nodeId,
    tag: 'instance',
    schemaVersion: 1,
    components: {
      clipContent: node.clipsContent,
      mainNodeComponentId: node.mainComponent?.id ?? '',
      ...mapEntityBaseProperties(entities, node, nodeParentId),
      ...mapEntitySceneProperties(entities, node),
      ...mapEntityBlendProperties(entities, node, nodeId),
      ...mapEntityChildrenProperties(entities, node, (_entities, _node) =>
        mapNode(_entities, _node, getNodeId, nodeId)
      ),
      ...mapEntityCornerProperties(entities, node),
      ...mapEntityIndividualCornerProperties(entities, node),
      ...mapEntityGeometryProperties(entities, node, nodeId),
      ...mapEntityIndividualStrokesProperties(entities, node),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Instance)
}

/**
 * @mutates entities
 */
const mapLine = (
  entities: Entity[],
  node: LineNode,
  nodeId: string,
  nodeParentId?: string
): void => {
  entities.push({
    id: nodeId,
    tag: 'line',
    schemaVersion: 1,
    components: {
      ...mapEntityBaseProperties(entities, node, nodeParentId),
      ...mapEntitySceneProperties(entities, node),
      ...mapEntityBlendProperties(entities, node, nodeId),
      ...mapEntityGeometryProperties(entities, node, nodeId),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Line)
}

/**
 * @mutates entities
 */
const mapPolygon = (
  entities: Entity[],
  node: PolygonNode,
  nodeId: string,
  nodeParentId?: string
): void => {
  entities.push({
    id: nodeId,
    tag: 'polygon',
    schemaVersion: 1,
    components: {
      pointCount: node.pointCount,
      ...mapEntityBaseProperties(entities, node, nodeParentId),
      ...mapEntitySceneProperties(entities, node),
      ...mapEntityBlendProperties(entities, node, nodeId),
      ...mapEntityCornerProperties(entities, node),
      ...mapEntityGeometryProperties(entities, node, nodeId),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Polygon)
}

/**
 * @mutates entities
 */
const mapRectangle = (
  entities: Entity[],
  node: RectangleNode,
  nodeId: string,
  nodeParentId?: string
): void => {
  entities.push({
    id: nodeId,
    tag: 'rectangle',
    schemaVersion: 1,
    components: {
      ...mapEntityBaseProperties(entities, node, nodeParentId),
      ...mapEntitySceneProperties(entities, node),
      ...mapEntityBlendProperties(entities, node, nodeId),
      ...mapEntityCornerProperties(entities, node),
      ...mapEntityIndividualCornerProperties(entities, node),
      ...mapEntityGeometryProperties(entities, node, nodeId),
      ...mapEntityIndividualStrokesProperties(entities, node),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Rectangle)
}

/**
 * @mutates entities
 */
const mapStar = (
  entities: Entity[],
  node: StarNode,
  nodeId: string,
  nodeParentId?: string
): void => {
  entities.push({
    id: nodeId,
    tag: 'star',
    schemaVersion: 1,
    components: {
      pointCount: node.pointCount,
      innerRadius: node.innerRadius,
      ...mapEntityBaseProperties(entities, node, nodeParentId),
      ...mapEntitySceneProperties(entities, node),
      ...mapEntityBlendProperties(entities, node, nodeId),
      ...mapEntityCornerProperties(entities, node),
      ...mapEntityGeometryProperties(entities, node, nodeId),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Star)
}

/**
 * @mutates entities
 */
const mapVector = (
  entities: Entity[],
  node: VectorNode,
  nodeId: string,
  nodeParentId?: string
): void => {
  entities.push({
    id: nodeId,
    tag: 'vector',
    schemaVersion: 1,
    components: {
      vectorPaths: node.vectorPaths.map((v) => ({
        windingRule: v.windingRule,
        data: v.data,
      })) as any,
      sizeBehaviour: 'FILL',
      ...mapEntityBaseProperties(entities, node, nodeParentId),
      ...mapEntitySceneProperties(entities, node),
      ...mapEntityBlendProperties(entities, node, nodeId),
      ...mapEntityCornerProperties(entities, node),
      ...mapEntityGeometryProperties(entities, node, nodeId),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Vector)
}

const mapText = (
  entities: Entity[],
  node: TextNode,
  nodeId: string,
  nodeParentId?: string
): void => {
  entities.push({
    id: nodeId,
    tag: 'text',
    schemaVersion: 1,
    components: {
      vectorPaths: node.fillGeometry.map((v) => ({
        windingRule: v.windingRule,
        data: v.data,
      })) as any,
      sizeBehaviour: 'IGNORE',
      ...mapEntityBaseProperties(entities, node, nodeParentId),
      ...mapEntitySceneProperties(entities, node),
      ...mapEntityBlendProperties(entities, node, nodeId),
      ...mapEntityGeometryProperties(entities, node, nodeId),
      ...mapEntityLayoutProperties(entities, node),
    },
  } satisfies Text)
}

const mapNode = (
  entities: Entity[],
  node: SceneNode,
  getNodeId: (node: SceneNode) => string,
  nodeParentId?: string
): string => {
  const nodeId = getNodeId(node)

  switch (node.type) {
    case 'ELLIPSE': {
      mapEllipse(entities, node, nodeId, nodeParentId)
      break
    }
    case 'BOOLEAN_OPERATION': {
      mapBooleanOperation(entities, node, nodeId, nodeParentId)
      break
    }
    case 'FRAME': {
      mapFrame(entities, node, nodeId, getNodeId, nodeParentId)
      break
    }
    case 'GROUP': {
      mapGroup(entities, node, nodeId, getNodeId, nodeParentId)
      break
    }
    case 'INSTANCE': {
      mapInstance(entities, node, nodeId, getNodeId, nodeParentId)
      break
    }
    case 'LINE': {
      mapLine(entities, node, nodeId, nodeParentId)
      break
    }
    case 'POLYGON': {
      mapPolygon(entities, node, nodeId, nodeParentId)
      break
    }
    case 'RECTANGLE': {
      mapRectangle(entities, node, nodeId, nodeParentId)
      break
    }
    case 'STAR': {
      mapStar(entities, node, nodeId, nodeParentId)
      break
    }
    case 'VECTOR': {
      mapVector(entities, node, nodeId, nodeParentId)
      break
    }
    case 'TEXT': {
      mapText(entities, node, nodeId, nodeParentId)
      break
    }
    default: {
      throw new Error(`Node with type "${node.type}" is not supported yet`)
    }
  }

  return nodeId
}

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

const getProjectId = (node: SceneNode): string => {
  const storedProjectId = node.getSharedPluginData(
    ANINIX_WORKSPACE_KEY,
    ANINIX_PROJECT_KEY
  )
  return !!storedProjectId ? storedProjectId : generateId()
}

const getNodeId = (node: SceneNode): string => {
  const storedNodeId = node.getSharedPluginData(
    ANINIX_WORKSPACE_KEY,
    ANINIX_NODE_KEY
  )
  return !!storedNodeId ? storedNodeId : generateId()
}

type Options = {
  /**
   * Middleware function to receive node ids.
   * By default it will try to grab public node id or generate a new one.
   * You can change behavior by providing custom function.
   *
   * @example
   * (node: SceneNode) => {
   *   const attachedNodeId = node.getPluginData('NODE_KEY') // or any other key you have used
   *   return !!attachedNodeId ? attachedNodeId : generateId()
   * }
   */
  getNodeId?: (node: SceneNode) => string
}

// @NOTE: using a class here improves performance in case of high mapper utilization
class Bind {
  constructor(
    private readonly node: SceneNode,
    private readonly options?: Options
  ) {}

  getSnapshot = (): AninixSnapshot => {
    const projectId = getProjectId(this.node)
    return {
      id: projectId,
      schemaVersion: 2,
      entities: Object.fromEntries(
        this.getEntities().map((entity) => [entity.id, entity])
      ),
    }
  }

  getEntities = (): Entity[] => {
    const projectId = getProjectId(this.node)
    const entities: Entity[] = []
    mapRoot(entities, this.node, projectId)
    mapNode(entities, this.node, this.options?.getNodeId ?? getNodeId)
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
  getNormalNodeName,
  getPageBackgroundColor,
  getProjectId,
  isProjectAttachedToNode,
}
