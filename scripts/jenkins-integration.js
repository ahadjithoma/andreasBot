var jenkinsapi = require('jenkins-api');
var token = 'topsecret'//process.env.JENKINS_TOKEN;
var username = process.env.JENKINS_USERNAME;
var url = process.env.JENKINS_URL.split('//');
var uri = url[1]
var protocol = url[0];

// API Token Auth
var jenkins = jenkinsapi.init(`https://${username}:${token}@ermis.ee.auth.gr:2121`);

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

function getBuildInfo(jobName, buildNum) {
    jenkins.build_info(jobName, buildNum, {}, function (err, data) {
        if (err) { return console.log(err); }
        console.log(data)
    });
}

function getLastBuildInfo(jobName, customParams) {
    jenkins.last_build_info(jobName, customParams, function (err, data) {
        if (err) throw err;
        console.log(data)
    });
}

function getLastCompletedBuildInfo(jobName) {
    jenkins.last_completed_build_info(jobName, {}, function (err, data) {
        if (err) { return console.log(err); }
        console.log(data)
    });
}

function getAllBuilds(jobName) {
    jenkins.all_builds(jobName, function (err, data) {
        if (err) { return console.log(err); }
        console.log(data)
    });
}

function getTestResult(jobName, buildNum) {
    jenkins.test_result(jobName, buildNum, {}, function (err, data) {
        if (err) { return console.log(err); }
        console.log(data)
    });
}

function getLastBuildReport(jobName) {
    jenkins.last_build_report('SEAF', {}, function (err, data) {
        if (err) { return console.log(err); }
        console.log(data);
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

module.exports = function(robot){
    
}


// jenkinsList = function (msg) {
//     var auth, filter, req, url;
//     url = 'https://ermis.ee.auth.gr:2121'//process.env.HUBOT_JENKINS_URL;
//     filter = new RegExp(msg.match[2], 'i');
//     req = msg.http(url + "/api/json");
//     if (true) {
//         auth = new Buffer("andreas_hadj:topsecret").toString('base64');
//         req.headers({
//             Authorization: "Basic " + auth
//         });
//     }
//     return req.get()(function (err, res, body) {
//         var content, error, i, index, job, len, ref, response, state;
//         response = "";
//         if (err) {
//             return msg.send("Jenkins says: " + err);
//         } else {
//             try {
//                 content = JSON.parse(body);
//                 ref = content.jobs;
//                 for (i = 0, len = ref.length; i < len; i++) {
//                     job = ref[i];
//                     index = jobList.indexOf(job.name);
//                     if (index === -1) {
//                         jobList.push(job.name);
//                         index = jobList.indexOf(job.name);
//                     }
//                     state = job.color === "red" ? "FAIL" : job.color === "aborted" ? "ABORTED" : job.color === "aborted_anime" ? "CURRENTLY RUNNING" : job.color === "red_anime" ? "CURRENTLY RUNNING" : job.color === "blue_anime" ? "CURRENTLY RUNNING" : "PASS";
//                     if ((filter.test(job.name)) || (filter.test(state))) {
//                         response += "[" + (index + 1) + "] " + state + " " + job.name + "\n";
//                     }
//                 }
//                 return msg.send(response);
//             } catch (_error) {
//                 error = _error;
//                 return msg.send(error);
//             }
//         }
//     });
// };

// module.exports = function (robot) {
//     robot.respond(/j(?:enkins)? list( (.+))?/i, function (msg) {
//         // console.log(res.match[1])
//         jenkinsList(msg);
//     });
// }