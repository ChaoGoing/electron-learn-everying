import { createRoot } from 'react-dom/client';
import './styles/index.css';

import React from 'react'
import { RouterProvider } from './router/RouterProvider';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <RouterProvider />
  </React.StrictMode>
);
