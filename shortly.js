var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var knex = require('knex');
var Bookshelf = require('bookshelf');
var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// app.get('/', passport.authenticate('login'));

// function(req, res) {
//   // res.redirect(link.get('http://127.0.0.1:4568/login'))
//   res.render('index')

// passport.use(new LocalStrategy(
//   function(username, password, done) {
//     User.findOne({ username: username }, function (err, user) {
//       if (err) { return done(err); }
//       if (!user) {
//         return done(null, false, { message: 'Incorrect username.' });
//       }
//       if (!user.validPassword(password)) {
//         return done(null, false, { message: 'Incorrect password.' });
//       }
//       return done(null, user);
//     });
//   }
// ));
// passport.authenticate()
app.get('/', function(req, res){
  // res.render('index');
  // res.render('login');
  //if auth credentials posessed, render index
  ////else: redirect to login.
  //use: cookieparser: sessions.
  res.redirect('/login');
});

app.get('/login', function(req, res){
  res.render('login');
});

app.get('/create',
function(req, res) {
  res.render('signup');
});

app.get('/links',
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/login', function(req, res){
  console.log('post to /login');
  // console.log('req obj:', req);
  console.log(req.body.username);
  var newUser = new User({username: req.body.username}).fetch().then(function(fetched){
    console.log('fetched : ', fetched);
    if (fetched.attributes.password === req.body.password){
      console.log('successful auth');
      res.redirect('/');
    }else{
      res.redirect('/create');
    }
  });
  // db.knex('users').where('username', '=', req.body.username).then(function(users) {
  //             if (users.length === 0) {
  //               res.redirect();
  //             } else{
  //               console.log('successful Login');
  //             }
  // });
});

// app.post('/', function(req, res){
//   console.log('post to /');
// });


app.post('/links',
function(req, res) {
  console.log("POST TO APP POST ");
  var uri = req.body.url;
  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  console.log("REQ.PARAMS[0] :  ", req.params[0])
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            console.log(link.get('url'));
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
