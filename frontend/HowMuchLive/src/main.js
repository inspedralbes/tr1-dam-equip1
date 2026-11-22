import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const app = createApp(App)

// Tema fosc amb els mateixos colors que assets/main.css
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'howmuch',
    themes: {
      howmuch: {
        dark: true,
        colors: {
          background: '#181b22',
          surface: '#242834',
          primary: '#00bfa5',
          secondary: '#94a3b8',
          error: '#f43f5e',
          success: '#10b981',
          info: '#38bdf8',
        },
      },
    },
  },
})

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')
