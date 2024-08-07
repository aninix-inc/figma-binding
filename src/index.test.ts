import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { Relations } from './relations'
import {
  defaultGetNodeId as getNodeId,
  mapEntityBaseProperties,
  mapEntityBlendProperties,
  mapEntityCornerProperties,
  mapEntityEntryProperties,
  mapEntityFrameProperties,
  mapEntityInstanceProperties,
  mapEntitySceneProperties,
} from './snapshot'

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
  let relations: Relations

  beforeEach(() => {
    relations = new Relations()
  })

  test('has NOT parent', () => {
    const result = mapEntityBaseProperties(
      relations,
      {
        id: 'some-id',
        name: 'Some Node',
        type: 'ELLIPSE',
      },
      {
        projectId: 'test-project',
        nodeId: 'test-node',
      }
    )
    expect(result).toMatchSnapshot()
    expect(relations.toJSON()).toMatchSnapshot()
  })

  test('has parent', () => {
    const result = mapEntityBaseProperties(
      relations,
      {
        id: 'some-id',
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
    expect(relations.toJSON()).toMatchSnapshot()
  })

  test('has NOT initial node', () => {
    const result = mapEntityBaseProperties(
      relations,
      {
        id: 'some-id',
        name: 'Some Node',
        type: 'ELLIPSE',
      },
      {
        projectId: 'test-project',
        nodeId: 'test-node',
      }
    )
    expect(result).toMatchSnapshot()
    expect(relations.toJSON()).toMatchSnapshot()
  })

  test('has initial node', () => {
    const result = mapEntityBaseProperties(
      relations,
      {
        id: 'some-id',
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
    expect(relations.toJSON()).toMatchSnapshot()
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
  let relations: Relations

  beforeEach(() => {
    relations = new Relations()
  })

  test('has NOT effects', () => {
    const entities: any[] = []
    const result = mapEntityBlendProperties(
      entities,
      relations,
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
    expect(relations.toJSON()).toMatchSnapshot()
    expect(result).toMatchSnapshot()
  })

  test('has drop shadow', () => {
    const entities: any[] = []
    const result = mapEntityBlendProperties(
      entities,
      relations,
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
    expect(relations.toJSON()).toMatchSnapshot()
    expect(result).toMatchSnapshot()
  })

  test('has inner shadow', () => {
    const entities: any[] = []
    const result = mapEntityBlendProperties(
      entities,
      relations,
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
    expect(relations.toJSON()).toMatchSnapshot()
    expect(result).toMatchSnapshot()
  })

  test('has layer blur', () => {
    const entities: any[] = []
    const result = mapEntityBlendProperties(
      entities,
      relations,
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
    expect(relations.toJSON()).toMatchSnapshot()
    expect(result).toMatchSnapshot()
  })

  test('has background blur', () => {
    const entities: any[] = []
    const result = mapEntityBlendProperties(
      entities,
      relations,
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
    expect(relations.toJSON()).toMatchSnapshot()
    expect(result).toMatchSnapshot()
  })

  test('has multiple effects', () => {
    const entities: any[] = []
    const result = mapEntityBlendProperties(
      entities,
      relations,
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
    expect(relations.toJSON()).toMatchSnapshot()
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

test('mapEntityFrameProperties', () => {
  const result = mapEntityFrameProperties({
    clipsContent: true,
  })
  expect(result).toMatchSnapshot()
})

describe('mapEntityInstanceProperties', () => {
  test('not null', async () => {
    const getPluginData = mock()
    const setPluginData = mock()
    const getSharedPluginData = mock().mockReturnValue('some-id-from-aninix')
    const setSharedPluginData = mock().mockReturnValue('some-id-from-aninix')

    const result = await mapEntityInstanceProperties(
      {
        id: 'some-id-1-from-figma',
        name: 'some-name-1',
        parent: null,
        getPluginData,
        setPluginData,
        getSharedPluginData,
        setSharedPluginData,
        getMainComponentAsync: async () => ({
          id: 'some-id-2-from-figma',
          name: 'some-name-2',
          parent: null,
          getPluginData,
          setPluginData,
          getSharedPluginData,
          setSharedPluginData,
        }),
      },
      getNodeId,
      {
        projectId: 'some-project-id',
        nodeId: 'some-node-id',
      }
    )
    expect(result).toMatchSnapshot()
  })

  test('null', () => {
    const getPluginData = mock()
    const setPluginData = mock()
    const getSharedPluginData = mock().mockReturnValue('some-id-from-aninix')
    const setSharedPluginData = mock().mockReturnValue('some-id-from-aninix')

    expect(
      mapEntityInstanceProperties(
        {
          id: 'some-id-1-from-figma',
          name: 'some-name-1',
          parent: null,
          getPluginData,
          setPluginData,
          getSharedPluginData,
          setSharedPluginData,
          getMainComponentAsync: async () => null,
        },
        getNodeId,
        {
          projectId: 'some-project-id',
          nodeId: 'some-node-id',
        }
      )
    ).resolves.toEqual({
      mainNodeComponentId: '',
    })
  })
})
