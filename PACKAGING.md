# Guía de Empaquetado Multiplataforma

Para distribuir esta aplicación en Escritorio (Windows/Mac/Linux) y Móvil (iOS/Android), utilizaremos Tauri y Capacitor.

## 1. Versión de Escritorio (Tauri)
Tauri es recomendado por su eficiencia en recursos.

### Requisitos
*   Rust instalado (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
*   Microsoft Visual Studio C++ Build Tools (en Windows)

### Configuración
1.  Instalar el CLI de Tauri:
    ```bash
    npm install -D @tauri-apps/cli
    ```
2.  Inicializar Tauri:
    ```bash
    npx tauri init
    ```
    *   **Window title**: ChatApp
    *   **Frontend dist**: `../out` (o el puerto dev `http://localhost:3000`)
3.  Construir la app:
    ```bash
    npm run build # Genera la carpeta .next o out
    npx tauri build
    ```

## 2. Versión Móvil (Capacitor)
Capacitor permite convertir tu app web en una app nativa.

### Requisitos
*   Android Studio (para Android)
*   Xcode (para iOS, solo en macOS)

### Configuración
1.  Instalar Capacitor:
    ```bash
    npm install @capacitor/core @capacitor/cli
    ```
2.  Inicializar:
    ```bash
    npx cap init ChatApp com.ejemplo.chat --web-dir out
    ```
3.  Agregar plataformas:
    ```bash
    npm install @capacitor/android @capacitor/ios
    npx cap add android
    npx cap add ios
    ```
4.  Sincronizar y abrir:
    ```bash
    npm run build
    npx cap copy
    npx cap open android
    ```

## 3. Consideraciones de Producción
*   **API URLs**: Asegúrate de cambiar `localhost` por tu URL de servidor real en los clientes de Socket.io y llamadas API.
*   **CORS**: Configura el servidor Socket.io para permitir conexiones desde los esquemas nativos (`capacitor://localhost` o `tauri://localhost`).
*   **Push Notifications**: Para móvil, deberás integrar el plugin de `@capacitor/push-notifications` con Firebase Cloud Messaging (FCM).
