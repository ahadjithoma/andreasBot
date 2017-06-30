var db = require('./mlab-login.js').db();
var CronJob = require('cron').CronJob;

db.bind('trelloTokens');
db.trelloTokens.find().toArrayAsync().then(dbData => {
    var num = dbData.length;

}).catch(dbError => {

})


var CronJob = require('cron').CronJob;
var job = new CronJob({
    cronTime: '00 30 11 * * 1-5',
    function() {
        console.log('cron job STARTED')
        /*
         * Runs every weekday (Monday through Friday)
         * at 11:30:00 AM. It does not run on Saturday
         * or Sunday.
         */
    },
    function() {
        console.log('cron job FINISHED')
    },
    start: false,
    timeZone: 'America/Los_Angeles'
});
job.start();


var CronJob = require('cron').CronJob;
var job = new CronJob('00 30 11 * * 1-5', function () {
    console.log('cron job STARTED')
    /*
     * Runs every weekday (Monday through Friday)
     * at 11:30:00 AM. It does not run on Saturday
     * or Sunday.
     */
}, function () {
    /* This function is executed when the job stops */
},
    true, /* Start the job right now */
    'Europe/Athens' /* Time zone of this job. */
);