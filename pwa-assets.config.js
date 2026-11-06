import {
  defineConfig,
  minimal2023Preset as preset,
} from '@vite-pwa/assets-generator/config'

// Color de fondo = theme_color (mismo azul del header)
const fondo = { background: '#168af0' }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: fondo },
    apple: { ...preset.apple, resizeOptions: fondo },
  },
  images: ['public/logo.svg'],
})