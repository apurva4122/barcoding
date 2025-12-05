"use client";

import { useState, useEffect, ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, AlertCircle } from "lucide-react";

interface PasswordProtectionProps {
  children: ReactNode;
  sectionName: string;
}

// Password for accessing protected sections (change this to your desired password)
const SECTION_PASSWORD = "admin123";

// Shared authentication key - once authenticated for any section, all sections are unlocked
const SHARED_AUTH_KEY = "app_authenticated";

export function PasswordProtection({ children, sectionName }: PasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(true);

  // Check if already authenticated (shared across all sections)
  useEffect(() => {
    const authenticated = sessionStorage.getItem(SHARED_AUTH_KEY) === "true";
    setIsAuthenticated(authenticated);
    setShowDialog(!authenticated);
  }, []);

  const handlePasswordSubmit = () => {
    if (password === SECTION_PASSWORD) {
      // Set shared authentication - unlocks all sections
      sessionStorage.setItem(SHARED_AUTH_KEY, "true");
      setIsAuthenticated(true);
      setShowDialog(false);
      setError(null);
    } else {
      setError("Incorrect password. Please try again.");
      setPassword("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePasswordSubmit();
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <Dialog open={showDialog} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyPress}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Password Required
          </DialogTitle>
          <DialogDescription>
            This section is password protected. Please enter the password to continue.
            Once authenticated, all sections will be unlocked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="section-password">Password</Label>
            <Input
              id="section-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              onKeyPress={handleKeyPress}
              placeholder="Enter password"
              autoFocus
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={handlePasswordSubmit} disabled={!password.trim()}>
            Unlock
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
