const multer = require('multer');
const path = require('path');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

// 1. Configure S3 Client (Only effectively used if STORAGE_TYPE is 's3')
// AWS credentials are loaded automatically from .env by the SDK if named correctly,
// but we pass them explicitly here to match your requested .env structure.
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// 2. Define Storage Engines
const storageEngines = {
  // Option A: AWS S3 Storage (Cloud)
  s3: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    // acl: 'public-read', // Uncomment if your bucket is configured for ACLs and you want public access
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // Logic: "Sony Headset @ XM5" -> "sony-headset-xm5"
      let sanitizedName = 'product';
      if (req.body.name) {
        sanitizedName = req.body.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      }
      
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      
      // Save as: products/sony-headset-xm5-123456789.jpg
      cb(null, `products/${sanitizedName}-${uniqueSuffix}${ext}`);
    }
  }),

  // Option B: Local Disk Storage (Vagrant/Local)
  local: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/uploads/'); 
    },
    filename: (req, file, cb) => {
      let sanitizedName = 'product';
      if (req.body.name) {
        sanitizedName = req.body.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      
      // Save as: sony-headset-xm5-123456789.jpg
      cb(null, sanitizedName + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  })
};

// 3. Select Engine based on ENV
// Default to 'local' if STORAGE_TYPE is missing or invalid
const selectedStorage = process.env.STORAGE_TYPE === 's3' 
  ? storageEngines.s3 
  : storageEngines.local;

// 4. Create Middleware
const upload = multer({ 
  storage: selectedStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed!'), false);
    }
  }
});

module.exports = upload;