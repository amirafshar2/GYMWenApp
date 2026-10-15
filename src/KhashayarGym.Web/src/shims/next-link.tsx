// جایگزین next/link برای کامپوننت‌های 21st.dev که برای Next.js نوشته شده‌اند (این پروژه Vite + React Router است)
import { forwardRef, type AnchorHTMLAttributes } from 'react'
import { Link as RouterLink } from 'react-router-dom'

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean; scroll?: boolean; replace?: boolean }

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch: _p, scroll: _s, replace, ...rest }, ref) {
  const external = /^(https?:|mailto:|tel:)/.test(href) || href.startsWith('#')
  if (external) return <a ref={ref} href={href} {...rest} />
  return <RouterLink ref={ref} to={href} replace={replace} {...rest} />
})
export default Link
