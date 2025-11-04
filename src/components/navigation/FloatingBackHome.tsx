import { Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const FloatingBackHome = () => {
  const location = useLocation();
  const homePaths = ['/', '/login'];
  if (homePaths.includes(location.pathname)) return null;

  return (
    <div className="fixed top-3 left-3 z-50">
      <Link to="/login" aria-label="Voltar para Home">
        <Button variant="outline" size="sm" className="gap-2 shadow-md">
          <Home className="w-4 h-4" />
          Home
        </Button>
      </Link>
    </div>
  );
};
