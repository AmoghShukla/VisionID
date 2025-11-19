import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Grid,
  Paper,
  TextField,
  Button,
  IconButton,
  Switch,
  FormControlLabel,
  Divider,
  Avatar,
  Card,
  CardContent,
  CardHeader,
  Stack,
  useMediaQuery,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LinkIcon from '@mui/icons-material/Link';
import StopIcon from '@mui/icons-material/Stop';
import PhotoCamera from '@mui/icons-material/PhotoCamera';

// Premium MUI Face Detection App (Split-screen)
// Default export a React component

export default function App() {
  // Theme mode
  const [mode, setMode] = useState('dark');
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  useEffect(() => {
    // initialize with system preference but allow toggling
    setMode(prefersDark ? 'dark' : 'light');
  }, [prefersDark]);

  const theme = createTheme({
    palette: {
      mode: mode,
      ...(mode === 'dark'
        ? {
            background: { default: '#0b0f16', paper: '#0f1720' },
            text: { primary: '#e6eef8', secondary: '#c6d7f0' },
          }
        : {
            background: { default: '#f6f8fb', paper: '#ffffff' },
            text: { primary: '#0b1b2b', secondary: '#354b63' },
          }),
    },
    shape: { borderRadius: 14 },
    typography: { fontFamily: "Inter, Roboto, 'Helvetica Neue', Arial" },
  });

  // Image + detection state
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  // refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const hiddenCanvasRef = useRef(null); // for capturing

  // Helpers
  const apiPostDetect = async (payload) => {
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post('/api/detect-faces', payload);
      setFaces(res.data || []);
      if ((res.data || []).length === 0) setError('No faces detected');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Detection failed');
      setFaces([]);
    } finally {
      setLoading(false);
    }
  };

  // URL submit
  const handleUrlSubmit = async (e) => {
    e?.preventDefault();
    if (!imageUrl.trim()) return;
    stopCamera();
    setImagePreview(imageUrl);
    await apiPostDetect({ imageUrl });
  };

  // File upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    setError(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const data = ev.target.result;
      setImagePreview(data);
      await apiPostDetect({ imageData: data });
    };
    reader.readAsDataURL(file);
  };

  // Camera controls
  const startCamera = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported');
      }
      const constraints = { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      // clear previous image
      setImagePreview(null);
      setFaces([]);
    } catch (err) {
      console.error(err);
      let message = err.message || 'Unable to access camera';
      if (err.name === 'NotAllowedError') message = 'Camera permission denied';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const video = videoRef.current;
      const canvas = hiddenCanvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      // mirror-correct capture
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      setImagePreview(imageData);
      stopCamera();
      await apiPostDetect({ imageData });
    } catch (err) {
      setError(err.message || 'Capture failed');
    } finally {
      setLoading(false);
    }
  };

  // Draw face boxes on canvas whenever imagePreview or faces change
  useEffect(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext('2d');

    const render = () => {
      // fit canvas to image while keeping high DPI
      const ratio = window.devicePixelRatio || 1;
      canvas.width = img.naturalWidth * ratio;
      canvas.height = img.naturalHeight * ratio;
      canvas.style.width = Math.min(img.naturalWidth, window.innerWidth * 0.55) + 'px';
      canvas.style.height = (img.naturalHeight * (parseInt(canvas.style.width) / img.naturalWidth)) + 'px';
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      // clear + draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

      // draw faces
      faces.forEach((face, idx) => {
        const rect = face.faceRectangle;
        if (!rect) return;
        ctx.strokeStyle = mode === 'dark' ? '#7ef9a6' : '#2e7d32';
        ctx.lineWidth = Math.max(3, 4);
        ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);

        // label
        ctx.fillStyle = mode === 'dark' ? '#7ef9a6' : '#2e7d32';
        ctx.font = 'bold 18px Inter, Arial';
        ctx.fillText(`Face ${idx + 1}`, rect.left + 6, Math.max(20, rect.top - 8));

        // landmarks
        const lm = face.faceLandmarks || {};
        const drawPoint = (p) => {
          if (!p) return;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        };
        drawPoint(lm.pupilLeft);
        drawPoint(lm.pupilRight);
        drawPoint(lm.noseTip);
        drawPoint(lm.mouthLeft);
        drawPoint(lm.mouthRight);
      });
    };

    // draw once image is loaded
    if (img.complete && img.naturalWidth) render();
    else img.onload = render;
  }, [imagePreview, faces, mode]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Integration helpers
  const replaceAppInstructions = (
    "Copy this file into src/App.jsx (or replace your existing App.jsx).\nMake sure you have @mui/material and @mui/icons-material installed:\n\n  npm install @mui/material @emotion/react @emotion/styled @mui/icons-material\n\nThen run your dev server: npm run dev for the frontend and npm start for the backend."
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(6px)' }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>FD</Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Face Detection App
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Powered by Azure Cognitive Services
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
  <Box
    onClick={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))}
    sx={{
      width: 60,
      height: 32,
      borderRadius: 20,
      background: mode === 'dark'
        ? 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)'
        : 'linear-gradient(135deg, #dfe9f3, #ffffff)',
      boxShadow: mode === 'dark'
        ? '0 4px 12px rgba(0,0,0,0.5)'
        : '0 4px 12px rgba(0,0,0,0.15)',
      position: 'relative',
      cursor: 'pointer',
      transition: '0.3s',
      display: 'flex',
      alignItems: 'center',
      p: 0.5,
    }}
  >
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: mode === 'dark' ? '#90caf9' : '#0b1b2b',
        transform: mode === 'dark' ? 'translateX(28px)' : 'translateX(0px)',
        transition: '0.3s',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }}
    />
  </Box>

  <Typography variant="body2" sx={{ fontWeight: 600 }}>
    {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
  </Typography>
</Box>

              <Button variant="contained" onClick={() => { setImagePreview(null); setFaces([]); setError(null); stopCamera(); }}>
                Reset
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3 }}>
          <Grid container spacing={3} sx={{ height: 'calc(100vh - 96px)' }}>
            {/* LEFT: Controls */}
            <Grid item xs={12} md={4}>
              <Paper elevation={6} sx={{ p: 3, height: '100%', borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Controls
                </Typography>

                <Box component="form" onSubmit={handleUrlSubmit} sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    placeholder="Paste image URL"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    InputProps={{ startAdornment: <LinkIcon sx={{ mr: 1 }} /> }}
                    size="small"
                  />
                  <Button type="submit" variant="contained" startIcon={<LinkIcon />} disabled={loading}>
                    Detect
                  </Button>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Upload Image
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>Upload
                      <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                    </Button>
                    <Button variant="text" onClick={() => document.querySelector('input[type=file]')?.click()} startIcon={<UploadFileIcon />}>
                      Choose File
                    </Button>
                  </Stack>
                </Box>

                <Divider />

                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Camera</Typography>
                  <Paper variant="outlined" sx={{ p: 1, borderRadius: 2, bgcolor: 'background.paper' }}>
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 10, background: '#000' }} />
                  </Paper>

                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    {!cameraActive ? (
                      <Button variant="contained" startIcon={<CameraAltIcon />} onClick={startCamera} disabled={loading} fullWidth>
                        Start Camera
                      </Button>
                    ) : (
                      <>
                        <Button variant="contained" startIcon={<PhotoCamera />} onClick={capturePhoto} disabled={loading}>
                          Capture
                        </Button>
                        <Button variant="outlined" color="error" startIcon={<StopIcon />} onClick={stopCamera}>
                          Stop
                        </Button>
                      </>
                    )}
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{error || (loading ? 'Processing...' : 'Ready')}</Typography>
                </Box>

                <Box sx={{ mt: 'auto' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Tip: Use high-resolution images for better detection. Images must be between 1KB and 6MB.
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* RIGHT: Image + Results (consume full page) */}
            <Grid item xs={12} md={8}>
              <Paper elevation={6} sx={{ p: 3, height: '100%', borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Preview & Results</Typography>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column', height: '100%' }}>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', borderRadius: 2 }}>
                    {imagePreview ? (
                      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <img ref={imageRef} src={imagePreview} alt="preview" style={{ display: 'none' }} />
                        <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: 12, boxShadow: '0 8px 24px rgba(2,6,23,0.3)' }} />
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                        <Typography variant="h5">No image selected</Typography>
                        <Typography variant="body2">Use the controls on the left to add an image or take a photo.</Typography>
                      </Box>
                    )}
                  </Box>

                  <Divider />

                  <Box sx={{ maxHeight: '36%', overflowY: 'auto' }}>
                    <Grid container spacing={2}>
                      {faces.length > 0 ? (
                        faces.map((face, idx) => (
                          <Grid item xs={12} sm={6} md={4} key={`face-${idx}`}>
                            <Card variant="outlined" sx={{ borderRadius: 2 }}>
                              <CardHeader title={`Face ${idx + 1}`} subheader={`Position: (${face.faceRectangle.left}, ${face.faceRectangle.top})`} />
                              <CardContent>
                                <Typography variant="body2"><strong>Size:</strong> {face.faceRectangle.width} × {face.faceRectangle.height} px</Typography>
                                {face.faceLandmarks && <Typography variant="body2">Facial Landmarks: Detected ✓</Typography>}
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    Basic detection only. Advanced attributes (age, gender, emotion) require Azure approval.
                                  </Typography>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))
                      ) : (
                        <Grid item xs={12}>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{loading ? 'Detecting faces...' : 'No faces to show'}</Typography>
                          </Paper>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* hidden canvas used for capture */}
        <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
      </Box>
    </ThemeProvider>
  );
}
