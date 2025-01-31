import * as fs from 'fs'

export const loadJsonFile = async (filePath: string): Promise<any> => {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8')
    return JSON.parse(data)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      console.error(`File ${filePath} not found.`)
      return null
    } else if (err instanceof SyntaxError) {
      console.error(`Error decoding JSON from ${filePath}.`)
      return null
    } else {
      throw err
    }
  }
}

export const writeJsonFile = async (
  filePath: string,
  data: any
): Promise<void> => {
  try {
    const jsonData = JSON.stringify(data, null, 4)
    await fs.promises.writeFile(filePath, jsonData, 'utf8')
    console.log(`File ${filePath} successfully updated.`)
  } catch (err) {
    throw new Error(`An error occurred while writing to ${filePath}: ${err}`)
  }
}
