// Configuration:
// Commands:
//   `JENKINS`
//   `jenkins login`
//   `jenkins builds of job <job name>`
//   `jenkins last successful build of job <job name>`
//   `jenkins last completed build of job <job name>`
//   `jenkins last build of job <job name>`
//   `jenkins build info <build number> of job <job name>`
//   `jenkins build console <build number> of job <job name>`
//   `jenkins build #<build number>`


var jenkinsapi = require('jenkins-api');
var Promise = require('bluebird')
var request = require('request-promise')
var cache = require('./cache.js').getCache()
var async = require('async')
var c = require('./config.json')
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
     *                           robot instances      
     */


    robot.respond(/jenkins builds of job (.*)/i, function (res) {
        getAllBuilds(res)
    })
    
    robot.respond(/jenkins last success?f?u?l? build of job (.*)/i, function (res) {
        getLastSuccessfulBuild(res)
    })

    robot.respond(/jenkins last completed? build of job (.*)/i, function (res) {
        getLastCompletedBuild(res)
    })

    robot.respond(/jenkins last build of job (.*)/i, function (res) {
        getLastBuildInfo(res)
    })


    robot.respond(/jenkins build info (.*) of job (.*)/i, function (res) {
        getBuildInfo(res)
    })

    robot.respond(/jenkins build console (.*) of job (.*)/, function (res) {
        getBuildConsole(res)
    })

    robot.respond(/jenkins build #(.*)/, function (res) {
        buildJob(res)
    })

    /*************************************************************************/
    /*                               BUILDS                                  */
    /*************************************************************************/

    function getAllBuilds(res) {
        var username, token
        var userid = res.message.user.id
        var jobName = res.match[1]

        var cred = getCredentials(res)
        if (!cred) { return 0 }

        var args = '?depth=1&tree=builds[id,timestamp,result,duration]&pretty=true'
        var options = {
            url: `${jenkins_url}/job/${jobName}/api/json${args}`,
            method: 'GET',
            auth: {
                'user': cred.username,
                'pass': cred.token
            },
            json: true
        };

        request(options)
            .then(data => {
                var builds = data.builds
                var msg = { attachments: [] }
                builds.forEach(function (item) {
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
            .then(msg => {
                robot.messageRoom(userid, msg)
            })
            .catch(error => {
                errorHandler(userid, error)
            })
    }

    function getLastSuccessfulBuild(res) {
        var userid = res.message.user.id
        var jobName = res.match[1]
        var cred = getCredentials(res)

        if (!cred) { return 0 }

        var options = {
            url: `${jenkins_url}/job/${jobName}/lastSuccessfulBuild/api/json`,
            method: 'GET',
            auth: {
                'user': cred.username,
                'pass': cred.token
            },
            json: true
        };
        request(options)
            .then(item => {
                return generateBuildInfoMsg(item)
            })
            .then(msg => {
                robot.messageRoom(userid, msg)
            })
            .catch(error => {
                errorHandler(userid, error)
                console.log(error)
            })
    }

    function getLastCompletedBuild(res) {
        var userid = res.message.user.id
        var jobName = res.match[1]
        var cred = getCredentials(res)

        if (!cred) { return 0 }

        var options = {
            url: `${jenkins_url}/job/${jobName}/lastCompletedBuild/api/json`,
            method: 'GET',
            auth: {
                'user': cred.username,
                'pass': cred.token
            },
            json: true
        };
        request(options)
            .then(item => {
                return generateBuildInfoMsg(item)
            })
            .then(msg => {
                robot.messageRoom(userid, msg)
            })
            .catch(error => {
                errorHandler(userid, error)
                console.log(error)
            })
    }

    function getLastBuildInfo(res) {
        var userid = res.message.user.id
        var jobName = res.match[1]

        var cred = getCredentials(res)
        if (!cred) { return 0 }

        var options = {
            url: `${jenkins_url}/job/${jobName}/lastBuild/api/json`,
            method: 'GET',
            auth: {
                'user': cred.username,
                'pass': cred.token
            },
            json: true
        };

        request(options)
            .then(data => {
                var lastBuild = data.lastBuild
                return generateBuildInfoMsg(data)
            })
            .then(msg => {
                robot.messageRoom(userid, msg)
            })
            .catch(error => {
                errorHandler(userid, error)
            })
    }

    function getBuildInfo(res) {
        var userid = res.message.user.id
        var jobName = 'myJob'//res.match[2]
        var buildNum = 78//res.match[1]

        var cred = getCredentials(res)
        if (!cred) { return 0 }

        var options = {
            url: `${jenkins_url}/job/${jobName}/${buildNum}/api/json`,
            method: 'GET',
            auth: {
                'user': cred.username,
                'pass': cred.token
            },
            json: true
        };

        request(options)
            .then(data => {
                var lastBuild = data.lastBuild
                return generateBuildInfoMsg(data)
            })
            .then(msg => {
                robot.messageRoom(userid, msg)
            })
            .catch(error => {
                errorHandler(userid, error)
            })
    }

    function getBuildConsole(res) {
        var userid = res.message.user.id
        var jobName = res.match[2]
        var buildNum = res.match[1]

        var cred = getCredentials(res)
        if (!cred) { return 0 }

        var options = {
            url: `${jenkins_url}/job/${jobName}/${buildNum}/consoleText/api/json`,
            method: 'GET',
            auth: {
                'user': cred.username,
                'pass': cred.token
            },
            json: true
        };

        request(options)
            .then(data => {
                return msg = '```' + data + '```'
            })
            .then(msg => {
                robot.messageRoom(userid, msg)
            })
            .catch(error => {
                errorHandler(userid, error)
            })
    }

    function buildJob(res) {
        var jobName = res.match[1]
        var userid = res.message.user.id

        var cred = getCredentials(res)
        if (!cred) { return 0 }
        var options = {
            url: `http://localhost:9999/job/${jobName}/build`,
            method: 'POST',
            headers: {
                'Jenkins-Crumb': cred.crumb
            },
            auth: {
                'user': cred.username,
                'pass': cred.token
            }
        };

        request(options)
            .then(data => {
                res.reply(`I'm on it!`)
            })
            .catch(error => {
                errorHandler(userid, error)
            })


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


    /*************************************************************************/
    /*                          helpful functions                            */
    /*************************************************************************/


    function getCredentials(res) {
        var userid = res.message.user.id

        try {
            var token = cache.get(userid).jenkins_token
            var username = cache.get(userid).jenkins_username
            //TODO
            var crumb = null//cache.get(userid).jenkins_crumb
            if (!token || !username) { // catch the case where username or token are null/undefined
                throw error
            }
        } catch (error) {
            robot.emit('jenkinsLogin', {}, res)
            return false
        }
        return {
            username: username,
            token: token,
            crumb: crumb
        }
    }

    function errorHandler(userid, error) {
        if (error.statusCode == 401) {
            robot.messageRoom(userid, c.jenkins.badCredentialsMsg)
        } else if (error.statusCode == 404) {
            robot.messageRoom(userid, c.jenkins.jobNotFoundMsg)
        } else {
            robot.messageRoom(userid, c.errorMessage + 'Status Code: ' + error.statusCode)
            robot.logger.error(error)
        }
    }

    function generateBuildInfoMsg(item) {
        var msg = { attachments: [] }
        var att = slackmsg.attachment()

        // msg text & fallback: Build #num (timestamp)
        var date = new Date(item.timestamp)
        msg.text = `*<${item.url}|${item.fullDisplayName}>`
            + ` (${dateFormat(date, df)})*`
        att.fallback = msg.text

        // color
        if (item.result == 'SUCCESS') {
            att.color = 'good'
        } else if (att.color.includes('FAIL')) {
            att.color = 'danger'
        } else {
            att.color = 'warning'
        }

        // attachement text
        // build result: <result> | Duration: #.### s
        att.text = `Result: ${item.result} | Duration: ${item.duration / 1000} s`

        // FIELDS
        // build description
        if (item.description) {
            att.fields.push({
                title: 'Description:',
                value: item.description,
                short: false
            })
        }

        // build changes
        var fieldTitle2 = '', value2 = ''
        if (item.changeSet.items.length) {
            fieldTitle2 = 'Changes:'
        }
        item.changeSet.items.forEach(function (change) {
            value2 += `• ${change.comment}`
        })
        att.fields.push({
            title: fieldTitle2,
            value: value2,
            short: false
        })

        msg.attachments.push(att)
        return msg
    }

}