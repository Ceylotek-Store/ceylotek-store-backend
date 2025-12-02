const multer = require('multer');
const path = require('path');

// 1. Configure where to store files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/'); 
  },
  filename: (req, file, cb) => {
    // 1. Get the name from req.body
    // Warning: If 'name' is not sent BEFORE the file, this will be undefined!
    let sanitizedName = 'product';

    if (req.body.name) {
      // Logic: "Sony Headset @ XM5" -> "sony-headset-xm5"
      sanitizedName = req.body.name
        .toLowerCase()                   // Convert to lowercase
        .replace(/\s+/g, '-')            // Replace spaces with dashes
        .replace(/[^a-z0-9-]/g, '');     // Remove all special chars (likes @, #, %)
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // Result: sony-headset-xm5-1700123-456.jpg
    cb(null, sanitizedName + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 2. Filter files (Only accept images)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Limit to 5MB
});

module.exports = upload;