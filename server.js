// declaration of required modules
const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

// SQLite initialization
const sqlite3 = require('sqlite3').verbose();

// create a directory to store uploaded images
const uploadDirectory = './static/uploads';
const storage = multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
        callback(null, file.originalname); // use the original file name
    }
});
const upload = multer({ storage });

// setting Express.js server variables
const app = express();
app.use(bodyParser.json()); // add body-parser middleware
const port = 8080;

// configure express-session middleware
app.use(session({
    secret: 'secret-key', 
    resave: false,
    saveUninitialized: true,
}));

// serve static files from the "public" directory
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, '/static/html/login_register.html'));
  });
app.use(express.static(path.join(__dirname, '/static')));
app.use(express.urlencoded({ extended: true })); // enable parsing of form data

// saltrounds variable for password hashing
const saltRounds = 10;

// define a route to handle the form submission
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    // open a connection to the SQLite database
    const db = new sqlite3.Database('clm_database.db');
    
    // check if the username exists in the database
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, [username], (err, row) => {
        if (err) {
            // handle the error
            res.status(500).json({ error: 'Server error' });
        } 
        else {
            // username is available, proceed with registration
            // hash and store the password, insert the new user into the database, etc.

            bcrypt.hash(password, saltRounds, function(err,hash) {

                // insert the user into the database
                const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
                db.run(sql, [username, hash], (err) => {
                    if (err) {
                        console.error(err.message);
                        res.send('Registration failed.');
                    } else {
                        // res.send('Registration successful!');
                        res.redirect('/html/register_success.html');
                    }
                    db.close();
                });
            })
        }
    });
});

// define a route to check if the username provided already exists in the database (called in login_register.html)
app.post('/check-username', (req, res) => {
    const { username } = req.body;

    // open a connection to the SQLite database
    const db = new sqlite3.Database('clm_database.db');

    const sql = 'SELECT username FROM users WHERE username = ?';
    db.get(sql, [username], (err, row) => {
        if (err) {
            // handle the database error, e.g., by sending a 500 Internal Server Error response
            res.status(500).json({ error: 'Database error' });
        } else {
            // if row exists, the username is taken; otherwise, it's available
            // using the double ! operator we essentialy assign true to the const if a row exists and false if it doesn't
            const exists = !!row;
            res.json({ exists });
        }
        db.close();
    });
});


// define a route to handle login form submissions
app.post('/login', (req, res) => {

    const { username, password } = req.body;

    // open a connection to the SQLite database
    const db = new sqlite3.Database('clm_database.db');

    // retrieve the hashed password from the database based on the provided username
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, [username], (err, row) => {
        if (err) {
        console.error(err.message);
        res.send('Login failed.');
        } else if (row) {
        const hashedPasswordFromDatabase = row.password;

        // compare the submitted password with the stored hash
        bcrypt.compare(password, hashedPasswordFromDatabase, function(err, result) {
            if (result) {
            // Passwords match, login successful
            const userId = row.user_id; // Retrieve the user ID from the database row
            console.log('User ID:', userId);

            // you can set the user's ID in the session or handle it as needed here
            req.session.userId = userId;

            // redirect to a secured page 
            res.redirect('/html/index.html');
            } else {
            // Passwords do not match, login failed
            res.redirect('/html/failed_login.html');
            }
            db.close();
        });
        } else {
            // user not found
            res.redirect('/html/failed_login.html');
            db.close();
        }
    });
});

// define a route to handle image uploads 
app.post('/upload', upload.single('image'), (req, res) => {
    var { originalname } = req.file;

    // check if the user is logged in
    if (req.session.userId) {
        const db = new sqlite3.Database('clm_database.db');

        // check if the filename already exists for the specific user
        const sqlCheck = 'SELECT COUNT(*) AS count FROM user_images WHERE user_id = ? AND filename = ?';

        db.get(sqlCheck, [req.session.userId, originalname], (checkErr, row) => {
            if (checkErr) {
                console.error(checkErr.message);
                res.send('Image upload failed.');
            } else {
                if (row.count > 0) {
                    // Duplicate found, display a warning message
                    res.send(`
                    <script>
                        alert('Warning: An image with this filename already exists. Please choose a different image.');
                        window.location.href = './html/index.html'; // Redirect to the original page 
                    </script>
                `);
                } else {
                    // filename is unique, insert the image information into the database
                    const sqlInsert = 'INSERT INTO user_images (user_id, filename) VALUES (?, ?)';
                    db.run(sqlInsert, [req.session.userId, originalname], (insertErr) => {
                        if (insertErr) {
                            console.error(insertErr.message);
                            res.send('Image upload failed.');
                        } else {
                            // redirect to the annotator page passing the image filename as a query parameter
                            res.redirect(`/annotator/annotator.html?originalname=${originalname}`);
                        }
                    });
                }
            }
        });
    } else {
        res.send('User is not logged in.');
    }
});

