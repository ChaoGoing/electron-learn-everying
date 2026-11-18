import { Suspense } from 'react'
import {
  RouterProvider as BaseRouterProvider,
  createBrowserRouter,
  RouteObject
} from 'react-router-dom'
import { routes, AppRouteObject } from './routes'
import Loading from '../components/Loading'

// 将 AppRouteObject 转换为 RouteObject
const convertToRouteObject = (route: AppRouteObject): RouteObject => {
  // meta 是本项目给路由附加的元信息（标题/鉴权），不属于 react-router 的 RouteObject，
  // 用剩余属性把它剔除；解构出的 meta 本身不参与后续逻辑。
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { meta, ...routeObject } = route
  if (routeObject.index) {
    return {
      ...routeObject,
      children: route.children?.map(convertToRouteObject)
    } as RouteObject
  }
  return {
    ...routeObject,
    index: false,
    children: route.children?.map(convertToRouteObject)
  } as RouteObject
}

// 创建路由实例
const router = createBrowserRouter(routes.map(convertToRouteObject))

export const RouterProvider = (): JSX.Element => {
  return (
    <Suspense fallback={<Loading />}>
      <BaseRouterProvider router={router} />
    </Suspense>
  )
}
