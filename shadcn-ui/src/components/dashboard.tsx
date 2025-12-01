"use client";

import { useState } from "react";
import { AttendanceManagement } from "./attendance-management";
import { BarcodeGenerator } from "./barcode-generator";
import { SupabaseInitializer } from "./supabase-initializer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, QrCode, Database } from "lucide-react";

export function Dashboard() {
  const [attendanceUpdateTrigger, setAttendanceUpdateTrigger] = useState(0);

  const handleAttendanceUpdate = () => {
    setAttendanceUpdateTrigger(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Package QR Code Manager</h1>
        <p className="text-gray-600 mt-2">Manage worker attendance and generate QR codes for package tracking</p>
      </div>

      <Tabs defaultValue="attendance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Attendance Management
          </TabsTrigger>
          <TabsTrigger value="barcode" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Code Generator
          </TabsTrigger>
          <TabsTrigger value="supabase" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Supabase Setup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <AttendanceManagement onAttendanceUpdate={handleAttendanceUpdate} />
        </TabsContent>

        <TabsContent value="barcode">
          <BarcodeGenerator key={attendanceUpdateTrigger} />
        </TabsContent>

        <TabsContent value="supabase">
          <SupabaseInitializer />
        </TabsContent>
      </Tabs>
    </div>
  );
}