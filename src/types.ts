export type PenData = {
  codepen_id: string,
  title: string,
  description: string,
  tags: string[]
  views: number,
  likes: number,
  comments_count: number,
  comments: CodepenComment[]
}

export type CodepenComment = {
  author: string,
  username: string,
  text: string,
  // date: string
}

export type CodepensScrapeData = {
  pens: PenData[],
  total_views: number,
  total_likes: number,
  total_comments: number
};

export type Profile = {
  profile_username: string,
  profile_name?: string | null,
  bio?: string | null,
  location?: string | null,
  profile_picture_url?: string | null,
  website_urls?: string[] | null
}

