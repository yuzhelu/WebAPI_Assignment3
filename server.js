
//BASE SETUP=========================================

//call packages---------------------------------
var express = require('express');   //call express
var app = express();    //define our app using express
var bodyParser = require('body-parser');    //get body-parser
var morgan = require('morgan'); //use to see requests
var mongoose = require('mongoose'); //for working w/ our database
var port = process.env.PORT || 8080;    //set port for app
var User = require('./app/models/user');
var jwt = require('jsonwebtoken');
var Movie = require('./app/models/movie');
var superSecret = 'topSecret';

var dotenv = require('dotenv').config();    //need for process.env.DB



//APP CONFIGURATION -----------------------------
//use body parser so we can grab info from post requests
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

//configure our app to handle CORS requests
app.use(function(req,res, next){
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
    next();
});

//log all requests to the console
app.use(morgan('dev'));

//connect to our database hosted on mlab
mongoose.connect('mongodb://tester:test@ds261838.mlab.com:61838/webapi');


//ROUTES FOR API ===========================================

//basic route for homepage------------
app.get('/', function(req, res){
    res.send('Welcome to the home page!');
});

app.post('/signup', function (req, res){
    var user = new User;
    user.name = req.body.name;
    user.password = req.body.password;
    user.username = req.body.username;

    user.save(function(err){
        if(err){
            if(err.code == 11000)
                return res.json({success: false, message: "User already exists"});
            else
                return res.send(err);
        }
        res.json({message: 'User Created'});
    });

});
//get an instance of the express router-----
var apiRouter = express.Router();


//route for authenticating users
apiRouter.post('/login', function(req, res){
    User.findOne({
        username: req.body.username
    }).select('name username password').exec(function(err,user){
        if(err) throw err;

        //no users
        if(!user){
            res.json({success:false, message: 'Authentication failed. User not found.'});
        }
        else if(user){
            //check valid pass
            var validPassword = user.comparePassword(req.body.password);
            if(!validPassword){
                res.json({success: false, message: 'Authentication failed. Wrong password.'});
            }
            else{
                //user found password correct
                //create token
                var token = jwt.sign({
                    name: user.name,
                    username:user.username
                }, superSecret,{
                    expiresIn:60*60*24
                });
                res.json({success:true, message: 'Enjoy your token!',
                token: token});
            }
        }
    });
});

//middleweare to use for all requests/ verify a token
apiRouter.use(function(req, res, next){
    //do logging
    console.log('Somebody just came to our app!');
    //add more middleware later
    //this is where we will authenticate users

    //check header or url parameters or post parametes for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    //decode token
    if(token){

        //verifies secret and checks exp
        jwt.verify(token, superSecret, function(err, decoded){
            if(err){
                return res.status(403).send({
                    success:false, message:'Failed to authenticate token.'
                });
            }
            else{
                //everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        });
    }
    else{
        //there is no token
        //return and HTTP response of 403 access forbidden
        return res.status(403).send({success:false, message:'No token provided.'});
    }
    //next();
});

//other api routes. the authenticated routes
//test route to make sure everythings working
//accessed at GET http://localhost:8080/api
apiRouter.get('/', function(req,res){
    res.json({message:'horray! welcome to our api!'});
});
//more routes for api will happen here

//on routes that end in /users
//-----------------------------------------------
apiRouter.route('/users')
    //create a user(accessed at POST http://localhost8080/api/users)
    .post(function(req, res){
        //create a new instance of the User model
        if(!req.body.username || !req.body.password){
            res.json({success:false, msg: "Please pass username and password"});
        } else {
            var user = new User();

            //set the users information (comes from the request)
            user.name = req.body.name;
            user.username = req.body.username;
            user.password = req.body.password;

            //save the user and check for errors
            user.save(function (err) {
                if (err) {
                    //duplicate entry
                    if (err.code == 11000)
                        return res.json({success: false, message: 'User with that username already exists.'});
                    else
                        return res.send(err);
                }
                res.json({message: 'User created'});
            });
        }
    })
//get all the users (accessed at GET http://localhost:8080/api/users)
    .get(function(req, res){
        User.find(function(err, users){
            if(err) res.send(err);
            //return the users
            res.json(users);
        });
    });


//on routes that end in /users/:user_id
//----------------------------------------------------
apiRouter.route('/users/:user_id')
//get user with that id
    .get(function(req, res){
        User.findById(req.params.user_id, function(err, user){
            if(err) res.send(err);

            //return user
            res.json(user);
        });
    })
    //update users with this username
    .put(function(req, res){
        //user our user model to find user we want
        User.findById(req.params.user_id, function(err, user){
            if(err) res.send(err);
            //update the users info only if it is new
            if(req.body.name) user.name = req.body.name;
            if(req.body.username) user.username = req.body.username;
            if(req.body.password) user.password = req.body.password;

            //save the user
            user.save(function(err){
                if (err) res.send(err);

                //return message
                res.json({message:'User updated'});
            });
        });
    })
//delete users with this id
    .delete(function(req,res){
        User.remove({
            _id: req.params.user_id
        }, function(err, user){
            if(err) return res.send(err);

            res.json({message: 'Successfully deleted'});
        });
    });

//api endpoint to get user information
apiRouter.get('/me', function(req, res){
    res.send(req.decoded);
});
apiRouter.route('/movies')
    .post(function(req, res){
        var movie = new Movie(
            req.body
        );
        movie.save(function(err){
            if(err) res.send(err);

            res.json({message:'movie saved'});
        });


    })
    .get(function(req, res){
        Movie.find(function(err, movies){
            if(err) res.send(err);
            res.json(movies);
        });
    });

apiRouter.route('/movies/:movie_id')
    .get(function(req, res){
        Movie.findById(req.params.movie_id, function(err, movie){
            if(err) res.send(err);
            res.json(movie);
        });
    })
/*
    .put(function(req, res){
        Movie.findById(req.params.movie_id, function(err, movie){
            if(err) res.send(err);
            if(req.body.Title) movie.Title = req.body.Title;
            if(req.body.Year) movie.Year = req.body.Year;
            if(req.body.Genre) movie.Genre = req.body.Genre;

            movie.save(function(err){
                if(err) res.send(err);
                res.json({message:'Movie updated'});
            });
        });
    })
    */
    .delete(function(req, res){
        Movie.remove({_id: req.params.movie_id}, function(err, movie){
            if(err) return res.send(err);

            res.json({message:'Deleted'});
        });
    });


//Register our routes
app.use('/api', apiRouter);
//start server

app.listen(port);
console.log('Check port ' + port);
