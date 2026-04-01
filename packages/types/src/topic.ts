export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  isFollowed?: boolean;
  followerCount: number;
}

export interface TopicFollow {
  topicId: string;
  userId: string;
  followedAt: string;
}
