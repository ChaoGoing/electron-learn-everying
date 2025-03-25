import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppRouteObject } from '../router/routes';

export const useRouteGuard = (route: AppRouteObject) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // 更新页面标题
    if (route.meta?.title) {
      document.title = route.meta.title;
    }

    // 检查认证
    if (route.meta?.requiresAuth) {
      const isAuthenticated = true; // 替换为实际的认证逻辑
      if (!isAuthenticated) {
        navigate('/login', { state: { from: location }, replace: true });
        return;
      }
    }

    // 检查权限
    if (route.meta?.permissions?.length) {
      const hasPermission = true; // 替换为实际的权限检查逻辑
      if (!hasPermission) {
        navigate('/403', { replace: true });
        return;
      }
    }
  }, [location, route.meta, navigate]);
};
