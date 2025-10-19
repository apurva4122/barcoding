import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CameraDebug() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string>("");

  const startCamera = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment" 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsActive(true);
      }
    } catch (err) {
      setError("Camera failed: " + (err as Error).message);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Camera Debug Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Simple test container */}
        <div className="w-full h-64 bg-gray-200 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden relative">
          <video 
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button onClick={startCamera}>
                Test Camera
              </Button>
            </div>
          )}
        </div>

        {isActive && (
          <Button onClick={stopCamera} variant="destructive">
            Stop Camera
          </Button>
        )}

        {error && (
          <div className="p-3 bg-red-100 text-red-800 rounded">
            {error}
          </div>
        )}

        {/* Visual test - this should always be visible */}
        <div className="p-4 bg-blue-100 rounded">
          <p>This blue box should always be visible.</p>
          <p>Camera active: {isActive ? "Yes" : "No"}</p>
        </div>
      </CardContent>
    </Card>
  );
}