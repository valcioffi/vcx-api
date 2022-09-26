const express = require('express')
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const authorizedHosts=process.env.VCX_HOSTS_AUTHORIZED.split(", ");

function checkHost(req){
    if( authorizedHosts.includes(req.headers.origin) )
        return true;
    else
        return false;
}

function getSettings(req, name){
    return (process.env["VCX_SETTINGS_"+name+"_"+((req.headers.origin).toUpperCase().replace(/[^\w\s]/gi, ''))]) ?? (process.env["VCX_SETTINGS_"+name+"_default"]);
}

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', authorizedHosts);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);

    next();
});


app.post('/email', (req, res) => {
    const email = req.body;

    if(checkHost(req)){
        var nodemailer = require('nodemailer');

        const providerName = getSettings(req, "USERNAME");
        const providerEmail = getSettings(req, "EMAIL");

        var transporter = nodemailer.createTransport({
        service:  process.env.VCX_EMAIL_SERVICE,
        auth: {
            user: process.env.VCX_EMAIL_ADDRESS,
            pass: process.env.VCX_EMAIL_PASSWORD
        }
        });
        console.log(req.headers.origin.replace(/[^\w\s]/gi, ''))


        var mailOptions = {
            from: req.query.senderName+" <"+process.env.VCX_EMAIL_ADDRESS+">",
            to: providerName+' <'+providerEmail+">",
            subject: process.env.VCX_EMAIL_SUBJECT.replace("$USER_NAME", req.query.senderName),
            text: process.env.VCX_EMAIL_TEXT.replace("$CONTENT", req.query.message),
            replyTo: req.query.senderEmail
        };

        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                res.send({type: "Error", message:'Error '+error.name+": "+error.message});
            } else {

                if(req.query.sendCopy){
                    var copyOptions = {
                        from: providerName+" <"+process.env.VCX_EMAIL_ADDRESS+">",
                        to: req.query.senderName+" <"+req.query.senderEmail+">",
                        subject: "Copy of: "+process.env.VCX_EMAIL_SUBJECT.replace("$USER_NAME", req.query.senderName),
                        text: process.env.VCX_EMAIL_TEXT_COPY.replace("$USERNAME", req.query.senderName).replace("$CONTENT", req.query.message),
                        replyTo: providerEmail
                    };
                    transporter.sendMail(copyOptions, function(error2, info2){
                        if (error2) {
                            res.send({type: "Copy Error", message:'Copy Error '+error2.name+" (the email has been sent, the copy has not): "+error2.message});
                        } else {
                            res.send({type: "Success", message:'Email sent: ' + info.response});
                        }
                    });
                } else {
                    res.send({type: "Success", message:'Email sent: ' + info.response});
                }
            }
        });
    }
    else
        res.send({type: "Error", message: 'Unauthorized host '+req.headers.origin+"."});

});

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));