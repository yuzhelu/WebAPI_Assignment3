//MOVIE SCHEMA
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MovieSchema = new Schema({
    Title: {type: String, required: true, index:{unique:true}},
    Year: {type: String, required: true},
    Genre: {type: String, required: true},
    //Array of 3 actors
    Actors:[{actorName:String, characterName: String}]
});

MovieSchema.pre('save', function (next){
    if(this.Actors.length < 3){
        return next(new Error('Fewer than 3 Actors'));
    }
    next()
});

module.exports = mongoose.model('Movie', MovieSchema);