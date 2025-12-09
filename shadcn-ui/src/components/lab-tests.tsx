"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getAllLabTestRecords, getLabTestRecordsByMonth, saveLabTestRecord, uploadLabTestFile, deleteLabTestRecord } from "@/lib/lab-tests-storage";
import { LabTestRecord, LabTestType, LabTestCategory } from "@/types";
import { FileText, Upload, Calendar, Trash2, Download, TestTube } from "lucide-react";
import { toast } from "sonner";

const FINISHED_GOODS = [
  { value: LabTestCategory.TAMARIND_JELLY, label: "Tamarind Jelly", required: true },
  { value: LabTestCategory.MANGO_JELLY, label: "Mango Jelly", required: true },
  { value: LabTestCategory.POPSICLES, label: "Popsicles", required: false },
];

const RAW_MATERIALS = [
  { value: LabTestCategory.WATER, label: "Water", required: true },
  { value: LabTestCategory.SUGAR, label: "Sugar", required: true },
  { value: LabTestCategory.TAMARIND, label: "Tamarind", required: true },
];

export function LabTests() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [testType, setTestType] = useState<LabTestType | "">("");
  const [category, setCategory] = useState<LabTestCategory | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [records, setRecords] = useState<LabTestRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [selectedMonth]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const recordsData = await getLabTestRecordsByMonth(selectedMonth);
      setRecords(recordsData);
    } catch (error) {
      console.error('Error loading lab test records:', error);
      toast.error('Failed to load lab test records');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!testType || !category || !file) {
      toast.error('Please fill in all required fields');
      return;
    }

    const productName = [...FINISHED_GOODS, ...RAW_MATERIALS].find(p => p.value === category)?.label || category;

    setIsUploading(true);

    try {
      // Upload file
      const fileUrl = await uploadLabTestFile(file, testType, category, selectedMonth);

      if (!fileUrl) {
        toast.error('Failed to upload file');
        setIsUploading(false);
        return;
      }

      // Save record
      const record = await saveLabTestRecord({
        testType: testType as LabTestType,
        category: category as LabTestCategory,
        productName: productName,
        month: selectedMonth,
        fileUrl: fileUrl,
        notes: notes || undefined
      });

      if (record) {
        toast.success('Lab test record saved successfully');
        // Reset form
        setFile(null);
        setNotes("");
        setCategory("");
        setTestType("");
        // Reset file input
        const fileInput = document.getElementById('lab-test-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        // Reload records
        loadRecords();
      } else {
        toast.error('Failed to save lab test record');
      }
    } catch (error) {
      console.error('Error submitting lab test record:', error);
      toast.error('Failed to save lab test record');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this lab test record?')) {
      return;
    }

    try {
      const success = await deleteLabTestRecord(recordId);
      if (success) {
        toast.success('Lab test record deleted successfully');
        loadRecords();
      } else {
        toast.error('Failed to delete lab test record');
      }
    } catch (error) {
      console.error('Error deleting lab test record:', error);
      toast.error('Failed to delete lab test record');
    }
  };

  const getProductLabel = (category: LabTestCategory): string => {
    return [...FINISHED_GOODS, ...RAW_MATERIALS].find(p => p.value === category)?.label || category;
  };

  const getTestTypeLabel = (type: LabTestType): string => {
    return type === LabTestType.FINISHED_GOOD ? "Finished Good" : "Raw Material";
  };

  const getStatusForCategory = (cat: LabTestCategory): { completed: boolean; record?: LabTestRecord } => {
    const record = records.find(r => r.category === cat);
    return { completed: !!record, record };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Lab Tests</h2>
        <p className="text-muted-foreground mt-2">
          Upload lab test reports for finished goods and raw materials
        </p>
      </div>

      {/* Month Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="max-w-xs"
          />
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Finished Goods */}
        <Card>
          <CardHeader>
            <CardTitle>Finished Goods</CardTitle>
            <CardDescription>
              Monthly lab test reports for finished products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {FINISHED_GOODS.map((product) => {
                const { completed, record } = getStatusForCategory(product.value);
                return (
                  <div
                    key={product.value}
                    className={`p-3 border rounded-lg flex items-center justify-between ${
                      completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {completed ? (
                        <FileText className="h-5 w-5 text-green-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <div className="font-medium">{product.label}</div>
                        {product.required && (
                          <div className="text-xs text-muted-foreground">Required</div>
                        )}
                        {!product.required && (
                          <div className="text-xs text-muted-foreground">Optional (Seasonal)</div>
                        )}
                      </div>
                    </div>
                    <Badge variant={completed ? "default" : "secondary"}>
                      {completed ? "Uploaded" : product.required ? "Pending" : "Optional"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Raw Materials */}
        <Card>
          <CardHeader>
            <CardTitle>Raw Materials</CardTitle>
            <CardDescription>
              Lab test reports for raw materials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {RAW_MATERIALS.map((material) => {
                const { completed, record } = getStatusForCategory(material.value);
                return (
                  <div
                    key={material.value}
                    className={`p-3 border rounded-lg flex items-center justify-between ${
                      completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {completed ? (
                        <FileText className="h-5 w-5 text-green-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <div className="font-medium">{material.label}</div>
                        <div className="text-xs text-muted-foreground">Required</div>
                      </div>
                    </div>
                    <Badge variant={completed ? "default" : "secondary"}>
                      {completed ? "Uploaded" : "Pending"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Lab Test Report</CardTitle>
          <CardDescription>
            Select test type, product/material, and upload the test report file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testType">Test Type *</Label>
              <Select value={testType} onValueChange={(value) => {
                setTestType(value as LabTestType);
                setCategory(""); // Reset category when test type changes
              }}>
                <SelectTrigger id="testType">
                  <SelectValue placeholder="Select test type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LabTestType.FINISHED_GOOD}>Finished Good</SelectItem>
                  <SelectItem value={LabTestType.RAW_MATERIAL}>Raw Material</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Product/Material *</Label>
              <Select 
                value={category} 
                onValueChange={(value) => setCategory(value as LabTestCategory)}
                disabled={!testType}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select product/material" />
                </SelectTrigger>
                <SelectContent>
                  {testType === LabTestType.FINISHED_GOOD && FINISHED_GOODS.map((product) => (
                    <SelectItem key={product.value} value={product.value}>
                      {product.label} {!product.required && "(Optional)"}
                    </SelectItem>
                  ))}
                  {testType === LabTestType.RAW_MATERIAL && RAW_MATERIALS.map((material) => (
                    <SelectItem key={material.value} value={material.value}>
                      {material.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lab-test-file">Test Report File *</Label>
              <Input
                id="lab-test-file"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="max-w-xs"
              />
              {file && (
                <div className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum file size: 10MB. Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
              />
            </div>

            <Button type="submit" disabled={isUploading || !file || !testType || !category}>
              {isUploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Report
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Records */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Reports</CardTitle>
          <CardDescription>
            Lab test reports for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-4">Loading...</div>
          ) : records.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No reports found for this month
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={record.testType === LabTestType.FINISHED_GOOD ? "default" : "secondary"}>
                          {getTestTypeLabel(record.testType)}
                        </Badge>
                        <h3 className="font-semibold">{record.productName}</h3>
                      </div>
                      {record.notes && (
                        <p className="text-sm text-muted-foreground mb-2">{record.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Uploaded: {new Date(record.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(record.fileUrl, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(record.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

