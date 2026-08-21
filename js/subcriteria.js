/**
 * subcriteria.js — Auto-suggest sub-criteria for weekly/monthly objectives
 * based on category and title keywords.
 */

const SUGGESTIONS = {
  sport: [
    'Nombre de séances réalisées',
    'Durée minimale par séance',
    'Régularité (pas de semaine sans activité)',
  ],
  santé: [
    'Respect du plan alimentaire',
    'Heures de sommeil suffisantes',
    'Hydratation quotidienne',
  ],
  santé_mental: [
    'Pratique de méditation ou respiration',
    'Moment de déconnexion numérique',
    'Journaling ou réflexion personnelle',
  ],
  travail: [
    'Avancement mesurable sur la tâche principale',
    'Respect des délais intermédiaires',
    'Qualité du livrable',
  ],
  apprentissage: [
    'Temps d\'étude consacré',
    'Exercices ou pratique active réalisés',
    'Synthèse ou révision effectuée',
  ],
  projet: [
    'Étape clé du projet avancée',
    'Livrables définis et réalisés',
    'Rétro ou point d\'avancement fait',
  ],
  lecture: [
    'Nombre de pages ou chapitres lus',
    'Prise de notes ou mémo rédigé',
    'Régularité (sessions régulières)',
  ],
  finance: [
    'Budget respecté',
    'Suivi des dépenses effectué',
    'Objectif d\'épargne atteint',
  ],
  social: [
    'Interactions intentionnelles réalisées',
    'Relation entretenue (message, appel, rencontre)',
    'Temps de qualité accordé à l\'entourage',
  ],
  créativité: [
    'Temps de pratique créative alloué',
    'Production ou création concrète réalisée',
    'Exploration d\'une nouvelle technique ou idée',
  ],
  défaut: [
    'Engagement tenu sur la période',
    'Progression par rapport à la période précédente',
    'Consistance dans l\'effort',
  ],
};

const KEYWORD_MAP = {
  'sport|gym|musculation|course|vélo|natation|yoga|pilates|entraînement|fitness': 'sport',
  'manger|alimentation|régime|nourriture|jeûne|nutrition|diète': 'santé',
  'sommeil|dormir|santé|médecin|médical|soin': 'santé',
  'méditation|mental|stress|anxiété|bien-être|pleine conscience': 'santé_mental',
  'travail|boulot|projet pro|client|réunion|deadline|tâche|productivité|focus': 'travail',
  'apprendre|formation|cours|étude|certif|langue|code|programmation|dev': 'apprentissage',
  'lire|livre|lecture|bouquin|roman': 'lecture',
  'argent|épargne|budget|finance|investissement|dépense': 'finance',
  'ami|famille|social|réseau|relation|contact': 'social',
  'créer|dessin|musique|écrire|art|photo|vidéo|podcast|créativité': 'créativité',
  'projet|plan|construire|lancer|démarrer|startup|side project': 'projet',
};

/**
 * Return 2-3 sub-criteria suggestions for a given objective.
 * @param {string} category - objective category
 * @param {string} title    - objective title
 * @returns {string[]}
 */
export function suggestSubCriteria(category, title) {
  const text = `${category} ${title}`.toLowerCase();

  for (const [pattern, key] of Object.entries(KEYWORD_MAP)) {
    const regex = new RegExp(pattern.split('|').join('|'), 'i');
    if (regex.test(text)) {
      return SUGGESTIONS[key] || SUGGESTIONS.défaut;
    }
  }

  // Category direct match
  const normalized = (category || '').toLowerCase().trim();
  for (const key of Object.keys(SUGGESTIONS)) {
    if (normalized.includes(key)) return SUGGESTIONS[key];
  }

  return SUGGESTIONS.défaut;
}
