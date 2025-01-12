import { useState } from "react";
import Authors from "./components/Authors";
import Books from "./components/Books";
import NewBook from "./components/NewBook";
import LoginForm from "./components/LoginForm";
import Recomendation from "./components/Recomendation";


const App = () => {
  const [page, setPage] = useState("authors");
  const [token, setToken] = useState(null);
 
  // const updateCacheWith = (addedBook) => {
  //   const includedIn = (set, object) =>
  //     set.map((p) => p.id).includes(object.id);

  //   const dataInStore = client.readQuery({ query: ALL_BOOKS });
  //   if (!includedIn(dataInStore.allBooks, addedBook)) {
  //     client.writeQuery({
  //       query: ALL_BOOKS,
  //       data: { allBooks: dataInStore.allBooks.concat(addedBook) },
  //     });
  //     console.log(client.readQuery({query: ALL_BOOKS}))
  //     // client.refetchQueries({
  //     //   include: [ALL_BOOKS, ALL_BOOKS_GENRE]
  //     // })
  //   }
  // };

  // useSubscription(BOOK_ADDED, {
  //   onData: ({ data }) => {
  //     if (data.data) {
  //       const addedBook = data.data.bookAdded;
  //       console.log("Libro añadido recibido:", addedBook);
  //       alert(`${addedBook.title} added`);
  //       updateCacheWith(addedBook);
  //     } else {
  //       console.warn("No se recibió data en la suscripción");
  //     }
  //   },
  //   onError: (error) => {
  //     console.error("Error en la suscripción:", error);
  //   },
  // });

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
