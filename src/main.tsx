import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import { routes } from './router'
import './index.css'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

const router = createBrowserRouter(routes, {
  basename: basename || undefined,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
)
