import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const app = createApp(App)

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'howMuchDark',
    themes: {
      howMuchDark: {
        dark: true,
        colors: {
          background: '#0f1219',
          surface: '#181d28',
          'surface-variant': '#121620',
          primary: '#14b8a6',
          secondary: '#38bdf8',
          error: '#fb7185',
          'on-background': '#f8fafc',
          'on-surface': '#f8fafc',
          'on-primary': '#0b1116',
        },
      },
    },
  },
})

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')
