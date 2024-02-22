import * as fs from 'fs'
import generateTypescriptFile from 'json-schema-to-typescript'
import * as path from 'path'

const run = async () => {
  const jsonSchema = await fetch(
    // @TODO: replace protocol with `https` once infrastracture is ready.
    'http://static.aninix.com/schemas/snapshot-v2.json'
  ).then((response) => response.json())
  const filePath = path.join(__dirname, '../src', 'types.ts')
  fs.writeFileSync(
    filePath,
    await generateTypescriptFile.compile(jsonSchema, 'snapshot-v2'),
    'utf-8'
  )
  console.log('Exported to:', filePath)
}

run()
