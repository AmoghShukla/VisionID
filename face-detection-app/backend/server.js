require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Azure Face API Configuration
const AZURE_ENDPOINT = process.env.AZURE_FACE_ENDPOINT;
const AZURE_KEY = process.env.AZURE_FACE_KEY;

// Validate Azure credentials
if (!AZURE_ENDPOINT || !AZURE_KEY) {
  console.error('❌ Error: Azure credentials not configured!');
  console.error('Please set AZURE_FACE_ENDPOINT and AZURE_FACE_KEY in backend/.env');
  process.exit(1);
}

// Face Detection Endpoint
app.post('/api/detect-faces', async (req, res) => {
  try {
    const { imageUrl, imageData } = req.body;

    if (!imageUrl && !imageData) {
      return res.status(400).json({ 
        error: 'Either imageUrl or imageData is required' 
      });
    }

    // Remove trailing slash from endpoint
    const endpoint = AZURE_ENDPOINT.replace(/\/$/, '');
    const azureUrl = `${endpoint}/face/v1.0/detect`;
    
    console.log('🔍 Azure Endpoint:', azureUrl);

    // Minimal parameters - only basic face detection and landmarks
    // returnFaceId requires special approval from Azure
    const params = {
      returnFaceId: 'false',
      returnFaceLandmarks: 'true',
      returnRecognitionModel: 'false'
    };

    let requestConfig;

    if (imageUrl) {
      // URL-based detection
      console.log('📷 Detecting faces from URL:', imageUrl);
      requestConfig = {
        method: 'POST',
        url: azureUrl,
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': AZURE_KEY
        },
        params,
        data: { url: imageUrl }
      };
    } else {
      // Base64 image data detection
      console.log('📷 Detecting faces from uploaded/captured image');
      
      // Remove data URL prefix if present
      let base64Data = imageData;
      if (imageData.includes('base64,')) {
        base64Data = imageData.split('base64,')[1];
      }
      
      // Convert to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');
      console.log('📦 Image buffer size:', imageBuffer.length, 'bytes', '(' + (imageBuffer.length / 1024 / 1024).toFixed(2) + ' MB)');
      
      // Check image size (Azure limit is 6MB)
      if (imageBuffer.length > 6 * 1024 * 1024) {
        return res.status(400).json({
          error: 'Image too large. Maximum size is 6MB.'
        });
      }
      
      // Check minimum size
      if (imageBuffer.length < 1024) {
        return res.status(400).json({
          error: 'Image too small or corrupted.'
        });
      }
      
      requestConfig = {
        method: 'POST',
        url: azureUrl,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': AZURE_KEY
        },
        params,
        data: imageBuffer,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      };
    }

    // Call Azure Face API
    console.log('🚀 Sending request to Azure...');
    console.log('📋 Request params:', params);
    const response = await axios(requestConfig);

    console.log(`✅ Success! Detected ${response.data.length} face(s)`);
    res.json(response.data);

  } catch (error) {
    console.error('❌ Face detection error:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Code:', error.response?.data?.error?.code);
    console.error('Error Message:', error.response?.data?.error?.message);
    console.error('Full Error Data:', JSON.stringify(error.response?.data, null, 2));
    
    // More detailed error response
    const errorMessage = error.response?.data?.error?.message || 
                        error.response?.data?.message ||
                        error.message ||
                        'Face detection failed';
    
    const errorCode = error.response?.data?.error?.code || 'Unknown';
    
    // Provide helpful suggestions based on error code
    let suggestion = '';
    if (errorCode === 'InvalidImageUrl') {
      suggestion = 'The image URL is invalid or inaccessible. Please check the URL.';
    } else if (errorCode === 'InvalidImageFormat') {
      suggestion = 'The image format is not supported. Use JPG, PNG, GIF, or BMP.';
    } else if (errorCode === 'InvalidImageSize') {
      suggestion = 'The image size is invalid. Image must be between 1KB and 6MB.';
    } else if (errorCode === 'InvalidRequest') {
      suggestion = 'The request format is invalid. This might be an API version issue.';
    } else if (errorCode === 'Unauthorized') {
      suggestion = 'Invalid API key. Please check your Azure subscription key.';
    }
    
    res.status(error.response?.status || 500).json({
      error: errorMessage,
      code: errorCode,
      suggestion: suggestion,
      details: error.response?.data
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Face Detection API is running',
    azureConfigured: !!(AZURE_ENDPOINT && AZURE_KEY),
    endpoint: AZURE_ENDPOINT
  });
});

// Test endpoint to verify Azure connection
app.get('/api/test-azure', async (req, res) => {
  try {
    const endpoint = AZURE_ENDPOINT.replace(/\/$/, '');
    const azureUrl = `${endpoint}/face/v1.0/detect`;
    
    // Test with a simple public image
    const testImageUrl = 'https://raw.githubusercontent.com/Azure-Samples/cognitive-services-sample-data-files/master/Face/images/detection1.jpg';
    
    const response = await axios.post(azureUrl, 
      { url: testImageUrl },
      {
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': AZURE_KEY
        },
        params: {
          returnFaceId: 'true'
        }
      }
    );
    
    res.json({
      success: true,
      message: 'Azure Face API is working correctly!',
      facesDetected: response.data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message,
      code: error.response?.data?.error?.code,
      statusCode: error.response?.status
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 Azure Endpoint: ${AZURE_ENDPOINT}`);
  console.log(`🔑 Azure Key: ${AZURE_KEY ? '✓ Configured (length: ' + AZURE_KEY.length + ')' : '✗ Not configured'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  http://localhost:${PORT}/api/health - Check server status`);
  console.log(`  GET  http://localhost:${PORT}/api/test-azure - Test Azure connection`);
  console.log(`  POST http://localhost:${PORT}/api/detect-faces - Detect faces`);
  console.log('');
  console.log('💡 Tip: Visit http://localhost:' + PORT + '/api/test-azure in your browser to test Azure setup');
});