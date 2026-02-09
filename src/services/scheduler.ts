import cron from 'node-cron';
import Upload from '../models/Upload';
import { User } from 'lucide-react';

export const setupScheduler = (): void => {
  // Run daily at 2 AM to check for pending uploads
  cron.schedule('0 2 * * *', async () => {
    console.log('Running daily cleanup and status check...');

    try {
      const pendingUploads = await Upload.find({ status: 'pending' }).limit(1);

      if (pendingUploads.length > 0) {
        console.log(`Found ${pendingUploads.length} pending upload(s)`);
      }

      // Clean old failed uploads (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedCount = await Upload.deleteMany({
        status: 'failed',
        uploadDate: { $lt: thirtyDaysAgo },
      });

      if (deletedCount.deletedCount > 0) {
        console.log(`Deleted ${deletedCount.deletedCount} old failed uploads`);
      }
    } catch (error) {
      console.error('Error in scheduler:', error);
    }
  });

  // Optional: Run monthly summary (first day of month at 6 AM)
  cron.schedule('0 6 1 * *', async () => {
    console.log('Running monthly summary...');

    try {
      const currentDate = new Date();
      const previousMonth = currentDate.getMonth();
      const previousYear = currentDate.getFullYear();

      const uploads = await Upload.find({
        month: previousMonth,
        year: previousYear,
        status: 'completed',
      });

      console.log(`Monthly Summary - ${previousMonth}/${previousYear}:`);
      console.log(`Total uploads: ${uploads.length}`);

      const totalNames = uploads.reduce((sum, u) => sum + u.totalNames, 0);
      console.log(`Total names screened: ${totalNames}`);
    } catch (error) {
      console.error('Error in monthly summary:', error);
    }
  });

  console.log('Scheduler initialized');
};




// async function creditUser(userId: string, paymentReference: string, amount: number) {
//   const user = await User.findById(userId)
//   //find user by id
//   if (!user) {
//     throw new Error("User does not exist"
//   }

//   //credit user with amount
//   user.balance += amount
//   await user.save()

//   // create a payment record

//   const Record = await PaymentRecord.create({
//     user: user._id,
//     paymentReference,
//     amount,
//     status: 'success',
//     date: new Date(),
//     method: 'credit',
//     status: 'success'
//   })

//   return Record
// }

