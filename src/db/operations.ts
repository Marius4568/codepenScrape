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
      SELECT totalviews
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
        // If the current total views and the new total views are different, insert new row
        const insertQuery = `
          INSERT INTO views (codepenprofile, totalviews, scrapedate)
          VALUES ($1, $2, $3)
        `;
        const insertValues = [codepenProfile, totalViews, new Date()];
        await pool.query(insertQuery, insertValues);
        console.log(`Successfully inserted new total view count for ${codepenProfile}.`);
      }
    } else {
      // If no rows exist, insert new row
      const insertQuery = `
        INSERT INTO views (codepenprofile, totalviews, scrapedate)
        VALUES ($1, $2, $3)
      `;
      const insertValues = [codepenProfile, totalViews, new Date()];
      await pool.query(insertQuery, insertValues);
      console.log(`Successfully inserted first total view count for ${codepenProfile}.`);
    }
  } catch (error) {
    console.error('Error in updateTotalViewsInDB:', error);
  }
};

export const updatePenViewsInDB = async (codepenProfile: string, pensData: Array<penData>) => {
  try {
    for (let pen of pensData) {
      const selectQuery = `
        SELECT views
        FROM penviews
        WHERE codepenprofile = $1 AND pentitle = $2
        ORDER BY scrapedate DESC
        LIMIT 1
      `;
      const selectValues = [codepenProfile, pen.title];
      const { rows } = await pool.query(selectQuery, selectValues);

      if (rows.length > 0) {
        const currentViews = rows[0].views;

        if (currentViews !== pen.views) {
          // If the current views and the new views are different, insert new row
          const insertQuery = `
            INSERT INTO penviews (codepenprofile, pentitle, views, scrapedate)
            VALUES ($1, $2, $3, $4)
          `;
          const insertValues = [codepenProfile, pen.title, pen.views, new Date()];
          await pool.query(insertQuery, insertValues);
          console.log(`Successfully inserted new view count for pen '${pen.title}' under profile ${codepenProfile}.`);
        }
      } else {
        // If no rows exist, insert new row
        const insertQuery = `
          INSERT INTO penviews (codepenprofile, pentitle, views, scrapedate)
          VALUES ($1, $2, $3, $4)
        `;
        const insertValues = [codepenProfile, pen.title, pen.views, new Date()];
        await pool.query(insertQuery, insertValues);
        console.log(`Successfully inserted first view count for pen '${pen.title}' under profile ${codepenProfile}.`);
      }
    }
  } catch (error) {
    console.error('Error in updatePenViewsInDB:', error);
  }
};
