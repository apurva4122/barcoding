import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanOnlyAccess: () => void;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({ 
  open, 
  onOpenChange, 
  onScanOnlyAccess 
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = () => {
    const success = login(password);
    if (success) {
      setError('');
      setPassword('');
      onOpenChange(false);
    } else {
      setError('Invalid password. Please try again.');
    }
  };

  const handleScanOnly = () => {
    onScanOnlyAccess();
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Access Dashboard</DialogTitle>
          <DialogDescription>
            Enter the password for full access or continue with scan-only mode.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="col-span-3"
              placeholder="Enter password"
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Button onClick={handleLogin} className="w-full">
              Login with Password
            </Button>
            <Button 
              variant="outline" 
              onClick={handleScanOnly}
              className="w-full"
            >
              Continue with Scan Only
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};