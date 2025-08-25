<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useProductoStore } from "#nuxt-modelator/stores/useProductoStore";

const store = useProductoStore();

// Datos reactivos
const newProduct = ref({
	name: "  iPhone 15 Pro Max  ",
	description: "El iPhone más avanzado con chip A17 Pro",
	category: "Smartphones", 
	price: 1299.99,
	stock: 25,
	supplierEmail: "apple@supplier.com",
	manufacturingDate: "2023-09-15"
});

const invalidProduct = ref({
	name: "",
	description: "x".repeat(2001),
	category: "",
	price: -100,
	stock: -5,
	supplierEmail: "email-inválido",
	manufacturingDate: "2025-12-31"
});

const searchQuery = ref("macbook");
const selectedCategory = ref("Laptops");
const currentTab = ref("products");

// Datos computados
const categories = computed(() => {
	const cats = new Set();
	if (Array.isArray(store.all)) {
		store.all.forEach(product => {
			if (product.category) cats.add(product.category);
		});
	}
	return Array.from(cats);
});

const totalProducts = computed(() => 
	Array.isArray(store.all) ? store.all.length : 0
);

const productsOnSale = computed(() => {
	if (!Array.isArray(store.all)) return [];
	return store.all.filter(p => p && p.onSale === true);
});

// Métodos
const loadInitialData = async () => {
	try {
		console.time("⏱️ [Demo] Initial data load");
		await store.getAll();
		console.timeEnd("⏱️ [Demo] Initial data load");
	} catch (error) {
		console.error("Error cargando datos iniciales:", error);
	}
};

const createSampleProduct = async () => {
	console.log("🚀 Creando producto de ejemplo...");
	try {
		await store.create({ ...newProduct.value });
		setTimeout(() => store.getAll(), 500);
	} catch (error) {
		console.error("Error creando producto:", error);
	}
};

const testValidations = async () => {
	console.log("❌ Probando validaciones...");
	try {
		await store.create({ ...invalidProduct.value });
	} catch (error) {
		console.log("✅ Validaciones funcionando:", error);
	}
};

const searchProducts = async () => {
	if (!searchQuery.value.trim()) return;
	console.log(`🔍 Buscando "${searchQuery.value}"...`);
	try {
		await store.search(searchQuery.value);
	} catch (error) {
		console.error("Error en búsqueda:", error);
	}
};

const getByCategory = async () => {
	if (!selectedCategory.value) return;
	console.log(`🏷️ Obteniendo categoría "${selectedCategory.value}"...`);
	try {
		await store.getByCategory(selectedCategory.value);
	} catch (error) {
		console.error("Error obteniendo por categoría:", error);
	}
};

const getProductsOnSale = async () => {
	console.log("💰 Obteniendo productos en oferta...");
	try {
		await store.getOnSale();
	} catch (error) {
		console.error("Error obteniendo ofertas:", error);
	}
};

onMounted(async () => {
	console.log("🍃 Nuxt-Modelator MongoDB Demo iniciado");
	await loadInitialData();
	console.log("✅ Demo listo!");
});
</script>

