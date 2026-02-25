export interface SampleQuery {
  name: string;
  description: string;
  query: string;
  variables: Record<string, any>;
  expectedResponse: any;
  providerState: string;
  subgraph: string;
}

export const sampleQueries: SampleQuery[] = [
  {
    name: 'getArticleBySlug',
    description: 'Fetch an article by its slug',
    subgraph: 'CMS_API',
    query: `query GetArticleBySlug($slug: String!, $tenant: Tenant!) {
  getArticleBySlug(slug: $slug, tenant: $tenant) {
    uuid
    title
    slug
    description
    publishedDate
  }
}`,
    variables: {
      slug: 'breaking-news-story',
      tenant: 'SPORTS_NETWORK'
    },
    expectedResponse: {
      getArticleBySlug: {
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Breaking News Story',
        slug: 'breaking-news-story',
        description: 'Latest sports news',
        publishedDate: '2024-01-15T10:00:00Z'
      }
    },
    providerState: 'article with slug breaking-news-story exists'
  },
  {
    name: 'getAllVideos',
    description: 'Fetch all videos with pagination',
    subgraph: 'CMS_API',
    query: `query GetAllVideos($tenant: Tenant!, $limit: Int) {
  getAllVideos(tenant: $tenant, limit: $limit) {
    uuid
    title
    duration
    thumbnailUrl
  }
}`,
    variables: {
      tenant: 'SPORTS_NETWORK',
      limit: 10
    },
    expectedResponse: {
      getAllVideos: [
        {
          uuid: 'video-001',
          title: 'Game Highlights',
          duration: 180,
          thumbnailUrl: 'https://example.com/thumb.jpg'
        }
      ]
    },
    providerState: 'videos exist in the system'
  },
  {
    name: 'searchContent',
    description: 'Search for content across the platform',
    subgraph: 'SPORTS_SEARCH_API',
    query: `query SearchContent($query: String!, $limit: Int) {
  search(query: $query, limit: $limit) {
    results {
      id
      title
      type
      score
    }
  }
}`,
    variables: {
      query: 'basketball',
      limit: 5
    },
    expectedResponse: {
      search: {
        results: [
          {
            id: 'content-123',
            title: 'Basketball Championship Finals',
            type: 'VIDEO',
            score: 0.95
          }
        ]
      }
    },
    providerState: 'search index contains basketball content'
  },
  {
    name: 'getContentModule',
    description: 'Fetch a content module by ID',
    subgraph: 'CONTENT_MODULES_API',
    query: `query GetContentModule($id: ID!) {
  getContentModule(id: $id) {
    id
    title
    description
    contentType
    scheduledDate
  }
}`,
    variables: {
      id: 'module-456'
    },
    expectedResponse: {
      getContentModule: {
        id: 'module-456',
        title: 'Featured Content',
        description: 'Top stories of the day',
        contentType: 'PACKAGE',
        scheduledDate: '2024-01-20T08:00:00Z'
      }
    },
    providerState: 'content module module-456 exists'
  },
  {
    name: 'getLiveLikeProfile',
    description: 'Fetch LiveLike user profile',
    subgraph: 'LIVELIKE_API',
    query: `query GetLiveLikeProfile($id: UUID!) {
  getLiveLikeProfile(id: $id) {
    id
    nickname
    customData
    createdAt
  }
}`,
    variables: {
      id: '550e8400-e29b-41d4-a716-446655440000'
    },
    expectedResponse: {
      getLiveLikeProfile: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nickname: 'SportsFan123',
        customData: { tier: 'premium' },
        createdAt: '2023-06-15T12:00:00Z'
      }
    },
    providerState: 'LiveLike profile exists for user'
  },
  {
    name: 'getEventById',
    description: 'Fetch sports event details',
    subgraph: 'EVENT_API',
    query: `query GetEventById($id: ID!) {
  getEventById(id: $id) {
    id
    title
    startTime
    status
    homeTeam
    awayTeam
  }
}`,
    variables: {
      id: 'sr:match:12345'
    },
    expectedResponse: {
      getEventById: {
        id: 'sr:match:12345',
        title: 'Lakers vs Warriors',
        startTime: '2024-01-25T19:00:00Z',
        status: 'SCHEDULED',
        homeTeam: 'Lakers',
        awayTeam: 'Warriors'
      }
    },
    providerState: 'event sr:match:12345 exists'
  },
  {
    name: 'getStats',
    description: 'Fetch player or team statistics',
    subgraph: 'STATS_API',
    query: `query GetPlayerStats($playerId: ID!, $season: String!) {
  getPlayerStats(playerId: $playerId, season: $season) {
    playerId
    playerName
    points
    rebounds
    assists
  }
}`,
    variables: {
      playerId: 'player-789',
      season: '2023-2024'
    },
    expectedResponse: {
      getPlayerStats: {
        playerId: 'player-789',
        playerName: 'LeBron James',
        points: 25.4,
        rebounds: 7.2,
        assists: 8.1
      }
    },
    providerState: 'player stats exist for 2023-2024 season'
  }
];
