import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { Room } from './pages/Room'
import { Root } from './pages/Root'

document.title = import.meta.env.VITE_APP_NAME || 'tldraw sync'

const router = createBrowserRouter([
	{
		path: '/',
		element: <Root />,
	},
	{
		path: '/:whiteboardId',
		element: <Room />,
	},
])

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
)
