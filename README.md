# Mood.fm
Spotify playlist generator based on audio features requested by user.

## How to Use
1. Clone this project or download zip
2. Create a <a href="https://developer.spotify.com/dashboard/login">Spotify Developers account</a>
3. Register an application and go into dashboard for the newly created application
4. Here you will find your Client ID, Client Secret, and the abiliy to add a redirect URI. Create a redirect URI in 'Edit Settings' and insert all of your information into their respective variables in `app.js`
5. Install Node.js (either from terminal or from <a href="https://nodejs.org/en/download/">Node.js website</a>)
6. `cd` to directory where your project is
7. Type `npm install` into command line to download all dependencies
8. Type `node app.js` into command line to start running application locally
9. Go to localhost:5000 in your browser and you should be able to start generating playlists

## Additional Resources
<a href="https://developer.spotify.com/documentation/web-api/">Spotify Web API Documentation</a>

