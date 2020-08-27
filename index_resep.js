//import required module
const express = require('express');
const app = express();
const bodyParser = require('body-parser'); //post body handler
const Sequelize = require('sequelize'); //Database ORM
const { check, validationResult } = require('express-validator/check'); //form validation
const { matchedData, sanitize } = require('express-validator/filter'); //sanitize form params
const multer  = require('multer'); //multipar form-data
const path = require('path');
const crypto = require('crypto');

//Set body parser for HTTP post operation
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

//set static assets to public directory
app.use(express.static('public'));
const uploadDir = '/img/';
const storage = multer.diskStorage({
    destination: "./public"+uploadDir,
    filename: function (req, file, cb) {
      crypto.pseudoRandomBytes(16, function (err, raw) {
        if (err) return cb(err)  

        cb(null, raw.toString('hex') + path.extname(file.originalname))
      })
    }
})

const upload = multer({storage: storage, dest: uploadDir });

//Set app config
const port = 8081;
const baseUrl = 'http://localhost:'+port;

//Connect to database
const sequelize = new Sequelize('resep_makanan', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    }
});

//Define models
const resep = sequelize.define('resep', {
    'id': {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    'nama': Sequelize.STRING,
    'deskripsi': Sequelize.TEXT,
    'gambar': {
        type: Sequelize.STRING,
        //Set custom getter for resep gambar using URL
        get(){
            const gambar = this.getDataValue('gambar');
            return uploadDir+gambar;
        }
    },
    
}, {
    //prevent sequelize transform table name into plural
    freezeTableName: true,
})

/**
 * Set Routes for CRUD
 */

//get all resep
app.get('/resep/', (req, res) => {
    resep.findAll().then(resep => {
        res.json(resep)
    })
})

//get resep by id
app.get('/resep/id', (req, res) => {
    resep.findOne({where: {id: req.params.id}}).then(resep => {
        res.json(resep)
    })
})

//Insert operation
app.post('/resep/', [
    //File upload (karena pakai multer, tempatkan di posisi pertama agar membaca multipar form-data)
    upload.single('gambar'),

    //Set form validation rule
    check('id')
        .isLength({ min: 5 })
        .isNumeric()
        .custom(value => {
            return resep.findOne({where: {id: value}}).then(b => {
                if(b){
                    throw new Error('id already in use');
                }            
            })
        }
    ),
    check('nama')
        .isLength({min: 2}),
    check('deskripsi')
     .isLength({min: 10})

],(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.mapped() });
    }

    resep.create({
        nama: req.body.nama,
        id: req.body.id,
        deskripsi: req.body.deskripsi,
        gambar: req.file === undefined ? "" : req.file.filename
    }).then(newresep => {
        res.json({
            "status":"success",
            "message":"resep added",
            "data": newresep
        })
    })
})

//Update operation
app.put('/resep/', [
    //File upload (karena pakai multer, tempatkan di posisi pertama agar membaca multipar form-data)
    upload.single('gambar'),

    //Set form validation rule
    check('id')
        .isLength({ min: 5 })
        .isNumeric()
        .custom(value => {
            return resep.findOne({where: {id: value}}).then(b => {
                if(!b){
                    throw new Error('id not found');
                }            
            })
        }
    ),
    check('nama')
        .isLength({min: 2}),
    check('deskripsi')
     .isLength({min: 10})

],(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.mapped() });
    }
    const update = {
        nama: req.body.nama,
        id: req.body.id,
        deskripsi: req.body.deskripsi,
        gambar: req.file === undefined ? "" : req.file.filename
    }
    resep.update(update,{where: {id: req.body.id}})
        .then(affectedRow => {
            return resep.findOne({where: {id: req.body.id}})      
        })
        .then(b => {
            res.json({
                "status": "success",
                "message": "resep updated",
                "data": b
            })
        })
})

app.delete('/resep/:id',[
    //Set form validation rule
    check('id')
        .isLength({ min: 5 })
        .isNumeric()
        .custom(value => {
            return resep.findOne({where: {id: value}}).then(b => {
                if(!b){
                    throw new Error('id not found');
                }            
            })
        }
    ),
], (req, res) => {
    resep.destroy({where: {id: req.params.id}})
        .then(affectedRow => {
            if(affectedRow){
                return {
                    "status":"success",
                    "message": "resep deleted",
                    "data": null
                } 
            }

            return {
                "status":"error",
                "message": "Failed",
                "data": null
            } 
                
        })
        .then(r => {
            res.json(r)
        })
})


app.listen(port, () => console.log("resep-rest-api run on "+baseUrl ))