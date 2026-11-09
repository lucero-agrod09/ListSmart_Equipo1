
import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

// ==========================================
// LISTSMART - CONFIGURACIÓN DE ICONOS PWA
// ==========================================

// Color principal de ListSmart
// Debe coincidir con el encabezado de la app
const COLOR_LISTSMART = '#168af0'

// Configuración para generar los iconos
export default defineConfig({

  // Iconos utilizados en el navegador
  headLinkOptions: {
    preset: '2023',
  },

  // Configuración de iconos para PWA
  preset: {
    ...minimal2023Preset,

    // Iconos adaptables para Android
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: {
        background: COLOR_LISTSMART,
      },
    },

    // Iconos para dispositivos Apple
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: {
        background: COLOR_LISTSMART,
      },
    },
  },

  // Logo oficial de ListSmart
  images: ['public/logo.svg'],
})
