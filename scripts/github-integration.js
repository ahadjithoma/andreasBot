// Commands:
//	 `github login`
//	 `github repos`
//	 `github open|closed|all issues of repo <repo_name>`
//	 `github commits of repo <repo_name>`
//	 `github issues of repo <repo_name>`

//	 `github issue <issue_num>` - get the the commit of the last repo lookup
//	 `github repo <repo_name> issue <issue_num> comments`
//	 `github issue reply <comment_text>`

// convert this to the above 2nd	
//	 `github comments of issue <issue num> of repo <repo_name>`

//	 `github (open|closed|all) pull requests of repo <repo_name>` - Default: open
//	 `github create issue`
//	 `github open|closed|all pull requests of all repos`
// 	 `github show sumup open|closed|all`

// 	 `github sumup( all| closed| open|)`

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
var color = require('./colors.js')
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
var githubURL = 'https://www.github.com/'

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
		var userid = res.message.user.id
		var repo = res.match.pop()
		var state = res.match[1].trim()
		if (state == '') {
			state = 'open'
		}
		updateConversationContent(userid, { github_repo: repo })
		listRepoIssues(userid, repo, state)
	})

	robot.respond(/github comments of issue (\d+) of repo (.*)/i, function (res) {
		var userid = res.message.user.id
		var repo = res.match[2].trim()
		var issueNum = res.match[1].trim()
		updateConversationContent(userid, { github_repo: repo, github_issue: issueNum })
		// updateConversationContent(userid, { github_issue: issueNum })
		listIssueComments(userid, issueNum, repo)
	})

	robot.respond(/github (open |closed |all |)pull requests of repo (.*)/i, function (res) {
		var userid = res.message.user.id
		var state = res.match[1].trim()
		var repo = res.match[2].trim()
		listPullRequests(userid, repo, state)
	})

	robot.respond(/github (open |closed |all |)pull requests of all repos/i, function (res) {
		var userid = res.message.user.id
		var state = res.match[1].trim()
		listPullRequestsForAllRepos(userid, state)
	})

	robot.respond(/github commits( of)?( repo)? (.*)/i, function (res) {
		var repo = res.match.pop().trim()
		var userid = res.message.user.id
		updateConversationContent(userid, { repo: repo })
		listRepoCommits(userid, repo)
	})
	robot.on('listRepoCommits', function (result, res) {
		var userid = res.message.user.id
		var since = result.parameters['date-time']
		var repoName = result.parameters['repo']
		listRepoCommits(userid, repoName, since)
	})

	// TODO: maybe replace it with api.ai
	robot.respond(/\bgithub\s(create|open)\sissue\b/i, function (res) {
		var userid = res.message.user.id
		dialog.startDialog(switchBoard, res, convModel.createIssue)
			.then(data => {
				createIssue(userid, 'anbot', data.title, data.body)
			})
			.catch(err => console.log(err))
	})

	//TODO
	robot.respond(/github issue comment (.*)/i, function (res) {
		var commentText = res.match.pop()
	})
	robot.respond(/github issue (\d+) comment (.*)/i, function (res) {
		var userid = res.message.user.id
		var issueNum = res.match[1]
		var commentText = res.match.pop()
		var repo = getConversationContent(userid, 'github_repo')
		if (repo) {
			createIssueComment(userid, repo, issueNum, commentText)
		} else {
			// TODO: send the bellow msg or use api.ai event to ask for the repo
			robot.messageRoom(userid, 'Sorry but i dont have your last repo lookup.'
				+ '\nYou need to search for a repo first for this command. i.e. `github commits repo <repo_name>`'
				+ '\nor use another command to specify repo as well.')
		}
	})

	// TODO 
	robot.respond(/^github issue (\d+) comment$/, function (res) {
		var issueNum = res.match[1]
		// ask for the comment text	
	})

	function createIssueComment(userid, repo, issueNum, comment) {
		var ghApp = cache.get('GithubApp')
		var appToken = ghApp[0].token
		var owner = ghApp[0].account

		var cred = getCredentials(userid)
		if (!cred) { return 0 }

		var dataString = { body: comment }
		var options = {
			url: `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNum}/comments`,
			method: 'POST',
			body: dataString,
			headers: getUserHeaders(cred.token),
			json: true
		}

		request(options)
			.then(r => {
				robot.messageRoom(userid, `Comment added on issue #${issueNum} of repo ${repo}!`)
			})
			.catch(error => {
				robot.logger.error(error)
				robot.messageRoom(userid, error.message)
			})
	}

	robot.on('githubSumUp', function (userid, query, saveLastSumupDate) {
		listGithubSumUp(userid, query, saveLastSumupDate)
	})

	robot.respond(/github sum-?ups?( all| closed| open|)/i, function (res) {
		var queryObj, state
		state = res.match[1].trim()
		if (state != null) {
			queryObj = { state: state }
		}
		else {
			queryObj = { state: 'open' }
		}
		listGithubSumUp(res.message.user.id, queryObj, false)
	})

	robot.respond(/github (close |re-?open )issue (\d+) repo (.*)/i, function (res) {
		var userid = res.message.user.id
		var repoName = res.match[3].trim()
		var issueNum = parseInt(res.match[2])
		var state = res.match[1].trim()
		if (state.includes('open')) {
			state = 'open'
		} else {
			state = 'closed'
		}
		updateIssue(userid, repoName, issueNum, { state: state })

	})

	/*************************************************************************/
	/*                             API Calls                                 */
	/*************************************************************************/
	function updateIssue(userid, repo, issueNum, updateObj) {
		var ghApp = cache.get('GithubApp')
		var owner = ghApp[0].account

		var cred = getCredentials(userid)
		if (!cred) { return 0 }

		var options = {
			url: `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNum}`,
			method: 'PATCH',
			headers: getUserHeaders(cred.token),
			body: updateObj,
			json: true
		}

		request(options).then(res => {
			console.log(res)
		}).catch(error => {
			robot.messageRoom(userid, error.message)
			robot.logger.error(error)
		})


	}

	function listPullRequestsForAllRepos(userid, state) {
		getAccesibleReposName(userid)
			.then(repos => {
				for (var i = 0; i < repos.length; i++) {
					listPullRequests(userid, repos[i], state)
				}
			})
			.catch(error => {
				robot.messageRoom(user, c.errorMessage)
				robot.logger.error(error)
			})
	}

	function listGithubSumUp(userid, query, saveLastSumupDate = false) {
		var ghApp = cache.get('GithubApp')
		var orgName = ghApp[0].account

		var credentials = getCredentials(userid)
		if (!credentials) { return 0 }

		if (saveLastSumupDate) {
			var date = new Date().toISOString()
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

		getAccesibleReposName(userid)
			.then(repos => {
				var sinceText = ''
				if (query.since) {
					sinceText = ` since *${dateFormat(new Date(query.since), 'mmm dS yyyy, HH:MM')}*`
				}
				robot.messageRoom(userid, `Here is your github summary${sinceText}:`)
				for (var i = 0; i < repos.length; i++) {
					var repoName = repos[i]
					Promise.mapSeries([
						`<${githubURL}${orgName}/${repoName}|[${orgName}/${repoName}]>`,
						getCommitsSumup(userid, repoName, query.since),
						getIssuesSumup(userid, repoName, query.state, query.since),
						getPullRequestsSumup(userid, repoName, query.state)
					], function (sumupMsg) {
						return sumupMsg
					}).then(function (data) {
						var msg = {
							unfurl_links: false,
							text: `${data[0]}`,
							attachments: []
						}
						for (var i = 1; i < data.length; i++) {
							msg.attachments.push(data[i])
						}
						return msg
					}).then((msg) => {
						robot.messageRoom(userid, msg)
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
	function getPullRequestsSumup(userid, repo, state = '') {
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
					var attachment = slackMsgs.attachment()
					var quantityText, s = 's'
					if (pullRequests.length > 1) {
						quantityText = 'There are ' + pullRequests.length
					}
					else if (pullRequests.length == 1) {
						quantityText = 'There is 1'
						s = ''
					}
					else {
						quantityText = 'There are no'
					}
					if (state == '' || state == 'all') {
						state = 'open/closed'
					}
					attachment.text = `${quantityText} (${state}) ${bold('pull request' + s)}.`
					attachment.color = color.rgbToHex(parseInt(pullRequests.length) * 25, 0, 0)
					resolve(attachment)
				})
				.catch(error => {
					reject(error)
				})
		})
	}

	// TODOs: as mentioned in displayPullRequestsSumup
	function getIssuesSumup(userid, repo, state = '', since = '') {
		var ghApp = cache.get('GithubApp')
		var appToken = ghApp[0].token
		var owner = ghApp[0].account

		if (since) {
			since = `&since=${since}`
		} else {
			since = ''
		}
		var options = {
			url: `${GITHUB_API}/repos/${owner}/${repo}/issues?state=${state}${since}`,
			method: 'GET',
			headers: getAppHeaders(appToken),
			json: true
		}
		return new Promise((resolve, reject) => {
			request(options)
				.then(issues => {
					var attachment = slackMsgs.attachment()
					var s = ''
					if (issues.length > 1) {
						s = 's'
					}
					attachment.text = `${issues.length} ${bold('issue' + s)} (including PRs) created or updated.`
					attachment.color = color.rgbToHex(parseInt(issues.length) * 25, 0, 0)
					resolve(attachment)
				})
				.catch(error => {
					reject(error)
					// robot.logger.error(error)
					// robot.messageRoom(userid, c.errorMessage)
				})
		})

	}

	// TODOs: as mentioned in displayPullRequestsSumup
	function getCommitsSumup(userid, repo, since = '') {
		var ghApp = cache.get('GithubApp')
		var appToken = ghApp[0].token
		var owner = ghApp[0].account

		if (since) {
			since = `?since=${since}`
		} else {
			since = ''
		}
		var options = {
			url: `${GITHUB_API}/repos/${owner}/${repo}/commits${since}`,
			method: 'GET',
			headers: getAppHeaders(appToken),
			json: true
		}

		return new Promise((resolve, reject) => {
			request(options)
				.then(commits => {
					var attachment = slackMsgs.attachment()
					var s = 's'
					var commitsNum = commits.length
					if (commitsNum == 1) {
						s = ''
					}
					if (commitsNum == 30) { // 30 = the max commits github returns
						commitsNum = '30 or more'
					}
					attachment.text = `${commitsNum} ${bold('commit' + s)} were made.`
					attachment.color = color.rgbToHex(parseInt(commitsNum) * 25, 0, 0)
					resolve(attachment)
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
					var attachment = slackMsgs.attachment()
					var title = pr.title
					var url = pr.html_url
					var num = pr.number
					attachment.text = `<${url}|#${num} ${title}>`


					attachment.author_name = pr.user.login
					attachment.author_link = pr.user.html_url
					attachment.author_icon = pr.user.avatar_url

					if (pr.state.includes('open')) {
						attachment.color = 'good'
					} else {
						attachment.color = 'danger'
					}
					msg.attachments.push(attachment)
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

		/* (Possible feature) having more than one Github App installations  */
		var installations = cache.get('GithubApp').length
		for (var i = 0; i < installations; i++) {
			var ghApp = cache.get('GithubApp')
			var installation_id = ghApp[i].id

			var options = {
				url: `${GITHUB_API}/user/installations/${installation_id}/repositories`,
				headers: getUserHeaders(cred.token),
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

	function getAccesibleReposName(userid) {

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

	function listRepoCommits(userid, repo, since) {
		var ghApp = cache.get('GithubApp')
		var appToken = ghApp[0].token
		var owner = ghApp[0].account

		var parameters = ''
		if (since) {
			parameters = `?since=${since}`
		}

		var options = {
			url: `${GITHUB_API}/repos/${owner}/${repo}/commits${parameters}`,
			method: 'GET',
			headers: getAppHeaders(appToken),
			json: true
		}

		request(options)
			.then(repoCommits => {
				var msg = { attachments: [] }
				var attachment = slackMsgs.attachment()
				msg.unfurl_links = false

				if (repoCommits.length > 0) {
					msg.attachments = []
					msg.text = `Commits of <${githubURL}${owner}/${repo}|${owner}/${repo}>:`
				} else {
					msg.text = `<${githubURL}${owner}/${repo}|{${owner}/${repo}]>: No Commits found`
				}

				Promise.each(repoCommits, function (commit) {
					var authorUsername = commit.author.login;
					var authorURL = githubURL + authorUsername;
					var commitID = commit.sha.substr(0, 7);		 	// get the first 7 chars of the commit id
					var commitMsg = commit.commit.message.split('\n', 1); 	// get only the commit msg, not the description
					var commitURL = commit.html_url;
					commitID = "`" + commitID + "`"
					attachment.text += `\n<${commitURL}|${commitID}> ${commitMsg} - ${authorUsername}`;
				}).then(() => {
					msg.attachments.push(attachment)
				}).done(() => {
					robot.messageRoom(userid, msg)
				})
			})
			.catch(err => { console.log(err) })
	}

	function listRepoIssues(userid, repo, state = 'open') {
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
					var attachment = slackMsgs.attachment()
					var title = issue.title
					var url = issue.html_url
					var num = `#${issue.number}`
					var userLogin = issue.user.login
					var userAvatar = issue.user.avatar_url
					var userUrl = issue.user.html_url

					attachment.author_name = userLogin
					attachment.author_icon = userAvatar
					attachment.author_link = userUrl
					attachment.text = ` <${url}|${num}>: ${title}`

					if (issue.state.includes('open')) {
						attachment.color = 'good'
					} else {
						attachment.color = 'danger'
					}
					msg.attachments.push(attachment)
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
				var repo_url = `${githubURL}${owner}/${repo}`

				if (issueComments.length > 0) {
					msg.attachments = []
					msg.text = `<${repo_url}|[${owner}/${repo}]> <${repo_url}/issues/${issueNum}|Issue #${issueNum}>:`
				} else {
					msg.text = `<${repo_url}/issues/${issueNum}|Issue #${issueNum}> of repository ${repo} hasn't any comments yet.`
				}
				Promise.each(issueComments, function (comment) {
					var attachment = slackMsgs.attachment()
					var body = comment.body
					// tODO: should i use created_at instead of updated_at 	?
					var ts = Date.parse(comment.updated_at) / 1000//dateFormat(new Date(comment.created_at), 'mmm dS yyyy, HH:MM'
					var url = comment.html_url
					var userLogin = comment.user.login
					var userUrl = comment.user.html_url
					var userAvatar = comment.user.avatar_url

					attachment.author_name = userLogin
					attachment.author_icon = userAvatar
					attachment.author_link = userUrl
					attachment.ts = ts
					attachment.color = 'warning'
					// attachment.pretext = `*${user}* commented on <${url}|${created_at}>`
					attachment.text = body

					msg.attachments.push(attachment)
				}).done(() => {
					robot.messageRoom(userid, msg)
				})

			})
			.catch(err => {
				//TODO handle error codes: i.e. 404 not found -> dont post
				console.log(err)
			})
	}

	function createIssue(userid, repo, title, body, label = [], assignees = []) {
		var cred = getCredentials(userid)
		if (!cred) { return 0 }

		var ghApp = cache.get('GithubApp')
		var owner = ghApp[0].account

		var dataObj = {
			title: title,
			body: body,
			labels: label,
			assignees: assignees
		}

		var options = {
			url: `${GITHUB_API}/repos/${owner}/${repo}/issues`,
			method: 'POST',
			body: dataObj,
			headers: getUserHeaders(cred.token),
			json: true
		}

		request(options)
			.then(res => {
				// TODO: maybe format the massage and give a url for the issue
				robot.messageRoom(userid, `issue created. `)
				// console.log(res)
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
				throw `User credentials not found. userid: ${userid}`
			}
		} catch (error) {
			console.log(error)
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

	function getConversationContent(userid, key) {
		try {
			var content = cache.get(userid, content)[key]
			if (!content) {
				throw 'content ' + key + ' for userid ' + userid + ' not found.'
			} else {
				return content
			}
		} catch (error) {
			return false
		}
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
			return false
		}
	}

	function bold(text) {
		if (robot.adapterName == 'slack') {
			return `*${text}*`
		}
		// Add any other adapters here  
		else {
			return text
		}
	}
}
