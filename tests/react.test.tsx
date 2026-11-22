import {describe, expect, it} from 'bun:test'
import {renderToStaticMarkup} from 'react-dom/server'
import {Avatar} from '../src/react'

describe('@superslate/avatar/react', () => {
  it('renders an inline SVG inside a sized span wrapper', () => {
    const html = renderToStaticMarkup(
      <Avatar
        shape="nova"
        palette="aurora-pink"
        appearance="dark"
        variantId="user-42"
        drift={8}
        size={96}
        className="custom-avatar"
        initials="SS"
      />,
    )

    expect(html).toContain('class="custom-avatar"')
    expect(html).toContain('width:96px')
    expect(html).toContain('height:96px')
    expect(html).toContain('<svg ')
    expect(html).toContain('width="96" height="96" viewBox="0 0 64 64"')
    expect(html).toContain('>SS</text>')
  })
})
