type RGBA = {
  r: number
  g: number
  b: number
  a: number
}

export const getPageBackgroundColor = (): {
  color: RGBA
  isVisible: boolean
} => {
  // @NOTE: there will always be only one background.
  // As for how Figma works in February 2024.
  const background = figma.currentPage.backgrounds[0]

  switch (background.type) {
    case 'SOLID': {
      const color = background.color
      const opacity = background.opacity || 1
      const isVisible = background.visible || false
      return {
        color: {
          r: color.r * 255,
          g: color.g * 255,
          b: color.b * 255,
          a: opacity,
        },
        isVisible,
      }
    }

    default: {
      console.warn(
        `Not supported paint type yet: "${background.type}". Default value returned.`
      )
      return {
        color: {
          r: 0,
          g: 0,
          b: 0,
          a: 1,
        },
        isVisible: true,
      }
    }
  }
}
