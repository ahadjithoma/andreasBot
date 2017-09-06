# # Description:
# #   Helper commands for YNAB Pull Requests
# #
# # Commands:
# #   hubot rebuild - Rebuilds this branch.
# #   hubot ketchup|catchup|catch_up|upbase|reverse integrate|reverse_integrate|backmerge|back_merge - Merges the target branch back into this pull request branch.

# TextMessage = require('hubot').TextMessage
# GitHubApi = require("github"); # https://github.com/mikedeboer/node-github

# module.exports = (robot) ->
#   # Respond requires it to start with the name of the robot

#   githubClient = new GitHubApi(version: "3.0.0", debug:false)
#   githubClient.authenticate
#     type: "oauth",
#     token: process.env.HUBOT_GITHUB_TOKEN

#   robot.on "github-repo-event", (repoEvent) =>

#     # Note that this assumes you are using the Hubot Github adapter, because it tries to comment on a github issue like
#     # user/repo/issueNumber
#     # And that's only valid if you are using the github adapter.
#     # https://github.com/ynab/hubot-github-adapter

#     switch repoEvent.eventType
#       when "pull_request"
#         payload = repoEvent.payload
#         if (payload.action == "opened")
#           robot.send room: 'random', "I'm your friendly neighborhood Github robot, and I can help you with your pull requests. For a list of the things I can do, just write:\n@#{robot.name} help"
#       when "status"
#         payload = repoEvent.payload
#         switch payload.state
#           when "failure", "error" #success, failure, error
#             # We can just comment on this failed commit:
#             repoOwner = payload.repository.owner.login
#             repoName = payload.repository.name
#             # Merge commits have one extra commit inside the first one
#             commitAuthor = payload.commit.author?.login || payload.commit.commit?.author.login
#             githubClient.repos.createCommitComment {
#               user: repoOwner,
#               repo: repoName,
#               sha: payload.commit.sha,
#               commit_id: payload.commit.sha,
#               body: "@#{commitAuthor}: It looks like the last build failed for this commit: [#{payload.description}](#{payload.target_url})"
#             },  (err, success) ->
#               if (err)
#                 robot.logger.error err

#   # TODO: Should preface these commands with "pr" to separate them from others

#   robot.respond /ketchup|catchup|catch_up|upbase|reverse integrate|reverse_integrate|backmerge|back_merge/i, (response) ->
#     githubPayload = response.envelope.message.githubPayload
#     if (githubPayload)

#       getPullRequest githubPayload,
#         (err, pull_request) ->
#           if (err)
#             replyMessage = err.toString()
#           else
#             branch_name = pull_request.head.ref
#             base_branch = pull_request.base.ref
#             pr_branch = pull_request.head.ref

#             if (!pull_request.mergeable)
#               response.send "Unfortunately, there would be merge conflicts, so you'll have to do that merge manually."
#             else if (pull_request.merged)
#               response.send "It looks like this PR has already been merged into #{base_branch}, so what would be the point?"
#             else
#               githubClient.repos.merge {
#                 user: githubPayload.repository.owner.login,
#                 repo: githubPayload.repository.name,
#                 base: pr_branch, # The branch we're merging INTO
#                 head: base_branch # The branch we're merging FROM
#               }, (mergeError, result) ->
#                 if (mergeError)
#                   response.send("I tried merging #{base_branch} into #{pr_branch}, but ran into an error: \n"+mergeError.toString())
#                 else if (result.meta.status == '204 No Content')
#                   response.send("Nothing to do. It looks like #{base_branch} is already merged into #{pr_branch}")
#                 else
#                   response.send("Done! I merged #{base_branch} into this PR (#{pr_branch})...\n")

#   # This is very specific to YNAB's process: Assumes use of Jenkins, etc
#   robot.respond /rebuild/i, (response) ->
#     githubPayload = response.envelope.message.githubPayload
#     if (githubPayload)
#       # Now, let's rebuild
#       # This is the Github command that we need to run:
#       # `jenkins build YNAB_Branch_Builder, branch_to_build=feature/flag_popover`
#       # But of course, we need to know the name of our branch
#       # So first, let's find out if we're in a pull request or not
#       getPullRequest githubPayload,
#         (err, pull_request) ->
#           if (err)
#             replyMessage = err.toString()
#           else
#             branch_name = pull_request.head.ref
#             console.log("You want to rebuild: #{branch_name}")
#             # user = robot.brain.userForId 'broadcast'
#             robot.receive(new TextMessage(response.envelope.message.user, "#{robot.name} jenkins build YNAB_Branch_Builder, branch_to_build=#{branch_name}"))
#             replyMessage = "No problem. I've queued up a Jenkins build for branch '#{branch_name}'."
#           response.send(replyMessage)

#   # Multiline echo - Echos back whatever you type after 'echo'. Useful for testing
#   # robot.respond /echo ([\s\S]*)/mi, (response) ->
#   #   console.log(response)
#   #   response.send(response.match[1])


#   # Helper methods:
#   getPullRequest = (githubPayload, callback) ->
#     if (githubPayload.issue.pull_request?)
#       issueNumber = getIssueNumberFromPayload(githubPayload)
#       githubClient.pullRequests.get {
#         user: githubPayload.repository.owner.login,
#         repo: githubPayload.repository.name,
#         number: issueNumber,
#       }, callback
#     else
#       callback(new Error("This issue isn't a pull request"), null)

#   getPullRequestForBranch = (owner, repo, branchName, callback) ->
#     githubClient.pullRequests.getAll {
#       user: owner,
#       repo: repo,
#       head: "#{owner}:#{branchName}"
#     }, callback

#   getRoomFromRepositoryAndIssue = (payload) ->
#     issueNumber = getIssueNumberFromPayload(payload)
#     return "#{payload.repository.owner.login}/#{payload.repository.name}/#{issueNumber}"

#   getRoomString = (owner, repo, issueNumber) ->
#     return "#{owner}/#{repo}/#{issueNumber}"

#   getIssueNumberFromPayload = (payload) ->
#     issueNumber = payload.issue?.number
#     issueNumber ||= payload.pull_request?.number
#     return issueNumber