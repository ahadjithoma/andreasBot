var key = process.env.HUBOT_TRELLO_KEY;
var Promise = require('bluebird');
var Trello = require('node-trello');
var message = require('./slackMsgs.js');

module.exports = function (robot) {
    var db = require('./mlab-login.js').db();
    var encryption = require('./encryption.js');
    var CronJob = require('cron').CronJob;
    var job = new CronJob('00 24 19 * * *',

        function () {
            trelloNotifications();
            // db.bind('trelloTokens');
            // db.trelloTokens.find().toArrayAsync().then(dbData => {
            //     var num = dbData.length;
            //     for (let i = 0; i < num; i++) {
            //         var encryptedToken = dbData[i].token;
            //         var userId = dbData[i].id;
            //         var token = encryption.decrypt(encryptedToken);
            //         var trello = Promise.promisifyAll(new Trello(key, token));
            //         trello.getAsync('/1/member/me/notifications').then(trData => {

            //             robot.logger.info(trData.data);
            //         }).catch(trError => {
            //             robot.logger.error(trError);
            //         })
            //     }
            // }).catch(dbError => {

            // })
            // robot.messageRoom('general', 'job started');
            // console.log('cron job B STARTED')

        }
        , function () {
            robot.messageRoom('general', 'job stopped');
            /* This function is executed when the job stops */
        },
        true, /* Start the job right now */
        'Europe/Athens' /* Time zone of this job. */
    );

    // if (db.somewhere == false) { job.stop() }


    /********************* THIS SHOULD GO TO SCHEDULER****************************/
    trelloNotifications();
    function trelloNotifications() {
        robot.logger.info('started')
        db.bind('trelloTokens');
        db.trelloTokens.find().toArrayAsync().then(dbData => {
            var usersNum = dbData.length;
            for (let i = 0; i < usersNum; i++) { // i: the number of authorized trello users
                var encryptedToken = dbData[i].token;
                var token = encryption.decrypt(encryptedToken);
                var trello = Promise.promisifyAll(new Trello(key, token));
                var args = { read_filter: 'unread' }; // get only the unread notifications
                trello.getAsync('/1/member/me/notifications', args).then(notif => {
                    robot.logger.info(notif)
                    var msg = [];
                    let notifNum = notif.length;
                    for (let j = 0; j < notifNum; j++) { // j: the number of notifications per user
                        let attachment = message.attachment()
                        attachment.text = notif[j].type;
                        msg[j]=attachment;
                    }
                    if (notifNum > 0) {
                        let userId = dbData[i].id;
                        robot.messageRoom(userId, msg);
                    }
                }).catch(trError => {
                    robot.logger.error(trError);
                })
            }
        }).catch(dbError => {

        })
    }
    /*****************************************************************************/
}