//USER SCHEMA --------------------------------------
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');



var UserSchema = new Schema({
    name: String,
    username: {type: String, required: true, index: {unique: true}}, //username cannot be duplicate
    password: {type:String, required: true, select: false}  //select:false when we query list of users or single user, no need to provide password
});

//hash the password before the user is saved
UserSchema.pre('save', function(next){
    var user = this;
    //hash password only if the password has been changed or user is new
    if(!user.isModified('password')) return next();

    //generate the ash
    bcrypt.hash(user.password, null, null, function(err, hash){
        if(err) return next(err);

        //change the password to the hashed version
        user.password = hash;
        next();
    });
});
//method to compare a given password with the database hash
UserSchema.methods.comparePassword = function(password){
    var user = this;
    return bcrypt.compareSync(password, user.password);
};

//return the model
module.exports = mongoose.model('User', UserSchema)