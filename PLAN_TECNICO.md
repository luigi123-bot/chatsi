# Plan Técnico: Aplicación de Chat Multiplataforma (WhatsApp Clone)

Este documento detalla la arquitectura y los pasos para construir una aplicación de mensajería instantánea moderna utilizando **Next.js 14+**, **Drizzle ORM** (con PostgreSQL), y **Socket.io** para tiempo real.

> **Nota:** Aunque la solicitud original mencionaba Neo4j, se ha optado por **Drizzle ORM + PostgreSQL** para cumplir con la instrucción específica de usar Drizzle, ya que Drizzle está optimizado para bases de datos SQL y es excelente para modelar relaciones de chat estándar.

## 1. Arquitectura del Proyecto

La aplicación seguirá una arquitectura moderna basada en Next.js App Router.

### Capas:
1.  **Presentación (Frontend)**:
    *   **Framework**: Next.js 14+ (React Server Components + Client Components).
    *   **Estilos**: Tailwind CSS para un diseño responsive y tema oscuro.
    *   **Iconos**: Lucide React.
    *   **Estado Global**: React Context + Zustand (para estado de UI complejo si es necesario).

2.  **Lógica de Negocio (Backend)**:
    *   **API**: Next.js Route Handlers (`app/api/...`) y Server Actions para mutaciones de datos.
    *   **Tiempo Real**: Servidor separado de Socket.io (o integrado en Next.js via custom server) para manejar eventos de WebSockets (mensajes instantáneos, estado "escribiendo...", presencia online).
    *   **Autenticación**: NextAuth.js (Auth.js) v5 para manejo de sesiones seguras.

3.  **Datos (Persistencia)**:
    *   **ORM**: Drizzle ORM para interactuar con la base de datos de manera segura y tipada.
    *   **Base de Datos**: PostgreSQL. Es robusta, escalable y perfecta para relaciones relacionales (Usuarios <-> Chats <-> Mensajes).
    *   **Almacenamiento de Archivos**: Almacenamiento local (para desarrollo) o nube (AWS S3/Uploadthing) para producción.

4.  **Distribución (Multiplataforma)**:
    *   **Escritorio**: Tauri (envuelve la aplicación web en un binario nativo ligero).
    *   **Móvil**: Capacitor (convierte la app web en apps nativas de iOS/Android).

## 2. Estructura de Base de Datos (Drizzle Schema)

Diseñaremos un esquema relacional eficiente.

### Tablas Principales:
*   **users**: Almacena información de perfil (nombre, email, avatar, contraseña/hash).
*   **conversations** (o `chats`): Representa un chat (1-a-1 o grupo).
*   **messages**: Almacena el contenido del mensaje, remitente, tipo (texto, imagen, video).
*   **users_to_conversations**: Tabla intermedia para manejar participantes en chats grupales.

## 3. Tecnologías Clave
*   **Next.js 14**: App Router para layouts anidados y rendimiento.
*   **Drizzle ORM**: Tipo seguro, migraciones fáciles.
*   **Socket.io**: Estándar de la industria para comunicación bidireccional.
*   **Tailwind CSS**: Estilizado rápido y consistente.

## 4. Flujo de Desarrollo

1.  **Configuración Inicial**: Setup de Next.js, Drizzle, y Base de Datos.
2.  **Autenticación**: Login y Registro.
3.  **Chat UI**: Diseño de la interfaz de lista de chats y ventana de conversación.
4.  **Backend Real-time**: Servidor Socket.io para pasar mensajes.
5.  **Integración**: Conectar UI con Backend y BD.
6.  **Multimedia**: Subida de imágenes/videos.
7.  **Empaquetado**: Configurar Tauri y Capacitor.

---

## 5. Próximos Pasos Inmediatos
1.  Instalar dependencias clave (ya en proceso).
2.  Configurar la conexión a la base de datos en `.env`.
3.  Crear el esquema de la base de datos (`schema.ts`).
4.  Ejecutar migraciones.
5.  Desarrollar la API de autenticación y chat.
