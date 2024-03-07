import { describe, expect, test } from 'bun:test'
import {
  mapEntityBaseProperties,
  mapEntityBlendProperties,
  mapEntityCornerProperties,
  mapEntityEntryProperties,
  mapEntitySceneProperties,
} from '.'

// @NOTE: provide global figma object
// @ts-ignore
globalThis.figma = {
  mixed: Symbol('figma.mixed'),
}

describe('mapEntityEntryProperties', () => {
  test('with parent', () => {
    const result = mapEntityEntryProperties({
      projectId: 'test-project',
      nodeId: 'test-node',
      parentNodeId: 'hello',
    })
    expect(result).toMatchSnapshot()
  })

  test('without parent', () => {
    const result = mapEntityEntryProperties({
      projectId: 'test-project',
      nodeId: 'test-node',
    })
    expect(result).toMatchSnapshot()
  })
})

describe('mapEntityBaseProperties', () => {
  test('has NOT parent', () => {
    const result = mapEntityBaseProperties(
      {
        name: 'Some Node',
        type: 'ELLIPSE',
      },
      {
        projectId: 'test-project',
        nodeId: 'test-node',
      }
    )
    expect(result).toMatchSnapshot()
  })

  test('has parent', () => {
    const result = mapEntityBaseProperties(
      {
        name: 'Some Node',
        type: 'ELLIPSE',
      },
      {
        projectId: 'test-project',
        nodeId: 'test-node',
        parentNodeId: 'test-parent-node',
      }
    )
    expect(result).toMatchSnapshot()
  })

  test('has NOT initial node', () => {
    const result = mapEntityBaseProperties(
      {
        name: 'Some Node',
        type: 'ELLIPSE',
      },
      {
        projectId: 'test-project',
        nodeId: 'test-node',
      }
    )
    expect(result).toMatchSnapshot()
  })

  test('has initial node', () => {
    const result = mapEntityBaseProperties(
      {
        name: 'Some Node',
        type: 'ELLIPSE',
      },
      {
        projectId: 'test-project',
        nodeId: 'test-node',
        initialNodeId: 'initial-test-node',
        parentNodeId: 'test-parent-node',
      }
    )
    expect(result).toMatchSnapshot()
  })
})

test('mapEntitySceneProperties', () => {
  const result = mapEntitySceneProperties({
    locked: true,
    visible: true,
  })
  expect(result).toMatchSnapshot()
})

describe('mapEntityBlendProperties', () => {
  test('has NOT effects', () => {
    const entities: any[] = []
    const result = mapEntityBlendProperties(
      entities,
      {
        blendMode: 'NORMAL',
        isMask: false,
        effects: [],
      },
      {
        projectId: 'test-project',
        nodeId: 'test-node',
        initialNodeId: 'initial-test-node',
        parentNodeId: 'test-parent-node',
      }
    )
    expect(entities).toMatchSnapshot()
    expect(result).toMatchSnapshot()
  })

  test('has drop shadow', () => {
    const entities: any[] = []
    const result = mapEntityBlendProperties(
      entities,
      {
        blendMode: 'NORMAL',
        isMask: false,
        effects: [
          {
            type: 'DROP_SHADOW',
            color: {
              r: 255,
              g: 0,
              b: 0,
              a: 1,
            },
            offset: {
              x: 0,
              y: 0,
            },
            radius: 10,
            visible: true,
            blendMode: 'NORMAL',
          },
        ],
      },
      {
        projectId: 'test-project',
        nodeId: 'test-node',
        initialNodeId: 'initial-test-node',
        parentNodeId: 'test-parent-node',
      }
    )
    expect(entities).toMatchSnapshot()
    expect(result).toMatchSnapshot()
  })

  test('has inner shadow', () => {
    const entities: any[] = []
    const result = mapEntityBlendProperties(
      entities,
      {
        blendMode: 'NORMAL',
        isMask: false,
        effects: [
          {
            type: 'INNER_SHADOW',
            color: {
              r: 255,
              g: 0,
              b: 0,
              a: 1,
            },
            offset: {
              x: 0,
              y: 0,
            },
            radius: 10,
            visible: true,
            blendMode: 'NORMAL',
          },
        ],
      },
      {
        projectId: 'test-project',
        nodeId: 'test-node',
        initialNodeId: 'initial-test-node',
        parentNodeId: 'test-parent-node',
      }
    )
    expect(entities).toMatchSnapshot()
    expect(result).toMatchSnapshot()
  })

  test('has layer blur', () => {
    const entities: any[] = []
    const result = mapEntityBlendProperties(
      entities,
      {
        blendMode: 'NORMAL',
        isMask: false,
        effects: [
          {
            type: 'LAYER_BLUR',
            radius: 10,
            visible: true,
          },
        ],
      },
      {
        projectId: 'test-project',
        nodeId: 'test-node',
        initialNodeId: 'initial-test-node',
        parentNodeId: 'test-parent-node',
      }
    )
    expect(entities).toMatchSnapshot()
    expect(result).toMatchSnapshot()
  })

  test('has background blur', () => {
    const entities: any[] = []
    const result = mapEntityBlendProperties(
      entities,
      {
        blendMode: 'NORMAL',
        isMask: false,
        effects: [
          {
            type: 'BACKGROUND_BLUR',
            radius: 10,
            visible: true,
          },
        ],
      },
      {
        projectId: 'test-project',
        nodeId: 'test-node',
        initialNodeId: 'initial-test-node',
        parentNodeId: 'test-parent-node',
      }
    )
    expect(entities).toMatchSnapshot()
    expect(result).toMatchSnapshot()
  })

  test('has multiple effects', () => {
    const entities: any[] = []
    const result = mapEntityBlendProperties(
      entities,
      {
        blendMode: 'NORMAL',
        isMask: false,
        effects: [
          {
            type: 'DROP_SHADOW',
            color: {
              r: 255,
              g: 0,
              b: 0,
              a: 1,
            },
            offset: {
              x: 0,
              y: 0,
            },
            radius: 10,
            visible: true,
            blendMode: 'NORMAL',
          },
          {
            type: 'INNER_SHADOW',
            color: {
              r: 255,
              g: 0,
              b: 0,
              a: 1,
            },
            offset: {
              x: 0,
              y: 0,
            },
            radius: 10,
            visible: true,
            blendMode: 'NORMAL',
          },
          {
            type: 'LAYER_BLUR',
            radius: 10,
            visible: true,
          },
          {
            type: 'BACKGROUND_BLUR',
            radius: 10,
            visible: true,
          },
        ],
      },
      {
        projectId: 'test-project',
        nodeId: 'test-node',
        initialNodeId: 'initial-test-node',
        parentNodeId: 'test-parent-node',
      }
    )
    expect(entities).toMatchSnapshot()
    expect(result).toMatchSnapshot()
  })
})

test('mapEntityCornerProperties', () => {
  const result = mapEntityCornerProperties({
    cornerRadius: 15,
    cornerSmoothing: 0.5,
  })
  expect(result).toMatchSnapshot()
})
