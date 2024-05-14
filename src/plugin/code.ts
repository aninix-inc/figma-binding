import { bind } from '../index'

async function run() {
  const selectedFrames = figma.currentPage.selection

  if (selectedFrames.length === 0) {
    console.log('>>> 1')
    figma.closePlugin('⚠️ Please select testing frame')
    return
  }

  const snapshot = await bind(selectedFrames[0]).snapshot()
  console.log('!!!', snapshot)

  console.log('>>> 2')
  figma.closePlugin('Done')
}

run()
