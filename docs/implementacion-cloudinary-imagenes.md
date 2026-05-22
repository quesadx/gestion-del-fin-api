# Implementación de imágenes con Cloudinary

## Objetivo

Se implementó soporte real para imágenes en el backend usando Cloudinary, con dos reglas principales:

1. El backend ya no depende de que el frontend envíe solo URLs cortas en texto plano.
2. Las URLs que devuelve la API quedan firmadas temporalmente y expiran, en lugar de ser enlaces públicos permanentes.

Además, el soporte aplica a:

- `admissions` para `photo_url` e `id_card_url`
- `people` para `photo_url`

## Flujo general

### 1. El cliente envía archivos

Para crear o editar una admission o una person, el frontend puede enviar `multipart/form-data` con archivos en estos campos:

- `photo` para la foto
- `id_card` para la cédula o documento

### 2. El backend intercepta el upload

Se agregó un middleware reutilizable en `src/middlewares/image-upload.middleware.ts` que:

- detecta requests `multipart/form-data`
- lee los archivos en memoria con `multer`
- sube cada archivo a Cloudinary
- reemplaza el archivo por la URL segura en `req.body`

### 3. Cloudinary guarda la imagen como asset autenticado

El helper de Cloudinary en `src/lib/cloudinary.ts` sube la imagen con configuración de seguridad:

- `resource_type: 'image'`
- `type: 'authenticated'`
- sin sobrescritura
- con nombre único generado por Cloudinary

Esto evita que las imágenes queden públicas por defecto.

### 4. Se persiste la URL en la base de datos

Una vez subida la imagen, el backend guarda la URL resultante en los campos existentes:

- `photo_url`
- `id_card_url`

No fue necesario cambiar el esquema principal para soportar las rutas actuales.

### 5. La API devuelve URLs firmadas temporalmente

Antes de responder al cliente, los controllers pasan la salida por `signMediaUrls()` en `src/shared/utils/mediaUrl.ts`.

Ese helper:

- detecta campos `photo_url` e `id_card_url`
- extrae el `public_id` de Cloudinary
- genera una URL firmada y temporal
- limita la expiración usando el `exp` del JWT del usuario
- además respeta `CLOUDINARY_SIGNED_URL_MAX_TTL_SECONDS` como tope máximo

## Cómo funciona la seguridad

La seguridad tiene dos capas:

### Capa 1: upload autenticado

Las imágenes se guardan como assets autenticados en Cloudinary. Eso significa que no quedan como archivos públicos accesibles sin control.

### Capa 2: entrega temporal

La API no devuelve la URL cruda de almacenamiento. Devuelve una URL firmada que expira.

La expiración se calcula con esta regla:

- usa el `exp` del JWT del usuario como límite principal
- si el JWT permite más tiempo, la URL se corta con `CLOUDINARY_SIGNED_URL_MAX_TTL_SECONDS`
- si no existe esa variable, el valor por defecto es 600 segundos

## Archivos nuevos

### `src/lib/cloudinary-provider.ts`

Configura Cloudinary con variables de entorno y expone si está listo para usarse.

### `src/lib/cloudinary.ts`

Implementa la subida de buffers a Cloudinary.

### `src/middlewares/image-upload.middleware.ts`

Middleware reutilizable para recibir imágenes por multipart y subirlas antes de llegar al controller.

### `src/shared/utils/mediaUrl.ts`

Firma URLs de Cloudinary y les aplica expiración temporal.

### `src/shared/utils/identificationCode.ts`

Genera un código único de identificación para personas creadas automáticamente.

## Archivos modificados

### `src/modules/admission/admission.routes.ts`

Agrega el middleware de upload para `photo` e `id_card` en creación de admissions.

### `src/modules/admission/admission.controller.ts`

Firma las URLs antes de responder en create, get list, get one y review.

### `src/modules/admission/admission.service.ts`

Cuando una admission se acepta:

- crea la persona automáticamente
- copia `photo_url`
- guarda `person_id` en la admission
- devuelve la persona creada dentro de la respuesta

### `src/modules/people/people.routes.ts`

Agrega soporte de upload para `photo` en create y update de people.

### `src/modules/people/people.controller.ts`

Firma las URLs de imagen antes de responder en create, update, get y list.

### `src/modules/people/people.service.ts`

Si no llega `identification_code`, genera uno automáticamente al crear la persona.

### `src/middlewares/auth.middleware.ts`

Expone `exp` e `iat` del JWT para que el backend use esa expiración al firmar URLs de media.

### `src/shared/utils/jwt.ts`

Se amplía el payload tipado para conservar `exp` e `iat` del token.

### `.env.example`

Se documentan las variables de Cloudinary y el TTL máximo de URLs firmadas.

### `package.json` y `package-lock.json`

Se agregan las dependencias necesarias:

- `cloudinary`
- `multer`
- `@types/multer`

## Variables de entorno nuevas

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_cloudinary_api_key_here
CLOUDINARY_API_SECRET=your_cloudinary_api_secret_here
CLOUDINARY_SIGNED_URL_MAX_TTL_SECONDS=600
```

## Resultado final

Con este cambio, el backend ya no maneja imágenes como URLs abiertas sin control. Ahora:

- recibe archivos por multipart
- los sube a Cloudinary
- guarda la URL en la base de datos
- devuelve URLs firmadas y temporales
- limita la vida útil de esas URLs con el JWT del usuario y con una variable de entorno

Si quieres, en un siguiente paso se puede ampliar este mismo flujo a otros módulos que tengan imágenes, o convertirlo en un endpoint de upload separado si el frontend prefiere ese patrón.
