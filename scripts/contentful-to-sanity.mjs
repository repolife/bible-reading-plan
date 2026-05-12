#!/usr/bin/env node
// One-time migration: Contentful songs → Sanity
// Run: node scripts/contentful-to-sanity.mjs

const CONTENTFUL_SPACE  = process.env.VITE_SPACE_ID
const CONTENTFUL_TOKEN  = process.env.VITE_CONTENT_ID || process.env.VITE_ACCESS_TOKEN
const SANITY_PROJECT    = '0yfb94zm'
const SANITY_DATASET    = 'production'
const SANITY_TOKEN      = process.env.SANITY_EDITOR_TOKEN

if (!CONTENTFUL_SPACE || !CONTENTFUL_TOKEN || !SANITY_TOKEN) {
  console.error('Missing env vars. Run with doppler run -- node scripts/contentful-to-sanity.mjs')
  process.exit(1)
}

// ── Contentful fetch ────────────────────────────────────────────────────────

async function fetchAllSongs() {
  const url = `https://cdn.contentful.com/spaces/${CONTENTFUL_SPACE}/environments/master/entries?content_type=song&limit=1000`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${CONTENTFUL_TOKEN}` } })
  const data = await res.json()
  console.log(`Fetched ${data.items?.length ?? 0} songs from Contentful`)
  return data.items || []
}

// ── Rich text → Portable Text ───────────────────────────────────────────────

let keyCounter = 0
const key = () => `k${++keyCounter}`

function convertMarks(marks = []) {
  return marks.map(m => m.type)
}

function convertInline(node) {
  if (node.nodeType === 'text') {
    return { _type: 'span', _key: key(), text: node.value, marks: convertMarks(node.marks) }
  }
  // hyperlink
  if (node.nodeType === 'hyperlink') {
    const markKey = key()
    return {
      _type: 'span',
      _key: key(),
      text: node.content.map(c => c.value || '').join(''),
      marks: [markKey],
      _markDef: { _type: 'link', _key: markKey, href: node.data?.uri || '' },
    }
  }
  return null
}

function convertBlock(node) {
  const styleMap = {
    'paragraph':  'normal',
    'heading-1':  'h1',
    'heading-2':  'h2',
    'heading-3':  'h3',
    'heading-4':  'h4',
    'heading-5':  'h5',
    'heading-6':  'h6',
    'blockquote': 'blockquote',
  }

  if (styleMap[node.nodeType]) {
    const children = []
    const markDefs = []
    for (const inline of node.content || []) {
      const span = convertInline(inline)
      if (span) {
        if (span._markDef) { markDefs.push(span._markDef); delete span._markDef }
        children.push(span)
      }
    }
    return { _type: 'block', _key: key(), style: styleMap[node.nodeType], children, markDefs }
  }

  if (node.nodeType === 'unordered-list' || node.nodeType === 'ordered-list') {
    const listItem = node.nodeType === 'unordered-list' ? 'bullet' : 'number'
    return (node.content || []).flatMap(li =>
      (li.content || []).map(block => ({
        ...convertBlock(block),
        listItem,
        level: 1,
      }))
    )
  }

  if (node.nodeType === 'hr') {
    return { _type: 'block', _key: key(), style: 'normal', children: [{ _type: 'span', _key: key(), text: '' }], markDefs: [] }
  }

  return null
}

function richTextToPortableText(doc) {
  if (!doc || !doc.content) return []
  return (doc.content || []).flatMap(node => {
    const result = convertBlock(node)
    if (!result) return []
    return Array.isArray(result) ? result : [result]
  })
}

// ── Sanity import ───────────────────────────────────────────────────────────

async function importToSanity(docs) {
  // Build NDJSON mutation payload
  const mutations = docs.map(doc => ({ createOrReplace: doc }))
  const ndjson = mutations.map(m => JSON.stringify(m)).join('\n')

  const url = `https://${SANITY_PROJECT}.api.sanity.io/v2021-06-07/data/mutate/${SANITY_DATASET}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SANITY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mutations }),
  })

  const result = await res.json()
  if (!res.ok) {
    console.error('Sanity import error:', JSON.stringify(result, null, 2))
    process.exit(1)
  }
  return result
}

// ── Main ────────────────────────────────────────────────────────────────────

const songs = await fetchAllSongs()

const sanityDocs = songs.map(item => ({
  _type: 'song',
  _id:   `contentful-${item.sys.id}`,
  title:    item.fields.title     ?? '',
  author:   item.fields.author    ?? '',
  isShabbat: item.fields.isShabbat ?? false,
  lyrics:   richTextToPortableText(item.fields.lyrics),
  notes:    richTextToPortableText(item.fields.notes),
}))

console.log(`Importing ${sanityDocs.length} songs to Sanity…`)
const result = await importToSanity(sanityDocs)
const { created = 0, updated = 0, skipped = 0 } = result.results?.reduce(
  (acc, r) => ({ ...acc, [r.operation]: (acc[r.operation] || 0) + 1 }),
  {}
) || {}
console.log(`Done — created: ${created}, updated: ${updated}, skipped: ${skipped}`)
