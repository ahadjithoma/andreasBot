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

    var switchBoard = new Conversation(robot)

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


    // db -> all standups data -> create cron jobs
    getAllStandupsData()
    function getAllStandupsData() {
        var db = mongoskin.MongoClient.connect(mongodb_uri)
        db.bind('standups').find().toArrayAsync()
            .then(dbData => {
                createCronJobs(dbData)
            })
            .catch(dbError => {

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

    // getStandupData() 
    function getStandupData(standupId) {
        var db = mongoskin.MongoClient.connect(mongodb_uri)

        db.bind('standups').findOneAsync({ _id: standupId })
            .then(standupData => {
                // TODO channel name -> process env 
                var channelMembers = (robot.adapter.client.rtm.dataStore.getChannelByName('general')).members

                channelMembers.forEach(function (id) {
                    var user = robot.brain.userForId(id)
                    if (!user[robot.adapterName].is_bot && !user[robot.adapterName].is_app_user) {
                        startReport(id, standupData, 0)
                    }
                })
            })
            .catch(dbError => {
                robot.logger.error(dbError)
                if (errorChannel != null)
                    robot.messageRoom(errorChannel, `Error in ${path.basename(__filename)} script. Please check the Server Log for more details.`)
            })
    }


    function startReport(userid, standup, qstCnt) {

        var question = standup.questions[qstCnt].text
        var attachmentColor = standup.questions[qstCnt].color
        var questionsNum = standup.questions.length


        //to get the users -> robot.adapter.client.rtm.dataStore.users
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
            if (qstCnt < standup.questions.length) {
                startReport(userid, standup, qstCnt)
            } else {
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