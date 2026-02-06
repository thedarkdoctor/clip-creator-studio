// src/lib/generateNicheKeywords.ts
/**
 * Generates a list of keywords and topics related to a given niche.
 * Returns: [base niche, 5-10 related subtopics, 3 problem-based, 3 aspiration-based]
 */
export function generateNicheKeywords(niche: string): string[] {
  // In production, use a real taxonomy or AI. Here, use simple logic for demo.
  const base = [niche];
  const related: Record<string, string[]> = {
    fitness: [
      'workout', 'gym routine', 'home workout', 'fat loss', 'muscle gain',
      'wellness', 'supplements', 'mobility', 'nutrition', 'personal trainer'
    ],
    'real estate': [
      'home buying', 'house tour', 'property tips', 'home staging', 'market update',
      'investment property', 'mortgage advice', 'open house', 'property management'
    ],
    marketing: [
      'digital marketing', 'content strategy', 'social media', 'SEO', 'branding',
      'analytics', 'ad campaigns', 'email marketing', 'lead generation'
    ],
    // ...add more as needed
  };
  const problems: Record<string, string[]> = {
    fitness: ['plateau', 'injury recovery', 'motivation loss'],
    'real estate': ['low inventory', 'financing issues', 'bad inspection'],
    marketing: ['low engagement', 'ad fatigue', 'brand confusion'],
  };
  const aspirations: Record<string, string[]> = {
    fitness: ['get stronger', 'run a marathon', 'body transformation'],
    'real estate': ['dream home', 'passive income', 'property empire'],
    marketing: ['viral growth', 'brand authority', 'market leader'],
  };
  const rel = related[niche] || [];
  const prob = problems[niche] || [];
  const asp = aspirations[niche] || [];
  return [
    ...base,
    ...rel.slice(0, 10),
    ...prob.slice(0, 3),
    ...asp.slice(0, 3)
  ];
}
