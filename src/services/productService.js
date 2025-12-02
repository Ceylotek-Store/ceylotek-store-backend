// const prisma = require('../config/prisma');
// const redis = require('../config/redis'); // Import the redis setup

// // Constants
// const CACHE_TTL = 3600; // Time to live: 1 hour (in seconds)
// const ALL_PRODUCTS_KEY = 'products:all'; // Key for the full list

// const createProduct = async (productData) => {
//   const product = await prisma.product.create({
//     data: productData
//   });

//   // 🗑️ INVALIDATE: The list of products has changed, so delete the cached list.
//   await redis.del(ALL_PRODUCTS_KEY);

//   return product;
// };

// const getAllProducts = async (categoryQuery, searchQuery) => {
  
//   // 1. 🔑 DETERMINE CACHE KEY
//   // We need a unique key for every combination to avoid showing wrong data.
//   let cacheKey = 'PRODUCTS_ALL';
  
//   if (categoryQuery && searchQuery) {
//     // Example: PRODUCTS_CAT_HEADPHONE_SEARCH_SONY
//     cacheKey = `PRODUCTS_CAT_${categoryQuery}_SEARCH_${searchQuery}`;
//   } else if (categoryQuery) {
//     // Example: PRODUCTS_CATEGORY_HEADPHONE
//     cacheKey = `PRODUCTS_CATEGORY_${categoryQuery}`;
//   } else if (searchQuery) {
//     // Example: PRODUCTS_SEARCH_SONY
//     cacheKey = `PRODUCTS_SEARCH_${searchQuery}`;
//   }
  
//   // Normalize key to uppercase to prevent case-sensitive duplicates
//   cacheKey = cacheKey.toUpperCase();

//   // 2. ⚡ CHECK REDIS
//   const cachedData = await redis.get(cacheKey);
  
//   if (cachedData) {
//     console.log(`⚡ Fetching products from Redis (Key: ${cacheKey})`);
//     return JSON.parse(cachedData);
//   }

//   // 3. 🛠️ BUILD QUERY FILTER
//   const whereClause = {
//     deletedAt: null // Always exclude soft-deleted items
//   };

//   // Add Category Filter
//   if (categoryQuery) {
//     whereClause.category = categoryQuery.toUpperCase(); 
//   }

//   // Add Search Filter (Matches Name OR Description)
//   if (searchQuery) {
//     whereClause.OR = [
//       // 'mode: insensitive' makes it match "sony", "Sony", "SONY"
//       { name: { contains: searchQuery, mode: 'insensitive' } },
//       { description: { contains: searchQuery, mode: 'insensitive' } }
//     ];
//   }

//   // 4. 🐢 QUERY DATABASE
//   console.log(`🐢 Fetching from DB (Category: ${categoryQuery || 'All'}, Search: ${searchQuery || 'None'})`);
  
//   const products = await prisma.product.findMany({
//     where: whereClause,
//     orderBy: { createdAt: 'desc' }
//   });

//   // 5. 💾 SAVE TO CACHE
//   // Only cache if we actually found products to prevent caching empty error states unnecessarily
//   if (products.length > 0) {
//     await redis.set(cacheKey, JSON.stringify(products), 'EX', CACHE_TTL);
//   }

//   return products;
// };

// const getProductById = async (id) => {
//   const cacheKey = `product:${id}`;

//   // 1. ⚡ CHECK CACHE
//   const cachedData = await redis.get(cacheKey);

//   if (cachedData) {
//     // Edge case: If we cached a "null" (404) previously to prevent spamming DB
//     if (cachedData === 'null') return null;
//     return JSON.parse(cachedData);
//   }

//   // 2. 🐢 QUERY DATABASE
//   const product = await prisma.product.findFirst({
//     where: {
//       id: parseInt(id),
//       deletedAt: null
//     }
//   });

//   // 3. 💾 SAVE TO CACHE
//   if (product) {
//     await redis.set(cacheKey, JSON.stringify(product), 'EX', CACHE_TTL);
//   } else {
//     // Optional: Cache "null" for short time to stop repeat queries for missing ID
//     // await redis.set(cacheKey, 'null', 'EX', 60); 
//   }

//   return product;
// };

// const updateProduct = async (id, data) => {
//   // Check existence (Standard DB logic)
//   const existingProduct = await prisma.product.findFirst({
//     where: { id: parseInt(id), deletedAt: null }
//   });

//   if (!existingProduct) {
//     throw new Error('Product not found or has been deleted');
//   }

//   // Perform Update
//   const updatedProduct = await prisma.product.update({
//     where: { id: parseInt(id) },
//     data: data
//   });

//   // 🗑️ INVALIDATE:
//   // 1. Delete the specific product cache so the next fetch gets new data
//   await redis.del(`product:${id}`);

//   // 2. Delete the "All Products" list because the details of this item changed
//   await redis.del(ALL_PRODUCTS_KEY);

//   return updatedProduct;
// };

// const deleteProduct = async (id) => {
//   const deletedProduct = await prisma.product.update({
//     where: { id: parseInt(id) },
//     data: {
//       deletedAt: new Date()
//     }
//   });

//   // 🗑️ INVALIDATE:
//   // 1. Remove specific product from cache (effectively a 404 now)
//   await redis.del(`product:${id}`);

