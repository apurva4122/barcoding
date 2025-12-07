import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarcodeGenerator } from '@/components/barcode-generator'
import { BarcodeList } from '@/components/barcode-list'
import { DualStatusScanner } from '@/components/dual-status-scanner'
import { AttendanceManagement } from '@/components/attendance-management'
import { Dashboard } from '@/components/dashboard'
import { ScanOnlyDashboard } from '@/components/dashboard/ScanOnlyDashboard'
import { ListsDashboard } from '@/components/dashboard/ListsDashboard'
import { PasswordProtection } from '@/components/PasswordProtection'
import { Toaster } from "@/components/ui/sonner"
import { Package, QrCode, ScanLine, Users, BarChart3 } from 'lucide-react'

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleBarcodesUpdated = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleAttendanceUpdated = () => {
    // Trigger refresh for components that depend on attendance
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Package Management System</h1>
          <p className="text-muted-foreground">
            Generate QR codes, track packages, manage attendance, and monitor analytics
          </p>
        </div>

        <Tabs defaultValue="scanner" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Generator
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Package List
            </TabsTrigger>
            <TabsTrigger value="scanner" className="flex items-center gap-2">
              <ScanLine className="h-4 w-4" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Attendance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <PasswordProtection sectionName="dashboard">
              <Dashboard key={refreshTrigger} />
            </PasswordProtection>
          </TabsContent>

          <TabsContent value="generator">
            <PasswordProtection sectionName="generator">
              <BarcodeGenerator
                key={refreshTrigger}
                onBarcodesGenerated={handleBarcodesUpdated}
              />
            </PasswordProtection>
          </TabsContent>

          <TabsContent value="list">
            <PasswordProtection sectionName="list">
              <div className="space-y-6">
                <ListsDashboard key={refreshTrigger} />
                <BarcodeList
                  key={refreshTrigger}
                  onBarcodeUpdated={handleBarcodesUpdated}
                />
              </div>
            </PasswordProtection>
          </TabsContent>

          <TabsContent value="scanner">
            {/* Scanner section is NOT password protected */}
            <div className="space-y-6">
              <DualStatusScanner
                key={refreshTrigger}
                onBarcodesUpdated={handleBarcodesUpdated}
              />
              <ScanOnlyDashboard key={refreshTrigger} />
            </div>
          </TabsContent>

          <TabsContent value="attendance">
            <PasswordProtection sectionName="attendance">
              <AttendanceManagement
                key={refreshTrigger}
                onAttendanceUpdate={handleAttendanceUpdated}
              />
            </PasswordProtection>
          </TabsContent>
        </Tabs>
      </div>

      <Toaster />
    </div>
  )
}

export default App