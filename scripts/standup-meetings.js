'use strict'

const Conversation = require('./hubot-conversation/index.js')
var slackMsg = require('./slackMsgs.js')
var cache = require('./cache.js').getCache()
var c = require('./config.json')
var CronJob = require('cron').CronJob
var path = require("path")
var async = require('async')
var dateFormat = require('dateformat')
var Promise = require('bluebird')
var mongoskin = require('mongoskin')
Promise.promisifyAll(mongoskin)

// config
var mongodb_uri = process.env.MONGODB_URI
var errorChannel = process.env.HUBOT_ERRORS_CHANNEL || null

module.exports = function (robot) {

    // init standups
    async.series([
        function (done) {
            initDefaultStandup()
            done()
        },
        function (done) {
            getAllStandupsData()
        }
    ])

    /*************************************************************************/
    /*                            Listeners                                  */
    /*************************************************************************/
    var switchBoard = new Conversation(robot)

    robot.respond(/(start|begin|trigger|report) (standup|report)/i, function (res) {
        getStandupData('defaultStandup', res.message.user.id)
    })

    // triggers a standup for everyone
    robot.hear(/(start|begin|trigger|report) (standup|report)/i, function (res) {
        getStandupData('defaultStandup')
    })

    robot.respond(/(show|view|get) standups?/i, function (res) {
        showStandups(res.message.user.id)
    })

    robot.respond(/(edit|change|modify|update) standup time ?t?o? (.*)/i, function (res) {
        var time = res.match[2].trim()
        var userid = res.message.user.id
        if (!isTimeValid(time)) {
            res.reply('Sorry but this is not a valid time. Try again using this `HH:MM` format.')
        } else {
            updateTime(userid, 'defaultStandup', time)
            robot.messageRoom('Ok, I have updated it.')
        }

    })

    robot.respond(/(edit|change|modify|update) standup days ?t?o? (.*)/i, function (res) {
        // trim and replace spaces
        var days = res.match[2].trim().replace(/\s/g, '');
        var userid = res.message.user.id
        var cronDays = getCronDays(days)
        if (!isCronDaysValid(cronDays)) {
            res.reply('Sorry but this is not a valid input. Try again someting like `Monday, Wednesday - Friday`.')
        } else {
            updateDays(userid, 'defaultStandup', cronDays)
        }
    })

    robot.respond(/(pause|deactivate|disable) standup/i, function (res) {
        var userid = res.message.user.id
        updateStandupStatus(userid, 'defaultStandup', false)
    })

    robot.respond(/(resume|activate|enable) standup/i, function (res) {
        var userid = res.message.user.id
        updateStandupStatus(userid, 'defaultStandup', true)
    })



    function enableStandup() { }

    robot.respond(/time (.*)/i, function (res) {
        console.log(isTimeValid(res.match[1]))
    })


    robot.on(/updateStandupsCronJobs/, function (res) {
        updateStandupsCronJobs()
    })




    /*************************************************************************/
    /*                                                                       */
    /*************************************************************************/


    function getCronDays(days) {
        var daysArray = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        for (var i = 0; i < 7; i++) {
            days = days.replace(daysArray[i], i)
            days = days.replace(daysArray[i].substring(0, 3), i)
        }
        return days
    }

    function getDaysNames(cronDay) {
        var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        for (var i = 0; i < 7; i++) {
            cronDay = cronDay.replace(i, days[i])
        }
        return cronDay
    }

    function isTimeValid(time) {
        var validateTimePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/
        return validateTimePattern.test(time);
    }


    function isCronDaysValid(days) {
        var validateDayPattern = /^[^a-zA-Z]+$/
        return validateDayPattern.test(days);
    }


    /*************************************************************************/
    /*                                                                       */
    /*************************************************************************/
    var cronJobs = {}

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

    function updateStandupsCronJobs() {
        // stop all the previous jobs and reset them with the new settings
        Promise.each(Object.keys(cronJobs),
            function (standupName) {
                cronJobs[standupName].stop()
            })
            .then(() => {
                getAllStandupsData()
            })
            .catch(err => {
                robot.logger.error(error)
                if (c.errorsChannel) {
                    robot.messageRoom(c.errorsChannel, c.errorMessage + `Script: ${path.basename(__filename)}`)
                }
            })
    }

    // TODO: updateTime() and updateDays() could be possibly merged  
    function updateTime(userid, standupid, time) {
        var db = mongoskin.MongoClient.connect(mongodb_uri)
        db.bind('standups').findAndModifyAsync(
            { _id: standupid },
            [["_id", 1]],
            { $set: { time: time } })
            .then(standup => {
                updateStandupsCronJobs()
                return { channel: standup.value.channel, name: standup.value.name }
            }).then((standup) => {
                var username = robot.brain.userForId(userid).name
                var realname = robot.brain.userForId(userid).real_name
                robot.messageRoom(userid, `Standup time succesfully changed.`)
                robot.messageRoom('#' + standup.channel, `Standup *${standup.name}* time changed to *${time}* by ${realname} (${username})`)
            })
            .catch(error => {
                robot.logger.error(error)
                robot.messageRoom(userid, c.errorMessage + `Script: ${path.basename(__filename)}`)
            })
    }

    function updateDays(userid, standupid, days) {
        var db = mongoskin.MongoClient.connect(mongodb_uri)
        db.bind('standups').findAndModifyAsync(
            { _id: standupid },
            [["_id", 1]],
            { $set: { days: days } })
            .then(standup => {
                updateStandupsCronJobs()
                return { channel: standup.value.channel, name: standup.value.name }
            }).then((standup) => {
                var username = robot.brain.userForId(userid).name
                var realname = robot.brain.userForId(userid).real_name
                robot.messageRoom(userid, `Standup days succesfully changed.`)
                robot.messageRoom('#' + standup.channel, `Standup *${standup.name}* days changed to *${getDaysNames(days)}* by ${realname} (${username})`)
            })
            .catch(error => {
                robot.logger.error(error)
                robot.messageRoom(userid, c.errorMessage + `Script: ${path.basename(__filename)}`)
            })
    }

    function updateStandupStatus(userid, standupid, status) {
        if (status) {
            cronJobs[standupid].start()
        } else {
            cronJobs[standupid].stop()
        }

        var db = mongoskin.MongoClient.connect(mongodb_uri)
        db.bind('standups').findAndModifyAsync(
            { _id: standupid },
            [["_id", 1]],
            { $set: { active: status } })
            .then(standup => {
                updateStandupsCronJobs()
                return { channel: standup.value.channel, name: standup.value.name }
            })
            .then(standup => {
                var username = robot.brain.userForId(userid).name
                var realname = robot.brain.userForId(userid).real_name
                var standup = standup
                var newStatus, oldStatus
                if (status) {
                    newStatus = 'activated'
                    oldStatus = 'deactivate'
                } else {
                    newStatus = 'deactivated'
                    oldStatus = 'activate'
                }
                robot.messageRoom('#' + standup.channel, `${realname} (${username}) *${newStatus}* ${standup.name} standup.`)
                showStandups(standup.channel, { _id: 'defaultStandup' })
                robot.messageRoom(standup.channel, `You can ${oldStatus} again by saying ` + '`activate standup`')
                robot.messageRoom(userid, `Standup ${standup.name} activated succesfully.`)
            })
            .catch(error => {
                robot.logger.error(error)
                robot.messageRoom(userid, c.errorMessage + `Script: ${path.basename(__filename)}`)
            })
    }

    // set query = {} to get All the stored standups
    function showStandups(userid, query = { _id: 'defaultStandup' }) {
        var db = mongoskin.MongoClient.connect(mongodb_uri)
        db.bind('standups').find(query).toArrayAsync() // Although we have a single standup, we are using Array for future feature of having multiple standups
            .then(allStandups => {
                var msg = { attachments: [] }
                Promise.each(allStandups, function (standup) {
                    var attachment = slackMsg.attachment()

                    attachment.pretext = `Standup *${standup.name}* for Channel *${standup.channel}*`
                    attachment.fields.push({
                        title: "Time",
                        value: standup.time,
                        short: true
                    })
                    attachment.fields.push({
                        title: "Days",
                        value: getDaysNames(standup.days),
                        short: true
                    })
                    attachment.fields.push({
                        title: "Active",
                        value: (standup.active).toString(),
                        short: true
                    })
                    attachment.fields.push({
                        title: "Channel",
                        value: standup.channel,
                        short: true
                    })
                    if (standup.active) {
                        attachment.color = 'good'
                    } else {
                        attachment.color = 'danger'
                    }
                    msg.attachments.push(attachment)

                    for (var i = 0; i < standup.questions.length; i++) {
                        var qAttachment = slackMsg.attachment()

                        qAttachment.text = `${i + 1}. ${standup.questions[i].text}`
                        qAttachment.color = standup.questions[i].color

                        msg.attachments.push(qAttachment)
                    }
                }).then(() => {
                    robot.messageRoom(userid, msg)
                })
            })
            .catch(error => {
                robot.logger.error(error)
                robot.messageRoom(userid, c.errorMessage + `Script: ${path.basename(__filename)}`)
            })
    }

    // mongoDb -> find standups data -> create cron jobs
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
    function createCronJobs(data) {
        data.forEach(function (standup) {
            var days = standup.days
            var time = standup.time.split(':')
            var standupId = standup._id
            // TODO days
            cronJobs[standup._id] = new CronJob(`00 ${time[1]} ${time[0]} * * ${days}`, /* ss mm hh daysOfMonth MM daysOFWeek */
                function () { getStandupData(standupId) },   /* This function is executed when the job starts */
                function () { return null },               /* This function is executed when the job stops */
                standup.active,           /* Start the job right now */
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


    // TODO: could be replaced with dynamic-dialog.js in the future
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
                delete cache.data[userid][standup.name]
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