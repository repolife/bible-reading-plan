import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'

const songSchema = {
  name: 'song',
  title: 'Song',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (R) => R.required(),
    },
    {
      name: 'author',
      title: 'Author',
      type: 'string',
    },
    {
      name: 'isShabbat',
      title: 'Shabbat Song',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'lyrics',
      title: 'Lyrics',
      type: 'array',
      of: [{ type: 'block' }],
    },
    {
      name: 'notes',
      title: 'Notes',
      type: 'array',
      of: [{ type: 'block' }],
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'author' },
  },
}

export default defineConfig({
  basePath: '/studio',
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset:   import.meta.env.VITE_SANITY_DATASET,
  plugins: [
    structureTool(),
  ],
  schema: {
    types: [songSchema],
  },
})
