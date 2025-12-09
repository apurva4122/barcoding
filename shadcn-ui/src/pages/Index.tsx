import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarcodeGenerator } from '@/components/barcode-generator'
import { BarcodeList } from '@/components/barcode-list'
import { DualStatusScanner } from '@/components/dual-status-scanner'
import { AttendanceManagement } from '@/components/attendance-management'
import { Dashboard } from '@/components/dashboard'
import { Package, QrCode, ScanLine, Users, BarChart3 } from 'lucide-react'

const Index = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleBarcodesUpdated = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleAttendanceUpdated = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">KETAKI COMPLIANCE</h1>
          <p className="text-muted-foreground">
            Generate QR codes, track packages, manage attendance, and monitor analytics
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
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
            <Dashboard key={refreshTrigger} />
          </TabsContent>

          <TabsContent value="generator">
            <BarcodeGenerator
              key={refreshTrigger}
              onBarcodesGenerated={handleBarcodesUpdated}
            />
          </TabsContent>

          <TabsContent value="list">
            <BarcodeList
              key={refreshTrigger}
              onBarcodeUpdated={handleBarcodesUpdated}
            />
          </TabsContent>

          <TabsContent value="scanner">
            <DualStatusScanner
              key={refreshTrigger}
              onBarcodesUpdated={handleBarcodesUpdated}
            />
          </TabsContent>

          <TabsContent value="attendance">
            <AttendanceManagement
              key={refreshTrigger}
              onAttendanceUpdate={handleAttendanceUpdated}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default Index