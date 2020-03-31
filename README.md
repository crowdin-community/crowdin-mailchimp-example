# crowdin-mailchimp-example

An example to showcase the integration of [Mailchimp](https://mailchimp.com/) and [Crowdin Enterprise](https://crowdin.com/enterprise)

The goal of this project is to show how easily you can create and deploy your Crowdin Application.

Using this Application you can easily localize your Mailchimp content in Crowdin Enterprise.

## Table of contents

* [Requirements](#requirements)
* [Running](#running)
    * [Local Environment](#local-environment)
    * [Heroku](#heroku)
* [App Installation in Crowdin](#app-installation-in-crowdin)
* [Project Structure](#project-structure)
* [Creating an App](#creating-an-app)
    * [Configuration](#configuration)
    * [Database](#database)
    * [Authorization](#authorization)
    * [Content management](#content-management)
        * [Fetching localizable content](#fetching-localizable-content)
        * [Pull content to Crowdin](#pull-content-to-crowdin)
        * [Push translations to service](#push-translations-to-service)
* [Contributing](#contributing)
* [Authors](#authors)
* [License](#license)

### Requirements
- Node.js 12.x.x
- npm 6.x.x

### Running

First of all, you need to clone the repository:

```console
git clone https://github.com/crowdin-community/crowdin-mailchimp-example.git
```

#### Local environment

1. Install dependencies
    ```console
    cd crowdin-mailchimp-example
    ```

   ```console
   npm install
   ```

2. Create `keys.js` file:

    ```console
    cp keys.sample.js keys.js
    ```

3. Open `keys.js` file and fill in the following credentials:

    | Variable                  | Description |
    |---------------------------|-------------|
    | `crowdinClientId`<br>`crowdinClientSecret`| [Crowdin OAuth](https://support.crowdin.com/enterprise/creating-oauth-app/) Client ID and Client Secret
    | `IntegrationClientId`<br>`IntegrationClientSecret`| [Mailchimp OAuth](https://mailchimp.com/developer/guides/how-to-use-oauth2/) Client ID and Client Secret
    | `UniqueCryptoSecret` | Unique random string. Will be used to encrypt data in DB

4. Start Node server (default port is 7000):

    - Use [ngrok](https://ngrok.com/) to make your server public:

    ```console
    ngrok http 7000
    ```

    - Open `keys.js` file and fill in `<your_ngrok_tunnel>`

    - Run the command below in the App directory:

    ```console
    node index.js
    ```

    Or you can use [nodemon](https://www.npmjs.com/package/nodemon) for running Node server, watching changes in the project and automatically reload server:

    - Install globally:
    ```console
    npm install -g nodemon
    ```

    - Start server using *nodemon*:

    ```console
    nodemon --watch crowdin-mailchimp-example crowdin-mailchimp-example/index.js
    ```

#### Heroku
- [Install Heroku CLI and Log In](https://devcenter.heroku.com/articles/getting-started-with-nodejs#set-up)

- Navigate to the project directory:

```console
cd crowdin-mailchimp-example
```

- Create `keys.js` file:

```console
cp keys.sample.js keys.js
```

- Open `keys.js` file and fill in you `<app_name>`

- Create Heroku App:

```console
heroku create <app_name>
```

- Add Postgres add-on to your App:

```console
heroku addons:create heroku-postgresql:hobby-dev
```

- Navigate to your App settings and define the following Config Vars:

| Variable                    | Description                                                                           |
|--------------------------------------------------------|---------------------------------------------------------------------------------------|
| `CROWDIN_CLIENT_ID`<br>`CROWDIN_CLIENT_SECRET`         | [Crowdin OAuth](https://support.crowdin.com/enterprise/creating-oauth-app/) Client ID and Client Secret
| `INTEGRATION_CLIENT_ID`<br>`INTEGRATION_CLIENT_SECRET` | [Mailchimp OAuth](https://mailchimp.com/developer/guides/how-to-use-oauth2/) Client ID and Client Secret
| `CRYPTO_SECRET`                                        | Unique random string. Will be used to encrypt data in DB

Also you can fill in appropriate variables in `keys.js` file instead of defining environment variables.

- Deploy your code:

```console
git push heroku master
```

For more about Node.js Apps on Heroku read "[Getting Started on Heroku with Node.js](https://devcenter.heroku.com/articles/getting-started-with-nodejs)" article.

### App Installation in Crowdin

1. In the upper-right corner, click your profile photo and select *Organization Settings*.
2. Select *Apps* tab and click **Install Application**.
3. Fill in the Manifest URL:
    - for local environment with ngrok: `https://<your_ngrok_tunnel>.ngrok.io/manifest.json`
    - for Heroku App: `https://<app_name>.herokuapp.com/manifest.json`
4. Click **Install** button.
5. Now your App will be available on *Integrations & API* tab for each project of the current organization.

### Project structure

| Name                               | Description                                                                 |
|------------------------------------|-----------------------------------------------------------------------------|
| assets/logo.png                    | App logo
| models/integration.js              | Logic to work with external service (configuring OAuth links, tokens, content management)
| models/organization.js             | Logic to work with Crowdin (authorization, files list, translation progress)
| templates/app.html                 | Small front application that configured to work with current backend
| templates/closeAuthModal.html      | Helper file to close integration authModal and reload the page
| uploadToCrowdin.js                 | Code to upload files for localization to Crowdin
| uploadToIntegration.js             | Code to upload translations to external service
| passportSetup.js                   | Configuration file for authentication on the external service side
| config.js                          | App Configuration file
| db_connect.js                      | Database configuration file
| middleware.js                      | Routes validation, checking and providing some important data
| index.js                           | Application backend routes configuration file
| helpers.js                         | Small helper things

### Creating an app
This example is created for the purpose to show how easy to create Crowdin App and provide an opportunity to create a new App from a template with minimal effort.

#### App logo

Change *assets/logo.png* to your own. Recommended dimensions are 50x50px. File name cannot be modified.

#### Configuration

App configuration located in *config.js* file. Each field with possible values described in the table below:

| Field           | Description                               | Possible values                                        |
|-----------------|-------------------------------------------|--------------------------------------------------------|
|identifier       | Unique identifier for your App            | Alphanumeric, dash, and underscore are allowed. Length 3-255 symbols
|name             | Name of your App. Will be displayed in the Apps list | 3-255 symbols
|baseUrl          | App URL. e.g. `https://<app_name>.herokuapp.com` | Valid URL
|authentication   | Authentication type. Required if you want to make API calls to Crowdin | An object with the following keys:<br> -`type`: `none` or `authorization_code`<br>-`client_id` - [OAuth App](https://support.crowdin.com/enterprise/creating-oauth-app/) Client ID (required only for `authorization_code` type)
|events           | Endpoints which Crowdin will trigger when certain events occur | -`installed` - an event when App being installed into organization <br>-`uninstall` - an event when App being uninstalled
|scopes           | Defines the access type your application needs | [Understanding Scopes for OAuth Apps](https://support.crowdin.com/enterprise/understanding-scopes-for-oauth-apps/)
|modules          | Defines the place where App will appear in Crowdin UI |
|integrations     | Integrations tab on Project page | An array of objects with the following keys:<br>-`key` - unique alphanumeric key. Used in the App URL<br>-`name` - App name. Will be displayed on the App card<br>-`description` - App description<br>-`logo` - App logo<br>-`url` - An App route which will be opened in IFrame

#### Database

Database is used to store Crowdin, Mailchimp OAuth tokens (for executing API requests) and Crowdin files to Mailchimp files mapping. By default, Postgres is used for production and Sqlite for local environment.

If you want to use another DB, feel free to change it in *db_connect.js* file. For more about all possible databases read [Sequelize](https://sequelize.org/) docs.

#### Authorization

This example is using [Passport.js](http://www.passportjs.org/) for authentication on the Mailchimp side.

You can simply choose the authentication strategy you need in *passportSetup.js* file by replacing `passport-mailchimp` to your own. Also, you need to provide your own strategy in `passport.authenticate()` method calls.

#### Content management

Content management in this type of integrations is based on pulling content to Crowdin from external service and pushing back localized content.

##### Fetching localizable content

First of all, you need to fetch localizable content from external service and display it on the right side of App.

Code responsible for localizable content fetching is located in *models/integration.js* file. You need to implement `getData` function returning an array of objects representing file items.

You need to follow the structure below in the `getData` response:

```yaml
[
    {
        id: <file unique ID>,
        name: <file name>,
        parent_id: <Id of parent item (directory or branch). default - 0>,
        type: <File type. e.g. html>,
        icon: <Custom icon URL (optional)>,
        node_type: nodeTypes.FOLDER | nodeTypes.FILE | nodeTypes.BRANCH,
    },
    {
      ...
    },
    ...
]
```

##### Pull content to Crowdin

Code responsible for pulling localizable content is located in the *uploadToCrowdin.js* file. 

This example is using [Crowdin API v2 Client](https://github.com/crowdin/crowdin-api-client-js) for making API requests to Crowdin.
For more details about Crowdin API v2 read the [documentation](https://support.crowdin.com/enterprise/api/).

There are few steps to upload files for localization:
- Using `fileIds` (external service file IDs selected in UI) you need get files content by using external service API.
- Fill `integrationFiles` array with objects with the following structure: `{"title": "...", "name": "...", "content": "..."}`.
- In the `crowdinApi.uploadStorageApi.addStorage` method call provide right filename (It depends on content type provided by external service).
- The next code will do all the necessary work.

##### Push translations to service

Code responsible for pushing localized content into external service is located in the *uploadToIntegration.js* file.

There are few steps to push localized content into external service:
- In the `translations` array stored list of Crowdin file IDs and language IDs selected for pushing translations.
- Implement external service files fetching in the `prepareData` method.
- Implement translations upload in `updateIntegrationFile` method according to external service API requirements.

### Contributing
If you find any problems or would like to suggest a feature, please feel free to file an issue on Github at [Issues Page](https://github.com/crowdin-community/crowdin-mailchimp-example/issues).

Also, we are happy to accept contributions from community. For more details about how to contribute read the [CONTRIBUTING.md](/CONTRIBUTING.md) file.

### Authors
- Yevhen Oliynyk

### License
```
The Crowdin-Mailchimp example is licensed under the MIT License. 
See the LICENSE file distributed with this work for additional 
information regarding copyright ownership.

Except as contained in the LICENSE file, the name(s) of the above copyright 
holders shall not be used in advertising or otherwise to promote the sale, 
use or other dealings in this Software without prior written authorization.
```