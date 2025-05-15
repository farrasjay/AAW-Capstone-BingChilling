import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');
const activeUsers = new Gauge('active_users');

// Test configuration
export const options = {
  stages: [
    // Ramp-up phase
    { duration: '2m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '10m', target: 200 },
    
    // Sustained load
    { duration: '15m', target: 200 },
    
    // Peak load
    { duration: '3m', target: 500 },
    { duration: '5m', target: 500 },
    
    // Ramp-down
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests should be under 5s
    http_req_failed: ['rate<0.05'], // Error rate should be less than 5%
    errors: ['rate<0.05'],
  },
};

// Environment configuration for different teams
const config = {
  // Change BASE_URL for different team testing
  baseUrl: __ENV.BASE_URL || 'http://localhost',
  
  // Service ports (adjust per team configuration)
  authPort: __ENV.AUTH_PORT || '8000',
  orderPort: __ENV.ORDER_PORT || '8001',
  productPort: __ENV.PRODUCT_PORT || '8002',
  tenantPort: __ENV.TENANT_PORT || '8003',
  wishlistPort: __ENV.WISHLIST_PORT || '8004',
  
  // Test data
  tenantId: __ENV.TENANT_ID || '47dd6b24-0b23-46b0-a662-776158d089ba',
  
  // Load distribution weights (adjust based on expected traffic patterns)
  weights: {
    auth: 0.15,
    products: 0.35,
    orders: 0.25,
    wishlist: 0.15,
    tenant: 0.10
  }
};

// Build service URLs
const services = {
  auth: `${config.baseUrl}:${config.authPort}`,
  orders: `${config.baseUrl}:${config.orderPort}`,
  products: `${config.baseUrl}:${config.productPort}`,
  tenant: `${config.baseUrl}:${config.tenantPort}`,
  wishlist: `${config.baseUrl}:${config.wishlistPort}`
};

// Shared state for tokens and IDs
let userToken = null;
let adminToken = null;
let productIds = [];
let categoryIds = [];
let wishlistIds = [];
let orderIds = [];

// Helper functions
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomData() {
  const timestamp = Date.now();
  return {
    email: `user${timestamp}@test.com`,
    username: `user${timestamp}`,
    password: 'Password123',
    fullName: `Test User ${timestamp}`,
    address: `Test Address ${timestamp}`,
    phoneNumber: `+62${Math.floor(Math.random() * 1000000000)}`
  };
}

// Authentication functions
function testAuthentication() {
  const userData = generateRandomData();
  
  // Test user registration
  const registerResponse = http.post(`${services.auth}/user/register`, {
    username: userData.username,
    email: userData.email,
    password: userData.password,
    full_name: userData.fullName,
    address: userData.address,
    phone_number: userData.phoneNumber
  });
  
  check(registerResponse, {
    'register status is 201': (r) => r.status === 201,
    'register response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  requestCount.add(1);
  errorRate.add(registerResponse.status !== 201);
  
  // Test user login
  const loginResponse = http.post(`${services.auth}/user/login`, {
    username: userData.username,
    password: userData.password
  });
  
  check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => r.json('token') !== undefined,
  });
  
  if (loginResponse.status === 200) {
    userToken = loginResponse.json('token');
  }
  
  requestCount.add(1);
  errorRate.add(loginResponse.status !== 200);
  
  // Test token verification
  if (userToken) {
    const verifyResponse = http.post(`${services.auth}/user/verify-token`, {
      token: userToken
    });
    
    check(verifyResponse, {
      'token verify status is 200': (r) => r.status === 200,
    });
    
    requestCount.add(1);
    errorRate.add(verifyResponse.status !== 200);
  }
}

// Product functions
function testProducts() {
  // Get all products
  const productsResponse = http.get(`${services.products}/product`);
  
  check(productsResponse, {
    'get products status is 200': (r) => r.status === 200,
    'products response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (productsResponse.status === 200) {
    const products = productsResponse.json('products');
    if (products && products.length > 0) {
      productIds = products.map(p => p.id);
    }
  }
  
  requestCount.add(1);
  errorRate.add(productsResponse.status !== 200);
  
  // Get categories
  const categoriesResponse = http.get(`${services.products}/product/category`);
  
  check(categoriesResponse, {
    'get categories status is 200': (r) => r.status === 200,
  });
  
  if (categoriesResponse.status === 200) {
    const categories = categoriesResponse.json('categories');
    if (categories && categories.length > 0) {
      categoryIds = categories.map(c => c.id);
    }
  }
  
  requestCount.add(1);
  errorRate.add(categoriesResponse.status !== 200);
  
  // Get specific product if available
  if (productIds.length > 0) {
    const productId = randomChoice(productIds);
    const productResponse = http.get(`${services.products}/product/${productId}`);
    
    check(productResponse, {
      'get specific product status is 200': (r) => r.status === 200,
    });
    
    requestCount.add(1);
    errorRate.add(productResponse.status !== 200);
  }
  
  // Get products by category if available
  if (categoryIds.length > 0) {
    const categoryId = randomChoice(categoryIds);
    const categoryProductsResponse = http.get(`${services.products}/product/category/${categoryId}`);
    
    check(categoryProductsResponse, {
      'get products by category status is 200': (r) => r.status === 200,
    });
    
    requestCount.add(1);
    errorRate.add(categoryProductsResponse.status !== 200);
  }
}

// Order functions
function testOrders() {
  if (!userToken) return;
  
  const headers = {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  };
  
  // Test cart operations
  // Add item to cart
  if (productIds.length > 0) {
    const productId = randomChoice(productIds);
    const addToCartResponse = http.post(`${services.orders}/cart`, {
      product_id: productId,
      quantity: Math.floor(Math.random() * 5) + 1
    }, { headers });
    
    check(addToCartResponse, {
      'add to cart status is 201': (r) => r.status === 201,
    });
    
    requestCount.add(1);
    errorRate.add(addToCartResponse.status !== 201);
  }
  
  // Get cart items
  const cartResponse = http.get(`${services.orders}/cart`, { headers });
  
  check(cartResponse, {
    'get cart status is 200': (r) => r.status === 200,
  });
  
  requestCount.add(1);
  errorRate.add(cartResponse.status !== 200);
  
  // Place order if cart has items
  const shippingProviders = ['JNE', 'TIKI', 'SICEPAT', 'GOSEND', 'GRAB_EXPRESS'];
  const placeOrderResponse = http.post(`${services.orders}/order`, {
    shipping_provider: randomChoice(shippingProviders)
  }, { headers });
  
  check(placeOrderResponse, {
    'place order status is 201': (r) => r.status === 201,
  });
  
  if (placeOrderResponse.status === 201) {
    const order = placeOrderResponse.json('order');
    if (order && order.id) {
      orderIds.push(order.id);
    }
  }
  
  requestCount.add(1);
  errorRate.add(placeOrderResponse.status !== 201);
  
  // Get all orders
  const ordersResponse = http.get(`${services.orders}/order`, { headers });
  
  check(ordersResponse, {
    'get orders status is 200': (r) => r.status === 200,
  });
  
  requestCount.add(1);
  errorRate.add(ordersResponse.status !== 200);
  
  // Get specific order if available
  if (orderIds.length > 0) {
    const orderId = randomChoice(orderIds);
    const orderResponse = http.get(`${services.orders}/order/${orderId}`, { headers });
    
    check(orderResponse, {
      'get specific order status is 200': (r) => r.status === 200,
    });
    
    requestCount.add(1);
    errorRate.add(orderResponse.status !== 200);
  }
}

// Wishlist functions
function testWishlist() {
  if (!userToken) return;
  
  const headers = {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  };
  
  // Create wishlist
  const createWishlistResponse = http.post(`${services.wishlist}/wishlist`, {
    name: `Wishlist ${Date.now()}`
  }, { headers });
  
  check(createWishlistResponse, {
    'create wishlist status is 201': (r) => r.status === 201,
  });
  
  let wishlistId = null;
  if (createWishlistResponse.status === 201) {
    wishlistId = createWishlistResponse.json('id');
    if (wishlistId) {
      wishlistIds.push(wishlistId);
    }
  }
  
  requestCount.add(1);
  errorRate.add(createWishlistResponse.status !== 201);
  
  // Get all wishlists
  const wishlistsResponse = http.get(`${services.wishlist}/wishlist`, { headers });
  
  check(wishlistsResponse, {
    'get wishlists status is 200': (r) => r.status === 200,
  });
  
  requestCount.add(1);
  errorRate.add(wishlistsResponse.status !== 200);
  
  // Add product to wishlist
  if (wishlistId && productIds.length > 0) {
    const productId = randomChoice(productIds);
    const addProductResponse = http.post(`${services.wishlist}/wishlist/add`, {
      wishlist_id: wishlistId,
      product_id: productId
    }, { headers });
    
    check(addProductResponse, {
      'add product to wishlist status is 201': (r) => r.status === 201,
    });
    
    requestCount.add(1);
    errorRate.add(addProductResponse.status !== 201);
  }
  
  // Get wishlist details
  if (wishlistId) {
    const wishlistDetailsResponse = http.get(`${services.wishlist}/wishlist/${wishlistId}`, { headers });
    
    check(wishlistDetailsResponse, {
      'get wishlist details status is 200': (r) => r.status === 200,
    });
    
    requestCount.add(1);
    errorRate.add(wishlistDetailsResponse.status !== 200);
  }
}

// Tenant functions
function testTenant() {
  // Skip tenant tests for regular users as it requires admin token
  // This would need admin credentials and proper setup
}

// Health check functions
function testHealthChecks() {
  const services_list = [services.auth, services.orders, services.products, services.tenant, services.wishlist];
  
  services_list.forEach(service => {
    const healthResponse = http.get(`${service}/health`);
    check(healthResponse, {
      [`${service} health check`]: (r) => r.status === 200,
    });
    requestCount.add(1);
    errorRate.add(healthResponse.status !== 200);
  });
}

// Main test function
export default function () {
  activeUsers.add(1);
  
  // Distribute load based on weights
  const testType = Math.random();
  let cumulativeWeight = 0;
  
  // Health checks (always run occasionally)
  if (Math.random() < 0.05) {
    testHealthChecks();
  }
  
  // Authentication tests
  cumulativeWeight += config.weights.auth;
  if (testType < cumulativeWeight) {
    testAuthentication();
  }
  // Products tests
  else {
    cumulativeWeight += config.weights.products;
    if (testType < cumulativeWeight) {
      testProducts();
    }
    // Orders tests
    else {
      cumulativeWeight += config.weights.orders;
      if (testType < cumulativeWeight) {
        testOrders();
      }
      // Wishlist tests
      else {
        cumulativeWeight += config.weights.wishlist;
        if (testType < cumulativeWeight) {
          testWishlist();
        }
        // Tenant tests
        else {
          testTenant();
        }
      }
    }
  }
  
  // Random sleep between 1-3 seconds to simulate real user behavior
  sleep(Math.random() * 2 + 1);
  
  activeUsers.add(-1);
}

// Setup function - runs once before all tests
export function setup() {
  console.log('Starting microservice workload test...');
  console.log(`Testing services at: ${config.baseUrl}`);
  console.log('Service ports:', {
    auth: config.authPort,
    orders: config.orderPort,
    products: config.productPort,
    tenant: config.tenantPort,
    wishlist: config.wishlistPort
  });
}

// Teardown function - runs once after all tests
export function teardown(data) {
  console.log('Workload test completed!');
  console.log('Check the results for performance metrics and error rates.');
}