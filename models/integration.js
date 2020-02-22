var _ = require('underscore');
var jwt = require('jsonwebtoken');

const jwtSecret = '23544325dfafdasdf!#@%#dd';
const cryptoSecret = 'asdfasdfasdlkk!!@';

module.exports = function(sequelize, DataTypes){
    const Integration = sequelize.define('Integration',{
        uid: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        integrationToken: {
            type: DataTypes.STRING,
        },
        integrationRefreshToken: {
            type: DataTypes.STRING,
        },
        integrationTokenExpiresIn: {
            type: DataTypes.STRING,
        },
        mapingFiles: {
            type: DataTypes.STRING,
        }
    });

   


    // User.prototype.generateToken = function (type) {
    //     if(typeof type !== 'string'){
    //         return undefined;
    //     }

    //     try{
    //         var stringData = JSON.stringify({id: this.get('id'), type: type});
    //         var encryptedData = cryptojs.AES.encrypt(stringData, cryptoSecret).toString();
    //         var token = jwt.sign({
    //             token: encryptedData
    //         }, jwtSecret);
    //         return token;
    //     } catch (e) {
    //         return undefined;
    //     }
    // }

    Integration.authenticate = function (body){
        return new Promise (function(resolv, reject){
            if(typeof body.email !== 'string' || typeof body.password !== 'string'){
                reject();
            }
            User.findOne({where: {
                email: body.email
            }}).then(function(user){
                if(!user || !bcrypt.compareSync(body.password, user.get('password_hash'))){
                    reject();
                }
                resolv(user);
            })
        })
    }

    // User.findByToken = function (token){
    //     return new Promise (function(resolv, reject){
    //         try {
    //             var decodedJWT = jwt.verify(token, jwtSecret);
    //             var bytes = cryptojs.AES.decrypt(decodedJWT.token, cryptoSecret);
    //             var tokenData =  JSON.parse(bytes.toString(cryptojs.enc.Utf8));

    //             User.findOne({where: {
    //                 id: tokenData.id
    //             }}).then(function(user){
    //                 if(!user){
    //                     reject();
    //                 }
    //                 resolv(user);
    //             }, function(e){
    //                 reject()
    //             })
    //         } catch (e) {
    //             reject();
    //         }
    //     })
    // }

    return Integration;
};