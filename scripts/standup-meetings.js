'use strict'

const Conversation = require('./hubot-conversation/index.js')
var slackMsg = require('./slackMsgs.js')
var cache = require('./cache.js').getCache()
var c = require('./config.json')
var CronJob = require('cron').CronJob
var path = require("path")
var dateFormat = require('dateformat')
var Promise = require('bluebird')
var mongoskin = require('mongoskin')
Promise.promisifyAll(mongoskin)

// config
var mongodb_uri = process.env.MONGODB_URI
var errorChannel = process.env.HUBOT_ERRORS_CHANNEL || null

module.exports = function (robot) {

    initDefaultStandup()

    /*************************************************************************/
    /*                            Listeners                                  */
    /*************************************************************************/
    var switchBoard = new Conversation(robot)

    robot.respond(/(start|begin|trigger|report) standup/i, function (res) {

    })
    robot.respond(/ standup /i, function (res) {

    })
    robot.respond(/ standup /i, function (res) {

    })
    robot.respond(/ standup /i, function (res) {

    })
    robot.respond(/ standup /i, function (res) {

    })


    // when updating existing standups CronJobs or adding new ones -> should fire this listener here to  get the updated/new cronjobs
    robot.on(/updateStandupsCronJobs/, function (res) {
        // stop all the previous jobs and reset them 
        Promise.each(Object.keys(cronJobs),
            function (standupName) {
                cronJobs[standupName].stop()
            })
            .catch(err => {
                console.log(err)
            })
            .done(() => {
                console.log('done')
                getAllStandupsData()
            })

    })


    /*************************************************************************/
    /*                                                                       */
    /*************************************************************************/
    function getCronDay(day) {
        if (!day) {
            return -1;
        }
        return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(day.toLowerCase().substring(0, 3));
    }

    function getDayName(cronDay) {
        var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        for (var i = 0; i < 7; i++) {
            cronDay = cronDay.replace(i, days[i])
        }
        return cronDay
    }

    function isTtimeValid(time) {
        var validateTimePattern;
        validateTimePattern = /([01]?[0-9]|2[0-4]):[0-5]?[0-9]/;
        return validateTimePattern.test(time);
    }

    /*************************************************************************/
    /*                                                                       */
    /*************************************************************************/

    function initDefaultStandup() {
        var db = mongoskin.MongoClient.connect(mongodb_uri)
        db.bind('standups').insertAsync(c.defaultStandup)
            .then(data => {
            })
            .catch(error => {
                if (error.code != 11000) {
                    robot.logger.error(error)
                    if (c.errorsChannel) {
                        robot.messageRoom(c.errorsChannel, c.errorMessage + `Script: ${path.basename(__filename)}`)
                    }
                }

            })
    }



    // db -> all standups data -> create cron jobs
    getAllStandupsData()
    function getAllStandupsData() {
        var db = mongoskin.MongoClient.connect(mongodb_uri)
        db.bind('standups').find().toArrayAsync()
            .then(dbData => {
                createCronJobs(dbData)
            })
            .catch(dbError => {
                //TODO
            })
    }


    // standup Data -> cronJobs
    // -> getStandup data() -> provide standup id
    // fetchStandupsDbData() <-> robot.on in case of new standup 
    var cronJobs = {}
    function createCronJobs(data) {
        data.forEach(function (standup) {
            var days = standup.days
            var time = standup.time.split(':')
            var standupId = standup._id
            // TODO days
            cronJobs[standup.name] = new CronJob(`${time[2]} ${time[1]} ${time[0]} * * ${days}`, /* ss mm hh daysOfMonth MM daysOFWeek */
                function () { getStandupData(standupId) },   /* This function is executed when the job starts */
                function () { return null },               /* This function is executed when the job stops */
                true,           /* Start the job right now */
                'Europe/Athens' /* Time zone of this job. */
            )
        })
    }

    // Whenever providing a userid parameter, the standup excecutes for the specific user only. 
    // Otherwise is escecuted for all the users that belong to specified channel
    function getStandupData(standupId, userid = null) {
        var db = mongoskin.MongoClient.connect(mongodb_uri)

        db.bind('standups').findOneAsync({ _id: standupId })
            .then(standupData => {
                if (!userid) {
                    var channelMembers = (robot.adapter.client.rtm.dataStore.getChannelByName(standupData.channel)).members

                    channelMembers.forEach(function (id) {
                        var user = robot.brain.userForId(id)
                        if (!user[robot.adapterName].is_bot && !user[robot.adapterName].is_app_user) {
                            startReport(id, standupData, 0)
                        }
                    })
                }
                else {
                    startReport(userid, standupData, 0)
                }
            })
            .catch(dbError => {
                robot.logger.error(dbError)
                if (c.errorsChannel) {
                    robot.messageRoom(c.errorsChannel, c.errorMessage
                        + `Script: ${path.basename(__filename)}`)
                }
            })
    }


    function startReport(userid, standup, qstCnt) {

        var question = standup.questions[qstCnt].text
        var attachmentColor = standup.questions[qstCnt].color
        var questionsNum = standup.questions.length

        var msg = {
            message: {
                user: { id: userid }
            },
            reply(text) {
                robot.messageRoom(userid, text)
            }
        }

        var timeout = c.standups.timeout
        var dialog = switchBoard.startDialog(msg, timeout)
        msg.reply(`*${standup.name}* ${question}`)
        var regex = new RegExp(robot.name + " (.*)", "i")
        dialog.addChoice(regex, function (msg2) {

            var answer = msg2.match[1]

            // save the answer in cache
            cache.union(`${userid}.${standup.name}`, { q: question, a: answer, c: attachmentColor })

            // move to next question 
            dialog.finish()
            qstCnt++
            if (['cancel', 'stop', 'abort', 'exit', 'quit'].includes(answer)) {
                robot.messageRoom(userid, 'You have cancelled the standup report. You can start whenever you want by saing `start standup`. ')
                return 0
            }
            else if (qstCnt < standup.questions.length) {
                startReport(userid, standup, qstCnt)
            }
            else {
                var user = robot.brain.userForId(userid).real_name
                var username = robot.brain.userForId(userid).name

                var reportMsg = { attachments: [] }
                var report = cache.data[userid][standup.name]

                msg.reply(`Thanks for reporting on ${standup.name} standup! Keep up the good work :wink:`)

                Promise.each(report, function (element) {
                    var attachment = slackMsg.attachment()
                    attachment.title = element.q
                    attachment.text = element.a
                    attachment.color = element.c
                    reportMsg.attachments.push(attachment)
                }).then(() => {
                    var date = dateFormat(new Date(), "dd/mm/yyyy")
                    reportMsg.text = `*${user}* (${username}) posted a status update for *${date}* on *${standup.name}* standup`
                    robot.messageRoom(standup.channel, reportMsg)
                }).catch(err => {
                    console.log(err)
                })


                // TODO (Feature): Save in DB

                // delete after save in DB
                delete cache.data[userid][standup.name]
            }
        })
    }

}