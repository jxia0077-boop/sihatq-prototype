# Postman / OpenAPI

Import either file into Postman:

```txt
http://localhost:3000/openapi.json
http://localhost:3000/postman/sihatq.postman_collection.json
```

The OpenAPI spec is also stored in:

```txt
web/public/openapi.json
web/docs/postman/openapi.json
```

The served Postman collection is stored in:

```txt
web/public/postman/sihatq.postman_collection.json
```

Most protected API routes use browser Supabase cookies. Copy the `Cookie`
header from DevTools Network after logging in, then set the Postman collection
variable named `cookie`.
