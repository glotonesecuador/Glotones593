import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path  = req.nextUrl.pathname
    if (path.startsWith('/admin') && path !== '/admin/login') {
      if (!token || (token as any).role !== 'admin') {
        return NextResponse.redirect(new URL('/admin/login', req.url))
      }
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        if (path === '/admin/login') return true
        if (path.startsWith('/admin')) return !!token
        return true
      },
    },
  }
)

export const config = {
  matcher: ['/admin/:path*'],
}
