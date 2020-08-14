# Fetch Metadata Request Headers Middleware

This project is Node.js middleware for enforcing browser [Fetch metadata request headers](https://web.dev/fetch-metadata/). This helps in preventing CSRF, XSSI and information leaking attacks.

## Installation

Install the middleware from NPM

```sh
npm install fetch-metadata
```

## Usage

Once installed, import and use the middleware like you would for any other Express.js/Connect middleware:

```typescript
import fetchMetadata from 'fetch-metadata'

app.use(fetchMetadata())
```

The middleware takes an optional config object with defaults shown below:

```typescript
app.use(
  fetchMetadata({
    allowedFetchSites: ['same-origin', 'same-site', 'none'],
    disallowedNavigationRequests: ['object', 'embed'],
    allowedPaths: [],
    errorStatusCode: 403,
    onError: (request, response, next, options) => {
      // Responds with `errorStatusCode` by default
      response.statusCode = options.errorStatusCode
      response.end()
    },
  })
)
```

## License

MIT License