//   // 2. Remove the list, because this item should no longer appear there
//   await redis.del(ALL_PRODUCTS_KEY);

//   return deletedProduct;
// };

// module.exports = {
//   createProduct,
//   getAllProducts,
//   getProductById,
//   updateProduct,
//   deleteProduct
// };

const prisma = require('../config/prisma');
const redis = require('../config/redis');

// Constants
const CACHE_TTL = 3600; // 1 hour
const CACHE_PREFIX_LIST = 'PRODUCT_LIST:'; // Prefix for ALL list queries (search, cat, all)
const CACHE_PREFIX_ITEM = 'PRODUCT_ITEM:'; // Prefix for individual items

/**
 * HELPER: Clears all cache keys related to product lists.
 * This is crucial because adding/editing a product might affect "All Products", 
 * "Category: Headphones", AND "Search: Sony" simultaneously.
 */
const clearProductListCache = async () => {
  // 1. Scan for keys starting with 'PRODUCT_LIST:'
  let cursor = '0';
  do {
    const reply = await redis.scan(cursor, 'MATCH', `${CACHE_PREFIX_LIST}*`, 'COUNT', 100);
    cursor = reply[0];
    const keys = reply[1];

    if (keys.length > 0) {
      // 2. Delete the found keys
      await redis.del(keys);
    }
  } while (cursor !== '0');
  
  console.log("🧹 Cleared all product list caches");
};

const createProduct = async (productData) => {
  const product = await prisma.product.create({
    data: productData
  });

  // 🗑️ INVALIDATE: Clear all lists because a new item exists
  await clearProductListCache();

  return product;
};

const getAllProducts = async (categoryQuery, searchQuery) => {
  // 1. 🔑 GENERATE CONSISTENT CACHE KEY
  let keySuffix = 'ALL';
  if (categoryQuery && searchQuery) {
    keySuffix = `CAT_${categoryQuery}_SEARCH_${searchQuery}`;
  } else if (categoryQuery) {
    keySuffix = `CAT_${categoryQuery}`;
  } else if (searchQuery) {
    keySuffix = `SEARCH_${searchQuery}`;
  }

  // Result: "PRODUCT_LIST:CAT_HEADPHONE"
  const cacheKey = `${CACHE_PREFIX_LIST}${keySuffix.toUpperCase()}`;

  // 2. ⚡ CHECK REDIS
  const cachedData = await redis.get(cacheKey);
  if (cachedData) return JSON.parse(cachedData);

  // 3. 🛠️ BUILD QUERY
  const whereClause = { deletedAt: null };

  if (categoryQuery) whereClause.category = categoryQuery.toUpperCase();
  if (searchQuery) {
    whereClause.OR = [
      { name: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } }
    ];
  }

  // 4. 🐢 QUERY DATABASE
  const products = await prisma.product.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  });

  // 5. 💾 SAVE TO CACHE
  if (products.length > 0) {
    await redis.set(cacheKey, JSON.stringify(products), 'EX', CACHE_TTL);
  }

  return products;
};

const getProductById = async (id) => {
  const cacheKey = `${CACHE_PREFIX_ITEM}${id}`;

  // 1. ⚡ CHECK CACHE
  const cachedData = await redis.get(cacheKey);
  if (cachedData) return JSON.parse(cachedData);

  // 2. 🐢 QUERY DATABASE
  const product = await prisma.product.findFirst({
    where: { id: parseInt(id), deletedAt: null }
  });

  // 3. 💾 SAVE TO CACHE
  if (product) {
    await redis.set(cacheKey, JSON.stringify(product), 'EX', CACHE_TTL);
  }

  return product;
};

const updateProduct = async (id, data) => {
  // OPTIMIZATION: Use updateMany to check for 'deletedAt: null' AND update in one go.
  // Standard .update() relies on unique ID and doesn't let us easily filter by deletedAt.
  const result = await prisma.product.updateMany({
    where: { 
      id: parseInt(id), 
      deletedAt: null // Ensure we don't update a soft-deleted item
    },
    data: data
  });

  if (result.count === 0) {
    throw new Error('Product not found or has been deleted');
  }

  // Fetch the updated item to return it (since updateMany returns a count)
  const updatedProduct = await prisma.product.findUnique({ where: { id: parseInt(id) } });

  // 🗑️ INVALIDATE:
  await redis.del(`${CACHE_PREFIX_ITEM}${id}`); // Clear specific item
  await clearProductListCache(); // Clear all lists (price/name changes affect filters)

  return updatedProduct;
};

const deleteProduct = async (id) => {
  // OPTIMIZATION: Atomic soft delete
  const result = await prisma.product.updateMany({
    where: { 
      id: parseInt(id), 
      deletedAt: null 
    },
    data: { 
      deletedAt: new Date() 
    }
  });

  if (result.count === 0) {
    throw new Error('Product not found or already deleted');
  }

  // 🗑️ INVALIDATE:
  await redis.del(`${CACHE_PREFIX_ITEM}${id}`); // Clear specific item
  await clearProductListCache(); // Clear all lists (item should vanish from results)

  return { message: "Product deleted successfully" };
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct
};