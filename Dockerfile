FROM node:6.11.0-slim

RUN mkdir /opt/hubot
WORKDIR /opt/hubot

# Install Dependencies
RUN npm install -g hubot coffee-script yo generator-hubot

# user node
RUN chown -R node /opt/hubot
USER node

# Install Hubot
RUN yo hubot --owner="Andreas Hadjithoma" --name="Hubot" --description="Hubot for chatOps" --adapter=slack --defaults --allow-root

# Install Slack adapter
RUN npm install hubot-slack


# Load Scripts
ADD scripts/ /opt/hubot/scripts
ADD external-scripts.json /opt/hubot/external-scripts.json

# Install App's Dependecnies
ADD package.json /opt/hubot/package.json
RUN npm install

# Set Environment Variables

# Set port 
EXPOSE 8080

# Run
CMD ["./bin/hubot", "--adapter", "slack"]