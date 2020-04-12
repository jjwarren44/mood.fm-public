var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = 'YOUR-CLIENT-ID'; // Your client id, found in Spoitfy Developers Dashboard
var client_secret = 'YOUR-CLIENT-SECRET'; // Your client secret, found in Spoitfy Developers Dashboard
var redirect_uri = 'YOUR-REDIRECT-URL'; // Your redirect uri, created in Spoitfy Developers Dashboard
var access_token;
var user_id;
var display_name;

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
    .use(cors())
    .use(cookieParser());

app.get('/login', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // Request authorization
    var scope = 'user-read-private user-read-email playlist-modify-public';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', function(req, res) {

    // Requests refresh and access tokens after checking the state parameter
    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                access_token = body.access_token,
                    refresh_token = body.refresh_token;

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function(error, response, body) {
                    var today = new Date();
                    var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
                    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
                    user_id = body.id;
                    display_name = body.display_name;
                    console.log(`${display_name} logged in on ${date} at ${time}`);
                });

                // Pass the token to the browser to make requests
                res.redirect('/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }));
            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

// Generate playlist based on user input
app.get('/create_playlist', function(req, res) {

    // Log playlist paramaters
    console.log(`${display_name} attempting to make playlist with parameters:`);
    console.log(req.query);

    var params = req.query;
    var artistID = params.artist.trim();

    // Search for artist ID
    var artistQuery = function() {
        var options = {
            url: 'https://api.spotify.com/v1/search?' +
                querystring.stringify({
                    q: artistID,
                    type: 'artist',
                    limit: 1
                }),
            headers: { 'Authorization': 'Bearer ' + access_token },
            json: true
        };

        request.get(options, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                artistID = body.artists.items[0].id;
                return findMusic();
            } else {
                console.log('Something went wrong when looking for artist.');
                console.log(error);
            }
        });
    };

    // Perform query for music based on user inputs
    var findMusic = function() {
        var playlistParams = {
            url: 'https://api.spotify.com/v1/recommendations?' +
                querystring.stringify({
                    limit: parseInt(params.numSongs, 10),
                    market: 'US',
                    seed_genres: params.genre,
                    seed_artists: artistID,
                    target_valence: params.valence,
                    target_danceability: params.danceability,
                    target_energy: params.energy,
                    target_instrumentalness: params.instrumentalness,
                    target_acousticness: params.acousticness
                }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            json: true
        };

        // Ask for list of songs that match user criteria
        request.get(playlistParams, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                // Create array of track uri's
                var uris = [];
                body.tracks.forEach(track => uris.push(track.uri));
                return createPlaylist(uris);
            } else {
                console.log('Something went wrong when searching for music.');
                console.log(error);
            }
        });
    };

    // Perform query for music if user didn't specify artist
    var findMusicWithoutArtist = function() {
        var playlistParams = {
            url: 'https://api.spotify.com/v1/recommendations?' +
                querystring.stringify({
                    limit: parseInt(params.numSongs, 10),
                    market: 'US',
                    seed_genres: params.genre,
                    target_valence: params.valence,
                    target_danceability: params.danceability,
                    target_energy: params.energy,
                    target_instrumentalness: params.instrumentalness,
                    target_acousticness: params.acousticness
                }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            json: true
        };

        // Ask for list of songs that match user criteria
        request.get(playlistParams, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                // Create array of track uri's
                var uris = [];
                body.tracks.forEach(track => uris.push(track.uri));
                return createPlaylist(uris);
            } else {
                console.log('Something went wrong when searching for music.');
                console.log(error);
            }
        });
    };


    // Create a playlist in user's account
    var createPlaylist = function(uris) {
        options = {
            url: `https://api.spotify.com/v1/users/${user_id}/playlists`,
            body: {
                'name': params.playlistName,
                'description': 'Made with Mood.fm',
                'public': true
            },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            json: true
        };

        request.post(options, function(error, response, body) {
            if (!error && response.statusCode === 201) {
                var playlist_id = body.id;
                return addSongs(playlist_id, uris, params.playlistName);
            } else {
                console.log('Something went wrong while creating playlist.');
                console.log(error);
            }
        });

    };

    // Add songs to playlist
    var addSongs = function(playlist_id, uris, playlist_name) {
        options = {
            url: `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
            body: {
                'uris': uris
            },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            },
            json: true
        }

        request.post(options, function(error, response, body) {
            if (!error && response.statusCode === 201) {
                console.log(`Playlist ${playlist_name} created`);
                res.send({
                    'playlist_id': playlist_id
                });
            } else {
                console.log('Something went wrong while adding songs to playlist.');
                console.log(error);
            }
        });
    }

    // Start building playlist
    if (artistID == '' || artistID == ' ') {
        return findMusicWithoutArtist();
    } else {
        return artistQuery();
    }

});

app.set('port', (process.env.PORT || 5000));

// Start node server
app.listen(app.get('port'), function() {
    console.log('Node server is running on port ' + app.get('port'));
});