# AstroBuild Backend - Vercel Deployment (PostgreSQL/Supabase)

✅ **MIGRACIÓN COMPLETA** - Este folder ya está completamente migrado de SQLite a PostgreSQL/Supabase y listo para Vercel.

## 🎯 Características implementadas:
- ✅ **PostgreSQL** con Supabase como base de datos
- ✅ **Migraciones automáticas** con scripts incluidos
- ✅ **Health checks** para verificar conexión
- ✅ **Todas las rutas migradas** y funcionando
- ✅ **Auto-inicialización** en Vercel production

## 📁 Archivos incluidos:
- ✅ `server.js` - Servidor principal con soporte PostgreSQL
- ✅ `package.json` - Dependencias actualizadas (pg en lugar de sqlite3)
- ✅ `database/db.js` - Configuración PostgreSQL con Pool
- ✅ `scripts/migrations/001_init.sql` - Esquema PostgreSQL completo
- ✅ `scripts/run-migrations.js` - Script de migración automática
- ✅ `scripts/health-check.js` - Verificador de conexión BD
- ✅ `routes/` - Todas las rutas con sintaxis PostgreSQL
- ✅ `vercel.json` - Configuración lista para deploy
- ✅ `.env.example` - Variables de entorno actualizadas

## 🚀 Instrucciones de despliegue:

### 1. **Configuración local (desarrollo):**

```bash
cd astrobuild-backend-vercel

# Crear archivo .env con tu conexión Supabase:
echo "SUPABASE_DB_URL=postgresql://postgres.rulstezvjymhikemxxbu:Haloreach321nueva@aws-1-us-east-2.pooler.supabase.com:6543/postgres" > .env

# Instalar dependencias
npm install

# Ejecutar migraciones (crea tablas y datos iniciales)
npm run db:migrate

# Verificar conexión
npm run db:health

# Iniciar servidor local
npm start
```

### 2. **Deploy en Vercel:**

```bash
# Instalar Vercel CLI si no lo tienes
npm install -g vercel

# Deploy
vercel --prod

# Configurar variable de entorno en Vercel:
vercel env add SUPABASE_DB_URL
# Pegar: postgresql://postgres.rulstezvjymhikemxxbu:Haloreach321nueva@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

## 🔧 Scripts disponibles:

```bash
npm start          # Iniciar servidor
npm run db:migrate # Ejecutar migraciones
npm run db:health  # Verificar conexión BD
```

## 📊 Variables de entorno:

### Para desarrollo local (.env):
```
SUPABASE_DB_URL=postgresql://postgres.rulstezvjymhikemxxbu:Haloreach321nueva@aws-1-us-east-2.pooler.supabase.com:6543/postgres
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Para Vercel production:
- `SUPABASE_DB_URL`: Tu connection string de Supabase
- `NODE_ENV`: production (automático)
- `VERCEL`: 1 (automático)

## 🎉 Endpoints disponibles:

Una vez desplegado, tendrás acceso a:

- `GET /api/health` - Status del servidor
- `GET /api/cars` - Listar carros
- `POST /api/cars` - Crear carro
- `GET /api/tasks` - Listar tareas
- `POST /api/tasks` - Crear tarea
- `GET /api/mechanics` - Listar mecánicos
- `GET /api/mechanics/leaderboard` - Ranking de mecánicos
- `GET /api/stats` - Estadísticas generales

## 🔍 Verificación post-deploy:

```bash
# Verificar que el servidor responde
curl https://tu-deploy.vercel.app/api/health

# Verificar datos
curl https://tu-deploy.vercel.app/api/mechanics
curl https://tu-deploy.vercel.app/api/stats
```

## 📝 Cambios implementados:

### Base de datos:
- ❌ SQLite → ✅ PostgreSQL/Supabase
- ❌ Archivos .db → ✅ Pool de conexiones
- ❌ Sintaxis SQLite → ✅ Sintaxis PostgreSQL
- ❌ Schema manual → ✅ Migraciones automáticas

### Código:
- Placeholders `?` → `$1`, `$2`, etc
- `result.lastID` → `result.rows[0].id` con `RETURNING`
- `result.changes` → `result.rowCount`
- Comillas dobles → Comillas simples en queries
- Auto-inicialización en production

## ⚠️ Notas importantes:

1. **El proyecto original permanece intacto** - solo este folder fue migrado
2. **Auto-migración en Vercel** - No necesitas correr migraciones manualmente
3. **Health checks incluidos** - Para debugging fácil
4. **Connection pooling** - Optimizado para serverless
5. **Real-time con Socket.io** - Funciona igual que antes

## 🐛 Troubleshooting:

Si hay problemas:

```bash
# Verificar localmente
npm run db:health

# Ver logs en Vercel
vercel logs https://tu-deploy.vercel.app

# Re-deploy forzado
vercel --prod --force
```

¡Tu backend está listo para producción! 🎉