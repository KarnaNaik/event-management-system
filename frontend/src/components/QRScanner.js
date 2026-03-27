import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

function QRScanner({ onScanSuccess, onScanError, autoStart = false }) {
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const html5QrCodeRef = useRef(null);
  const scanLockRef = useRef(false);

  useEffect(() => {
    // Get available cameras
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        setCameras(devices);
        // Prefer back camera on mobile
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );
        setSelectedCamera(backCamera ? backCamera.id : devices[0].id);
      }
    }).catch(err => {
      console.error('Error getting cameras:', err);
    });

    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (autoStart && selectedCamera && !scanning && !starting) {
      startScanning();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, selectedCamera]);

  const startScanning = async () => {
    if (!selectedCamera || scanning || starting) return;
    setStarting(true);
    scanLockRef.current = false;

    try {
      html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      
      await html5QrCodeRef.current.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1.0,
          rememberLastUsedCamera: true
        },
        (decodedText) => {
          if (scanLockRef.current) {
            return;
          }
          scanLockRef.current = true;

          // Parse QR code data
          try {
            const data = JSON.parse(decodedText);
            onScanSuccess(data);
          } catch (err) {
            // If not JSON, treat as ticket number
            onScanSuccess({ ticketNumber: decodedText });
          }
          stopScanning();
        },
        () => {
          // Handle scan errors silently (happens frequently while scanning)
        }
      );
      
      setScanning(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
      if (onScanError) {
        onScanError('Failed to start camera. Please check permissions.');
      }
    } finally {
      setStarting(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      } finally {
        html5QrCodeRef.current = null;
        scanLockRef.current = false;
        setScanning(false);
        setStarting(false);
      }
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    
    if (scanning) {
      await stopScanning();
    }
    
    const currentIndex = cameras.findIndex(cam => cam.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCamera(cameras[nextIndex].id);
  };

  return (
    <div className="qr-scanner">
      <div className="scanner-controls" style={{ marginBottom: '1rem', textAlign: 'center' }}>
        {cameras.length > 1 && (
          <button 
            type="button"
            onClick={switchCamera} 
            className="btn btn-primary"
            style={{ marginRight: '1rem' }}
          >
            🔄 Switch Camera
          </button>
        )}
        
        {!scanning ? (
          <button type="button" onClick={startScanning} className="btn btn-success" disabled={starting || !selectedCamera}>
            {starting ? 'Starting Camera...' : '📷 Start Scanning'}
          </button>
        ) : (
          <button type="button" onClick={stopScanning} className="btn btn-danger">
            ⏹️ Stop Scanning
          </button>
        )}
      </div>

      <div 
        id="qr-reader" 
        className="camera-scanner"
        style={{ width: '100%', maxWidth: '560px', margin: '0 auto', minHeight: '340px' }}
      ></div>

      {!scanning && !starting && (
        <div style={{ 
          textAlign: 'center', 
          padding: '1rem 1rem 2rem', 
          background: 'white',
          borderRadius: '16px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📱</div>
          <h3 style={{ marginBottom: '1rem', color: '#64748b' }}>
            Ready to Scan
          </h3>
          <p style={{ color: '#94a3b8' }}>
            Click "Start Scanning" to activate your camera
          </p>
        </div>
      )}
    </div>
  );
}

export default QRScanner;
