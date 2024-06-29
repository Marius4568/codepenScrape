import sendGrid from '@sendgrid/mail';
import Logger from '../logger';


interface PenInteractionData {
    codepen_id: string;
    title: string;
    new_views: number;
    new_likes: number;
    new_comments: number;
    total_views: number;
    total_likes: number;
    total_comments: number;
}
interface NotificationData {
    totalViews: number;
    previousTotalViews: number;
    totalLikes: number;
    previousTotalLikes: number;
    totalComments: number;
    previousTotalComments: number;
    penInteractions: PenInteractionData[];
}

export const sendNewCodePenChangedDataNotification = async ({
    totalViews,
    previousTotalViews,
    totalLikes,
    previousTotalLikes,
    totalComments,
    previousTotalComments,
    penInteractions
}: NotificationData) => {
    if (!process.env.SENDGRID_API_KEY || !process.env.RECEIVER_EMAIL || !process.env.SENDER_EMAIL) {
        throw new Error("SENDGRID_API_KEY, RECEIVER_EMAIL and SENDER_EMAIL must be defined in environment variables");
    }
    sendGrid.setApiKey(process.env.SENDGRID_API_KEY);

    Logger.info('Starting notification process');
    Logger.info(`Total Views: ${totalViews}, Previous Total Views: ${previousTotalViews}`);
    Logger.info(`Total Likes: ${totalLikes}, Previous Total Likes: ${previousTotalLikes}`);
    Logger.info(`Total Comments: ${totalComments}, Previous Total Comments: ${previousTotalComments}`);

    let penUpdatesText = "";

    penInteractions.forEach(pen => {
        if (pen.new_views > 0) {
            penUpdatesText += `<li>Pen "${pen.title}" has <strong>${pen.new_views}</strong> new views (total: ${pen.total_views} views).</li>`;
        }
        if (pen.new_likes > 0) {
            penUpdatesText += `<li>Pen "${pen.title}" has <strong>${pen.new_likes}</strong> new likes (total: ${pen.total_likes} likes).</li>`;
        }
        if (pen.new_comments > 0) {
            penUpdatesText += `<li>Pen "${pen.title}" has <strong>${pen.new_comments}</strong> new comments (total: ${pen.total_comments} comments).</li>`;
        }
    });

    console.log(penInteractions, 'interactions', penUpdatesText, 'updates text')

    if (penUpdatesText.length > 0 || previousTotalLikes < totalLikes || previousTotalViews < totalViews || previousTotalComments < totalComments) { // If any pen has new views, likes, or comments
        const emailMessage = {
            to: process.env.RECEIVER_EMAIL,
            from: process.env.SENDER_EMAIL,
            subject: 'You have new interactions on your CodePens!',
            text: `You have ${totalViews - previousTotalViews} new views, ${totalLikes - previousTotalLikes} new likes, and ${totalComments - previousTotalComments} new comments.\n\nYour pens interactions:\n${penUpdatesText}\nYour total views are now: ${totalViews}, total likes: ${totalLikes}, total comments: ${totalComments}`,
            html: `<p>You have <strong>${totalViews - previousTotalViews}</strong> new views, <strong>${totalLikes - previousTotalLikes}</strong> new likes, and <strong>${totalComments - previousTotalComments}</strong> new comments.</p>
           <ul>${penUpdatesText}</ul>
           <p>Your total views are now: <strong>${totalViews}</strong>, total likes: <strong>${totalLikes}</strong>, total comments: <strong>${totalComments}</strong></p>`,
        };
        try {
            Logger.info('Sending email notification...');
            await sendGrid.send(emailMessage);
            Logger.info(`Sent email to ${process.env.RECEIVER_EMAIL}!`);
        } catch (err) {
            Logger.error(`Couldn't send the email encountered error: ${err}`);
        }
    } else {
        Logger.info('No new views, likes, or comments to report.');
    }
};