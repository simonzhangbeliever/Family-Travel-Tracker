import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "Xu19940521",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

async function getCurrentUsers() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}


async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1;",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

app.get("/", async (req, res) => {
  const currentUser = await getCurrentUsers();
  const countries = await checkVisisted();
  const color = currentUser.color;
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: color,
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try { 
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      const currentUser = await getCurrentUsers();
      const countries = await checkVisisted();
      const color = currentUser.color;
      res.render("index.ejs", {
        countries: countries,
        total: countries.length,
        users: users,
        color: color,
        error: "Country has already been added, try again.",
  });

      console.log(err);
    }
  } catch (err) {
    const currentUser = await getCurrentUsers();
    const countries = await checkVisisted();
    const color = currentUser.color;
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: color,
      error: "Country name does not exist, try again."
  });
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const name = req.body.name;
  const color = req.body.color;
  try {
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES($1, $2) RETURNING id;",
      [name, color]
    );
    currentUserId = result.rows[0].id;
    res.redirect("/");
  } catch {
    res.render("new.ejs", {
      error: "This name has already been used, please enter a different name."
    });
  }
    
    
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
