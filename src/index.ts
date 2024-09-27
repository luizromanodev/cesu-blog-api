import express, { Request, Response } from "express";
import mysql from "mysql2/promise";
import session from "express-session";

const app = express();

// Configura EJS como a engine de renderização de templates
app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);

const connection = mysql.createPool({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "root",
    database: "unicesumar"
});

// Middleware para permitir dados no formato JSON
app.use(express.json());
// Middleware para permitir dados no formato URLENCODED
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


app.use(session({
    secret: 'my-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));


function isAuthenticated(req: Request, res: Response, next: any) {
    if (req.session.user) {
        return next();
    } else {
        res.redirect('/login');
    }
}

app.get('/', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const [rows] = await connection.query("SELECT * FROM posts ORDER BY created_at DESC LIMIT 5");
        const posts = rows as any[];

        res.render('home/index', { posts });
    } catch (error) {
        console.error("Erro ao buscar os posts:", error);
        res.status(500).send("Erro ao carregar a página inicial.");
    }
});


app.get('/categories', isAuthenticated, async function (req: Request, res: Response) {
    const [rows] = await connection.query("SELECT * FROM categories");
    return res.render('categories/index', {
        categories: rows
    });
});

app.get("/categories/form", isAuthenticated, async function (req: Request, res: Response) {
    return res.render("categories/form");
});

app.post("/categories/save", isAuthenticated, async function(req: Request, res: Response) {
    const body = req.body;
    const insertQuery = "INSERT INTO categories (name) VALUES (?)";
    await connection.query(insertQuery, [body.name]);

    res.redirect("/categories");
});

app.post("/categories/delete/:id", isAuthenticated, async function (req: Request, res: Response) {
    const id = req.params.id;
    const sqlDelete = "DELETE FROM categories WHERE id = ?";
    await connection.query(sqlDelete, [id]);

    res.redirect("/categories");
});


app.get('/users', isAuthenticated, async function (req: Request, res: Response) {
    const [rows] = await connection.query("SELECT * FROM users");
    return res.render('users/index', {
        users: rows
    });
});

app.get("/users/form", async function (req: Request, res: Response) {
    return res.render("users/form");
});

app.post("/users/save", isAuthenticated, async function(req: Request, res: Response) {
    const { name, email, password, role, active } = req.body;
    const isActive = active ? 1 : 0;

    try {
        const insertQuery = `
            INSERT INTO users (name, email, password, role, active, registration_date)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;
        await connection.query(insertQuery, [name, email, password, role, isActive]);

        res.redirect("/users");
    } catch (error) {
        console.error("Erro ao salvar o usuário:", error);
        res.status(500).send("Erro ao salvar o usuário.");
    }
});

app.post("/users/delete/:id", isAuthenticated, async function(req: Request, res: Response) {
    const id = req.params.id;
    const sqlDelete = "DELETE FROM users WHERE id = ?";
    await connection.query(sqlDelete, [id]);

    res.redirect("/users");
});


app.get('/login', (req: Request, res: Response) => {
    const error = req.query.error ? true : false; // Verifica se existe um erro
    res.render('login/login', { error });
});


app.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const [rows] = await connection.query(
            "SELECT * FROM users WHERE email = ? AND password = ? AND active = 1",
            [email, password]
        );

        if ((rows as any).length > 0) {
            const user = (rows as any)[0];
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            };
            
            res.redirect('/users');
        } else {
            res.redirect('/login?error=1');
        }
    } catch (error) {
        console.error("Erro ao autenticar usuário:", error);
        res.redirect('/login?error=1');
    }
});


app.get('/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            console.log('Erro ao destruir a sessão:', err);
        }
        res.redirect('/login');
    });
});

app.listen('3000', () => console.log("Server is listening on port 3000"));
