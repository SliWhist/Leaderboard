import sql from "mssql";
import { json } from '@sveltejs/kit';

import * as dotenv from 'dotenv'
import { each } from "svelte/internal";

dotenv.config()

const config = {
	user: process.env.DB_SUBMIT_USER, // better stored in an app setting such as process.env.DB_USER
	password: process.env.DB_SUBMIT_PASSWORD, // better stored in an app setting such as process.env.DB_PASSWORD
	server: process.env.DB_SERVER, // better stored in an app setting such as process.env.DB_SERVER
	database: process.env.DB_NAME, // better stored in an app setting such as process.env.DB_NAME
	authentication: {
		type: 'default'
	},
	options: {
		encrypt: true
	}
}

const classes = ['hunter','fighter','ranger','gunner','force','techter','bouncer','braver','waker'];
const weapons = ['sword','wl','partisan','td','ds','knuckles','katana','sb','rifle','launcher','tmg','bow','rod','talis','wand','jb','takt'];
const runTypes = ['aegis','purple'];
const buffList = ["glen","ilma","ainamanon","nadereh"];
const regionRanks =
{
    "aelio" : [1, 2, 3],
    "retem" : [1, 2, 3],
    "kvaris" : [1, 2],
    "stia" : [1]
};
const regionList =
[
    "aelio",
    "retem",
    "kvaris",
    "stia"
];

