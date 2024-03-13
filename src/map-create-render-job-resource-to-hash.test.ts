import { expect, test } from 'bun:test'
import { mapCreateRenderJobResourceToHash } from './map-create-render-job-resource-to-hash'

test('mapCreateRenderJobResourceToHash', async () => {
  const result = await mapCreateRenderJobResourceToHash({ test: 'object' })
  expect(result).toEqual(
    'f5385eaa9068c121e39b71e8bce648628eb0ff7b3b106bb8395a5f74f3c23de0'
  )
})
