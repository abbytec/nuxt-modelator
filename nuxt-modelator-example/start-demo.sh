#!/bin/bash

# 🍃 Nuxt-Modelator + MongoDB Demo - Script de inicio rápido

echo "🍃 Iniciando demo de Nuxt-Modelator + MongoDB..."
echo ""

# Verificar que Docker esté disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor instálalo primero."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Por favor instálalo primero."
    exit 1
fi

# Paso 1: Levantar MongoDB
echo "📀 1. Levantando MongoDB con Docker Compose..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo "✅ MongoDB iniciado correctamente en puerto 27018"
    echo "✅ Mongo Express disponible en http://localhost:8081 (admin/admin123)"
else
    echo "❌ Error levantando MongoDB"
    exit 1
fi

# Esperar a que MongoDB esté listo
echo "⏳ Esperando a que MongoDB esté completamente listo..."
sleep 10

# Paso 2: Verificar que nuxt-modelator esté built
echo ""
echo "🔧 2. Verificando que nuxt-modelator esté construido..."
if [ ! -d "../nuxt-modelator/dist" ]; then
    echo "⚠️  nuxt-modelator no está construido, construyendo..."
    cd ../nuxt-modelator
    npm run build
    if [ $? -eq 0 ]; then
        echo "✅ nuxt-modelator construido correctamente"
        cd ../nuxt-modelator-example
    else
        echo "❌ Error construyendo nuxt-modelator"
        exit 1
    fi
else
    echo "✅ nuxt-modelator ya está construido"
fi

# Paso 3: Instalar dependencias si no existen
echo ""
echo "📦 3. Verificando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ Dependencias instaladas"
    else
        echo "❌ Error instalando dependencias"
        exit 1
    fi
else
    echo "✅ Dependencias ya instaladas"
fi

# Paso 4: Mostrar información
echo ""
echo "🎉 ¡Demo listo para usar!"
echo ""
echo "📊 Servicios disponibles:"
echo "  - MongoDB:      http://localhost:27018"
echo "  - Mongo Express: http://localhost:8081 (admin/admin123)"
echo "  - Nuxt App:     http://localhost:3000 (ejecutar 'npm run dev')"
echo ""
echo "📚 Datos de ejemplo incluidos:"
echo "  - 5 productos en diferentes categorías"
echo "  - Índices optimizados para búsquedas"
echo "  - Usuario de aplicación configurado"
echo ""
echo "🚀 Para iniciar la aplicación web:"
echo "  npm run dev"
echo ""
echo "🛑 Para detener todo:"
echo "  docker-compose down"
echo ""
echo "📖 Ver README.md para más información" 