import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function CameraTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  const startCamera = async () => {
    addLog("Camera requested");
    setError(null);
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera API not supported in this browser");
      addLog("Camera API not supported");
      return;
    }
    
    try {
      addLog("Requesting camera permissions");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" }
      });
      
      addLog("Camera permission granted");
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        addLog("Setting video source");
        
        videoRef.current.onloadedmetadata = () => {
          addLog("Video metadata loaded");
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                addLog("Video playing");
                setIsActive(true);
              })
              .catch(e => {
                addLog(`Play error: ${e.message}`);
                setError(`Failed to play video: ${e.message}`);
              });
          }
        };
      } else {
        addLog("Video ref is null");
        setError("Video element not found");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`Camera error: ${errorMsg}`);
      setError(`Camera access failed: ${errorMsg}`);
    }
  };
  
  const stopCamera = () => {
    addLog("Stopping camera");
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        addLog(`Track stopped: ${track.kind}`);
      });
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  };
  
  useEffect(() => {
    // Check browser compatibility
    if (typeof navigator !== 'undefined') {
      addLog(`Browser: ${navigator.userAgent}`);
      
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        addLog("Camera API available");
      } else {
        addLog("Camera API NOT available");
      }
    }
    
    return () => {
      stopCamera();
    };
  }, []);
  
  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Camera Test Page</h1>
      
      <div className="mb-4">
        <p className="text-gray-600 mb-4">
          This is a standalone page to test camera functionality.
        </p>
        <div className="flex space-x-2">
          <Button onClick={startCamera} disabled={isActive}>Start Camera</Button>
          <Button onClick={stopCamera} disabled={!isActive} variant="destructive">Stop Camera</Button>
        </div>
      </div>
      
      <div className="w-full aspect-video bg-gray-900 border-4 border-dashed border-gray-400 rounded-lg overflow-hidden relative mb-6">
        <video 
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        
        {!isActive && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            Camera inactive. Press "Start Camera" to begin.
          </div>
        )}
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="border rounded-lg p-4 bg-gray-50 h-64 overflow-auto">
        <h2 className="font-semibold mb-2">Debug Log:</h2>
        <div className="text-xs font-mono">
          {log.map((entry, i) => (
            <div key={i} className="mb-1">{entry}</div>
          ))}
        </div>
      </div>
    </div>
  );
}