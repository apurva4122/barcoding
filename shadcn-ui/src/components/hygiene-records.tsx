"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getAllWorkers } from "@/lib/attendance-utils";
import { getAllHygieneRecords, getHygieneRecordsByDate, saveHygieneRecord, uploadHygienePhoto } from "@/lib/hygiene-storage";
import { Worker, HygieneRecord, HygieneArea } from "@/types";
import { Camera, Upload, CheckCircle2, XCircle, Calendar, X } from "lucide-react";
import { toast } from "sonner";

const HYGIENE_AREAS = [
    { value: HygieneArea.TOILETS, label: "Clean Toilets" },
    { value: HygieneArea.STORAGE_AREA, label: "Cleaned Storage Area" },
    { value: HygieneArea.PACKAGING_AREA, label: "Cleaned Packaging Area" },
    { value: HygieneArea.PROCESSING_AREA, label: "Cleaned Processing Area" },
    { value: HygieneArea.OFFICE_AREA, label: "Clean Office Area" },
];

export function HygieneRecords() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [selectedWorker, setSelectedWorker] = useState<string>("");
    const [selectedArea, setSelectedArea] = useState<HygieneArea | "">("");
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [notes, setNotes] = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);
    const [records, setRecords] = useState<HygieneRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

    useEffect(() => {
        loadWorkers();
        loadRecords();
    }, []);

    useEffect(() => {
        loadRecords();
    }, [selectedDate]);

    // Cleanup camera stream on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    const loadWorkers = async () => {
        try {
            const workersData = await getAllWorkers();
            // Filter to only show cleaners
            const cleaners = workersData.filter(w => w.isCleaner);
            setWorkers(cleaners);
            if (cleaners.length > 0 && !selectedWorker) {
                setSelectedWorker(cleaners[0].id);
            }
        } catch (error) {
            console.error('Error loading workers:', error);
            toast.error('Failed to load workers');
        }
    };

    const loadRecords = async () => {
        try {
            setLoading(true);
            const recordsData = await getHygieneRecordsByDate(selectedDate);
            setRecords(recordsData);
        } catch (error) {
            console.error('Error loading hygiene records:', error);
            toast.error('Failed to load hygiene records');
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Use back camera on mobile
            });
            setStream(mediaStream);
            setIsCameraOpen(true);

            // Set video stream once element is available
            if (videoElement) {
                videoElement.srcObject = mediaStream;
                videoElement.play();
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            toast.error('Failed to access camera. Please allow camera permissions.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraOpen(false);
        if (videoElement) {
            videoElement.srcObject = null;
        }
    };

    const capturePhoto = () => {
        if (!videoElement) {
            toast.error('Camera not ready');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.drawImage(videoElement, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    // Convert blob to File
                    const file = new File([blob], `hygiene-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    setPhotoFile(file);
                    setPhotoPreview(canvas.toDataURL('image/jpeg'));
                    stopCamera();
                    toast.success('Photo captured successfully');
                } else {
                    toast.error('Failed to capture photo');
                }
            }, 'image/jpeg', 0.9);
        }
    };

    const clearPhoto = () => {
        setPhotoFile(null);
        setPhotoPreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedWorker || !selectedArea || !photoFile) {
            toast.error('Please fill in all required fields');
            return;
        }

        const worker = workers.find(w => w.id === selectedWorker);
        if (!worker) {
            toast.error('Worker not found');
            return;
        }

        setIsUploading(true);

        try {
            // Upload photo
            const photoUrl = await uploadHygienePhoto(photoFile, selectedWorker, selectedArea, selectedDate);

            if (!photoUrl) {
                toast.error('Failed to upload photo');
                setIsUploading(false);
                return;
            }

            // Save record
            const record = await saveHygieneRecord({
                workerId: selectedWorker,
                workerName: worker.name,
                date: selectedDate,
                area: selectedArea,
                photoUrl: photoUrl,
                notes: notes || undefined
            });

            if (record) {
                toast.success('Hygiene record saved successfully');
                // Reset form
                setPhotoFile(null);
                setPhotoPreview(null);
                setNotes("");
                setSelectedArea("");
                // Reload records
                loadRecords();
            } else {
                toast.error('Failed to save hygiene record');
            }
        } catch (error) {
            console.error('Error submitting hygiene record:', error);
            toast.error('Failed to save hygiene record');
        } finally {
            setIsUploading(false);
        }
    };

    const getAreaStatus = (area: HygieneArea): { completed: boolean; record?: HygieneRecord } => {
        const record = records.find(r => r.area === area);
        return { completed: !!record, record };
    };

    const getAreaLabel = (area: HygieneArea): string => {
        return HYGIENE_AREAS.find(a => a.value === area)?.label || area;
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Hygiene Records</h2>
                <p className="text-muted-foreground mt-2">
                    Upload photos of cleaned areas daily
                </p>
            </div>

            {/* Date Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Select Date
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="max-w-xs"
                    />
                </CardContent>
            </Card>

            {/* Progress Overview */}
            <Card>
                <CardHeader>
                    <CardTitle>Today's Progress</CardTitle>
                    <CardDescription>
                        Status of hygiene checks for {new Date(selectedDate).toLocaleDateString()}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center text-muted-foreground py-4">Loading...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {HYGIENE_AREAS.map((area) => {
                                const { completed, record } = getAreaStatus(area.value);
                                return (
                                    <div
                                        key={area.value}
                                        className={`p-4 border rounded-lg flex items-center justify-between ${completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {completed ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-gray-400" />
                                            )}
                                            <div>
                                                <div className="font-medium">{area.label}</div>
                                                {record && (
                                                    <div className="text-xs text-muted-foreground">
                                                        By {record.workerName}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Badge variant={completed ? "default" : "secondary"}>
                                            {completed ? "Done" : "Pending"}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Capture Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Capture Hygiene Record</CardTitle>
                    <CardDescription>
                        Select a cleaner, area, and capture a photo
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="worker">Cleaner *</Label>
                            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                                <SelectTrigger id="worker">
                                    <SelectValue placeholder="Select a cleaner" />
                                </SelectTrigger>
                                <SelectContent>
                                    {workers.map((worker) => (
                                        <SelectItem key={worker.id} value={worker.id}>
                                            {worker.name} ({worker.employeeId})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="area">Area *</Label>
                            <Select value={selectedArea} onValueChange={(value) => setSelectedArea(value as HygieneArea)}>
                                <SelectTrigger id="area">
                                    <SelectValue placeholder="Select an area" />
                                </SelectTrigger>
                                <SelectContent>
                                    {HYGIENE_AREAS.map((area) => (
                                        <SelectItem key={area.value} value={area.value}>
                                            {area.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Photo *</Label>
                            {!isCameraOpen && !photoPreview && (
                                <div className="space-y-2">
                                    <Button
                                        type="button"
                                        onClick={startCamera}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <Camera className="h-4 w-4 mr-2" />
                                        Open Camera
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                        Click to open camera and capture a photo
                                    </p>
                                </div>
                            )}

                            {isCameraOpen && (
                                <div className="space-y-2">
                                    <div className="relative border rounded-lg overflow-hidden bg-black">
                                        <video
                                            ref={(el) => {
                                                if (el) {
                                                    setVideoElement(el);
                                                    if (stream) {
                                                        el.srcObject = stream;
                                                        el.play();
                                                    }
                                                }
                                            }}
                                            autoPlay
                                            playsInline
                                            className="w-full max-w-md mx-auto"
                                            style={{ maxHeight: '400px', objectFit: 'contain' }}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            onClick={capturePhoto}
                                            className="flex-1"
                                        >
                                            <Camera className="h-4 w-4 mr-2" />
                                            Capture Photo
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={stopCamera}
                                            variant="outline"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {photoPreview && !isCameraOpen && (
                                <div className="space-y-2">
                                    <div className="relative inline-block">
                                        <img
                                            src={photoPreview}
                                            alt="Captured photo"
                                            className="w-full max-w-md rounded-lg border"
                                        />
                                        <Button
                                            type="button"
                                            onClick={clearPhoto}
                                            variant="destructive"
                                            size="sm"
                                            className="absolute top-2 right-2"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={startCamera}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <Camera className="h-4 w-4 mr-2" />
                                        Retake Photo
                                    </Button>
                                </div>
                            )}
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

                        <Button type="submit" disabled={isUploading || !photoFile || !selectedWorker || !selectedArea}>
                            {isUploading ? (
                                <>
                                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Save Record
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Recent Records */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Records</CardTitle>
                    <CardDescription>
                        Latest hygiene records for {new Date(selectedDate).toLocaleDateString()}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center text-muted-foreground py-4">Loading...</div>
                    ) : records.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No records found for this date
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {records.map((record) => (
                                <div key={record.id} className="border rounded-lg p-4">
                                    <div className="flex items-start gap-4">
                                        <img
                                            src={record.photoUrl}
                                            alt={getAreaLabel(record.area)}
                                            className="w-32 h-32 object-cover rounded-lg border"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <h3 className="font-semibold">{getAreaLabel(record.area)}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        By {record.workerName}
                                                    </p>
                                                </div>
                                                <Badge variant="default">Completed</Badge>
                                            </div>
                                            {record.notes && (
                                                <p className="text-sm text-muted-foreground mt-2">{record.notes}</p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {new Date(record.createdAt).toLocaleString()}
                                            </p>
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

