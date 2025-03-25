import { createRoot } from 'react-dom/client';
import './assets/base.css';
import './assets/main.css';
import './assets/layout.css';
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