<template>
	<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
		<div class="container mx-auto px-4 py-8 max-w-7xl">
			<!-- Header -->
			<div class="text-center mb-12">
				<h1 class="text-5xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-4">
					🍃 Nuxt-Modelator + MongoDB
				</h1>
				<p class="text-xl text-gray-600 mb-8">
					Demostración completa de composición de middlewares y auto-generación de schemas
				</p>
				
				<div class="flex flex-wrap justify-center gap-2 mb-6">
					<span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">✨ Auto-Schema Generation</span>
					<span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">⚡ True Composition</span>
					<span class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">🔍 Full-Text Search</span>
					<span class="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">📊 Real-time Stats</span>
				</div>
			</div>

			<!-- Estadísticas -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				<div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
					<div class="flex items-center">
						<div class="p-3 rounded-full bg-blue-100">
							<span class="text-2xl">📦</span>
						</div>
						<div class="ml-4">
							<p class="text-sm text-gray-600">Total Productos</p>
							<p class="text-2xl font-bold text-blue-600">{{ totalProducts }}</p>
						</div>
					</div>
				</div>
				
				<div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
					<div class="flex items-center">
						<div class="p-3 rounded-full bg-green-100">
							<span class="text-2xl">💰</span>
						</div>
						<div class="ml-4">
							<p class="text-sm text-gray-600">En Oferta</p>
							<p class="text-2xl font-bold text-green-600">{{ productsOnSale.length }}</p>
						</div>
					</div>
				</div>
				
				<div class="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
					<div class="flex items-center">
						<div class="p-3 rounded-full bg-purple-100">
							<span class="text-2xl">🏷️</span>
						</div>
						<div class="ml-4">
							<p class="text-sm text-gray-600">Categorías</p>
							<p class="text-2xl font-bold text-purple-600">{{ categories.length }}</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Tabs -->
			<div class="bg-white rounded-xl shadow-lg mb-8">
				<div class="border-b border-gray-200">
					<nav class="flex space-x-8 px-6">
						<button @click="currentTab = 'products'"
							:class="[currentTab === 'products' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500', 'py-4 px-1 border-b-2 font-medium text-sm']">
							📦 Productos
						</button>
						<button @click="currentTab = 'create'"
							:class="[currentTab === 'create' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500', 'py-4 px-1 border-b-2 font-medium text-sm']">
							➕ Crear
						</button>
						<button @click="currentTab = 'search'"
							:class="[currentTab === 'search' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500', 'py-4 px-1 border-b-2 font-medium text-sm']">
							🔍 Búsqueda
						</button>
					</nav>
				</div>

				<div class="p-6">
					<!-- Tab: Productos -->
					<div v-if="currentTab === 'products'" class="space-y-6">
						<div class="flex flex-wrap gap-4 mb-6">
							<button @click="loadInitialData()" :disabled="store.loading.getAll"
								class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
								{{ store.loading.getAll ? "🔄 Cargando..." : "🔄 Recargar Todo" }}
							</button>
							<button @click="getProductsOnSale()" :disabled="store.loading.getOnSale"
								class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
								{{ store.loading.getOnSale ? "💰 Cargando..." : "💰 Solo Ofertas" }}
							</button>
						</div>

						<div v-if="Array.isArray(store.all) && store.all.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							<div v-for="product in store.all" :key="product._id || product.id" 
								class="bg-white border rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
								<div class="flex justify-between items-start mb-3">
									<h3 class="font-bold text-lg text-gray-900">{{ product.name }}</h3>
									<span v-if="product.onSale" class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
										-{{ product.discount }}% OFF
									</span>
								</div>
								<p class="text-gray-600 text-sm mb-3">{{ product.description }}</p>
								<div class="space-y-2 text-sm">
									<div class="flex justify-between">
										<span class="text-gray-500">Categoría:</span>
										<span class="font-medium">{{ product.category }}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-500">Precio:</span>
										<span class="font-bold text-green-600">${{ product.price }}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-gray-500">Stock:</span>
										<span :class="product.stock > 10 ? 'text-green-600' : 'text-red-600'">
											{{ product.stock || 0 }}
										</span>
									</div>
								</div>
							</div>
						</div>
						
						<div v-else-if="store.loading.getAll" class="text-center py-12">
							<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
							<p class="text-gray-600">Cargando productos desde MongoDB...</p>
						</div>
						
						<div v-else class="text-center py-12 text-gray-500">
							<span class="text-4xl mb-4 block">📦</span>
							<p>No hay productos para mostrar</p>
						</div>
					</div>

					<!-- Tab: Crear -->
					<div v-if="currentTab === 'create'" class="space-y-6">
						<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
							<div class="bg-green-50 p-6 rounded-lg">
								<h3 class="text-lg font-semibold mb-4 text-green-800">✅ Crear Producto Válido</h3>
								<div class="space-y-4">
									<input v-model="newProduct.name" placeholder="Nombre del producto"
										class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500">
									<select v-model="newProduct.category" 
										class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500">
										<option>Smartphones</option>
										<option>Laptops</option>
										<option>Audio</option>
										<option>Tablets</option>
									</select>
									<input v-model="newProduct.price" type="number" placeholder="Precio"
										class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500">
									<textarea v-model="newProduct.description" placeholder="Descripción" rows="3"
										class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500"></textarea>
								</div>
								<button @click="createSampleProduct()" :disabled="store.loading.create"
									class="w-full mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50">
									{{ store.loading.create ? "⏳ Creando..." : "✅ Crear Producto" }}
								</button>
							</div>

							<div class="bg-red-50 p-6 rounded-lg">
								<h3 class="text-lg font-semibold mb-4 text-red-800">❌ Probar Validaciones</h3>
								<div class="space-y-3 mb-4 text-sm text-red-600">
									<div>❌ Nombre vacío (Required)</div>
									<div>❌ Descripción >2000 chars (MaxLength)</div>
									<div>❌ Precio negativo (IsPositive)</div>
									<div>❌ Email inválido (Email)</div>
									<div>❌ Fecha futura (PastDate)</div>
								</div>
								<button @click="testValidations()" :disabled="store.loading.create"
									class="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50">
									❌ Probar Validaciones
								</button>
							</div>
						</div>

						<div v-if="store.validationErrors.create?.length" class="bg-red-100 border border-red-300 rounded-lg p-6">
							<h3 class="font-semibold text-red-800 mb-3">🚨 Errores de Validación:</h3>
							<ul class="list-disc list-inside text-red-700 space-y-1">
								<li v-for="error in store.validationErrors.create" :key="error.field">
									<strong>{{ error.field }}:</strong> {{ error.message }}
								</li>
							</ul>
						</div>
					</div>

					<!-- Tab: Búsqueda -->
					<div v-if="currentTab === 'search'" class="space-y-6">
						<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
							<div class="bg-blue-50 p-6 rounded-lg">
								<h3 class="text-lg font-semibold mb-4 text-blue-800">🔍 Búsqueda por Texto</h3>
								<div class="flex gap-3 mb-4">
									<input v-model="searchQuery" @keyup.enter="searchProducts()" 
										placeholder="Buscar productos..." 
										class="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
									<button @click="searchProducts()" :disabled="store.loading.search"
										class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
										🔍
									</button>
								</div>
								<p class="text-sm text-blue-600">
									💡 Índice de texto completo de MongoDB
								</p>
							</div>

							<div class="bg-purple-50 p-6 rounded-lg">
								<h3 class="text-lg font-semibold mb-4 text-purple-800">🏷️ Filtrar por Categoría</h3>
								<div class="flex gap-3 mb-4">
									<select v-model="selectedCategory" 
										class="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-purple-500">
										<option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
									</select>
									<button @click="getByCategory()" :disabled="store.loading.getByCategory"
										class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50">
										🏷️
									</button>
								</div>
								<p class="text-sm text-purple-600">
									💡 Consulta optimizada con índices
								</p>
							</div>
						</div>

						<div v-if="store.entity" class="bg-white border rounded-lg p-6">
							<h4 class="font-semibold mb-4">📊 Resultados:</h4>
							<div class="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
								<pre class="text-sm">{{ JSON.stringify(Array.isArray(store.entity) ? store.entity : [store.entity], null, 2) }}</pre>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Features -->
			<div class="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-8">
				<h3 class="text-xl font-bold mb-6 text-center">🌟 Características de Nuxt-Modelator + MongoDB</h3>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div class="text-center">
						<div class="text-3xl mb-3">✨</div>
						<h4 class="font-semibold mb-2">Auto-Schema Generation</h4>
						<p class="text-sm text-gray-600">Los decorators TypeScript se convierten automáticamente en schema de Mongoose</p>
					</div>
					<div class="text-center">
						<div class="text-3xl mb-3">⚡</div>
						<h4 class="font-semibold mb-2">True Composition</h4>
						<p class="text-sm text-gray-600">Middlewares con next() real para timing, auth, rate limiting y más</p>
					</div>
					<div class="text-center">
						<div class="text-3xl mb-3">🚀</div>
						<h4 class="font-semibold mb-2">Zero Configuration</h4>
						<p class="text-sm text-gray-600">Solo agrega dbConfig y todo funciona: conexión, endpoints, validación</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
pre {
	white-space: pre-wrap;
	word-break: break-word;
}
</style> 