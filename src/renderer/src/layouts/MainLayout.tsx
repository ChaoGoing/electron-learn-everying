import { FC } from 'react';
import { Outlet } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const MainLayout: FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors h-[100vh] overflow-hidden">
      <header className="drag-region">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="no-drag">
            <ThemeToggle />
          </div>
        </nav>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
