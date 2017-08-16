var jenkinsapi = require('jenkins-api');
var Promise = require('bluebird')
var cache = require('./cache.js').getCache()
var async = require('async')
var dateFormat = require('dateformat');
var slackmsg = require('./slackMsgs.js')

// config
var username = process.env.JENKINS_USERNAME;
var jenkins_url = process.env.JENKINS_URL
var url = process.env.JENKINS_URL.split('//');
var uri = url[1]
var protocol = url[0];
var df = "dd/mm/yyyy, hh:MM TT"

module.exports = function (robot) {

    /*************************************************************************
     *                               BUILDS      
     */

    function build(jobName) {
        jenkins.build(jobName, function (err, data) {
            if (err) throw err;
            console.log(data)
        });
    }

    function stopBuild(jobName, buildNum) {
        jenkins.stop_build(jobName, buildNum, {}, function (err, data) {
            if (err) { return console.log(err); }
            console.log(data)
        });
    }

    function getConsoleOutput(jobName, buildNum) {
        jenkins.console_output(jobName, buildNum, {}, function (err, data) {
            if (err) { return console.log(err); }
            console.log(data.body)
        });
    }

    function getBuildInfo(res) {
        var userid = res.message.user.id
        var jobName = res.match[2]
        var buildNum = res.match[1]

        console.log('j: ', jobName)
        console.log('b: ', buildNum)

        var jenkins = login(res)
        if (!jenkins) return
        else console.log('ok')
        jenkins.build_infoAsync(jobName, buildNum, {})
            .then(item => {
                console.log(item)
                var msg = { attachments: [] }
                var att = slackmsg.attachment()

                // title: Build #num (timestamp)
                var date = new Date(item.timestamp)
                att.title = `<${item.url}|Build #${item.id}>`
                    + ` (${dateFormat(date, df)})`

                // fallback
                att.fallback = att.title

                // text: Result: <result> | Duration: #.### s
                att.text = `Result: ${item.result} | Duration: ${item.duration / 1000} s`

                // color
                if (item.result == 'SUCCESS') {
                    att.color = 'good'
                } else if (att.color.includes('FAIL')) {
                    att.color = 'danger'
                } else {
                    att.color = 'warning'
                }

                // description

                //changes
                if (item.changeSet.items) {
                    console.log('\n', item.changeSet.items)
                    console.log('\n', item.changeSet.items[0])
                }

                msg.attachments.push(att)
                return msg
            })
            .then(msg => { robot.messageRoom(userid, msg) })
            .catch(err => { console.log(err) })
    }

    function getLastBuildInfo(res) {
        var userid = res.message.user.id
        var jobName = res.match[1]

        var jenkins = login(res)
        if (!jenkins) return
        jenkins.last_build_infoAsync(jobName, {})
            .then(item => {
                var msg = { attachments: [] }
                var att = slackmsg.attachment()
                var date = new Date(item.timestamp)
                att.title = `<${item.url}|Build #${item.id}>`
                    + ` (${dateFormat(date, df)})`
                att.fallback = att.title
                att.text = `Result: ${item.result} | Duration: ${item.duration / 1000} s`
                if (item.result == 'SUCCESS') {
                    att.color = 'good'
                } else if (att.color.includes('FAIL')) {
                    att.color = 'danger'
                } else {
                    att.color = 'warning'
                }
                msg.attachments.push(att)
                return msg
            })
            .then(msg => { robot.messageRoom(userid, msg) })
            .catch(err => { console.log(err) })
    }

    function getLastCompletedBuildInfo(jobName) {
        jenkins.last_completed_build_info(jobName, {}, function (err, data) {
            if (err) { return console.log(err); }
            console.log(data)
        });
    }

    function getAllBuilds(res) {
        var username, token
        var userid = res.message.user.id
        var jobName = res.match[1]

        var jenkins = login(res)
        if (!jenkins) return

        jenkins.all_buildsAsync(jobName, {})
            .then(data => {
                var msg = { attachments: [] }
                data.forEach(function (item) {
                    var att = slackmsg.attachment()
                    var date = new Date(item.timestamp)
                    att.title = `<${jenkins_url}/job/${jobName}/${item.id}|Build #${item.id}>`
                        + ` (${dateFormat(date, df)})`
                    att.fallback = att.title
                    att.text = `Result: ${item.result} | Duration: ${item.duration / 1000} s`
                    if (item.result == 'SUCCESS') {
                        att.color = 'good'
                    } else if (att.color.includes('FAIL')) {
                        att.color = 'danger'
                    } else {
                        att.color = 'warning'
                    }
                    msg.attachments.push(att)
                })
                return msg

            })
            .then(msg => { robot.messageRoom(userid, msg) })
            .catch(err => { console.log(err) })
    }

    function getTestResult(jobName, buildNum) {
        jenkins.test_result(jobName, buildNum, {}, function (err, data) {
            if (err) { return console.log(err); }
            console.log(data)
        });
    }

    function deleteBuildData(jobName, buildNum) {
        jenkins.delete_build(jobName, buildNum, {}, function (err, data) {
            if (err) { return console.log(err); }
            console.log(data)
        });
    }


    /*************************************************************************
     *                               JOBS      
     */

    function getAllJobs() {
        jenkins.all_jobs({}, function (err, data) {
            if (err) { return console.log(err); }
            console.log(data)
        });
    }

    function getJobConfigXML(jobName) {

        jenkins.get_config_xml(jobName, {}, function (err, data) {
            if (err) { return console.log(err); }
            console.log(data)
        });
    }

    function getJobInfo(jobName) {
        jenkins.job_info(jobName, {}, function (err, data) {
            if (err) { return console.log(err); }
            console.log(data)
        });
    }

    function getJobsLastSuccessBuild(jobName) {
        jenkins.last_success(jobName, {}, function (err, data) {
            if (err) { return console.log(err); }
            console.log(data)
        });
    }


    function getJobsLastResult(jobName) {
        jenkins.last_result(jobName, {}, function (err, data) {
            if (err) { return console.log(err); }
            console.log(data)
        });
    }

    /*
        NOT IMPLEMENTED:
        update
        create
        copy
        delete
        enable
        disaple
    */


    /*************************************************************************
     *                               VIEWS      
     */

    function getAllViews() {
        jenkins.all_views({}, function (err, data) {
            if (err) { return console.log(err); }
            console.log(data)
        });
    }

    /*************************************************************************
     *                           robot instance      
     */


    robot.respond(/jenkins builds of job (.*)/i, function (res) {
        getAllBuilds(res)
    })

    robot.respond(/jenkins last build report of job (.*)/i, function (res) {
        getLastBuildInfo(res)
    })

    robot.respond(/jenkins build (.*) info of job (.*)/i, function (res) {
        getBuildInfo(res)
    })

    function login(res) {
        var userid = res.message.user.id

        try {
            var token = cache.get(userid).jenkins_token
            var username = cache.get(userid).jenkins_username
            if (!token || !username) throw error // catch the case where username or token are null/undefined
        } catch (error) {
            robot.emit('jenkinsLogin', {}, res)
            return false
        }
        var jenkins = jenkinsapi.init(`https://${username}:${token}@c349f31c.ngrok.io`)
        return Promise.promisifyAll(jenkins);
    }

}