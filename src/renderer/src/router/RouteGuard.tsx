import { FC, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AppRouteObject } from './routes';

interface RouteGuardProps {
  children: ReactNode;
  route: AppRouteObject;
}

export const RouteGuard: FC<RouteGuardProps> = ({ children, route }) => {
  const location = useLocation();
  const isAuthenticated = true; // 这里替换为你的认证逻辑

  // 检查是否需要认证
  if (route.meta?.requiresAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 检查权限
  if (route.meta?.permissions?.length) {
    const hasPermission = true; // 这里替换为你的权限检查逻辑
    if (!hasPermission) {
      return <Navigate to="/403" replace />;
    }
  }

  return <>{children}</>;
};
