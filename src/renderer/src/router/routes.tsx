import { RouteObject } from 'react-router-dom';
import { lazy, ReactNode } from 'react';
import MainLayout from '../layouts/MainLayout';

// 懒加载页面组件
const Home = lazy(() => import('../pages/Home'));
const About = lazy(() => import('../pages/About'));
const Settings = lazy(() => import('../pages/Settings'));

// 扩展路由配置类型
export interface RouteMeta {
  title?: string;
  requiresAuth?: boolean;
  permissions?: string[];
}

export interface AppRouteObject extends Omit<RouteObject, 'children'> {
  meta?: RouteMeta;
  children?: AppRouteObject[];
}

// 路由配置
export const routes: AppRouteObject[] = [
  {
    path: '/',
    element: <MainLayout  />,
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: 'about',
        element: <About />
      },
      {
        path: 'settings',
        element: <Settings />
      }
    ]
  }
];
