const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: function(origin, callback) {
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const upload = multer({ dest: 'uploads/' });

const API_KEY = process.env.RUNNINGHUB_API_KEY;
const BASE_URL = 'https://www.runninghub.cn/openapi/v2';

const WORKFLOWS = {
  whitebg: {
    id: '2071046048042278914',
    nodes: {
      image: { nodeId: '530', fieldName: 'image' },
      prompt: { nodeId: '318', fieldName: 'text' }
    },
    defaultPrompt: '改为纯白色的背景'
  },
  watermark: {
    id: '2071045767187488769',
    nodes: {
      image: { nodeId: '530', fieldName: 'image' },
      prompt: { nodeId: '318', fieldName: 'text' }
    },
    defaultPrompt: '去掉图片中所有的水印,LOGO和文字'
  },
  sketch: {
    id: '2071046156146270210',
    nodes: {
      image: { nodeId: '530', fieldName: 'image' },
      prompt: { nodeId: '318', fieldName: 'text' }
    },
    defaultPrompt: '把图片改为黑白线稿图,纯白色背景'
  },
  flux2: {
    id: '2070840960669540354',
    nodes: {
      image: { nodeId: '530', fieldName: 'image' },
      prompt: { nodeId: '536', fieldName: 'text' }
    },
    defaultPrompt: '修改为nude pu材质效果'
  },
  material: {
    id: '2071046278393454593',
    nodes: {
      image1: { nodeId: '530', fieldName: 'image' },
      image2: { nodeId: '316', fieldName: 'image' },
      prompt: { nodeId: '318', fieldName: 'text' }
    },
    defaultPrompt: '把图2的材质效果转移到图1上'
  }
};

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: -1, message: 'No file uploaded' });
    }

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', require('fs').createReadStream(req.file.path));

    const response = await axios.post(`${BASE_URL}/media/upload/binary`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    require('fs').unlinkSync(req.file.path);

    res.json(response.data);
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ code: -1, message: error.message });
  }
});

app.post('/api/submit', async (req, res) => {
  try {
    const { workflow, images, prompt } = req.body;

    if (!WORKFLOWS[workflow]) {
      return res.status(400).json({ error: 'Invalid workflow' });
    }

    const config = WORKFLOWS[workflow];
    const nodeInfoList = [];

    if (config.nodes.image && images && images[0]) {
      nodeInfoList.push({
        nodeId: config.nodes.image.nodeId,
        fieldName: config.nodes.image.fieldName,
        fieldValue: images[0]
      });
    }

    if (config.nodes.image1 && images && images[0]) {
      nodeInfoList.push({
        nodeId: config.nodes.image1.nodeId,
        fieldName: config.nodes.image1.fieldName,
        fieldValue: images[0]
      });
    }

    if (config.nodes.image2 && images && images[1]) {
      nodeInfoList.push({
        nodeId: config.nodes.image2.nodeId,
        fieldName: config.nodes.image2.fieldName,
        fieldValue: images[1]
      });
    }

    if (config.nodes.prompt) {
      nodeInfoList.push({
        nodeId: config.nodes.prompt.nodeId,
        fieldName: config.nodes.prompt.fieldName,
        fieldValue: prompt || config.defaultPrompt
      });
    }

    const response = await axios.post(`${BASE_URL}/run/workflow/${config.id}`, {
      addMetadata: true,
      nodeInfoList,
      instanceType: 'default',
      usePersonalQueue: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Submit error:', error.message);
    res.status(500).json({ 
      error: error.message,
      status: 'FAILED'
    });
  }
});

app.post('/api/query', async (req, res) => {
  try {
    const { taskId } = req.body;

    const response = await axios.post(`${BASE_URL}/query`, {
      taskId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Query error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});