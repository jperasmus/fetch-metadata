import fetchMetadata from '../src'
import { Request, Response, NextFunction } from '../src/types'

const mockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    headers: {},
    ...overrides,
  } as Request
}

const mockResponse = (): Response => {
  return ({
    end: jest.fn(),
  } as unknown) as Response
}

const mockNext = (): NextFunction => {
  return jest.fn() as NextFunction
}

test('Bypass middleware if secFetchSite header is not provided (old browsers)', () => {
  const onError = jest.fn()
  const req = mockRequest()
  const res = mockResponse()
  const next = mockNext()

  // Unnecessary but for clarity
  delete req.headers['secFetchSite']

  const middleware = fetchMetadata({ onError })

  middleware(req, res, next)

  expect(next).toHaveBeenCalledWith()
  expect(next).toHaveBeenCalledTimes(1)
  expect(onError).not.toHaveBeenCalled()
})

test('Allow requests from same full- or sub-domain as well as direct navigation', () => {
  const onError = jest.fn()
  const middleware = fetchMetadata({ onError })

  const secFetchSiteTests = ['same-origin', 'same-site', 'none']

  secFetchSiteTests.forEach(secFetchSiteHeader => {
    const req = mockRequest({
      headers: {
        'sec-fetch-site': secFetchSiteHeader,
      },
    })
    const res = mockResponse()
    const next = mockNext()

    middleware(req, res, next)

    expect(next).toHaveBeenCalledWith()
    expect(next).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })
})

test('Allow simple top-level navigation and iframing (except for <object> and <embed> nav requests by default)', () => {
  const onError = jest.fn()
  const req = mockRequest({
    method: 'get',
    headers: {
      'sec-fetch-dest': 'script',
      'sec-fetch-mode': 'naviGATE',
      'sec-fetch-site': 'cross-site',
    },
  })
  const res = mockResponse()
  const next = mockNext()

  const middleware = fetchMetadata({ onError })

  middleware(req, res, next)

  expect(next).toHaveBeenCalledWith()
  expect(next).toHaveBeenCalledTimes(1)
  expect(onError).not.toHaveBeenCalled()
})

test('Allow explicitly allow-listed paths', () => {
  const onError = jest.fn()
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

  const middleware = fetchMetadata({
    onError,
    allowedFetchSites: [],
    allowedPaths,
  })
  const res = mockResponse()

  const allowedPathTests = [
    {
      url: '/api/public/route',
      method: undefined,
    },
    {
      url: '/api/public/route',
      method: 'get',
    },
    {
      url: '/products',
      method: 'delete',
    },
    {
      url: '/products',
      method: 'post',
    },
    {
      url: '/products/123',
      method: 'put',
    },
  ]

  allowedPathTests.forEach(({ url, method }) => {
    const req = mockRequest({
      method,
      url,
      headers: {
        'sec-fetch-dest': 'script',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
      },
    })

    const next = mockNext()

    middleware(req, res, next)

    expect(next).toHaveBeenCalledWith()
    expect(next).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })

  // Test failure as sanity check to make sure anything is not just allowed
  const req = mockRequest({
    method: 'GET',
    url: '/something/not/allowed',
    headers: {
      'sec-fetch-dest': 'script',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
  })

  const next = mockNext()

  middleware(req, res, next)

  expect(onError).toHaveBeenCalledWith(req, res, next, expect.any(Object))
  expect(next).not.toHaveBeenCalled()
})

test('Invoke the default onError handler if request does not satisfy any allowed configuration', () => {
  const middleware = fetchMetadata({
    allowedFetchSites: [],
    // @ts-ignore
    allowedPaths: null,
  })
  const res = mockResponse()
  const req = mockRequest({
    headers: {
      'sec-fetch-dest': 'script',
      'sec-fetch-mode': ['cors'],
      'sec-fetch-site': 'same-site',
    },
  })

  const next = mockNext()

  middleware(req, res, next)

  expect(res.end).toHaveBeenCalledTimes(1)
  expect(res.statusCode).toEqual(403)
  expect(next).not.toHaveBeenCalled()
})
