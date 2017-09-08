// Commands:
//	 `github login`
//	 `github repos`
//	 `github open|closed|all issues of repo <repo name>`
//	 `github comments of issue <issue num> of repo <repo name>`
//	 `github pull requests of repo <repo name>`
//	 `github create issue`

'use strict';

// init
var GitHubApi = require("github");
var slackMsgs = require('./slackMsgs.js');
var c = require('./config.json')
var encryption = require('./encryption.js')
var cache = require('./cache.js').getCache()
const Conversation = require('./hubot-conversation/index.js');
var dialog = require('./dynamic-dialog.js')
var convModel = require('./conversation-models.js')
var path = require('path')
var async = require('async')
var dateFormat = require('dateformat')
var request = require('request-promise')
var Promise = require('bluebird')
var mongoskin = require('mongoskin')
Promise.promisifyAll(mongoskin)

// config
var mongodb_uri = process.env.MONGODB_URI
var bot_host_url = process.env.HUBOT_HOST_URL;
var GITHUB_API = 'https://api.github.com'

module.exports = function (robot) {

	/*************************************************************************/
	/*                             Listeners                                 */
	/*************************************************************************/

	var switchBoard = new Conversation(robot);

	robot.respond(/github login/, function (res) {
		oauthLogin(res.message.user.id)
	})
	robot.on('githubOAuthLogin', function (res) {
		oauthLogin(res.message.user.id)
	})

	robot.respond(/github repos/, (res) => {
		listRepos(res.message.user.id)
	})
	robot.on('listRepos', (data, res) => {
		listRepos(res.message.user.id)
	})

	robot.respond(/github (open |closed |all |)issues( of)?( repo)? (.*)/i, function (res) {
		var repo = res.match.pop()
		var state = res.match[1].trim()
		var userid = res.message.user.id
		updateConversationContent(userid, { repo: repo })
		listRepoIssues(userid, repo, state)
	})

	robot.respond(/github comments of issue ([0-9]) of repo (.*)/i, function (res) {
		var repo = res.match[2].trim()
		var issueNum = res.match[1].trim()
		listIssueComments(res.message.user.id, issueNum, repo)
	})

	robot.respond(/github pull requests of repo (.*)/i, function (res) {
		var userid = res.message.user.id
		var repo = res.match[1].trim()
		listPullRequests(userid, repo)
	})

	// TODO: maybe replace it with api.ai
	robot.respond(/github (create|open)(| a new) issue\b/, function (res) {

		var userid = res.message.user.id

		dialog.startDialog(switchBoard, res, convModel.createIssue)
			.then(data => {
				var owner
				var repo = data.repo.split('/')
				if (repo[1]) {
					repo = repo[1]
					owner = repo[0]
				} else {
					repo = repo[0]
					owner = cache.get('GithubApp')[0].account
				}

				try {
					var assignees = data.assignees.replace(/\s/g, '').split(',')

				} catch (error) {
					var assignees = []
				}
				try {
					var labels = data.labels.replace(/\s/g, '').split(',')

				} catch (error) {
					var labels = []
				}

				createIssue(userid, repo, owner, data.title, data.body, labels, assignees)
			}).catch(err => console.log(err))
	})


	robot.on('githubSumUp', function (userid, query, saveLastSumupDate) {
		listCommitsSumUp(userid, query, saveLastSumupDate)
	})

	robot.respond(/gh repo/i, function (res) {
		listCommitsSumUp(res.message.user.id, 'query', true)
	})

	/*************************************************************************/
	/*                             API Calls                                 */
	/*************************************************************************/


	function listCommitsSumUp(userid, query, saveLastSumupDate = false) {
		var credentials = getCredentials(userid)
		if (!credentials) { return 0 }

		if (saveLastSumupDate) {
			var date = new Date().toISOString();
			cache.set(userid, { github_last_sumup_date: date })

			var db = mongoskin.MongoClient.connect(mongodb_uri);
			db.bind('users').findAndModifyAsync(
				{ _id: userid },
				[["_id", 1]],
				{ $set: { github_last_sumup_date: date } },
				{ upsert: true })
				.catch(error => {
					robot.logger.error(error)
					if (c.errorsChannel) {
						robot.messageRoom(c.errorsChannel, c.errorMessage
							+ `Script: ${path.basename(__filename)}`)
					}
				})
		}
		getAccesibleReposFullName(userid)
			.then(repos => {
				var msg = {attachments: []}
				var attachment = slackMsgs.attachment()
				
				for (var i = 0; i < repos.length; i++) {
					var repoName = repos[i]
					Promise.mapSeries([
						displayPullRequestsSumup(userid, repoName),
						displayIssuesSumup(userid, repoName),
						displayCommitsSumup(userid, repoName)
					], function (msg) {
						return msg
					}).then(function (data) {
						data.forEach(function (msg) {

							robot.messageRoom(userid, msg)
						})
					})
				}
			})
			.catch(error => {
				robot.logger.error(error)
				robot.messageRoom(userid, c.errorMessage + `Script: ${path.basename(__filename)}`)
			})
	}

	function displayRepoSumup(userid, repo, state = '') {

	}

	// TODO: 
	//   check the state when is not provided.
	//	 better msg + title
	//	 same for the functions bellow
	function displayPullRequestsSumup(userid, repo, state = '') {
		var ghApp = cache.get('GithubApp')
		var appToken = ghApp[0].token
		var owner = ghApp[0].account

		var cred = getCredentials(userid)
		if (!cred) { return 0 }

		var options = {
			url: `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=${state}`,
			method: 'GET',
			headers: getUserHeaders(cred.token),
			json: true
		}
		return new Promise((resolve, reject) => {
			request(options)
				.then(pullRequests => {
					var msg = `[${owner}/${repo}] has ${pullRequests.length} ${state} pull requests`
					return msg
				})
				.then((msg) => {
					resolve(msg)
					// robot.messageRoom(userid, msg)
				})
				.catch(error => {
					reject(error)
					// robot.logger.error(error)
					// robot.messageRoom(userid, c.errorMessage)
				})
		})
	}

	// TODOs: as mentioned in displayPullRequestsSumup
	function displayIssuesSumup(userid, repo, state = '') {
		var ghApp = cache.get('GithubApp')
		var appToken = ghApp[0].token
		var owner = ghApp[0].account

		var options = {
			url: `${GITHUB_API}/repos/${owner}/${repo}/issues?state=${state}`,
			method: 'GET',
			headers: getAppHeaders(appToken),
			json: true
		}

		return new Promise((resolve, reject) => {
			request(options)
				.then(pullRequests => {
					var msg = `[${owner}/${repo}] has ${pullRequests.length} ${state} issues`
					return msg
				})
				.then((msg) => {
					resolve(msg)
					// robot.messageRoom(userid, msg)
				})
				.catch(error => {
					reject(error)
					// robot.logger.error(error)
					// robot.messageRoom(userid, c.errorMessage)
				})
		})

	}

	// TODOs: as mentioned in displayPullRequestsSumup
	function displayCommitsSumup(userid, repo, since = '2017-01-01T04:36:52+03:00') {
		var ghApp = cache.get('GithubApp')
		var appToken = ghApp[0].token
		var owner = ghApp[0].account

		var options = {
			url: `${GITHUB_API}/repos/${owner}/${repo}/commits?since=${since}`,
			method: 'GET',
			headers: getAppHeaders(appToken),
			json: true
		}

		return new Promise((resolve, reject) => {
			request(options)
				.then(commits => {
					var msg = `[${owner}/${repo}] has ${commits.length} commits`
					return msg
				})
				.then((msg) => {
					resolve(msg)
					// robot.messageRoom(userid, msg)
				})
				.catch(error => {
					reject(error)
					// robot.logger.error(error)
					// robot.messageRoom(userid, c.errorMessage)
				})
		})
	}

	function listPullRequests(userid, repo, state) {
		var ghApp = cache.get('GithubApp')
		var appToken = ghApp[0].token
		var owner = ghApp[0].account

		var cred = getCredentials(userid)
		if (!cred) { return 0 }

		var options = {
			url: `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=${state}`,
			method: 'GET',
			headers: getUserHeaders(cred.token),
			json: true
		}

		request(options)
			.then(pullRequests => {
				var msg = {}
				msg.unfurl_links = false
				if (pullRequests.length > 0) {
					msg.attachments = []
					msg.text = `Pull Requests of <https://www.github.com/${owner}/${repo}|${owner}/${repo}>:`
				} else {
					msg.text = `There aren't any Pull Requests on <https://www.github.com/${owner}/${repo}|${owner}/${repo}>`
				}
				Promise.each(pullRequests, function (pr) {
					console.log(pr)
					var attachement = slackMsgs.attachment()
					var title = pr.title
					var url = pr.html_url
					var num = pr.number
					attachement.text = `<${url}|#${num} ${title}>`


					attachement.author_name = pr.user.login
					attachement.author_link = pr.user.html_url
					attachement.author_icon = pr.user.avatar_url

					if (pr.state.includes('open')) {
						attachement.color = 'good'
					} else {
						attachement.color = 'danger'
					}
					msg.attachments.push(attachement)
				}).done(() => {
					robot.messageRoom(userid, msg)
				})
			})
			.catch(error => {
				robot.messageRoom(userid, c.errorMessage)
			})
	}

	function listRepos(userid) {

		var cred = getCredentials(userid)
		if (!cred) { return 0 }

		try {
			var token = cache.get(userid).github_token //robot.brain.get(userid).github_token
			var githubUsername = robot.brain.get(userid).github_username
		}
		catch (e) {
			var token = null
			var githubUsername = null
			robot.messageRoom(userid, 'you are not logged in')
			oauthLogin(userid)
			return
		}

		/* (Possible feature) having more than one Github App installations  */
		var installations = cache.get('GithubApp').length
		for (var i = 0; i < installations; i++) {
			var ghApp = cache.get('GithubApp')
			var installation_id = ghApp[i].id

			var options = {
				url: `${GITHUB_API}/user/installations/${installation_id}/repositories`,
				headers: getUserHeaders(token),
				json: true,
			};

			request(options)
				.then(res => {
					var msg = slackMsgs.basicMessage();
					res.repositories.forEach(function (repo) {
						// TODO: add link to repo 
						msg.attachments[0].text += (`${repo.full_name}\n`)
					})
					return { msg: msg }
				})
				.then((data) => {
					data.msg.text = `Your accessible Repositories: `
					robot.messageRoom(userid, data.msg)
				})
				.catch(err => {
					//TODO handle error codes: i.e. 404 not found -> dont post
					console.log(err)
				})
		}
	}

	function getAccesibleReposFullName(userid) {

		var cred = getCredentials(userid)
		if (!cred) { return 0 }

		var ghApp = cache.get('GithubApp')
		var installation_id = ghApp[0].id

		var options = {
			url: `${GITHUB_API}/user/installations/${installation_id}/repositories`,
			headers: getUserHeaders(cred.token),
			json: true,
		};
		return new Promise(function (resolve, reject) {
			request(options)
				.then(res => {
					var reposArray = []
					Promise.each(res.repositories, function (repo) {
						reposArray.push(repo.name)
					}).then(() => {
						resolve(reposArray)
					})
				})
				.catch(error => {
					reject(error)
				})
		})
	}


	function listRepoIssues(userid, repo, state) {
		var ghApp = cache.get('GithubApp')
		var appToken = ghApp[0].token
		var owner = ghApp[0].account

		var options = {
			url: `${GITHUB_API}/repos/${owner}/${repo}/issues?state=${state}`,
			method: 'GET',
			headers: getAppHeaders(appToken),
			json: true
		}

		request(options)
			.then(repoIssues => {
				var msg = {}
				msg.unfurl_links = false
				if (repoIssues.length > 0) {
					msg.attachments = []
					msg.text = `Issues of <https://www.github.com/${owner}/${repo}|${owner}/${repo}>:`
				} else {
					msg.text = `There aren't any issues on <https://www.github.com/${owner}/${repo}|${owner}/${repo}>`
				}
				Promise.each(repoIssues, function (issue) {
					var attachement = slackMsgs.attachment()
					var title = issue.title
					var url = issue.html_url
					var num = `#${issue.number}`
					attachement.text = `${title} <${url}|${num}>`

					if (issue.state.includes('open')) {
						attachement.color = 'good'
					} else {
						attachement.color = 'danger'
					}
					msg.attachments.push(attachement)
				}).done(() => {
					robot.messageRoom(userid, msg)
				})
			})
			.catch(err => { console.log(err) })
	}

	function listIssueComments(userid, issueNum, repo = null) {
		var ghApp = cache.get('GithubApp')
		var appToken = ghApp[0].token
		var owner = ghApp[0].account

		var cred = getCredentials(userid)
		if (!cred) { return 0 }

		var options = {
			url: `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNum}/comments`,
			method: 'GET',
			headers: getUserHeaders(cred.token),
			json: true
		}

		request(options)
			.then(issueComments => {
				var msg = {}
				msg.unfurl_links = false
				var repo_url = `${GITHUB_API}/repos/${owner}/${repo}`

				if (issueComments.length > 0) {
					msg.attachments = []
					msg.text = `Comments of <${repo_url}/issues/${issueNum}|issue #${issueNum}> of <${repo_url}|${repo}> repo:`
				} else {
					msg.text = `<${repo_url}/issues/${issueNum}|Issue #${issueNum}> of repository ${repo} hasn't any comments yet.`
				}
				Promise.each(issueComments, function (comment) {
					var attachement = slackMsgs.attachment()
					var body = comment.body
					var created_at = dateFormat(new Date(comment.created_at), 'mmm dS yyyy, HH:MM')
					var url = comment.html_url
					var user = comment.user.login
					attachement.color = 'warning'
					attachement.pretext = `*${user}* commented on <${url}|${created_at}>`
					attachement.text = body

					msg.attachments.push(attachement)
				}).done(() => {
					robot.messageRoom(userid, msg)
				})

			})
			.catch(err => {
				//TODO handle error codes: i.e. 404 not found -> dont post
				console.log(err)
			})
	}

	function createIssue(userid, repo, owner, title, body, label, assignees) {
		var cred = getCredentials(userid)
		if (!cred) { return 0 }

		var dataString = {
			title: title,
			body: body,
			labels: label,
			assignees: assignees
		}

		var options = {
			url: `${GITHUB_API}/repos/${owner}/${repo}/issues`,
			method: 'POST',
			body: dataString,
			headers: getUserHeaders(cred.token),
			json: true
		}

		request(options)
			.then(res => {
				console.log(res)
			})
			.catch(err => {
				//TODO handle error codes: i.e. 404 not found -> dont post
				console.log(err)
			})
	}


	/*************************************************************************/
	/*                          helpful functions                            */
	/*************************************************************************/


	function getCredentials(userid) {

		try {
			var token = cache.get(userid).github_token
			var username = cache.get(userid).github_username

			if (!token || !username) { // catch the case where username or token are null/undefined
				throw error
			}
		} catch (error) {
			oauthLogin(userid)
			return false
		}
		return {
			username: username,
			token: token
		}
	}

	function getUserHeaders(token) {
		return {
			'Authorization': `token ${token}`,
			'Accept': 'application/vnd.github.machine-man-preview+json',
			'User-Agent': 'Hubot For Github'
		}
	}

	function getAppHeaders(token) {
		return {
			'Authorization': `Bearer ${token}`,
			'Accept': 'application/vnd.github.machine-man-preview+json',
			'User-Agent': 'Hubot For Github'
		}
	}
	function oauthLogin(userid) {
		// TODO change message text 
		robot.messageRoom(userid, `<${bot_host_url}/auth/github?userid=${userid}|login>`);
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

	function errorHandler(userid, error) {
		// TODO change the messages
		if (error.statusCode == 401) {
			robot.messageRoom(userid, c.jenkins.badCredentialsMsg)
		} else if (error.statusCode == 404) {
			robot.messageRoom(userid, c.jenkins.jobNotFoundMsg)
		} else {
			robot.messageRoom(userid, c.errorMessage + 'Status Code: ' + error.statusCode)
			robot.logger.error(error)
		}
	}

	function updateConversationContent(userid, content) {
		cache.set(userid, { content: content })
	}


	function getSlackUser(username) {

		var userids = cache.get('userIDs')

		for (var i = 0; i < userids.length; i++) {
			var id = userids[i]

			var user = cache.get(id)
			var githubUsername
			try {
				var githubUsername = user.github_username
				if (githubUsername == username) {
					return robot.brain.userForId(id)
				}
			} catch (e) {

			}
			return 'false'
		}
	}
}