// define a route to add the coordinates from the image annotation to the database (called in annotator.js)
app.get('/setCoordinates', (req, res) => {
    const coordinates = req.query.coordinates;
    const originalname = req.query.image_id;
    if (req.session.userId) {
        const db = new sqlite3.Database('clm_database.db'); 

        const sql = 'UPDATE user_images SET coordinates = ? WHERE user_id = ? AND filename = ?';
        db.run(sql, [coordinates, req.session.userId, originalname], (err) => {
            if (err) {
                console.error(err.message);
                res.send('Image upload failed.');
            } 
            else {
                res.redirect('/html/index.html');
            }
        })          
    } else {
        res.send('User is not logged in.');
    }
});

// define a route to discard the upload of an image in annotator.html
// (also used for deleting already uploaded images in client.js and annotator.html)
app.get('/discardUpload', (req, res) => {
    const originalname = req.query.image_id;
    if (req.session.userId) {
        const db = new sqlite3.Database('clm_database.db'); 

        const sql = 'DELETE FROM user_images WHERE user_id = ? AND filename = ?';
        db.run(sql, [req.session.userId, originalname], (err) => {
            if (err) {
                console.error(err.message);
                res.send('Discard upload failed.');
            } 
            else {
                res.redirect('/html/index.html'); 
            }
        })          
    } else {
        res.send('User is not logged in.');
    }
}); 

// define a route to fetch the images' names from the database (called in client.js)
app.get('/getSelectData', (req, res) => {
    const db = new sqlite3.Database('clm_database.db');
    // fetch data from the database 
    userId = req.session.userId;
    const sql = 'SELECT filename FROM user_images WHERE user_id = ?';
    db.all(sql, [req.session.userId], (err, rows) => {
        if (err) {
            console.error('Error fetching custom images:', err);
            res.status(500).send('Internal Server Error');
        }   
        
        else if (rows && rows.length > 0) {
        
            // extracting the filename without the extension which will be displayed in index.html as an option
            const customImagesNames = rows.map((row) => path.parse(row.filename).name);
            // extracting the full filename with the extension which will later be set as an attribute for each image
            const extensions = rows.map((row) => row.filename);

            // create an object with both arrays
            const responseData = {
                selectData: customImagesNames,
                imageExtensions: extensions
            };
 
            // send the data as JSON in the response
            res.json(responseData);
            }  
        else {
            // handling the JSON response in the case the user hasn't uploaded any custom images
            const selectData = [];
            const extensions = [];
            const responseData = {
                selectData: selectData,
                imageExtensions: extensions
            };
            res.json(responseData);
        }            
    })
});  

// define a route to fetch image data from the database (called in client.js)
app.get('/getImages', (req, res) => {
    const db = new sqlite3.Database('clm_database.db'); 
    userId = req.session.userId;
    const sql = 'SELECT filename, coordinates FROM user_images WHERE user_id = ?';
    db.all(sql, [req.session.userId], (err, rows) => {
        if (err) {
            console.error('Error fetching custom images:', err);
            res.status(500).send('Internal Server Error');
        }   
        else if (rows && rows.length > 0) {
            // define the image directory
            const image_url = "../uploads/";
        
            // map rows to the desired format
            const imageData = rows.map((row) => ({
                id: path.parse(row.filename).name,
                path: image_url + row.filename,
                coordinates: row.coordinates // add the coordinates to the response
            }));               
            // send the data as JSON in the response
            res.json(imageData);
            }
        else {
            // handling the JSON response in case the user hasn't uploaded any custom images
            const imageData = [];
            res.json(imageData);
        };               
    })
});

// start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});