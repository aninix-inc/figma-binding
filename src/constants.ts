/**
 * Used to add small labels to frame names when there are linked Aninix project
 */
export const ANINIX_NAME_PART = '▶ '

/**
 * Used as Aninix workspace
 */
export const ANINIX_WORKSPACE_KEY = 'aninix'

/**
 * Used to store Aninix project id on nodes
 */
export const ANINIX_PROJECT_KEY = 'aninix_project_id'

/**
 * Previously has name `ModelType`
 */
export enum EntityType {
  Root = 'root',
  Node = 'node',
  Keyframe = 'keyframe',
  /**
   * Previously has name `property-group`
   */
  Effect = 'effect',
  /**
   * Previously has name `property-group`
   */
  Paint = 'paint',
  ExportPreset = 'export-preset',
  CurveStyle = 'curve-style',
  ColorStop = 'color-stop',
}

export enum BlendModeType {
  PassThrough = 'PASS_THROUGH',
  Normal = 'NORMAL',
  Darken = 'DARKEN',
  Multiply = 'MULTIPLY',
  LinearBurn = 'LINEAR_BURN',
  ColorBurn = 'COLOR_BURN',
  Lighten = 'LIGHTEN',
  Screen = 'SCREEN',
  LinearDodge = 'LINEAR_DODGE',
  ColorDodge = 'COLOR_DODGE',
  Overlay = 'OVERLAY',
  SoftLight = 'SOFT_LIGHT',
  HardLight = 'HARD_LIGHT',
  Difference = 'DIFFERENCE',
  Exclusion = 'EXCLUSION',
  Hue = 'HUE',
  Saturation = 'SATURATION',
  Color = 'COLOR',
  Luminosity = 'LUMINOSITY',
}

export enum StrokeCap {
  None = 'NONE', // or BUTT
  Round = 'ROUND',
  Square = 'SQUARE',
  ArrowLines = 'ARROW_LINES',
  ArrowEquilateral = 'ARROW_EQUILATERAL',
  TriangleFilled = 'TRIANGLE_FILLED',
  DiamondFilled = 'DIAMOND_FILLED',
  CircleFilled = 'CIRCLE_FILLED',
}
