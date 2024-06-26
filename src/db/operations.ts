import { pool } from './db';
import Logger from '../logger';
import { Profile, CodepenComment, PenData, CodepensScrapeData } from '../types';

export const updateDBDataWithScrapedData = async (profile: Profile, codepensScrapeData: CodepensScrapeData) => {
  //TODO: perform these actions in transaction
  // 1)update or create codepen profile
  // 2)add profiles total_views history
  // 3)add profiles total_likes history
  // 4)add profiles _c history
  // 5)update or create codepens
  // a) add codepens history
  // b) update tags table
  // b2) update codepen_tags table
  // c) update codepen_comment table


  const { pens, total_views, total_likes, total_comments } = codepensScrapeData;
  const { profile_username, profile_name = null, bio = null, location = null, profile_picture_url = null, website_urls = null } = profile;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Update or create codepen profile
    await client.query(`
      INSERT INTO public.codepen_profile (profile_username, profile_name, bio, location, profile_picture_url, website_urls, total_codepen_views, total_likes, total_comments)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (profile_username) DO UPDATE SET 
        profile_name = EXCLUDED.profile_name,
        bio = EXCLUDED.bio,
        location = EXCLUDED.location,
        profile_picture_url = EXCLUDED.profile_picture_url,
        website_urls = EXCLUDED.website_urls,
        total_codepen_views = EXCLUDED.total_codepen_views,
        total_likes = EXCLUDED.total_likes,
        total_comments = EXCLUDED.total_comments,
        date_modified = CURRENT_TIMESTAMP
    `, [profile_username, profile_name, bio, location, profile_picture_url, website_urls, total_views, total_likes, total_comments]);

    // 2. Add profiles total views history
    await client.query(`
      INSERT INTO public.profile_codepen_total_views_history (codepen_profile_username, total_views)
      VALUES ($1, $2)
    `, [profile_username, total_views]);

    // 3. Add profiles total likes history
    await client.query(`
      INSERT INTO public.profile_codepen_total_likes_history (codepen_profile_username, total_likes)
      VALUES ($1, $2)
    `, [profile_username, total_likes]);

    // 4. Add profiles total comments history
    await client.query(`
      INSERT INTO public.profile_codepen_total_comments_history (codepen_profile_username, total_comments)
      VALUES ($1, $2)
    `, [profile_username, total_comments]);

    for (const pen of pens) {
      const { codepen_id, title, description, tags, views, likes, comments_count, comments } = pen;

      // 5. Update or create codepens
      await client.query(`
        INSERT INTO public.codepen (codepen_id, author_username, title, description, views_count, likes_count, comments_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (codepen_id) DO UPDATE SET
          author_username = EXCLUDED.author_username,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          views_count = EXCLUDED.views_count,
          likes_count = EXCLUDED.likes_count,
          comments_count = EXCLUDED.comments_count,
          date_modified = CURRENT_TIMESTAMP
      `, [codepen_id, profile_username, title, description, views, likes, comments_count]);

      // 5a. Add codepens history
      await client.query(`
        INSERT INTO public.codepen_history (codepen_id, codepen_profile_username, views, likes, comments)
        VALUES ($1, $2, $3, $4, $5)
      `, [codepen_id, profile_username, views, likes, comments_count]);

      // 5b. Update tags table
      const tagFrequencyMap = new Map();
      for (const tagName of tags) {
        await client.query(`
          INSERT INTO public.tags (tag_name)
          VALUES ($1)
          ON CONFLICT (tag_name) DO NOTHING
        `, [tagName]);
      }

      // 5b2. Update codepen_tags table
      for (const tagName of tags) {
        const res = await client.query(`
          SELECT tag_id FROM public.tags WHERE tag_name = $1
        `, [tagName]);

        const tagId = res.rows[0].tag_id;

        await client.query(`
          INSERT INTO public.codepen_tags (codepen_id, tag_id)
          VALUES ($1, $2)
          ON CONFLICT (codepen_id, tag_id) DO NOTHING
        `, [codepen_id, tagId]);
      }

      // 5c. Update codepen_comment table
      for (const comment of comments) {
        await client.query(`
          INSERT INTO public.codepen_comment (codepen_id, author_username, comment_text)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [codepen_id, comment.username, comment.text]);
      }
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export const fetchUserTotalViews = async (codepenProfile: string): Promise<number | undefined> => {
  try {
    const query = `
      SELECT total_views
      FROM profile_codepen_total_views_history
      WHERE codepen_profile_username = $1
      ORDER BY date_created DESC
      LIMIT 1;
    `;
    const values = [codepenProfile];
    const { rows } = await pool.query(query, values);
    return rows.length > 0 ? rows[0].total_views : 0;
  } catch (error) {
    Logger.error('Error in fetchUserTotalViews:', error);
    return undefined;
  }
};

export const fetchUserTotalLikes = async (codepenProfile: string): Promise<number | undefined> => {
  try {
    const query = `
      SELECT total_likes
      FROM profile_codepen_total_likes_history
      WHERE codepen_profile_username = $1
      ORDER BY date_created DESC
      LIMIT 1;
    `;
    const values = [codepenProfile];
    const { rows } = await pool.query(query, values);
    return rows.length > 0 ? rows[0].total_likes : 0;
  } catch (error) {
    Logger.error('Error in fetchUserTotalLikes:', error);
    return undefined;
  }
};

export const fetchUserTotalComments = async (codepenProfile: string): Promise<number | undefined> => {
  try {
    const query = `
      SELECT total_comments
      FROM profile_codepen_total_comments_history
      WHERE codepen_profile_username = $1
      ORDER BY date_created DESC
      LIMIT 1;
    `;
    const values = [codepenProfile];
    const { rows } = await pool.query(query, values);
    return rows.length > 0 ? rows[0].total_comments : 0;
  } catch (error) {
    Logger.error('Error in fetchUserTotalComments:', error);
    return undefined;
  }
};


export const fetchUserCodepens = async (authorUsername: string) => {
  try {
    const query = `
      SELECT codepen_id, title, description, views_count, likes_count, comments_count, date_created, date_modified
      FROM codepen
      WHERE author_username = $1
      ORDER BY date_created DESC;
    `;
    const values = [authorUsername];
    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    console.error('Error in fetchUserCodepens:', error);
    return [];
  }
};
