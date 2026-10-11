export interface TeamMember {
  id: number;
  name: string;
  role: string;
  bio: string;
}

export const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: 'Dr. John Batani',
    role: 'Researcher & Advisor',
    bio: 'Guides the Hub through research and academic insight.',
  },
  {
    id: 2,
    name: 'Mr Kasongo Kibambe',
    role: 'Advisor',
    bio: 'Advises the team as it supports innovation at Botho University.',
  },
  {
    id: 3,
    name: 'Mr Tumelo Pii',
    role: 'Advisor',
    bio: 'Provides guidance to the Innovation Hub and its initiatives.',
  },
  {
    id: 4,
    name: 'Mr Kananelo Joel',
    role: 'Technical Lead',
    bio: 'Product management and full-stack development.',
  },
  {
    id: 5,
    name: 'Mr Poloko Nkolanyane',
    role: 'Technical Lead',
    bio: 'Architecture and machine learning.',
  },
  {
    id: 6,
    name: 'Mr Bokang Mahlaka',
    role: 'Technical Lead',
    bio: 'Frontend development and large language models (LLMs).',
  },
  {
    id: 7,
    name: 'Mr Rethabile Lebelo',
    role: 'Technical Lead',
    bio: 'Backend development, APIs, and databases.',
  },
];
