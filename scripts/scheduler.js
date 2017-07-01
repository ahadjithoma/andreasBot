var key = process.env.HUBOT_TRELLO_KEY;
var Promise = require('bluebird');
var Trello = require('node-trello');
var slackmsg = require('./slackMsgs.js');

module.exports = function (robot) {
    var db = require('./mlab-login.js').db();
    var encryption = require('./encryption.js');
    var CronJob = require('cron').CronJob;
    var job = new CronJob('00 54 14 * * *', function () {
        db.bind('trelloTokens');
        db.trelloTokens.find().toArrayAsync().then(dbData => {
            var num = dbData.length;
            for (let i = 0; i < num; i++) {
                var encryptedToken = dbData[i].token;
                var userId = dbData[i].id;
                var token = encryption.decrypt(encryptedToken);
                var trello = Promise.promisifyAll(new Trello(key, token));
                trello.getAsync('/1/member/me/notifications').then(trData => {
                                    let msg = slackmsg.attachmentMsg();

                    robot.logger.info(trData.data);
                }).catch(trError => {
                    robot.logger.error(trError);
                })
            }
        }).catch(dbError => {

        })
        robot.messageRoom('general', 'job started');
        console.log('cron job B STARTED')

    }, function () {
        robot.messageRoom('general', 'job stopped');
        /* This function is executed when the job stops */
    },
        true, /* Start the job right now */
        'Europe/Athens' /* Time zone of this job. */
    );

    // if (db.somewhere == false) { job.stop() }


    trelloNotifications();
    /********************* THIS SHOULD GO TO SCHEDULER****************************/
    function trelloNotifications() {
        db.bind('trelloTokens');
        db.trelloTokens.find().toArrayAsync().then(dbData => {
            var num = dbData.length;
            for (let i = 0; i < num; i++) {
                var encryptedToken = dbData[i].token;
                var userId = dbData[i].id;
                var token = encryption.decrypt(encryptedToken);
                var trello = Promise.promisifyAll(new Trello(key, token));
                var args = { read_filter: 'unread' }; // get only the unread notifications
                trello.getAsync('/1/member/me/notifications', args).then(trData => {
                    robot.logger.info(trData);
                    robot.logger.error(trData['data']);
                    robot.logger.warning(trData[0].data);
                }).catch(trError => {
                    robot.logger.error(trError);
                })
            }
        }).catch(dbError => {

        })
    }
    /*****************************************************************************/
}