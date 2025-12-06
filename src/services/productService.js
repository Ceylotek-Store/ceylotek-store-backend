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