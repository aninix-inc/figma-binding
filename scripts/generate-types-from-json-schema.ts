import * as fs from 'fs'
import generateTypescriptFile from 'json-schema-to-typescript'
import * as path from 'path'

const run = async () => {
  const jsonSchema = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'schema.json'), 'utf-8')
  )
  const filePath = path.join(__dirname, '../src', 'types.d.ts')
  fs.writeFileSync(
    filePath,
    await generateTypescriptFile.compile(jsonSchema, 'snapshot-v2'),
    'utf-8'
  )
  console.log('Exported to:', filePath)
}

run()
