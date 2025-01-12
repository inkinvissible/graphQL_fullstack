import { useState } from "react";
import Authors from "./components/Authors";
import Books from "./components/Books";
import NewBook from "./components/NewBook";
import LoginForm from "./components/LoginForm";
import Recomendation from "./components/Recomendation";

const App = () => {
  const [page, setPage] = useState("authors");
  const [token, setToken] = useState(null);

  return (
    <div>
      <div>
        <button onClick={() => setPage("authors")}>authors</button>
        <button onClick={() => setPage("books")}>books</button>
        {token && <button onClick={() => setPage("add")}>add book</button>}
        {token && (
          <button onClick={() => setPage("recomended")}>recomended</button>
        )}
        {!token && <button onClick={() => setPage("login")}>Login</button>}
      </div>

      <Authors show={page === "authors"} token={token} />

      <Books show={page === "books"} />

      <NewBook show={page === "add"} />

      <LoginForm setToken={setToken} show={page === "login"} />

      <Recomendation show={page === "recomended"} />
    </div>
  );
};

export default App;
