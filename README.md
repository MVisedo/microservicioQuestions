# Microservicio de Preguntas y Respuestas

Este microservicio se encarga de gestionar las preguntas y respuestas asociadas a los artículos de la plataforma.

## Casos de uso

### CU: Crear una pregunta

- **Precondición**: El usuario está autenticado y el artículo sobre el que se pregunta existe.
- **Camino normal**:
  - Un usuario envía una pregunta para un `articleId` específico.
  - El servicio valida que el artículo existe a través de un mensaje de RabbitMQ a catalog.
  - Se crea y guarda una nueva pregunta con el `articleId`, `userId` y el texto. La pregunta se crea en estado `enabled: false`.
  - Se responde con la pregunta creada.
  - Cuando se cosume la respuesta de catalog, si el articulo es valido entonces se cambia el estado de la pregunta `enabled: true`, si el articulo no es valido se elimina la pregunta
- **Caminos alternativos**:
  - Si el `articleId` o el texto de la pregunta no se proveen, se responde con un error `400 BAD REQUEST`.
  - Cuando se cosume la respuesta de catalog, si el articulo no es valido entonces se elimina la pregunta

### CU: Agregar una respuesta a una pregunta

- **Precondición**: El usuario está autenticado como user y la pregunta fue creada por el o esta autenticado como admin, y la pregunta a la que se responde existe.
- **Camino normal**:
  - Un usuario envía una respuesta a una `questionId` existente.
  - El servicio busca la pregunta por su ID.
  - Se valida si tiene rol admin o si la pregunta fue creada por el.
  - Se agrega la nueva respuesta (con su `userId` y texto) al array de respuestas de la pregunta.
  - Se actualiza la fecha `updated` de la pregunta.
  - Se responde con la pregunta actualizada, incluyendo la nueva respuesta.
- **Caminos alternativos**:
  - Si la pregunta no se encuentra, se responde con un error `404 NOT FOUND`.
  - Si el usuario no tiene rol admin o no es el creador de la pregunta, se responde con error `User is not authorized to answer this question`
  - Si el texto de la respuesta no se provee, se responde con un error `path: text","message": "No puede quedar vacío."`.

### CU: Consultar preguntas de un artículo

- **Precondición**: Usuario autenticado y articulo existente.
- **Camino normal**:
  - Se realiza una petición para obtener las preguntas de un `articleId`.
  - El servicio busca y devuelve todas las preguntas habilitadas (`enabled: true`) para ese `articleId`.
  - Se responde con un listado de preguntas y sus respuestas.

### CU: Eliminar una pregunta

- **Precondición**: El usuario está autenticado como user y la pregunta fue creada por el o esta autenticado como admin, y la pregunta a la que se responde existe.
- **Camino normal**:
  - Se envía una petición para deshabilitar una pregunta específica por su `questionId`.
  - El servicio busca la pregunta y la elimina.

### CU: Eliminar una respuesta

- **Precondición**:  
  - Usuario autenticado como admin **o** creador de la respuesta.  
  - La pregunta existe.  
  - La respuesta existe dentro de esa pregunta.
- **Camino normal**:
  - El usuario envía una solicitud para eliminar una respuesta específica dentro de una pregunta.
  - El servicio valida que la pregunta exista.
  - Se busca la respuesta dentro del array `answers`.
  - Se valida si el usuario es admin o creador de la respuesta.
  - La respuesta se elimina del array.
- **Caminos alternativos**:
  - Pregunta no encontrada → `404 NOT FOUND`
  - Respuesta no encontrada → `404 NOT FOUND`
  - Usuario sin permisos → `User is not authorized to delete this answer`


## Modelo de datos

**Question**
- `id`: ObjectId
- `articleId`: String
- `userId`: String
- `text`: String
- `answers`: Array<Answer>
- `created`: Date
- `enabled`: Boolean

**Answer (subdocumento)**
- `id`: ObjectId
- `userId`: String
- `text`: String
- `created`: Date

## Interfaz REST

### Crear una pregunta

`POST /v1/questions`

**Body**
```json
{
  "articleId": "string",
  "text": "string"
}
```

**Headers**
- `Authorization`: Bearer token

**Response**

`200 OK`
```json
{
    "answers": [],
    "enabled": true,
    "_id": "6351c8e2f161a35252b0251c",
    "articleId": "23423",
    "userId": "user-id-from-token",
    "text": "¿Tienen stock en color azul?",
    "created": "2022-10-20T21:33:22.157Z",
    "__v": 0
}
```

### Agregar una respuesta

`POST /v1/questions/{questionId}/answers`

**Params path**
- `questionId`: ID de la pregunta a responder.

**Body**
```json
{
  "text": "string"
}
```

**Headers**
- `Authorization`: Bearer token

**Response**

`200 OK` con la pregunta y la respuesta agregada.

### Consultar preguntas de un artículo

`GET /v1/questions?articleId={articleId}`

**Params query**
- `articleId`: Artículo para la consulta.

**Response**

`200 OK` con un arreglo de las preguntas y respuestas del articulo.
```json
[
    [
    {
        "_id": "6928abbf55ade1f3ea69f579",
        "articleId": "6928a17e41be14e991fd5623",
        "userId": "6928a0cd6c29697717a17ec1",
        "text": "¿Este artículo tiene garantía?",
        "created": "2025-11-27T19:49:21.097Z",
        "enabled": true,
        "answers": [],
        "__v": 2
    },
    {
        "_id": "6928ae2755ade1f3ea69f585",
        "articleId": "6928a17e41be14e991fd5623",
        "userId": "6928a0cd6c29697717a17ec1",
        "text": "¿Este artículo tiene garantía?",
        "created": "2025-11-27T19:49:21.097Z",
        "enabled": true,
        "answers": [],
        "__v": 0
    }
]
]
```

### Eliminar una pregunta  
`DELETE /v1/questions/{questionId}`

**Response**
`204 NO CONTENT`

**Errores**
- `404 NOT FOUND`
- `401 User is not authorized to delete this question`
- `403 FORBIDDEN`

### Eliminar una respuesta  
`DELETE /v1/questions/{questionId}/answers/{answerId}`

**Response**
`204 NO CONTENT`

**Errores**
- `404 NOT FOUND`
- `401 User is not authorized to delete this answer`
- `403 FORBIDDEN`

## Interfaz asincrónica (RabbitMQ)

### Consumidor de existencia de artículos

- **Exchange**: `questions`
- **Routing key**: `article_validation`
- **Descripción**: Se utiliza para validar si un artículo existe para habilitar o eliminar una pregunta. Este es un consumidor desde el servicio catalog.

### Consumidor de Logout

- **Exchange**: `auth`
- **Descripción**: Escucha eventos de logout para invalidar tokens de sesión.

### Publisher de existencia de artículos

- **Exchange**: `article_exist`
- **Descripción**: Se utiliza para validar si un artículo existe para habilitar o eliminar una pregunta.