export async function POST({ request }) {
    
    const data = await request.json();
    //console.log(data)

    // Iterate over the Party Size

    for (let i = 0; i < Number(data.PartySize); i++) {
        

        // Check the run type validity

        if(!runTypes.includes(data.RunType)) {
            return json({'Code' : 'error', 'Message' : 'RunType was a problem'});
        }

        // Check the trigger option validity

        if(data.Trigger && Number(data.Trigger) != 1 && Number(data.Trigger) != 0) {
            //console.log('trig error');
            return json({'Code' : 'error', 'Message' : 'Trigger was a problem'});
        }


        // Check the buff type validity

        if(data.Buff && !buffList.includes(data.Buff)) {
            //console.log('buff error');
            return json({'Code' : 'error', 'Message' : 'Buff was a problem'});
        }


        // Check the region validity

        if(data.Region && !(regionList.includes(data.Region))) {
            //console.log('region error');
            return json({'Code' : 'error'});
        }


        // Check the rank validity
        
        if(data.Rank && !((regionRanks[data.Region]).includes(Number(data.Rank)))) {
            //console.log('rank error');
            return json({'Code' : 'error'});
        }


        // Check the server validity

        if((data["Player" + (i+1)].Server != 'global') && (data["Player" + (i+1)].Server != 'japan')) {
            return json({'Code' : 'error'});
        }


        // Check the class validity

        if(!classes.includes(data["Player" + (i+1)].MainClass)) {
            return json({'Code' : 'error'});
        }
        if(!classes.includes(data["Player" + (i+1)].SubClass)) {
            return json({'Code' : 'error'});
        }


        // Check the weapon validity

        if(Number(data.PartySize) == 1) {
            (data["Player" + (i+1)].Weapons).forEach((element) => {
                if(!weapons.includes(element)) {
                    return json({'Code' : 'error'});
                }
            });
        }


        // Check the run server validity

        if(Number(data.PartySize) > 1) {
            if((data.RunServer != 'global') && (data.RunServer != 'japan')) {
                return json({'Code' : 'error'});
            }
        }


        // Iterate the videos & validate

        if(data["Player" + (i+1)].Video != null && data["Player" + (i+1)].Video != '') {
            var urls = [
                (data["Player" + (i+1)].Video)
            ];


            // Regex
                
            var b, r, rx = /^(?:https?:)?(?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))([a-zA-Z0-9\_-]{7,15})(?:[\?&][a-zA-Z0-9\_-]+=[a-zA-Z0-9\_-]+)*$/;
                
            for (b = 0; b < urls.length; ++b) {
                r = urls[b].match(rx);
                ////console.log(r[1]);
                youtubeCode = r[1];
            }
            if(youtubeCode == null || youtubeCode == undefined) {
                return json({'Code' : 'error'});
            }
            ////console.log(r[1]);
            var youtubeCode = r[1];
            var youtubeLink = `https://youtu.be/` + youtubeCode;
            data["Player" + (i+1)].Video = youtubeLink;
        }


        // Set the submission time to the present.

        data.SubmissionTime = new Date();


        
    }
    //console.log(data)
    try {
        switch(data.RunType) {
            case 'purple':
                var strsec = Number(data.TimeSeconds).toString();
                if (strsec.length < 2) {
                    strsec = '0' + strsec;
                }
                var strmin = Number(data.TimeMinutes).toString();
                if (strmin.length < 2) {
                    strmin = '0' + strmin;
                }
                var time = strmin+':'+strsec+':00';
                data.Time = time;
                
                /*
                * PARTY RUN LOGIC
                */

                if (Number(data.PartySize) == 4) {

                    var pool = await sql.connect(config);
                    
                    var sqlQuery = `
                    SELECT Users.Information.PlayerID
                    FROM Users.Information
                    
                    WHERE
                    Users.Information.UserID = @uid`
                    results = await pool.request().input('uid',sql.NVarChar,data.SubmitterID).query(sqlQuery);

                    if (results.rowsAffected == 0) {
                        pool.close();
                        return json({'Code' : 'error'});
                    }

                    data.SubmitterID = results.recordset[0].PlayerID;

                    var sqlQuery = `

                    INSERT INTO 
                    Submissions.Party (P1PlayerID,P2PlayerID,P3PlayerID,P4PlayerID,P1RunCharacter,P2RunCharacter,P3RunCharacter,P4RunCharacter,Patch,Region,Rank,Time,P1MainClass,P2MainClass,P3MainClass,P4MainClass,P1SubClass,P2SubClass,P3SubClass,P4SubClass,PartySize,P1Link,P2Link,P3Link,P4Link,Notes,SubmissionTime,SubmitterID,ServerID)
                    VALUES (@p1pid,@p2pid,@p3pid,@p4pid,@p1rc,@p2rc,@p3rc,@p4rc,@patch,@region,@rank,@time,@p1mc,@p2mc,@p3mc,@p4mc,@p1sc,@p2sc,@p3sc,@p4sc,@partysize,@p1link,@p2link,@p3link,@p4link,@notes,@subtime,@subpid,@serverid);`;
                    var date = new Date();
            
                    await pool.request().input('p1pid',sql.Int,data["Player1"].PlayerID).input('p2pid',sql.Int,data["Player2"].PlayerID).input('p3pid',sql.Int,data["Player3"].PlayerID).input('p4pid',sql.Int,data["Player4"].PlayerID).input('p1rc',sql.NVarChar,data["Player1"].VideoName).input('p2rc',sql.NVarChar,data["Player2"].VideoName).input('p3rc',sql.NVarChar,data["Player3"].VideoName).input('p4rc',sql.NVarChar,data["Player4"].VideoName).input('patch',sql.NVarChar,'60R').input('region',sql.NVarChar,data.Region).input('rank',sql.Int,data.Rank).input('time',sql.NVarChar,data.Time).input('p1mc',sql.NVarChar,data["Player1"].MainClass).input('p2mc',sql.NVarChar,data["Player2"].MainClass).input('p3mc',sql.NVarChar,data["Player3"].MainClass).input('p4mc',sql.NVarChar,data["Player4"].MainClass).input('p1sc',sql.NVarChar,data["Player1"].SubClass).input('p2sc',sql.NVarChar,data["Player2"].SubClass).input('p3sc',sql.NVarChar,data["Player3"].SubClass).input('p4sc',sql.NVarChar,data["Player4"].SubClass).input('partysize',sql.Int,data.PartySize).input('p1link',sql.NVarChar,data["Player1"].Video).input('p2link',sql.NVarChar,data["Player2"].Video).input('p3link',sql.NVarChar,data["Player3"].Video).input('p4link',sql.NVarChar,data["Player4"].Video).input('notes',sql.NVarChar,data.Notes).input('subtime',sql.DateTime,date).input('subpid',sql.Int,data.SubmitterID).input('serverid',sql.NVarChar,data.RunServer).query(sqlQuery);
            
                    pool.close();

                    return json({'Code' : 'success'});


                break;


                }

                /*
                * Duo RUN LOGIC
                */

                                if (Number(data.PartySize) == 2) {

                                    var pool = await sql.connect(config);
                                    
                                    var sqlQuery = `
                                    SELECT Users.Information.PlayerID
                                    FROM Users.Information
                                    
                                    WHERE
                                    Users.Information.UserID = @uid`
                                    results = await pool.request().input('uid',sql.NVarChar,data.SubmitterID).query(sqlQuery);
                
                                    if (results.rowsAffected == 0) {
                                        pool.close();
                                        return json({'Code' : 'error'});
                                    }
                
                                    data.SubmitterID = results.recordset[0].PlayerID;
                
                                    var sqlQuery = `
                
                                    INSERT INTO 
                                    Submissions.Party (P1PlayerID,P2PlayerID,P1RunCharacter,P2RunCharacter,Patch,Region,Rank,Time,P1MainClass,P2MainClass,P1SubClass,P2SubClass,PartySize,P1Link,P2Link,Notes,SubmissionTime,SubmitterID,ServerID)
                                    VALUES (@p1pid,@p2pid,@p1rc,@p2rc,@patch,@region,@rank,@time,@p1mc,@p2mc,@p1sc,@p2sc,@partysize,@p1link,@p2link,@notes,@subtime,@subpid,@serverid);`;
                                    var date = new Date();
                            
                                    await pool.request().input('p1pid',sql.Int,data["Player1"].PlayerID).input('p2pid',sql.Int,data["Player2"].PlayerID).input('p1rc',sql.NVarChar,data["Player1"].VideoName).input('p2rc',sql.NVarChar,data["Player2"].VideoName).input('patch',sql.NVarChar,'60R').input('region',sql.NVarChar,data.Region).input('rank',sql.Int,data.Rank).input('time',sql.NVarChar,data.Time).input('p1mc',sql.NVarChar,data["Player1"].MainClass).input('p2mc',sql.NVarChar,data["Player2"].MainClass).input('p1sc',sql.NVarChar,data["Player1"].SubClass).input('p2sc',sql.NVarChar,data["Player2"].SubClass).input('partysize',sql.Int,data.PartySize).input('p1link',sql.NVarChar,data["Player1"].Video).input('p2link',sql.NVarChar,data["Player2"].Video).input('notes',sql.NVarChar,data.Notes).input('subtime',sql.DateTime,date).input('subpid',sql.Int,data.SubmitterID).input('serverid',sql.NVarChar,data.RunServer).query(sqlQuery);
                            
                                    pool.close();
                
                                    return json({'Code' : 'success'});
                
                
                                break;
                
                
                                }

                /*
                * SOLO RUN LOGIC
                */

                else {
                    var pool = await sql.connect(config);
                    var sqlQuery = `SELECT Link FROM Purples.Solo WHERE Link = @Link`;
                    var results = await pool.request().input('Link',sql.NVarChar,data["Player1"].Video).query(sqlQuery);

                    if (results.rowsAffected != 0) {
                        pool.close();
                        return json({'Code' : 'error'});
                    }

                    sqlQuery = `SELECT Link FROM Submissions.Pending WHERE Link = @Link AND SubmissionStatus = 0`;
                    results = await pool.request().input('Link',sql.NVarChar,data["Player1"].Video).query(sqlQuery);
                    if (results.rowsAffected != 0) {
                        pool.close();
                        return json({'Code' : 'error'});
                    }
                    
                    sqlQuery = `
                    SELECT Users.Information.PlayerID
                    FROM Users.Information
                    
                    WHERE
                    Users.Information.UserID = @uid`
                    results = await pool.request().input('uid',sql.NVarChar,data.SubmitterID).query(sqlQuery);

                    if (results.rowsAffected == 0) {
                        pool.close();
                        return json({'Code' : 'error'});
                    }

                    data.SubmitterID = results.recordset[0].PlayerID;


                    data["Player1"].Weapons[0] == null || data["Player1"].Weapons[0] == undefined ? data["Player1"].Weapons[0] == '' : null
                    data["Player1"].Weapons[1] == null || data["Player1"].Weapons[1] == undefined ? data["Player1"].Weapons[1] == '' : null
                    data["Player1"].Weapons[2] == null || data["Player1"].Weapons[2] == undefined ? data["Player1"].Weapons[2] == '' : null
                    data["Player1"].Weapons[3] == null || data["Player1"].Weapons[3] == undefined ? data["Player1"].Weapons[3] == '' : null
                    data["Player1"].Weapons[4] == null || data["Player1"].Weapons[4] == undefined ? data["Player1"].Weapons[4] == '' : null
                    data["Player1"].Weapons[5] == null || data["Player1"].Weapons[5] == undefined ? data["Player1"].Weapons[5] == '' : null


                    var sqlQuery = `

                    INSERT INTO 
                    Submissions.Pending (PlayerID,RunCharacter,Patch,Region,Rank,Time,MainClass,SubClass,W1,W2,W3,W4,W5,W6,Link,Notes,SubmissionTime,SubmitterID)
                    VALUES (@0,@1,@2,@3,@4,@5,@6,@7,@8,@9,@10,@11,@12,@13,@14,@15,@16,@17);`;
                    var date = new Date();
            
                    await pool.request().input('0',sql.Int,data["Player1"].PlayerID).input('1',sql.NVarChar,data["Player1"].VideoName).input('2',sql.NVarChar,'60R').input('3',sql.NVarChar,data.Region).input('4',sql.Int,data.Rank).input('5',sql.NVarChar,data.Time).input('6',sql.NVarChar,data["Player1"].MainClass).input('7',sql.NVarChar,data["Player1"].SubClass).input('8',sql.NVarChar,data["Player1"].Weapons[0]).input('9',sql.NVarChar,data["Player1"].Weapons[1]).input('10',sql.NVarChar,data["Player1"].Weapons[2]).input('11',sql.NVarChar,data["Player1"].Weapons[3]).input('12',sql.NVarChar,data["Player1"].Weapons[4]).input('13',sql.NVarChar,data["Player1"].Weapons[5]).input('14',sql.NVarChar,data["Player1"].Video).input('15',sql.NVarChar,data.Notes).input('16',sql.DateTime,date).input('17',sql.Int,data.SubmitterID).query(sqlQuery);
            
                    pool.close();

                    return json({'Code' : 'success'});
                }

                break;

                /*
                * AEGIS LOGIC
                */

            case 'aegis':
                var strhrs = Number(data.TimeHours).toString();
                if (strhrs.length < 2) {
                    ////console.log("REE");
                    strhrs = '0' + strhrs;
                }
                var strsec = Number(data.TimeSeconds).toString();
                if (strsec.length < 2) {
                    ////console.log("REE");
                    strsec = '0' + strsec;
                }
                var strmin = Number(data.TimeMinutes).toString();
                if (strmin.length < 2) {
                    ////console.log("REE");
                    strmin = '0' + strmin;
                }
                var time = strhrs+':'+strmin+':'+strsec;
                data.Time = time;
                
                /*
                * PARTY RUN LOGIC
                */

                if (Number(data.PartySize) > 1) {

                    
                /*
                * MPA RUN LOGIC
                */

                if (Number(data.PartySize) == 8) {

                    var pool = await sql.connect(config);
                    
                    var sqlQuery = `
                    SELECT Users.Information.PlayerID
                    FROM Users.Information
                    
                    WHERE
                    Users.Information.UserID = @uid`
                    results = await pool.request().input('uid',sql.NVarChar,data.SubmitterID).query(sqlQuery);

                    if (results.rowsAffected == 0) {
                        pool.close();
                        return json({'Code' : 'error'});
                    }

                    data.SubmitterID = results.recordset[0].PlayerID;

                    var sqlQuery = `

                    INSERT INTO 
                    Submissions.DFAegisParty (
                        P1PlayerID,
                        P2PlayerID,
                        P3PlayerID,
                        P4PlayerID,
                        P5PlayerID,
                        P6PlayerID,
                        P7PlayerID,
                        P8PlayerID,
                        P1RunCharacter,
                        P2RunCharacter,
                        P3RunCharacter,
                        P4RunCharacter,
                        P5RunCharacter,
                        P6RunCharacter,
                        P7RunCharacter,
                        P8RunCharacter,
                        Patch,
                        Buff,
                        Drill,
                        Time,
                        P1MainClass,
                        P2MainClass,
                        P3MainClass,
                        P4MainClass,
                        P5MainClass,
                        P6MainClass,
                        P7MainClass,
                        P8MainClass,
                        P1SubClass,
                        P2SubClass,
                        P3SubClass,
                        P4SubClass,
                        P5SubClass,
                        P6SubClass,
                        P7SubClass,
                        P8SubClass,
                        PartySize,
                        P1Link,
                        P2Link,
                        P3Link,
                        P4Link,
                        P5Link,
                        P6Link,
                        P7Link,
                        P8Link,
                        Notes,
                        SubmissionTime,
                        SubmitterID,
                        ServerID,
                        Rank)
                    VALUES (
                        @p1pid,
                        @p2pid,
                        @p3pid,
                        @p4pid,
                        @p5pid,
                        @p6pid,
                        @p7pid,
                        @p8pid,
                        @p1rc,
                        @p2rc,
                        @p3rc,
                        @p4rc,
                        @p5rc,
                        @p6rc,
                        @p7rc,
                        @p8rc,
                        @patch,
                        @region,
                        @rank,
                        @time,
                        @p1mc,
                        @p2mc,
                        @p3mc,
                        @p4mc,
                        @p5mc,
                        @p6mc,
                        @p7mc,
                        @p8mc,
                        @p1sc,
                        @p2sc,
                        @p3sc,
                        @p4sc,
                        @p5sc,
                        @p6sc,
                        @p7sc,
                        @p8sc,
                        @partysize,
                        @p1link,
                        @p2link,
                        @p3link,
                        @p4link,
                        @p5link,
                        @p6link,
                        @p7link,
                        @p8link,
                        @notes,
                        @subtime,
                        @subpid,
                        @serverid,
                        @questrank);`;
                    var date = new Date();
            
                    await pool.request()
                    .input('p1pid',sql.Int,data["Player1"].PlayerID)
                    .input('p2pid',sql.Int,data["Player2"].PlayerID)
                    .input('p3pid',sql.Int,data["Player3"].PlayerID)
                    .input('p4pid',sql.Int,data["Player4"].PlayerID)
                    .input('p5pid',sql.Int,data["Player5"].PlayerID)
                    .input('p6pid',sql.Int,data["Player6"].PlayerID)
                    .input('p7pid',sql.Int,data["Player7"].PlayerID)
                    .input('p8pid',sql.Int,data["Player8"].PlayerID)
                    .input('p1rc',sql.NVarChar,data["Player1"].VideoName)
                    .input('p2rc',sql.NVarChar,data["Player2"].VideoName)
                    .input('p3rc',sql.NVarChar,data["Player3"].VideoName)
                    .input('p4rc',sql.NVarChar,data["Player4"].VideoName)
                    .input('p5rc',sql.NVarChar,data["Player5"].VideoName)
                    .input('p6rc',sql.NVarChar,data["Player6"].VideoName)
                    .input('p7rc',sql.NVarChar,data["Player7"].VideoName)
                    .input('p8rc',sql.NVarChar,data["Player8"].VideoName)
                    .input('patch',sql.NVarChar,'60R')
                    .input('region',sql.NVarChar,data.Buff)
                    .input('rank',sql.Int,data.Trigger)
                    .input('time',sql.NVarChar,data.Time)
                    .input('p1mc',sql.NVarChar,data["Player1"].MainClass)
                    .input('p2mc',sql.NVarChar,data["Player2"].MainClass)
                    .input('p3mc',sql.NVarChar,data["Player3"].MainClass)
                    .input('p4mc',sql.NVarChar,data["Player4"].MainClass)
                    .input('p5mc',sql.NVarChar,data["Player5"].MainClass)
                    .input('p6mc',sql.NVarChar,data["Player6"].MainClass)
                    .input('p7mc',sql.NVarChar,data["Player7"].MainClass)
                    .input('p8mc',sql.NVarChar,data["Player8"].MainClass)
                    .input('p1sc',sql.NVarChar,data["Player1"].SubClass)
                    .input('p2sc',sql.NVarChar,data["Player2"].SubClass)
                    .input('p3sc',sql.NVarChar,data["Player3"].SubClass)
                    .input('p4sc',sql.NVarChar,data["Player4"].SubClass)
                    .input('p5sc',sql.NVarChar,data["Player5"].SubClass)
                    .input('p6sc',sql.NVarChar,data["Player6"].SubClass)
                    .input('p7sc',sql.NVarChar,data["Player7"].SubClass)
                    .input('p8sc',sql.NVarChar,data["Player8"].SubClass)
                    .input('partysize',sql.Int,data.PartySize)
                    .input('p1link',sql.NVarChar,data["Player1"].Video)
                    .input('p2link',sql.NVarChar,data["Player2"].Video)
                    .input('p3link',sql.NVarChar,data["Player3"].Video)
                    .input('p4link',sql.NVarChar,data["Player4"].Video)
                    .input('p5link',sql.NVarChar,data["Player5"].Video)
                    .input('p6link',sql.NVarChar,data["Player6"].Video)
                    .input('p7link',sql.NVarChar,data["Player7"].Video)
                    .input('p8link',sql.NVarChar,data["Player8"].Video)
                    .input('notes',sql.NVarChar,data.Notes)
                    .input('subtime',sql.DateTime,date)
                    .input('subpid',sql.Int,data.SubmitterID)
                    .input('serverid',sql.NVarChar,data.RunServer)
                    .input('questrank',sql.Int,1)
                    .query(sqlQuery);
            

                    pool.close();

                    return json({'Code' : 'success'});


                break;


                }



                /*
                * Duo RUN LOGIC
                */

                if (Number(data.PartySize) == 2) {

                    var pool = await sql.connect(config);
                    
                    var sqlQuery = `
                    SELECT Users.Information.PlayerID
                    FROM Users.Information
                    
                    WHERE
                    Users.Information.UserID = @uid`
                    results = await pool.request().input('uid',sql.NVarChar,data.SubmitterID).query(sqlQuery);

                    if (results.rowsAffected == 0) {
                        pool.close();
                        return json({'Code' : 'error'});
                    }

                    data.SubmitterID = results.recordset[0].PlayerID;

                    var sqlQuery = `

                    INSERT INTO 
                    Submissions.DFAegisParty (P1PlayerID,
                        P2PlayerID,
                        P1RunCharacter,
                        P2RunCharacter,
                        Patch,
                        Buff,
                        Drill,
                        Time,
                        P1MainClass,
                        P2MainClass,
                        P1SubClass,
                        P2SubClass,
                        PartySize,
                        P1Link,
                        P2Link,
                        Notes,
                        SubmissionTime,
                        SubmitterID,
                        ServerID,
                        Rank)
                    VALUES (@p1pid,@p2pid,@p1rc,@p2rc,@patch,@region,@rank,@time,@p1mc,@p2mc,@p1sc,@p2sc,@partysize,@p1link,@p2link,@notes,@subtime,@subpid,@serverid,@questrank);`;
                    var date = new Date();
            
                    await pool.request().input('p1pid',sql.Int,data["Player1"].PlayerID).input('p2pid',sql.Int,data["Player2"].PlayerID).input('p1rc',sql.NVarChar,data["Player1"].VideoName).input('p2rc',sql.NVarChar,data["Player2"].VideoName).input('patch',sql.NVarChar,'60R').input('region',sql.NVarChar,data.Buff).input('rank',sql.Int,data.Trigger).input('time',sql.NVarChar,data.Time).input('p1mc',sql.NVarChar,data["Player1"].MainClass).input('p2mc',sql.NVarChar,data["Player2"].MainClass).input('p1sc',sql.NVarChar,data["Player1"].SubClass).input('p2sc',sql.NVarChar,data["Player2"].SubClass).input('partysize',sql.Int,data.PartySize).input('p1link',sql.NVarChar,data["Player1"].Video).input('p2link',sql.NVarChar,data["Player2"].Video).input('notes',sql.NVarChar,data.Notes).input('subtime',sql.DateTime,date).input('subpid',sql.Int,data.SubmitterID).input('serverid',sql.NVarChar,data.RunServer).input('questrank',sql.Int,1).query(sqlQuery);
            
                    pool.close();

                    return json({'Code' : 'success'});


                break;


                }

                }

                /*
                * SOLO RUN LOGIC
                */

                else {
                    var pool = await sql.connect(config);
                    var sqlQuery = `SELECT Link FROM DFAegis.Solo WHERE Link = @Link`;
                    var results = await pool.request().input('Link',sql.NVarChar,data["Player1"].Video).query(sqlQuery);

                    if (results.rowsAffected != 0) {
                        pool.close();
                        return json({'Code' : 'error'});
                    }

                    sqlQuery = `SELECT Link FROM Submissions.DFAegisSolo WHERE Link = @Link AND SubmissionStatus = 0`;
                    results = await pool.request().input('Link',sql.NVarChar,data["Player1"].Video).query(sqlQuery);
                    if (results.rowsAffected != 0) {
                        pool.close();
                        return json({'Code' : 'error'});
                    }
                    
                    sqlQuery = `
                    SELECT Users.Information.PlayerID
                    FROM Users.Information
                    
                    WHERE
                    Users.Information.UserID = @uid`
                    results = await pool.request().input('uid',sql.NVarChar,data.SubmitterID).query(sqlQuery);

                    if (results.rowsAffected == 0) {
                        pool.close();
                        return json({'Code' : 'error'});
                    }

                    data.SubmitterID = results.recordset[0].PlayerID;


                    data["Player1"].Weapons[0] == null || data["Player1"].Weapons[0] == undefined ? data["Player1"].Weapons[0] == '' : null
                    data["Player1"].Weapons[1] == null || data["Player1"].Weapons[1] == undefined ? data["Player1"].Weapons[1] == '' : null
                    data["Player1"].Weapons[2] == null || data["Player1"].Weapons[2] == undefined ? data["Player1"].Weapons[2] == '' : null
                    data["Player1"].Weapons[3] == null || data["Player1"].Weapons[3] == undefined ? data["Player1"].Weapons[3] == '' : null
                    data["Player1"].Weapons[4] == null || data["Player1"].Weapons[4] == undefined ? data["Player1"].Weapons[4] == '' : null
                    data["Player1"].Weapons[5] == null || data["Player1"].Weapons[5] == undefined ? data["Player1"].Weapons[5] == '' : null


                    var sqlQuery = `

                    INSERT INTO 
                    Submissions.DFAegisSolo (PlayerID,RunCharacter,Patch,Drill,Support,Time,MainClass,SubClass,W1,W2,W3,W4,W5,W6,Link,Notes,SubmissionTime,SubmitterID)
                    VALUES (@0,@1,@2,@3,@4,@5,@6,@7,@8,@9,@10,@11,@12,@13,@14,@15,@16,@17);`;
                    var date = new Date();
            
                    //console.log(data)

                    await pool.request().input('0',sql.Int,data["Player1"].PlayerID).input('1',sql.NVarChar,data["Player1"].VideoName).input('2',sql.NVarChar,'60R').input('3',sql.Int,data.Trigger).input('4',sql.NVarChar,data.Buff).input('5',sql.NVarChar,data.Time).input('6',sql.NVarChar,data["Player1"].MainClass).input('7',sql.NVarChar,data["Player1"].SubClass).input('8',sql.NVarChar,data["Player1"].Weapons[0]).input('9',sql.NVarChar,data["Player1"].Weapons[1]).input('10',sql.NVarChar,data["Player1"].Weapons[2]).input('11',sql.NVarChar,data["Player1"].Weapons[3]).input('12',sql.NVarChar,data["Player1"].Weapons[4]).input('13',sql.NVarChar,data["Player1"].Weapons[5]).input('14',sql.NVarChar,data["Player1"].Video).input('15',sql.NVarChar,data.Notes).input('16',sql.DateTime,date).input('17',sql.Int,data.SubmitterID).query(sqlQuery);
            
                    pool.close();

                    return json({'Code' : 'success'});
                }

                break;
            default:
                return json({'Code' : 'error'})
        }
    }
    catch (err) {
		console.error(err.message);
        return json({'Code' : 'error'})
	}
}