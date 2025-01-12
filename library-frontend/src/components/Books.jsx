import { useQuery } from "@apollo/client";
import { ALL_BOOKS, ALL_BOOKS_GENRE } from "../queries";
import { useState } from "react";

const Books = (props) => {
  const result = useQuery(ALL_BOOKS);
  const [genre, setGenre] = useState(null);
  
  const genreResult = useQuery(ALL_BOOKS_GENRE, {
    variables: { genre },
    skip: !genre 
  });

  if (!props.show) return null;
  if (result.loading) return <p>Loading...</p>;

  let books = result.data.allBooks;
  if (genreResult.data) {
    books = genreResult.data.allBooks;
  }

  const genres = [...new Set(result.data.allBooks.flatMap(b => b.genres))];

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
            <tr key={a.title}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        {genres.map(g => (
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
