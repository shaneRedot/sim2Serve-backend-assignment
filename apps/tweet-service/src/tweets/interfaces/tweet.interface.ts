export interface TweetResponse {
  id: string;
  content: string;
  authorId: string;
  author?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedTweetsResponse {
  tweets: TweetResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
