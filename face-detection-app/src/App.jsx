import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const cameraCaptureRef = useRef(null);

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;

    setError(null);
    setLoading(true);
    setImagePreview(imageUrl);
    stopCamera();
    
    try {
      const response = await axios.post('/api/detect-faces', { imageUrl });
      setFaces(response.data);
      
      if (response.data.length === 0) {
        setError('No faces detected in the image');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to detect faces');
      setFaces([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    stopCamera();
    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target.result;
      setImagePreview(imageData);

      try {
        const response = await axios.post('/api/detect-faces', { imageData });
        setFaces(response.data);
        
        if (response.data.length === 0) {
          setError('No faces detected in the image');
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to detect faces');
        setFaces([]);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      console.log('Requesting camera access...');
      
      // First, get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('Available video devices:', videoDevices);
      
      if (videoDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      const constraints = { 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      console.log('Requesting stream with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('Camera access granted!');
      console.log('Stream tracks:', stream.getTracks());
      console.log('Video track settings:', stream.getVideoTracks()[0]?.getSettings());
      
      setCameraStream(stream);
      setCameraActive(true);
      setImagePreview(null);
      setFaces([]);
      
      // Wait a bit for DOM to update
      setTimeout(() => {
        if (videoRef.current) {
          console.log('Setting video source...');
          videoRef.current.srcObject = stream;
          
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded, attempting to play...');
            videoRef.current.play()
              .then(() => console.log('✅ Video is playing'))
              .catch(err => console.error('❌ Play error:', err));
          };
        } else {
          console.error('❌ Video ref is null');
        }
      }, 100);
      
    } catch (err) {
      console.error('Camera error:', err);
      let errorMsg = 'Unable to access camera. ';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg += 'Please allow camera permissions in your browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg += 'No camera found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg += 'Camera is already in use by another application.';
      } else {
        errorMsg += err.message;
      }
      
      setError(errorMsg);
      setCameraActive(false);
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setCameraActive(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    setLoading(true);
    setError(null);

    const canvas = cameraCaptureRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    setImagePreview(imageData);
    
    stopCamera();

    try {
      const response = await axios.post('/api/detect-faces', { imageData });
      setFaces(response.data);
      
      if (response.data.length === 0) {
        setError('No faces detected in the photo');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to detect faces');
      setFaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const drawFaceBoxes = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    
    if (!img || !canvas || faces.length === 0) return;

    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0, img.width, img.height);

    faces.forEach((face, index) => {
      const rect = face.faceRectangle;
      
      // Draw green bounding box
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 4;
      ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);

      // Draw face number label
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(`Face ${index + 1}`, rect.left, rect.top - 10);
      
      // Draw facial landmarks if available
      if (face.faceLandmarks) {
        ctx.fillStyle = '#00ff00';
        const landmarks = face.faceLandmarks;
        
        // Draw key facial points
        const drawPoint = (point) => {
          if (point) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
            ctx.fill();
          }
        };
        
        // Eyes
        drawPoint(landmarks.pupilLeft);
        drawPoint(landmarks.pupilRight);
        
        // Nose
        drawPoint(landmarks.noseTip);
        
        // Mouth
        drawPoint(landmarks.mouthLeft);
        drawPoint(landmarks.mouthRight);
      }
    });
  };

  const getEmotionText = (emotions) => {
    if (!emotions) return 'N/A';
    const emotionEntries = Object.entries(emotions);
    const dominant = emotionEntries.reduce((max, entry) => 
      entry[1] > max[1] ? entry : max
    );
    return `${dominant[0]} (${(dominant[1] * 100).toFixed(1)}%)`;
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🔍 Face Detection</h1>
        <p>Powered by Azure Cognitive Services</p>
      </header>

      <div className="container">
        <div className="upload-section">
          <form onSubmit={handleUrlSubmit} className="url-form">
            <input
              type="text"
              placeholder="Enter image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="url-input"
              disabled={cameraActive}
            />
            <button type="submit" disabled={loading || cameraActive} className="btn btn-primary">
              {loading ? 'Detecting...' : 'Detect Faces'}
            </button>
          </form>

          <div className="divider">OR</div>

          <label className="file-upload">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={loading || cameraActive}
            />
            <span className="btn btn-secondary">
              📁 Upload Image
            </span>
          </label>

          <div className="divider">OR</div>

          <div className="camera-controls">
            {!cameraActive ? (
              <button 
                onClick={startCamera} 
                disabled={loading}
                className="btn btn-camera"
              >
                📷 Use Camera
              </button>
            ) : (
              <div className="camera-buttons">
                <button 
                  onClick={capturePhoto} 
                  disabled={loading}
                  className="btn btn-capture"
                >
                  📸 Capture Photo
                </button>
                <button 
                  onClick={stopCamera}
                  className="btn btn-stop"
                >
                  ❌ Stop Camera
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
        </div>

        {cameraActive && (
          <div className="camera-section">
            <div className="camera-container">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                muted
                className="camera-video"
                onLoadedMetadata={() => console.log('Video metadata loaded')}
                onCanPlay={() => console.log('Video can play')}
              />
            </div>
            <p className="camera-hint">Position your face in the frame and click "Capture Photo"</p>
          </div>
        )}

        <canvas ref={cameraCaptureRef} style={{ display: 'none' }} />

        {imagePreview && (
          <div className="results-section">
            <div className="image-container">
              <img
                ref={imageRef}
                src={imagePreview}
                alt="Preview"
                onLoad={drawFaceBoxes}
                style={{ display: 'none' }}
              />
              <canvas ref={canvasRef} className="canvas" />
            </div>

            {faces.length > 0 && (
              <div className="faces-info">
                <h2>Detected Faces: {faces.length}</h2>
                <div className="faces-grid">
                  {faces.map((face, index) => (
                    <div key={`face-${index}`} className="face-card">
                      <h3>Face {index + 1}</h3>
                      <div className="face-details">
                        <p><strong>Position:</strong> ({face.faceRectangle.left}, {face.faceRectangle.top})</p>
                        <p><strong>Size:</strong> {face.faceRectangle.width} × {face.faceRectangle.height} px</p>
                        {face.faceLandmarks && (
                          <p><strong>Facial Landmarks:</strong> Detected ✓</p>
                        )}
                        <p className="info-note">
                          💡 Basic face detection only. For advanced features (age, gender, emotion), Azure requires additional approval.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;