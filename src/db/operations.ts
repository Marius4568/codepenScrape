import { pool } from './db';
import { penData } from '../email/operations';

export const fetchPreviousPenViews = async (codepenProfile: string) => {
  try {
    const query = `
      SELECT v.pentitle, v.views
      FROM penviews v
      INNER JOIN (
        SELECT pentitle, MAX(scrapedate) as latestscrapedate
        FROM penviews
        WHERE codepenprofile = $1
        GROUP BY pentitle
      ) as subQuery
      ON v.pentitle = subQuery.pentitle AND v.scrapedate = subQuery.latestscrapedate
      ORDER BY latestscrapedate DESC
    `;
    const values = [codepenProfile];
    const { rows } = await pool.query(query, values);
    let previousViewsObj: Record<string, number> = {};
    rows.forEach((row: any) => (previousViewsObj[row.pentitle] = row.views));
    return previousViewsObj;
  } catch (error) {
    console.error('Error in fetchPreviousPenViews:', error);
    return {}; // return an empty object in case of an error
  }
};

export const fetchPreviousTotalViews = async (codepenProfile: string) => {
  try {
    const query = `
      SELECT totalviews
      FROM views
      WHERE codepenprofile = $1
      ORDER BY scrapedate DESC
      LIMIT 1
    `;
    const values = [codepenProfile];
    const { rows } = await pool.query(query, values);
    return rows.length > 0 ? rows[0].totalviews : 0;
  } catch (error) {
    console.error('Error in fetchPreviousTotalViews:', error);
  }
};

export const updateTotalViewsInDB = async (codepenProfile: string, totalViews: number) => {
  try {
    const selectQuery = `
      SELECT totalviews, scrapedate
      FROM views
      WHERE codepenprofile = $1
      ORDER BY scrapedate DESC
      LIMIT 1
    `;
    const selectValues = [codepenProfile];
    const { rows } = await pool.query(selectQuery, selectValues);

    if (rows.length > 0) {
      const currentTotalViews = rows[0].totalviews;

      if (currentTotalViews !== totalViews) {
        const updateQuery = `
          UPDATE views
          SET totalviews = $1, scrapedate = $2
          WHERE codepenprofile = $3 AND scrapedate = (
            SELECT MAX(scrapedate) 
            FROM views 
            WHERE codepenprofile = $3
          )
        `;
        const updateValues = [totalViews, new Date(), codepenProfile];
        await pool.query(updateQuery, updateValues);
      }
    } else {
      const insertQuery = `
        INSERT INTO views (codepenprofile, totalviews, scrapedate)
        VALUES ($1, $2, $3)
      `;
      const insertValues = [codepenProfile, totalViews, new Date()];
      await pool.query(insertQuery, insertValues);
    }
  } catch (error) {
    console.error('Error in updateTotalViewsInDB:', error);
  }
};



export const updatePenViewsInDB = async (codepenProfile: string, pensData: Array<penData>) => {
  try {
    for (let pen of pensData) {
      const query = `
        SELECT id, views
        FROM penviews
        WHERE codepenprofile = $1 AND pentitle = $2
        ORDER BY scrapedate DESC
        LIMIT 1
      `;
      const values = [codepenProfile, pen.title];
      const { rows } = await pool.query(query, values);

      if (rows.length === 0 || rows[0].views !== pen.views) {
        if (rows.length > 0) {
          // Update existing row
          const updateQuery = `
            UPDATE penviews
            SET views = $1
            WHERE id = $2
          `;
          await pool.query(updateQuery, [pen.views, rows[0].id]);
        } else {
          // Insert new row
          const insertQuery = `
            INSERT INTO penviews (codepenprofile, pentitle, views)
            VALUES ($1, $2, $3)
          `;
          await pool.query(insertQuery, [codepenProfile, pen.title, pen.views]);
        }
      }
    }
  } catch (error) {
    console.error('Error in updatePenViewsInDB:', error);
  }
};
