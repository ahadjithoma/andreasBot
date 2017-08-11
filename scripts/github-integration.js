'use strict';

// init
var GitHubApi = require("github");
var slackMsgs = require('./slackMsgs.js');
var mongoskin = require('mongoskin')
var Promise = require('bluebird')
var path = require('path')
var c = require('./config.json')
var encryption = require('./encryption.js')
Promise.promisifyAll(mongoskin)

// config
var mongodb_uri = process.env.MONGODB_URI

module.exports = function (robot) {


	robot.on('getbrain', function () {
		getBrain();
	})
	function getBrain() {
		var u = robot.brain.get('U514U4XDF')
		console.log('AFTER: ', u)
	}

	/* set Github Accounts for Users and App (bot) */
	var github = new GitHubApi({
		/* optional */
		// debug: true,
		protocol: "https",
		host: "api.github.com", // should be api.github.com for GitHub
		thPrefix: "/api/v3", // for some GHEs; none for GitHub
		headers: {
			"Accept": "application/vnd.github.machine-man-preview+json",
			"user-agent": "Hubot-GitHub" // GitHub is happy with a unique user agent
		},
		Promise: require('bluebird'),
		followRedirects: false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
		timeout: 5000
	});

	var ghUser, ghApp
	var ghUser = ghApp = new GitHubApi({
		/* optional */
		// debug: true,
		protocol: "https",
		host: "api.github.com", // should be api.github.com for GitHub
		thPrefix: "/api/v3", // for some GHEs; none for GitHub
		headers: {
			"Accept": "application/vnd.github.machine-man-preview+json",
			"user-agent": "Hubot-GitHub" // GitHub is happy with a unique user agent
		},
		Promise: require('bluebird'),
		followRedirects: false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
		timeout: 5000
	})

	robot.on('getRepos', (data, res) => {
		getRepos(res)
	})

	function getRepos(res) {
		var userID = res.message.user.id;
		var token = robot.brain.get(userID).github_token
		if (!token) {
			// TODO 
			// tell user to login 
			// (maybe emit e message and do it somewhere else)
			// maybe cancel api.ai context
			return
		}
		githubAuthApp(robot.brain.get('GithubApp'))

		var repos = [];
		ghApp.integrations.getInstallationRepositories({ user_id: 'andreash92' })
			.then(res => {
				(res.data.repositories).forEach(function (repo) {
					repos.push(`• ${repo.full_name}`)
				})
			})
			.then(()=>{
				console.log(repos)
				robot.messageRoom(userID, repos)
			})
	}

	function getAppToken(appID) {
		var db = mongoskin.MongoClient.connect(mongodb_uri)
		db.bind('GithubApp')
		return db.GithubApp.findOneAsync({ _id: appID })
			.then(dbData => encryption.decrypt(dbData.token))
			.catch(error => {
				robot.logger.error(error)
				if (c.errorsChannel) {
					robot.messageRoom(c.errorsChannel, c.errorMessage
						+ `Script: ${path.basename(__filename)}`)
				}
			})
	}

	function githubAuthUser(token) {
		ghUser.authenticate({
			"type": "token",
			"token": token
		})
	}
	function githubAuthApp(token) {
		ghApp.authenticate({
			"type": "integration",
			"token": token
		})
	}

	/* oauth autentication using github personal token */
	// github.authenticate({
	// 	"type": "oauth",
	// 	"token": process.env.HUBOT_GITHUB_TOKEN
	// })

	// oauth key/secret (to get a token)
	// github.authenticate({
	// 	type: "oauth",
	// 	key: process.env.GITHUB_APP_CLIENT_ID,
	// 	secret: process.env.GITHUB_APP_CLIENT_SECRET
	// })
	robot.hear(/gh auth/i, function (res_r) {

		var client_id = process.env.GITHUB_APP_CLIENT_ID;
		var client_secret = process.env.GITHUB_APP_CLIENT_SECRET;

		github.authorization.getOrCreateAuthorizationForApp({
			client_secret: client_secret,
			client_id: client_id,
			note: 'some note'
		}).then(res => {
			robot.logger.info(res);
		}).catch(err => {
			robot.logger.error(err);
		});


		// var data = { client_id: client_id,
		// redirect_uri: "https://andreasbot.herokuapp.com/hubot/github-oauth"};
		// var headers = {  'Accept': 'application/vnd.github.machine-man-preview+json'};


		// robot.http("http://github.com/login/oauth/authorize")
		// .headers(headers)
		// .post(data)(function (err, res, body) {
		// 	if (err){
		// 		robot.logger.error(err)
		// 		return 0;
		// 	}
		// 	robot.logger.info(res)
		// 	robot.logger.warning(body)
		// 				robot.logger.error(res.req.ClientRequest._events.response)

		// })
	})
	/* basic autentication using github's username & password */
	// github.authenticate({
	//     type: "basic",
	//     username: '',
	//     password: ''
	// });

	function pushEvent(payload) {
		var room = "random";
		var adapter = robot.adapterName;
		let repo_name = payload.repository.full_name;
		let branch = payload.repository.default_branch;
		let repo_url = payload.repository.url + '/tree/' + branch;
		let compare_url = payload.compare;
		let commits = Object.keys(payload.commits).length;		 // get the total number of commits done

		if (adapter == 'slack') {
			let msg = slackMsgs.githubEvent();
			let i;

			for (i = 0; i < commits; i++) {
				let user_login = payload.commits[i].author.username;
				var user_url = `https://www.github.com/${user_login}`;
				var user_name = payload.commits[i].author.name;
				var commit_id = payload.commits[i].id.substr(0, 7);		 // get the first 7 chars of the commit id
				var commit_msg = payload.commits[i].message.split('\n', 1); // get only the commit msg, not the description
				var commit_url = payload.commits[i].url;
				commit_id = "`" + commit_id + "`"; // add slack's msg format 
				msg.attachments[0].text = msg.attachments[0].text + `\n<${commit_url}|${commit_id}> ${commit_msg}`;
			}
			msg.text = `<${repo_url}|[${repo_name}:${branch}]> ${commits} new <${compare_url}|commit(s)> by <${user_url}|${user_name}>:`;
			msg.attachments[0].color = '#0000ff'; // set color = blue
			robot.messageRoom(room, msg);

		} else {
			//TODO: send a msg in plain text for other chat platforms or add any other specific formats than slack's
			robot.messageRoom(room, "push event");
		}
	}

	function getCommits() {

	}

	function developmentStatusEvent(payload) {
		var room = "random";
		var adapter = robot.adapterName;
		if (adapter == 'slack') {
			let msg = slackMsgs.githubEvent();
			let target_url = payload.deployment_status.target_url;
			let repo_url = payload.repository.html_url;
			let state = payload.deployment_status.state;
			let creator = payload.deployment_status.creator.login;
			let repo = payload.repository.full_name;
			let environment = payload.deployment.environment;
			msg.text = `<${repo_url}|[${repo}]> created by ${creator}`;
			msg.attachments[0].title = `Deployment ${state}`;
			msg.attachments[0].text = `<${target_url}|${environment}>`;
			if (state == 'pending') {
				msg.attachments[0].color = '#ff8533' // set color = orange
			} else if (state == 'success') {
				msg.attachments[0].color = '#00ff00' // set color = green 
			} else if (state == 'fail') {
				msg.attachments[0].color = '#0000ff' // set color = blue 
			} else {
				msg.attachments[0].color = '#ff0000' // set color = red 
			}
			robot.messageRoom(room, msg);
		} else {
			robot.messageRoom(room, "deployment_status event");
		}
	}

	function developmentEvent(payload) {
		//TODO 
	};

	function issuesEvent(payload) {
		//under construction
		var room = "random";
		var adapter = robot.adapterName;
		let repo = payload.repository.full_name;
		let repo_url = payload.repository.html_url;
		let action = payload.action;
		let issue_url = payload.issue.url;
		let issue_num = payload.issue.number;
		let issue_title = payload.issue.title;
		let issue_body = payload.issue.body;
		let user = payload.issue.user.login;
		let labels = Object.keys(payload.issue.labels).length;

		if (adapter == 'slack') {
			let msg = slackMsgs.githubEvent();
			if (action == 'opened') {
				msg.attachments[0].pretext = `[${repo}] Issue *created* by <www.github.com/${user}|${user}>`;
				msg.attachments[0].fallback = `[${repo}] Issue created: ${issue_title}`;
				msg.attachments[0].title = `<${issue_url}|#${issue_num} ${issue_title}>`;
				msg.attachments[0].text = issue_body;
				msg.attachments[0].color = '#00ff00'; // set color = green
			} else {
				msg = `[${repo}] Issue <${issue_url}|#${issue_num} ${issue_title}>: *${action}* by <www.github.com/${user}|${user}>`;
			}

			/* assign attachement color - CURRENTLY WE ARE NOT USING ATTACHEMENTS FOR ALL ISSUES
			if (action.includes('open')){
				msg.attachments[0].color = '#00ff00'; // set color = green
			} else if (action.includes('close')){
				msg.attachments[0].color = '#ff0000'; // set color = red
			} else {
				msg.attachments[0].color = '#ff8533'; // set color = orange
			} 
			*/
			robot.messageRoom(room, msg);

		} else {
			let msg = `[${repo}] Issue ${action} by <www.github.com/${user}|${user}>`;
			msg = msg + `\n <${issue_url}|#${issue_num} ${issue_title}>` + `\n${issue_body}`;
			robot.messageRoom(room, msg);

			//todo: plain text
		}
	};

	function issueCommentEvent(payload) {
		//TODO
	};

	robot.on('github-webhook-event', function (data) {

		switch (data.eventType) {
			case 'push':
				pushEvent(data.payload);
				break;
			case 'deployment':
				developmentEvent(data.payload);
				break;
			case 'deployment_status':
				developmentStatusEvent(data.payload);
				break;
			case 'issues':
				issuesEvent(data.payload);
				break;
			case 'issue_comment':
				issueCommentEvent(data.payload);
				break;
			case 'fork':
				break;
			case 'pull':
				break;
			case '':
				break;

			default:
				let room = "random";
				robot.messageRoom(room, `event: ${data.eventType}`);
				break;
		}
	})

	robot.respond(/gh hook/i, function (res_r) {

		github.repos.createHook({
			"owner": "andreash92",
			"repo": "andreasBot",
			"name": "andreasBot-hook",
			"config": {
				"url": "https://andreasbot.herokuapp.com/hubot/github-hooks",
				"content_type": "json"
			}
		},
			function (err, res) {
				if (err) {
					robot.logger.error(err);
					return 0;
				}
				robot.logger.info(res);
			});
	})

	// get user's followers. Developed for testing purposes
	robot.respond(/gh followers (.*)/, function (res_r) {
		var username = res_r.match[1];
		github.users.getFollowersForUser({
			"username": username
		}).then(function (res) {
			var jsonsize = Object.keys(res.data).length;
			let menu = slackMsgs.menu();
			let login;
			for (var i = 0; i < jsonsize; i++) {
				login = res.data[i].login;
				menu.attachments[0].actions[0]['options'].push({ "text": login, "value": login });
			}
			menu.attachments[0].text = "Followers of " + "*" + username + "*";
			menu.attachments[0].fallback = 'Github followers of ' + username;
			menu.attachments[0].callback_id = 'followers_cb_id';
			menu.attachments[0].actions[0].name = ' ';
			menu.attachments[0].actions[0].text = ' ';
			res_r.reply(menu);
		}).catch(function (err) {
			res_r.send('Error: ' + JSON.parse(err).message);
		})
	})
}
