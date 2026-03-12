// Geometry type descriptors for each layer's 3 objects
// Used by both scene files and the overlay artifact viewer
export const GEOMETRY_TYPES = [
  [
    { type: 'icosahedron', args: [0.6, 1] },
    { type: 'box', args: [0.8, 0.8, 0.8] },
    { type: 'octahedron', args: [0.6] },
  ],
  [
    { type: 'torus', args: [0.5, 0.2, 12, 24] },
    { type: 'tetrahedron', args: [0.7] },
    { type: 'icosahedron', args: [0.55, 0] },
  ],
  [
    { type: 'box', args: [0.7, 0.7, 0.7] },
    { type: 'octahedron', args: [0.55] },
    { type: 'torus', args: [0.45, 0.18, 12, 24] },
  ],
  [
    { type: 'tetrahedron', args: [0.65] },
    { type: 'icosahedron', args: [0.5, 1] },
    { type: 'box', args: [0.75, 0.75, 0.75] },
  ],
  [
    { type: 'octahedron', args: [0.6] },
    { type: 'torus', args: [0.5, 0.2, 12, 24] },
    { type: 'tetrahedron', args: [0.6] },
  ],
];

export const LAYERS = [
  {
    name: 'The Foundation',
    period: 'Origin',
    quote: 'Before design, there was observation.',
    detail: 'Where curiosity became intention',
    color: '#3D2B1A',
    objects: ['First Brief', 'Sketchbook', 'The Eye'],
    objectDescriptions: [
      'The very first design brief that started it all \u2014 a handwritten note on lined paper.',
      'A worn Moleskine filled with sketches, observations, and half-formed ideas.',
      'The practice of truly seeing, not just looking. Observation as a creative act.',
    ],
    y: 0,
  },
  {
    name: 'The Awakening',
    period: 'Early Work',
    quote: 'First client. First compromise. First lesson.',
    detail: 'Learning through making',
    color: '#4A6741',
    objects: ['Brand Mark', 'Late Invoice', 'Pixel Grid'],
    objectDescriptions: [
      'The first logo delivered to a paying client. Imperfect, but real.',
      'A reminder that creativity and commerce must coexist \u2014 even when payment is late.',
      'The foundational unit of digital design. Every screen begins here.',
    ],
    y: 9,
  },
  {
    name: 'The Discipline',
    period: 'Craft',
    quote: 'Systems over aesthetics. No\u2009\u2014\u2009both.',
    detail: 'Precision as philosophy',
    color: '#7A9E72',
    objects: ['Design System', 'The Grid', 'Component'],
    objectDescriptions: [
      'When individual decisions became repeatable patterns. Consistency as craft.',
      'The invisible architecture beneath every layout. Structure that liberates.',
      'A single reusable building block \u2014 the atom of modern interface design.',
    ],
    y: 18,
  },
  {
    name: 'The Break',
    period: 'The Shift',
    quote: 'The year I unlearned everything.',
    detail: 'Breaking to rebuild',
    color: '#C8B99A',
    objects: ['AI Prompt', 'Vibe Code', 'New Tools'],
    objectDescriptions: [
      'The moment language became a design tool. Prompting as a new form of intent.',
      'Writing code by feel, not by spec. When intuition met technology.',
      'Embracing unfamiliar instruments \u2014 the discomfort that precedes growth.',
    ],
    y: 27,
  },
  {
    name: 'The Studio',
    period: 'Now',
    quote: 'Soni Labs begins here.',
    detail: 'Present tense, future facing',
    color: '#E8E0CC',
    objects: ['Identity', 'The Work', "What's Next"],
    objectDescriptions: [
      'The visual language of Soni Labs \u2014 where personal vision meets public presence.',
      'The current portfolio. Every project a conversation between craft and curiosity.',
      'The unwritten chapter. An invitation to collaborate, explore, and build forward.',
    ],
    y: 36,
  },
];
