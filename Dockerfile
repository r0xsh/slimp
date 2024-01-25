FROM node:lts-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Bundle app source
COPY . .


# Install any needed packages
RUN npm install


EXPOSE 7676

# Define the command to run your app
CMD [ "node", "src/app.js" ]

