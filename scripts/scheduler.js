module.exports = function (robot) {
    var db = require('./mlab-login.js').db();

    db.bind('trelloTokens');
    db.trelloTokens.find().toArrayAsync().then(dbData => {
        var num = dbData.length;

    }).catch(dbError => {

    })


    var CronJob = require('cron').CronJob;
    var job = new CronJob('00 23 03 * * *', function () {
        robot.messageRoom('general', 'job started');
        console.log('cron job B STARTED')
        job.stop();
        /*
         * Runs every weekday (Monday through Friday)
         * at 11:30:00 AM. It does not run on Saturday
         * or Sunday.
         */
    }, function () {
        robot.messageRoom('general', 'job stopped');
        console.log('cron job B FINISHED')
        /* This function is executed when the job stops */
    },
        true, /* Start the job right now */
        'Europe/Athens' /* Time zone of this job. */
    );
    
job.start()
}