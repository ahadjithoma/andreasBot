'use strict';

var gql = require('graphql-request');



module.exports = function (robot) {
    robot.respond(/ql/, function (res) {
        const client = new gql.GraphQLClient('https://api.github.com/graphql', {
            headers: {
                Authorization: `token ${process.env.HUBOT_GITHUB_TOKEN}`,
            },
        })

        const query = ` {
  repository(owner:"octocat", name:"Hello-World") {
    issues(last:20, states:CLOSED) {
      edges {
        node {
          title
          url
          labels(first:5) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
    }
  }
}`
        console.log(client);
        client.request(query).then(data => console.log(data.repository.issues.edges[1].node.title)).catch(error => console.log(error));


    })
}
