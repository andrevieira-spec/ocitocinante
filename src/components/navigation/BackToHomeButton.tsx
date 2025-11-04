import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const BackToHomeButton = () => {
  return (
    <Link to="/login">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <Home className="w-4 h-4" />
        Voltar para Home
      </Button>
    </Link>
  );
};
