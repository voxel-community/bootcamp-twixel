## Generating a new Remix project

💿 Open your terminal and run this command:

```sh
npx create-remix@latest
```

<docs-info>

This may ask you whether you want to install `create-remix` to run the command. Enter `y`. It will only be installed temporarily to run the setup script.

</docs-info>

When the fun Remix animation is finished, it'll ask you a few questions. We'll call our app "remix-jokes", choose the "Remix App Server" deploy target, use TypeScript, and have it run the installation for us:

```
R E M I X

💿 Welcome to Remix! Let's get you set up with a new project.

? Where would you like to create your app? remix-jokes
? Where do you want to deploy? Choose Remix if you're unsure, it's easy to change deployment targets. Remix
 App Server
? TypeScript or JavaScript? TypeScript
? Do you want me to run `npm install`? Yes
```

Remix can be deployed in a large and growing list of JavaScript environments. The "Remix App Server" is a full-featured [Node.js](https://nodejs.org) server based on [Express](https://expressjs.com/). It's the simplest option and it satisfies most people's needs, so that's what we're going with for this tutorial. Feel free to experiment in the future!

Once the `npm install` has completed, we'll change into the `remix-jokes` directory:

💿 Run this command

```sh
cd remix-jokes
```

Now you're in the `remix-jokes` directory. All other commands you run from here on out will be in that directory.

💿 Great, now open that up in your favorite editor and let's explore the project structure a bit.