# Pádel Point Gestión — base real

Esta carpeta ya está preparada para publicar una primera versión online.

## Qué incluye
- Login real con Supabase Auth
- Roles `admin` y `employee`
- Finanzas visible y accesible solo para `admin`
- Planner y módulos operativos
- Base PostgreSQL en Supabase
- Políticas RLS para bloquear Finanzas desde la base de datos
- Frontend estático compatible con Vercel

## Pasos

### 1. Crear proyecto en Supabase
Entrá a Supabase y creá un proyecto nuevo.

### 2. Ejecutar `supabase-schema.sql`
En Supabase > SQL Editor:
- crear una query nueva
- pegar el contenido completo de `supabase-schema.sql`
- ejecutar

### 3. Crear usuarios
En Authentication > Users:
- crear tu usuario
- crear los usuarios de empleados

Por defecto todos quedan como `employee`.

Para convertir TU usuario en administradora, en SQL Editor ejecutar:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID_DE_TU_USUARIO';
```

### 4. Conectar el frontend
En Supabase > Project Settings > API copiá:
- Project URL
- Publishable key

En `app.js` reemplazá:
- `REEMPLAZAR_SUPABASE_URL`
- `REEMPLAZAR_SUPABASE_PUBLISHABLE_KEY`

Nunca pongas la `service_role` key en el navegador.

### 5. Subir a GitHub
Subí los archivos:
- `index.html`
- `styles.css`
- `app.js`

### 6. Publicar en Vercel
Importá el repositorio desde GitHub y desplegá.

## Importante
Esta base ya protege `financial_movements` mediante RLS. Un empleado no puede leer Finanzas aunque intente llamar a la base de datos directamente desde el navegador.

## Próximo desarrollo recomendado
- formularios de alta/edición conectados a Supabase
- pagos automáticos desde clases/canchas/eventos hacia Finanzas
- cuentas por cobrar
- liquidación de profesores
- historial de cambios
- exportación a Excel/PDF
- vista móvil
