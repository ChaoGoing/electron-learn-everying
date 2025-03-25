import { Suspense } from 'react';
import { RouterProvider as BaseRouterProvider, createBrowserRouter, RouteObject } from 'react-router-dom';
import { routes, AppRouteObject } from './routes';
import Loading from '../components/Loading';

// 将 AppRouteObject 转换为 RouteObject
const convertToRouteObject = (route: AppRouteObject): RouteObject => {
  const { meta, ...routeObject } = route;
  if (routeObject.index) {
    return {
      ...routeObject,
      children: route.children?.map(convertToRouteObject)
    } as RouteObject;
  }
  return {
    ...routeObject,
    index: false,
    children: route.children?.map(convertToRouteObject)
  } as RouteObject;
};

// 创建路由实例
const router = createBrowserRouter(routes.map(convertToRouteObject));

export const RouterProvider = () => {
  return (
    <Suspense fallback={<Loading />}>
      <BaseRouterProvider router={router} />
    </Suspense>
  );
};
