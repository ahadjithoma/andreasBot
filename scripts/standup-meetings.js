'use strict'

const Conversation = require('hubot-conversation');
var CronJob = require('cron').CronJob;
var db = require('./mlab-login.js').db();
var errorChannel = process.env.HUBOT_ERRORS_CHANNEL;

var path = require("path");


module.exports = function (robot) {


    var job = new CronJob('30 * 24 * * *', // note that heroku free plan is not running 24/7
        function () { getStandupData() },
        function () { return null; }, /* This function is executed when the job stops */
        false, /* Start the job right now */
        'Europe/Athens' /* Time zone of this job. */
    );


    // getStandupData();
    function getStandupData() {
        db.bind('standups');
        db.standups.find().toArrayAsync().then(dbData => {
            startReport(dbData);
        }).catch(err => {
            robot.logger.error(err);
            if (errorChannel != null)
                robot.messageRoom(errorChannel, `Error in ${path.basename(__filename)} script. Please check the Server Log for more details.`)
        })
    }

    function startReport(data) {
        console.log(data);
        var i = 0;
        var j = 0;
        var channel = data[i]['broadcast-channel'];
        var standupName = data[i]['standup-name'];
        var question = data[i].questions[j];
        var questionsNum = data[i].questions.length;

        var funcArray = [];
        var q = { questions: ["first", "second"] }

        for (var j = 0; j < questionsNum; j++) {
            funcArray[j] = function (done) {conv(q.questions[j], done)}
        }
        //to get the users -> robot.adapter.client.rtm.dataStore.users
        var userId = 'U514U4XDF' 
        //TODO: userId ^^^ must change
        robot.messageRoom(userId, question);

        var eventName = 'standup_report'
        var handled = robot.emit('event-api.ai', eventName, userId);
        if (!handled) {
            // TODO
        }
    }

    function conv(question, done) {
        var dialog = switchBoard.startDialog(msg, 5 * 5000);
        msg.reply(question)

        dialog.addChoice(/(.*)/i, function (msg2) {
            msg2.reply('ok')
            done()
        });
    }




    robot.on('standup.create', function (data, res) {
        createStandup(data);
    })

    robot.on('standup.report', function (data, res) {
        console.log(data);
        // save the report
        // TODO

        // check if there are any remaining questions


        // post question || post end message 
        // TODO
    })

    function createStandup(data) {
        var db = require('./mlab-login.js').db();
        db.bind('standups');
    }

    function createCronJob(data) {

        var hours = 19; //data... 
        var minutes = 18; //data...
        var dates = '1-5';//data...


        // check if standup feature is enabled
        db.bind('settings');
        db.settings.findOneAsync({ "_id": "settings_doc" }).then(dbData => {
            console.log(dbData)
            if (dbData.standups) {
                job.start();
            } else {
                job.stop();
            }
        }).catch(dbError => {
            robot.logger.info(dbError)
        });
    }




    var type = 'user' //Type parameter can take one of two values: user (default) or room 
    var switchBoard = new Conversation(robot, type);

    robot.respond(/setup standup/, function (res) {
        var timeout = 1000 * 60; //60 seconds timeout. Default = 30 sec
        var dialog = switchBoard.startDialog(res, timeout);
        res.reply('Sure, please give me the *name* of your new standup');

        dialog.addChoice(/([a-zA-Z0-9$-/:-?{-~!"^_`\[\]]+)/g, function (res) {
            var name = res.match[1];
            res.reply('name = ' + name);
        });
    });
}