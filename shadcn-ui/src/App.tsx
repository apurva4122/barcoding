import { useState } from 'react'
import { BarcodeGenerator } from '@/components/barcode-generator'
import { BarcodeList } from '@/components/barcode-list'
import { DualStatusScanner } from '@/components/dual-status-scanner'
import { AttendanceManagement } from '@/components/attendance-management'
import { Dashboard } from '@/components/dashboard'
import { ScanOnlyDashboard } from '@/components/dashboard/ScanOnlyDashboard'
import { ListsDashboard } from '@/components/dashboard/ListsDashboard'
import { HygieneRecords } from '@/components/hygiene-records'
import { LabTests } from '@/components/lab-tests'
import { PasswordProtection } from '@/components/PasswordProtection'
import { Toaster } from "@/components/ui/sonner"
import { Package, QrCode, ScanLine, Users, BarChart3, Sparkles, TestTube } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeTab, setActiveTab] = useState("scanner")

  const handleBarcodesUpdated = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleAttendanceUpdated = () => {
    // Trigger refresh for components that depend on attendance
    setRefreshTrigger(prev => prev + 1)
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
  return (
          <PasswordProtection sectionName="dashboard">
            <Dashboard key={refreshTrigger} />
          </PasswordProtection>
        )
      case "generator":
        return (
          <PasswordProtection sectionName="generator">
            <BarcodeGenerator 
              key={refreshTrigger}
              onBarcodesGenerated={handleBarcodesUpdated} 
            />
          </PasswordProtection>
        )
      case "list":
        return (
          <PasswordProtection sectionName="list">
            <div className="space-y-6">
              <ListsDashboard key={refreshTrigger} />
              <BarcodeList 
                key={refreshTrigger}
                onBarcodeUpdated={handleBarcodesUpdated} 
              />
            </div>
          </PasswordProtection>
        )
      case "scanner":
        return (
            <div className="space-y-6">
              <DualStatusScanner 
                key={refreshTrigger}
                onBarcodesUpdated={handleBarcodesUpdated} 
              />
              <ScanOnlyDashboard key={refreshTrigger} />
            </div>
        )
      case "attendance":
        return (
          <PasswordProtection sectionName="attendance">
            <AttendanceManagement 
              onAttendanceUpdate={handleAttendanceUpdated} 
            />
          </PasswordProtection>
        )
      case "hygiene":
        return (
          <PasswordProtection sectionName="hygiene">
            <HygieneRecords key={refreshTrigger} />
          </PasswordProtection>
        )
      case "lab-tests":
        return (
          <PasswordProtection sectionName="lab-tests">
            <LabTests key={refreshTrigger} />
          </PasswordProtection>
        )
      default:
        return null
    }
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 p-4">
              <SidebarTrigger />
              <div className="flex-1">
                <h1 className="text-xl font-bold tracking-tight group-data-[collapsible=icon]:hidden">KETAKI COMPLIANCE</h1>
                <p className="text-xs text-muted-foreground mt-1 group-data-[collapsible=icon]:hidden">
                  QR codes, attendance & analytics
                </p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveTab("dashboard")}
                      isActive={activeTab === "dashboard"}
                      tooltip="Dashboard"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveTab("generator")}
                      isActive={activeTab === "generator"}
                      tooltip="Generator"
                    >
                      <QrCode className="h-4 w-4" />
                      <span>Generator</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveTab("list")}
                      isActive={activeTab === "list"}
                      tooltip="Package List"
                    >
                      <Package className="h-4 w-4" />
                      <span>Package List</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveTab("scanner")}
                      isActive={activeTab === "scanner"}
                      tooltip="Scanner"
                    >
                      <ScanLine className="h-4 w-4" />
                      <span>Scanner</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveTab("attendance")}
                      isActive={activeTab === "attendance"}
                      tooltip="Attendance"
                    >
                      <Users className="h-4 w-4" />
                      <span>Attendance</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveTab("hygiene")}
                      isActive={activeTab === "hygiene"}
                      tooltip="Hygiene Records"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Hygiene Records</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveTab("lab-tests")}
                      isActive={activeTab === "lab-tests"}
                      tooltip="Lab Tests"
                    >
                      <TestTube className="h-4 w-4" />
                      <span>Lab Tests</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <div className="flex-1">
              <h2 className="text-lg font-semibold">
                {activeTab === "dashboard" && "Dashboard"}
                {activeTab === "generator" && "QR Code Generator"}
                {activeTab === "list" && "Package List"}
                {activeTab === "scanner" && "Scanner"}
                {activeTab === "attendance" && "Attendance Management"}
                {activeTab === "hygiene" && "Hygiene Records"}
                {activeTab === "lab-tests" && "Lab Tests"}
              </h2>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 overflow-auto">
            {renderContent()}
          </div>
        </SidebarInset>
      </div>
      <Toaster />
    </SidebarProvider>
  )
}

export default App