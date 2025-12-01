"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { initializeSupabaseTables, migrateLocalStorageToSupabase } from '@/lib/setup-supabase';
import { Database, Settings, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function SupabaseInitializer() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [initStatus, setInitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInitialize = async () => {
    setIsInitializing(true);
    setInitStatus('idle');

    try {
      const success = await initializeSupabaseTables();
      if (success) {
        setInitStatus('success');
        toast.success('Supabase tables initialized successfully!');
      } else {
        setInitStatus('error');
        toast.error('Failed to initialize Supabase tables');
      }
    } catch (error) {
      console.error('Error initializing tables:', error);
      setInitStatus('error');
      toast.error('Error initializing Supabase tables');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleMigration = async () => {
    setIsMigrating(true);
    setMigrationStatus('idle');

    try {
      const success = await migrateLocalStorageToSupabase();
      if (success) {
        setMigrationStatus('success');
        toast.success('Data migrated to Supabase successfully!');
      } else {
        setMigrationStatus('error');
        toast.error('Failed to migrate data to Supabase');
      }
    } catch (error) {
      console.error('Error migrating data:', error);
      setMigrationStatus('error');
      toast.error('Error migrating data to Supabase');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Supabase Setup</h2>
        <p className="text-muted-foreground">Initialize Supabase tables and migrate existing data</p>
      </div>

      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          <strong>Setup Instructions:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Make sure your Supabase project is configured with the correct environment variables</li>
            <li>Initialize the database tables first</li>
            <li>Optionally migrate existing localStorage data to Supabase</li>
          </ol>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Initialize Tables */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Initialize Tables
            </CardTitle>
            <CardDescription>
              Create the required database tables and indexes in your Supabase project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Tables to be created:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>workers</code> - Store worker information</li>
                <li>• <code>attendance_records</code> - Store attendance data</li>
                <li>• Indexes for performance optimization</li>
                <li>• Row Level Security policies</li>
              </ul>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                onClick={handleInitialize} 
                disabled={isInitializing}
                className="flex-1"
              >
                {isInitializing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Initializing...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Initialize Tables
                  </>
                )}
              </Button>
              
              {initStatus === 'success' && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {initStatus === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Migrate Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Migrate Data
            </CardTitle>
            <CardDescription>
              Move existing worker and attendance data from localStorage to Supabase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Migration includes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All worker profiles and information</li>
                <li>• Historical attendance records</li>
                <li>• Packer designations and settings</li>
                <li>• Overtime records</li>
              </ul>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Note:</strong> Initialize tables first before migrating data. 
                This will copy data from localStorage to Supabase without removing the local copies.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-2">
              <Button 
                onClick={handleMigration} 
                disabled={isMigrating || initStatus !== 'success'}
                variant="outline"
                className="flex-1"
              >
                {isMigrating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Migrating...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Migrate Data
                  </>
                )}
              </Button>
              
              {migrationStatus === 'success' && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {migrationStatus === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {initStatus === 'success' && migrationStatus === 'success' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Setup Complete!</strong> Your attendance system is now integrated with Supabase. 
            All new data will be automatically synced to your Supabase database.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}