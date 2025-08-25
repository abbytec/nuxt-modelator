// 🍃 Script de inicialización de MongoDB para nuxt-modelator demo

// Conectar a la base de datos de demostración
db = db.getSiblingDB('nuxt-modelator-demo');

// Crear usuario de aplicación con permisos de lectura/escritura
db.createUser({
  user: 'nuxt-app',
  pwd: 'nuxt-app-123',
  roles: [
    {
      role: 'readWrite',
      db: 'nuxt-modelator-demo'
    }
  ]
});

print('✅ Usuario de aplicación creado: nuxt-app');

// Crear colección de productos con algunos datos de ejemplo
db.productos.drop(); // Limpiar si existe

// Insertar productos de ejemplo
const productosDemo = [
  {
    _id: ObjectId(),
    name: 'MacBook Pro M3',
    slug: 'macbook-pro-m3',
    description: 'Potente laptop profesional con chip M3 de Apple',
    category: 'Laptops',
    price: 2499.99,
    onSale: false,
    discount: 0,
    stock: 15,
    supplierEmail: 'apple@supplier.com',
    manufacturingDate: new Date('2023-01-15'),
    tags: ['laptop', 'apple', 'professional', 'M3'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: 'Samsung Galaxy S24',
    slug: 'samsung-galaxy-s24',
    description: 'Smartphone premium con cámara de alta resolución',
    category: 'Smartphones',
    price: 899.99,
    onSale: true,
    discount: 15,
    stock: 32,
    supplierEmail: 'samsung@supplier.com', 
    manufacturingDate: new Date('2023-11-20'),
    tags: ['smartphone', 'samsung', 'camera', 'premium'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: 'Sony WH-1000XM5',
    slug: 'sony-wh-1000xm5',
    description: 'Auriculares con cancelación de ruido líder en la industria',
    category: 'Audio',
    price: 349.99,
    onSale: true,
    discount: 20,
    stock: 78,
    supplierEmail: 'sony@supplier.com',
    manufacturingDate: new Date('2023-08-10'),
    tags: ['headphones', 'sony', 'noise-cancelling', 'premium'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: 'Dell XPS 13',
    slug: 'dell-xps-13', 
    description: 'Ultrabook compacta ideal para productividad',
    category: 'Laptops',
    price: 1299.99,
    onSale: false,
    discount: 0,
    stock: 8,
    supplierEmail: 'dell@supplier.com',
    manufacturingDate: new Date('2023-06-05'),
    tags: ['laptop', 'dell', 'ultrabook', 'portable'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: 'iPad Air M2',
    slug: 'ipad-air-m2',
    description: 'Tablet versátil con chip M2 para creativos',
    category: 'Tablets', 
    price: 699.99,
    onSale: true,
    discount: 10,
    stock: 25,
    supplierEmail: 'apple@supplier.com',
    manufacturingDate: new Date('2023-03-12'),
    tags: ['tablet', 'apple', 'M2', 'creative'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Insertar los productos
db.productos.insertMany(productosDemo);

// Crear índices para optimizar consultas
db.productos.createIndex({ name: 1 });
db.productos.createIndex({ category: 1 });
db.productos.createIndex({ onSale: 1, stock: 1 });
db.productos.createIndex({ slug: 1 }, { unique: true });
db.productos.createIndex({ supplierEmail: 1 });
db.productos.createIndex({ tags: 1 });
db.productos.createIndex({ price: 1 });
db.productos.createIndex({ createdAt: -1 });

// Crear índice de texto completo para búsquedas
db.productos.createIndex({
  name: "text", 
  description: "text",
  category: "text",
  tags: "text"
}, {
  weights: {
    name: 10,
    tags: 5,
    category: 3,
    description: 1
  }
});

print(`✅ ${productosDemo.length} productos de ejemplo insertados`);
print('✅ Índices de optimización creados');
print('✅ Índice de búsqueda de texto completo configurado');

// Crear colección de categorías
db.categorias.drop();

const categoriasDemo = [
  { _id: ObjectId(), name: 'Laptops', description: 'Computadoras portátiles', count: 2 },
  { _id: ObjectId(), name: 'Smartphones', description: 'Teléfonos inteligentes', count: 1 },
  { _id: ObjectId(), name: 'Audio', description: 'Equipos de audio', count: 1 },
  { _id: ObjectId(), name: 'Tablets', description: 'Tabletas y dispositivos táctiles', count: 1 }
];

db.categorias.insertMany(categoriasDemo);
db.categorias.createIndex({ name: 1 }, { unique: true });

print(`✅ ${categoriasDemo.length} categorías creadas`);

// Verificar que todo esté correcto
print('🔍 Verificación final:');
print('- Productos:', db.productos.countDocuments());
print('- Categorías:', db.categorias.countDocuments());
print('- Productos en oferta:', db.productos.countDocuments({ onSale: true }));
print('- Stock total:', db.productos.aggregate([{ $group: { _id: null, total: { $sum: "$stock" } } }]).toArray()[0].total);

print('🚀 Inicialización de MongoDB completada para nuxt-modelator demo!'); 