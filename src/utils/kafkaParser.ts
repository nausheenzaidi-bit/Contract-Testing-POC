export interface KafkaMessage {
  name: string;
  description: string;
  provider: string;
  consumer: string;
  topic: string;
  messageSchema: any;
  pactRules?: any;
  direction: 'produces' | 'consumes';
}

export const hydrationStationKafkaMessages: KafkaMessage[] = [
  {
    name: 'Social Media Tweet',
    description: 'Hydration Station publishes tweets to BMM for indexing',
    provider: 'sports-hydration-station-go',
    consumer: 'bmm-service',
    topic: 'bmm.socialmedia.v4',
    direction: 'produces',
    messageSchema: {
      entity_class: 46,
      id: {
        id: '1672589658990026755',
        namespace: 'urn:wbd:identifier:hydration-station:socialmedia-id'
      },
      text: 'The Celtics win the championship!',
      author_id: '123456789',
      external_url: 'https://twitter.com/celtics/status/1672589658990026755',
      created_date_time: '2024-11-10T22:00:00Z',
      last_modified_date_time: '2024-11-10T22:00:00Z',
      hashtags: [
        { text: 'Celtics' },
        { text: 'NBA' }
      ],
      tweet: {
        tweet_type: 1,
        tweet_author: {
          username: 'celtics',
          name: 'Boston Celtics',
          verified: true,
          profile_image_url: 'https://pbs.twimg.com/profile_images/...'
        }
      }
    },
    pactRules: {
      entity_class: { match: 'integer', value: 46 },
      'id.namespace': { match: 'regex', regex: '^urn:wbd:identifier:' },
      text: { match: 'type' },
      created_date_time: { match: 'iso8601' }
    }
  },
  {
    name: 'Content Command',
    description: 'Hydration Station tells BMM to create Content Module with tags',
    provider: 'sports-hydration-station-go',
    consumer: 'bmm-service',
    topic: 'bmm.contentcommand.v4',
    direction: 'produces',
    messageSchema: {
      command_type: 1,
      commanded_entity_class: 46,
      content_id: {
        id: '1672589658990026755',
        namespace: 'urn:wbd:identifier:hydration-station:socialmedia-id'
      },
      entity_class: 49,
      id: {
        id: 'boston-celtics_1672589658990026755',
        namespace: 'urn:wbd:identifier:hydration-station:contentcommand-id'
      },
      taxonomy_reference_groups: [
        {
          kind: 'Team',
          taxonomy_references: [
            {
              taxonomy_id: {
                id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                namespace: 'urn:wbd:identifier:sp-cms:taxonomy-id'
              }
            }
          ]
        }
      ],
      created_date_time: '2024-11-10T22:00:00Z',
      last_modified_date_time: '2024-11-10T22:00:00Z'
    },
    pactRules: {
      command_type: { match: 'integer', value: 1 },
      entity_class: { match: 'integer', value: 49 },
      commanded_entity_class: { match: 'integer', oneOf: [46, 47] }
    }
  },
  {
    name: 'Social Media Article (RSS)',
    description: 'Hydration Station publishes RSS articles to BMM',
    provider: 'sports-hydration-station-go',
    consumer: 'bmm-service',
    topic: 'bmm.socialmedia.v4',
    direction: 'produces',
    messageSchema: {
      entity_class: 47,
      id: {
        id: 'aHR0cHM6Ly9leGFtcGxlLmNvbS9hcnRpY2xl',
        namespace: 'urn:wbd:identifier:hydration-station:socialmedia-id'
      },
      text: 'Breaking: Major trade announcement',
      author_id: 'rss-feed-espn',
      external_url: 'https://example.com/article',
      created_date_time: '2024-11-10T22:00:00Z',
      last_modified_date_time: '2024-11-10T22:00:00Z',
      external_article: {
        headline: 'Breaking: Major trade announcement',
        host_site: 'example.com'
      }
    },
    pactRules: {
      entity_class: { match: 'integer', value: 47 },
      'id.id': { match: 'regex', regex: '^[A-Za-z0-9_-]+$' },
      'external_article.host_site': { match: 'type' }
    }
  },
  {
    name: 'Talkwalker Social Events',
    description: 'Hydration Station consumes social media events from Talkwalker',
    provider: 'talkwalker-api',
    consumer: 'sports-hydration-station-go',
    topic: 'talkwalker.social.events',
    direction: 'consumes',
    messageSchema: {
      id: 'tw_12345678',
      type: 'tweet',
      url: 'https://twitter.com/user/status/1672589658990026755',
      text: 'Breaking news about the game!',
      author: {
        name: 'Sports Reporter',
        handle: '@sportsreporter'
      },
      published_at: '2024-11-10T22:00:00Z',
      engagement: {
        likes: 1234,
        retweets: 567
      }
    },
    pactRules: {
      type: { match: 'regex', regex: '^(tweet|article|post)$' },
      url: { match: 'regex', regex: '^https?://' },
      published_at: { match: 'iso8601' }
    }
  }
];

export interface KafkaContractSample {
  message: KafkaMessage;
  providerState: string;
}

export const kafkaSampleContracts: KafkaContractSample[] = hydrationStationKafkaMessages.map(msg => ({
  message: msg,
  providerState: msg.direction === 'produces' 
    ? `${msg.provider} can produce valid ${msg.name} messages`
    : `${msg.consumer} can consume ${msg.name} messages from ${msg.provider}`
}));

export const kafkaConstants = {
  entity_classes: {
    SocialMediaTweet: 46,
    SocialMediaExternalArticle: 47,
    ContentCommand: 49
  },
  command_types: {
    Create: 1
  },
  tweet_types: {
    Original: 1,
    Reply: 2,
    Quote: 3,
    Retweet: 4
  },
  namespaces: {
    socialmedia_id: 'urn:wbd:identifier:hydration-station:socialmedia-id',
    contentcommand_id: 'urn:wbd:identifier:hydration-station:contentcommand-id',
    taxonomy_id: 'urn:wbd:identifier:sp-cms:taxonomy-id'
  }
};
