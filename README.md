# Fetch Metadata Request Headers Middleware

This project is Node.js middleware for enforcing browser [Fetch metadata request headers](https://web.dev/fetch-metadata/). This helps in preventing CSRF, XSSI and information leaking attacks. Use it to add to your [defense in depth](https://en.wikipedia.org/wiki/Defense_in_depth_%28computing%29) security strategy.

## Installation

Install the middleware from NPM

```sh
npm install fetch-metadata
```

## Usage

Once installed, import and use the middleware as you would for any other Express.js/Connect middleware:

```typescript
import fetchMetadata from 'fetch-metadata'

app.use(fetchMetadata())
```

The middleware takes an **optional** config object with defaults shown below:

```typescript
app.use(
  fetchMetadata({
    allowedFetchSites: ['same-origin', 'same-site', 'none'],
    disallowedNavigationRequests: ['object', 'embed'],
    errorStatusCode: 403,
    allowedPaths: [],
    onError: (request, response, next, options) => {
      // Responds with `errorStatusCode` by default
      response.statusCode = options.errorStatusCode
      response.end()
    },
  })
)
```

### Config Options

#### allowedFetchSites

Array of all the `Sec-Fetch-Site` request header values to allow.

The current possible values are:

- `same-origin`: request came from your own application
- `same-site`: request came from a subdomain of your own application
- `none`: request came from user's interaction with the user agent (e.g. clicking on a bookmark)
- `cross-site`: request came from a completely different site

#### disallowedNavigationRequests

Array of all the `Sec-Fetch-Dest` request header values to block for navigation requests. With the defaults set to block `object` and `embed` top-level GET requests, your site can still be linked to from other sites and embedded in an iframe (if you don't block that with something else).

If you want to disable this setting, set an empty array.

#### errorStatusCode

The HTTP status code to return when a request is blocked.

#### allowedPaths

Optionally, specify an array of route paths that you want to allow regardless of any of the other checks. You can also specify this for a specific HTTP method to allow a `POST` to `/api/public/route` for instance.

##### Examples

```typescript
const allowedPaths = [
  '/api/public/route', // plain string
  '/products(/:productId)', // string with dynamic parts
  {
    path: '/api/public/route',
    method: 'GET',
  }, // object with plain string path and method
  {
    path: '/products(/:productId)',
    method: 'POST',
  }, // object with string with dynamic parts and method
]
```

As you can see, you can mix and match strings with objects and the paths can have dynamic parts, similar to how Express.js routes work.

> Allowed paths can have any pattern that [url-pattern](https://www.npmjs.com/package/url-pattern) can match.

#### onError

A callback function that will be called with a request was blocked. The function is called with the `request`, `response`, `next` and `options` objects, where the first three objects are the standard middleware arguments and the `options` object is a copy of the current configuration of this middleware.

By default, this callback will simply respond with the `errorStatusCode` that you've set (or 403). This callback is a great place is you want to log any blocked requests or even by-pass the block completely by calling `next()` here while you're testing this middleware.

## License

MIT License
