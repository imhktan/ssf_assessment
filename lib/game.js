const hbs = require('express-handlebars')
const express = require('express')
const bodyParser = require('body-parser');

// const SQL_SELECT_GAME = "select * from employees limit ? offset ?";
const SQL_SELECT_GAME_BY_GID = "select * from employees where emp_no = ?";

module.exports = function(empPool, location) {

    console.info("Initializing: ", location)

    const router = express.Router();

    router.get('/game/:gid', (req, resp) => {
        const empId = parseInt(req.params.gid);
        empPool.getConnection((err, conn) => {
            conn.query(SQL_SELECT_GAME_BY_GID, [ gid ],
                (err, result) => {
                    conn.release();
                    if (result.length <= 0) {
                        resp.status(404)
                        resp.send("Not found");
                        return;
                    }
                    resp.status(200);
                    resp.send(result[0]);
                }
            )
        })
    })

    router.get('/game', (req, resp) => {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        empPool.getConnection((err, conn) => {
            console.error('Error: ', err)
            conn.query(SQL_SELECT_EMPLOYEE, [ limit, offset ],
                (err, result) => {
                    conn.release();
                    console.error('Error: ', err);
                    resp.format({
                        'text/html': () => {
                                resp.status(200);
                                resp.type('text/html');
                                resp.render('employees', { 
                                    employees: result, 
                                    next_offset: (offset + limit), 
                                    prev_offset: (offset - limit), //beware of conrner cases
                                    layout: false
                                }
                            );
                        },
                        'application/json': () => {
                            let empUrls = result
                                    //.filter(r => (r.emp_no % 2) == 0)
                                    .map(r => `/employee/${r.emp_no}`)
                            //for (let r of result) 
                                //empUrls.push(`/employee/${r.emp_no}`);
                            resp.status(200);
                            resp.type('application/json')
                            resp.json(empUrls);
                        },
                        'default': () => { resp.status(417).end(); }
                    })
                }
            )
        })
    })
    return (router);
}