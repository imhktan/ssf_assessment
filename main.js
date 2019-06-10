const SQL_SELECT_GAMES = "select * from game where name like ? limit 5";
const SQL_SELECT_COMMENTS = "select * from comment where gid = ? limit 5 offset ?" ;
const hbs = require('express-handlebars')
const express = require('express')
const mysql = require('mysql')
const bodyParser = require('body-parser');
const config = require('./config.json');
const cookieParser = require('cookie-parser');
// const gameModule = require('./lib/game');

const PORT = parseInt(process.argv[2] || process.env.APP_PORT || 3000);

const app = express();
const pool = mysql.createPool(config.bgg);
// const gameEmp = gameModule(pool, "GAME");
//Promises
const mkQuery = (sql, pool) => {
    return ((params) => {
        const p = new Promise((resolve, reject) => {
            pool.getConnection((err, conn) => {
                if (err)
                {
                console.log('err (conn)  :', err);               
                    return reject(err);
                }
                console.info('>>> sql: ' + sql)
                console.info('>> params: ' + params)
                conn.query(sql, params || [], (err, result) => {

                    if (err)
                    {
                    console.log('err (query)  :', err);  
                        return reject(err);
                    }
                    conn.release()
                    console.log('result (conn)  :', result);  
                    resolve(result);
                })
            })
        })
        return (p);
    });
}

const selectGames = mkQuery(SQL_SELECT_GAMES, pool);
const selectComments = mkQuery(SQL_SELECT_COMMENTS, pool);

app.engine('hbs', hbs())
app.set('view engine', 'hbs')
app.set('views', __dirname + '/views');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
// app.get('/game', (req, resp) => {
//     const name = req.query.name;


//     resp.status(200)
//     resp.type('text/html')
//     resp.render('game', { 
//         name: name,
//         layout: false
//     })
// })

//Routes
app.post('/game', (req, resp) => {
    const name = req.body.name;
    const gid = req.body.gid;
    console.log('game name :', name);
    console.log('game gid :', gid);

    //Checkout a connection from the pool
    Promise.all([ selectGames([  `%${name}%` ]) ])
    .then(result => {
        console.info('result: ', result)
        const gdata = result[0];
        console.log('data :', gdata);
        //console.log('result :', result);
        resp.status(200);
        resp.type('text/html');
        resp.cookie("gdata", gdata, 
        { httpOnly: true, maxAge: 1000 * 60 * 60  });

        resp.render('game', { 
            layout: false, 
            name: name,
            gdata: result[0]

        });

    })
    .catch(err => {
        console.error('err: ', err)
        resp.status(500);
        resp.type('text/plain');
        resp.send(err);
    })
});

//Routes
app.get('/comment', (req, resp) => {
    const offset = parseInt(req.query.offset) || 0;
    if ('gdata' in req.cookies) {
        const gdata = req.cookies.gdata;
        console.log('cookies :', gdata[0].name);
    
    console.log('comment name :', gdata[0].name);
    console.log('comment gid :', gdata[0].gid);
    const gid = parseInt(gdata[0].gid);
    //Checkout a connection from the pool
    Promise.all([ selectComments([  gid, offset ]) ])
    .then(result => {
        console.info('result: ', result)
        const cdata = result[0];
        console.log('data :', cdata);
        //console.log('result :', result);
        resp.status(200);
        resp.type('text/html');
        resp.render('comment', { 
            layout: false, 
            name: gdata[0].name,
            year: gdata[0].year,
            ranking: gdata[0].ranking,
            users_rated: gdata[0].users_rated,
            url: gdata[0].url,
            next_offset: (offset + 5), 
            prev_offset: (offset - 5), 
            disable_prev: (offset <= 0)? "disabled": "",
			// disable_next: ((offset + 5) >= result.pagination.total_count)? "disabled": "",
            cdata: result[0]

        });
    })
    .catch(err => {
        console.error('err: ', err)
        resp.status(500);
        resp.type('text/plain');
        resp.send(err);
    })
}
});

app.get(/.*/, express.static(__dirname + '/public'));


app.listen(PORT, () => {
    console.info('Application started at %s on port %d',
        new Date(), PORT);
});