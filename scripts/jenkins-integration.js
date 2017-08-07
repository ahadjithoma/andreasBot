var jenkinsapi = require('jenkins-api');
var token = 'topsecret'//process.env.JENKINS_TOKEN;
var username = process.env.JENKINS_USERNAME;
var url = process.env.JENKINS_URL.split('//');
var uri = url[1]
var protocol = url[0];

// API Token Auth
var jenkins = jenkinsapi.init(`https://${username}:${token}@ermis.ee.auth.gr:2121`);

/** BUILDS **/

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


/** JOBS **/


