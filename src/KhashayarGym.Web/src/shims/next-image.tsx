// جایگزین next/image: یک <img> ساده با lazy-load
import { forwardRef, type ImgHTMLAttributes } from 'react'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | { src: string }; fill?: boolean; priority?: boolean; quality?: number; placeholder?: string; blurDataURL?: string
}

const Image = forwardRef<HTMLImageElement, Props>(function Image({ src, fill, priority, quality: _q, placeholder: _ph, blurDataURL: _b, style, ...rest }, ref) {
  return (
    <img
      ref={ref}
      src={typeof src === 'string' ? src : src.src}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      style={fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...style } : style}
      {...rest}
    />
  )
})
export default Image
