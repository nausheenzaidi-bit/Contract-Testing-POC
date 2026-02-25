export interface RestEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  path: string;
  description: string;
  parameters?: Array<{ name: string; value: string }>;
  headers?: Array<{ name: string; value: string }>;
  body?: any;
  service: string;
}

export const hydrationStationEndpoints: RestEndpoint[] = [
  {
    name: 'Health Check',
    method: 'GET',
    url: 'https://sports-hydration-station.us-east-1.sportsplatform.io/up/elb',
    path: '/up/elb',
    description: 'Check if the Hydration Station service is healthy and responsive',
    service: 'Hydration Station'
  },
  {
    name: 'Get Stream Configuration',
    method: 'GET',
    url: 'https://sports-hydration-station.us-east-1.sportsplatform.io/client/stream_config/los-angeles-lakers',
    path: '/client/stream_config/{teamSlug}',
    description: 'Retrieve stream configuration for a specific team',
    parameters: [
      { name: 'teamSlug', value: 'los-angeles-lakers' }
    ],
    service: 'Hydration Station'
  },
  {
    name: 'Get Tweets',
    method: 'GET',
    url: 'https://sports-hydration-station.us-east-1.sportsplatform.io/client/tweets',
    path: '/client/tweets',
    description: 'Fetch tweets by their IDs',
    parameters: [
      { name: 'ids', value: '2013872487910514691,2013870435138494758' }
    ],
    service: 'Hydration Station'
  },
  {
    name: 'Hydrate Tweet from URL',
    method: 'GET',
    url: 'https://sports-hydration-station.us-east-1.sportsplatform.io/client/hydrate',
    path: '/client/hydrate',
    description: 'Hydrate (fetch and enrich) a tweet from its URL',
    parameters: [
      { name: 'url', value: 'https://x.com/NBA/status/2013836436739379373' }
    ],
    service: 'Hydration Station'
  },
  {
    name: 'Toggle RSS Output',
    method: 'POST',
    url: 'https://sports-hydration-station.us-east-1.sportsplatform.io/client/stream_config/los-angeles-lakers',
    path: '/client/stream_config/{teamSlug}',
    description: 'Toggle RSS output settings for a team stream',
    parameters: [
      { name: 'teamSlug', value: 'los-angeles-lakers' }
    ],
    headers: [
      { name: 'Content-Type', value: 'application/json' }
    ],
    body: {
      rss_output_toggle: true,
      programmer_override: true
    },
    service: 'Hydration Station'
  },
  {
    name: 'Create Tweet',
    method: 'POST',
    url: 'https://sports-hydration-station.us-east-1.sportsplatform.io/client/tweets',
    path: '/client/tweets',
    description: 'Create/store a tweet by its ID',
    headers: [
      { name: 'Content-Type', value: 'application/json' }
    ],
    body: {
      id: '2013869140264554876'
    },
    service: 'Hydration Station'
  }
];

export interface RestSampleContract {
  name: string;
  endpoint: RestEndpoint;
  expectedResponse: any;
  providerState: string;
}

export const restSampleContracts: RestSampleContract[] = [
  {
    name: 'Health Check Returns OK',
    endpoint: hydrationStationEndpoints[0],
    expectedResponse: {
      status: 'ok',
      service: 'hydration-station',
      timestamp: '2024-01-15T10:00:00Z'
    },
    providerState: 'service is healthy'
  },
  {
    name: 'Get Stream Config for Lakers',
    endpoint: hydrationStationEndpoints[1],
    expectedResponse: {
      teamSlug: 'los-angeles-lakers',
      streamEnabled: true,
      rssOutputToggle: false,
      sources: ['twitter', 'instagram'],
      refreshInterval: 60
    },
    providerState: 'stream configuration exists for los-angeles-lakers'
  },
  {
    name: 'Get Tweets by IDs',
    endpoint: hydrationStationEndpoints[2],
    expectedResponse: {
      tweets: [
        {
          id: '2013872487910514691',
          text: 'Lakers win the championship!',
          author: 'NBA',
          createdAt: '2024-01-15T20:00:00Z',
          likes: 15000,
          retweets: 5000
        },
        {
          id: '2013870435138494758',
          text: 'Amazing game tonight!',
          author: 'Lakers',
          createdAt: '2024-01-15T19:45:00Z',
          likes: 8000,
          retweets: 2000
        }
      ]
    },
    providerState: 'tweets with specified IDs exist'
  },
  {
    name: 'Hydrate Tweet from URL',
    endpoint: hydrationStationEndpoints[3],
    expectedResponse: {
      id: '2013836436739379373',
      text: 'NBA highlights from tonight',
      author: 'NBA',
      authorHandle: '@NBA',
      createdAt: '2024-01-15T18:30:00Z',
      likes: 25000,
      retweets: 10000,
      media: [
        {
          type: 'video',
          url: 'https://video.twimg.com/...',
          thumbnailUrl: 'https://pbs.twimg.com/...'
        }
      ],
      hydrated: true
    },
    providerState: 'tweet URL is valid and accessible'
  },
  {
    name: 'Toggle RSS Output Success',
    endpoint: hydrationStationEndpoints[4],
    expectedResponse: {
      success: true,
      teamSlug: 'los-angeles-lakers',
      rssOutputToggle: true,
      programmerOverride: true,
      updatedAt: '2024-01-15T10:00:00Z'
    },
    providerState: 'stream configuration exists for los-angeles-lakers'
  },
  {
    name: 'Create Tweet Success',
    endpoint: hydrationStationEndpoints[5],
    expectedResponse: {
      success: true,
      tweetId: '2013869140264554876',
      status: 'created',
      createdAt: '2024-01-15T10:00:00Z'
    },
    providerState: 'tweet ID is valid and not already stored'
  }
];
