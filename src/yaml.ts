import * as fs from 'fs'
import * as yaml from 'js-yaml'

export const loadYamlFile = async (filePath: string): Promise<any> => {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8')
    return yaml.load(data)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      console.error(`File ${filePath} not found.`)
      return null
    } else if (err instanceof yaml.YAMLException) {
      console.error(`Error decoding YAML from ${filePath}.`)
      return null
    } else {
      throw err
    }
  }
}

export const writeYamlFile = async (
  filePath: string,
  data: any
): Promise<void> => {
  try {
    const yamlData = yaml.dump(data)
    await fs.promises.writeFile(filePath, yamlData, 'utf8')
    console.log(`File ${filePath} successfully updated.`)
  } catch (err) {
    throw new Error(`An error occurred while writing to ${filePath}: ${err}`)
  }
}
