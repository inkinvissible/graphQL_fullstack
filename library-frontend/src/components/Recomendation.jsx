import { useQuery } from "@apollo/client";
import { ALL_BOOKS_GENRE, ME } from "../queries";

// eslint-disable-next-line react/prop-types
const Recomendation = ({ show }) => {
  const { loading: userLoading, data: userData } = useQuery(ME);

  const { loading: booksLoading, data: booksData } = useQuery(ALL_BOOKS_GENRE, {
    skip: !userData?.me?.favoriteGenre,
    variables: { genre: userData?.me?.favoriteGenre },
  });

  if (!show) return null;
  if (userLoading || booksLoading) return <div>Loading...</div>;
  if (!userData?.me) return <div>Please login</div>;

  return (
    <div>
      <h2>Recommendations</h2>
      <p>Books in your favorite genre: {userData.me.favoriteGenre}</p>
      <table>
        <tbody>
          <tr>
            <th>title</th>
            <th>author</th>
            <th>published</th>
          </tr>
          {booksData?.allBooks?.map((book) => (
            <tr key={book.title}>
              <td>{book.title}</td>
              <td>{book.author.name}</td>
              <td>{book.published}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Recomendation;
