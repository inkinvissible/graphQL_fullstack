import { useQuery, useSubscription } from "@apollo/client";
import { ALL_BOOKS, BOOK_ADDED, ALL_BOOKS_GENRE } from "../queries";
import { useState } from "react";

const Books = (props) => {
  const { data, loading } = useQuery(ALL_BOOKS);
  const [genre, setGenre] = useState(null);

  useSubscription(BOOK_ADDED, {
    onSubscriptionData: ({ client, subscriptionData }) => {
      if (!subscriptionData.data) return;
      const addedBook = subscriptionData.data.bookAdded;
      const includedIn = (set, object) =>
        set.map((p) => p.id).includes(object.id);
      alert(`${addedBook.title} added`);
      const dataInStore = client.readQuery({ query: ALL_BOOKS });
      if (!includedIn(dataInStore.allBooks, addedBook)) {
        client.writeQuery({
          query: ALL_BOOKS,
          data: { allBooks: dataInStore.allBooks.concat(addedBook) },
        });
      }
    },
  });

  const genreResult = useQuery(ALL_BOOKS_GENRE, {
    variables: { genre },
    skip: !genre,
  });

  if (!props.show) return null;
  if (loading) return <p>Loading...</p>;

  let books = data.allBooks;
  if (genreResult.data) {
    books = genreResult.data.allBooks;
  }

  const genres = [...new Set(data.allBooks.flatMap((b) => b.genres))];

  return (
    <div>
      <h2>books</h2>
      {genre && <p>in genre <strong>{genre}</strong></p>}
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>author</th>
            <th>published</th>
          </tr>
          {books.map((a) => (
            <tr key={a.id}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        {genres.map((g) => (
          <button key={g} onClick={() => setGenre(g)}>
            {g}
          </button>
        ))}
        <button onClick={() => setGenre(null)}>all genres</button>
      </div>
    </div>
  );
};

export default Books;