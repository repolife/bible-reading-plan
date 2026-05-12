import { Studio } from 'sanity'
import config from '../../sanity.config'

export default function StudioInner() {
  return (
    <div style={{ height: 'calc(100vh - 4rem)' }}>
      <Studio config={config} />
    </div>
  )
}
